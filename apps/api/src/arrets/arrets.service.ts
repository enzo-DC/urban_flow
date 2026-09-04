import { Injectable } from '@nestjs/common';
import type { ArretTransport, ProchainPassage } from '@urbanflow/shared';
import { TisseoGtfsRtService } from '../integrations/gtfs-rt/tisseo-gtfs-rt.service';
import { OtpClientService } from '../integrations/otp/otp-client.service';

@Injectable()
export class ArretsService {
  constructor(
    private readonly otp: OtpClientService,
    private readonly gtfsRt: TisseoGtfsRtService,
  ) {}

  parZone(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
  ): Promise<ArretTransport[]> {
    return this.otp.arretsDansZone(minLat, minLon, maxLat, maxLon);
  }

  /**
   * Prochains passages theoriques, marques retardes/annules quand une
   * perturbation GTFS-RT deja recuperee par le projet correspond au meme
   * voyage — meme logique de croisement par tripId que
   * itineraires/perturbations.util.ts, appliquee ici a un arret plutot
   * qu'a un itineraire complet.
   */
  async prochainsPassages(stopId: string): Promise<ProchainPassage[]> {
    const [passages, perturbations] = await Promise.all([
      this.otp.prochainsPassages(stopId),
      this.gtfsRt.getPerturbations(),
    ]);

    return passages.map((passage) => {
      const perturbation = perturbations.find(
        (p) =>
          p.tripId === passage.voyageId &&
          (p.statut === 'ANNULE' || p.statut === 'RETARDE'),
      );
      if (!perturbation) {
        return {
          ligne: passage.ligne,
          destination: passage.destination,
          mode: passage.mode,
          dansMinutes: passage.dansMinutes,
        };
      }
      return {
        ligne: passage.ligne,
        destination: passage.destination,
        mode: passage.mode,
        dansMinutes: passage.dansMinutes,
        // Le filtre du .find() ci-dessus exclut deja AJOUTE, mais son
        // predicat ne retrecit pas le type — ternaire explicite pour TS.
        perturbation: perturbation.statut === 'ANNULE' ? 'ANNULE' : 'RETARDE',
        retardMinutes: perturbation.retardSecondes
          ? Math.round(perturbation.retardSecondes / 60)
          : undefined,
      };
    });
  }
}
