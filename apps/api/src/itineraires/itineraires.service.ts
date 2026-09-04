import { Inject, Injectable } from '@nestjs/common';
import type {
  Coordonnees,
  CritereTri,
  Itineraire,
  ReponseItineraires,
  Segment,
} from '@urbanflow/shared';
import {
  FOURNISSEUR_MOBILITE_TOKEN,
  FournisseurMobilite,
} from '../integrations/fournisseur-mobilite.interface';
import { TisseoGtfsRtService } from '../integrations/gtfs-rt/tisseo-gtfs-rt.service';
import { OtpClientService } from '../integrations/otp/otp-client.service';
import type { OtpItineraire } from '../integrations/otp/otp.types';
import { calculerCo2Grammes } from '../carbone/facteurs-ademe';
import { RedisService } from '../redis/redis.service';
import type { RequeteItineraireDto } from './dto/requete-itineraire.dto';
import { appliquerPerturbations } from './perturbations.util';

// Superieur au cycle de rafraichissement GTFS-RT (45s) pour beneficier du
// cache sur des recherches repetees, mais assez court pour ne pas trainer
// une duree ajustee (retard) perimee trop longtemps.
const CACHE_TTL_SECONDES = 60;

@Injectable()
export class ItinerairesService {
  constructor(
    private readonly otp: OtpClientService,
    private readonly gtfsRt: TisseoGtfsRtService,
    @Inject(FOURNISSEUR_MOBILITE_TOKEN)
    private readonly fournisseurs: FournisseurMobilite[],
    private readonly redis: RedisService,
  ) {}

  async planifier(requete: RequeteItineraireDto): Promise<ReponseItineraires> {
    const { itineraires, disponibilites } = await this.recupererBrut(requete);

    let resultat = requete.modesAutorises?.length
      ? itineraires.filter((it) =>
          it.segments.every((s) => requete.modesAutorises!.includes(s.mode)),
        )
      : itineraires;

    resultat = this.trier(resultat, requete.critereTri ?? 'duree');

    return { itineraires: resultat, disponibilites };
  }

  private async recupererBrut(
    requete: RequeteItineraireDto,
  ): Promise<ReponseItineraires> {
    const cle = this.cleCache(
      requete.depart,
      requete.arrivee,
      requete.accessible ?? false,
    );
    const cached = await this.redis.client.get(cle);
    if (cached) {
      return JSON.parse(cached) as ReponseItineraires;
    }

    // Un seul Promise.all sur deux Promise.allSettled deja surs (elles ne
    // rejettent jamais) : les trois sources partent en parallele, la
    // defaillance de l'une n'attend jamais ni ne bloque les autres.
    const [[otpResultat, gtfsRtResultat], fournisseurResultats] =
      await Promise.all([
        Promise.allSettled([
          this.otp.planifier(
            requete.depart,
            requete.arrivee,
            requete.accessible ?? false,
          ),
          this.gtfsRt.getPerturbations(),
        ]),
        Promise.allSettled(this.fournisseurs.map((f) => f.disponibilites())),
      ]);

    const itinerairesOtp =
      otpResultat.status === 'fulfilled' ? otpResultat.value : [];
    const perturbations =
      gtfsRtResultat.status === 'fulfilled' ? gtfsRtResultat.value : [];
    const disponibilites = fournisseurResultats.flatMap((r) =>
      r.status === 'fulfilled' ? r.value : [],
    );

    const itineraires = itinerairesOtp
      .map((it) => appliquerPerturbations(it, perturbations))
      .filter((it): it is OtpItineraire => it !== null)
      .map((it) => this.versItineraire(it, requete));

    const reponse: ReponseItineraires = { itineraires, disponibilites };

    // On ne met en cache que des resultats reels : un OTP en echec (tableau
    // vide) ne doit jamais figer une reponse degradee pendant le TTL.
    if (itineraires.length > 0) {
      await this.redis.client.set(
        cle,
        JSON.stringify(reponse),
        'EX',
        CACHE_TTL_SECONDES,
      );
    }

    return reponse;
  }

  private versItineraire(
    otp: OtpItineraire,
    requete: RequeteItineraireDto,
  ): Itineraire {
    const segments: Segment[] = otp.legs.map((leg) => ({
      mode: leg.mode,
      depart: leg.depart,
      arrivee: leg.arrivee,
      distanceMetres: leg.distanceMetres,
      dureeSecondes: leg.dureeSecondes,
      operateur: leg.ligneId,
      co2Grammes: calculerCo2Grammes(leg.mode, leg.distanceMetres),
      trace: leg.trace,
      departNom: leg.departNom,
      arriveeNom: leg.arriveeNom,
    }));

    return {
      id: crypto.randomUUID(),
      depart: requete.depart,
      arrivee: requete.arrivee,
      segments,
      dureeSecondes: otp.dureeSecondes,
      co2Grammes: segments.reduce((total, s) => total + s.co2Grammes, 0),
    };
  }

  private trier(itineraires: Itineraire[], critere: CritereTri): Itineraire[] {
    const copie = [...itineraires];
    if (critere === 'co2') {
      copie.sort((a, b) => a.co2Grammes - b.co2Grammes);
      return copie;
    }
    // 'duree' et 'prix' (le tarif n'est pas encore calcule : on trie par
    // duree en attendant plutot que de renvoyer un ordre arbitraire).
    copie.sort((a, b) => a.dureeSecondes - b.dureeSecondes);
    return copie;
  }

  private cleCache(
    depart: Coordonnees,
    arrivee: Coordonnees,
    accessible: boolean,
  ): string {
    const r = (n: number) => n.toFixed(4);
    return `itineraires:${accessible ? 'pmr' : 'standard'}:${r(depart.latitude)},${r(depart.longitude)}:${r(arrivee.latitude)},${r(arrivee.longitude)}`;
  }
}
