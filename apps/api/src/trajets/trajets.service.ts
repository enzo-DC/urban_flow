import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import type { ModeTransport } from '@urbanflow/shared';
import { calculerCo2Grammes } from '../carbone/facteurs-ademe';
import { PrismaService } from '../prisma/prisma.service';
import type { EnregistrerTrajetDto } from './dto/enregistrer-trajet.dto';
import {
  TRAJET_EFFECTUE_EVENT,
  TrajetEffectueEvent,
} from './events/trajet-effectue.event';

const TYPE_SERVICE_PAR_MODE: Record<ModeTransport, string> = {
  marche: 'personnel',
  velo: 'libre_service',
  trottinette: 'libre_service',
  scooter: 'libre_service',
  bus: 'transport_commun',
  metro: 'transport_commun',
  tram: 'transport_commun',
  voiture: 'personnel',
};

export interface TrajetEnregistre {
  trajetId: string;
  effectueLe: Date;
  co2Grammes: number;
}

@Injectable()
export class TrajetsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  async enregistrer(
    utilisateurId: string,
    dto: EnregistrerTrajetDto,
  ): Promise<TrajetEnregistre> {
    const segments = await Promise.all(
      dto.segments.map(async (segment, index) => ({
        ordre: index,
        mode: segment.mode,
        // Colonne Postgres INTEGER : OTP renvoie des distances
        // fractionnaires (ex. 543.78 m), arrondies uniquement a la
        // persistance — le calcul CO2 ci-dessous reste sur la valeur exacte.
        distanceMetres: Math.round(segment.distanceMetres),
        dureeSecondes: segment.dureeSecondes,
        co2Grammes: calculerCo2Grammes(segment.mode, segment.distanceMetres),
        operateurId: segment.operateur
          ? await this.resoudreOperateur(segment.operateur, segment.mode)
          : null,
        depart: segment.depart,
        arrivee: segment.arrivee,
      })),
    );

    const dureeSecondes = segments.reduce(
      (total, s) => total + s.dureeSecondes,
      0,
    );
    const co2Grammes = segments.reduce((total, s) => total + s.co2Grammes, 0);

    const itineraireId = await this.prisma.creerItineraireEffectue({
      dureeSecondes,
      co2Grammes,
      depart: dto.depart,
      arrivee: dto.arrivee,
      segments,
    });

    const trajet = await this.prisma.trajet.create({
      data: { utilisateurId, itineraireId },
    });

    // Publie apres la persistance : le module carbone (et la gamification
    // en Phase 8) reagit a un trajet qui existe reellement en base, jamais
    // a une intention non confirmee.
    this.eventEmitter.emit(
      TRAJET_EFFECTUE_EVENT,
      new TrajetEffectueEvent(
        trajet.id,
        utilisateurId,
        dto.segments.map((s) => ({
          mode: s.mode,
          distanceMetres: s.distanceMetres,
        })),
      ),
    );

    return { trajetId: trajet.id, effectueLe: trajet.effectueLe, co2Grammes };
  }

  private async resoudreOperateur(
    nom: string,
    mode: ModeTransport,
  ): Promise<string> {
    const operateur = await this.prisma.operateur.upsert({
      where: { nom },
      create: { nom, typeService: TYPE_SERVICE_PAR_MODE[mode] },
      update: {},
    });
    return operateur.id;
  }
}
