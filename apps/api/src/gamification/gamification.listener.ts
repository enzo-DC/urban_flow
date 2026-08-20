import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import {
  calculerCo2EviteGrammes,
  calculerCo2Grammes,
} from '../carbone/facteurs-ademe';
import { PrismaService } from '../prisma/prisma.service';
import {
  TRAJET_EFFECTUE_EVENT,
  TrajetEffectueEvent,
} from '../trajets/events/trajet-effectue.event';
import { calculerPoints, trajetSuspect } from './points.util';

/**
 * Second consommateur independant de TrajetEffectue — n'importe jamais le
 * module carbone (voir CarboneListener) : les deux derivent chacun leur
 * propre etat a partir des memes faits bruts (mode + distance + duree par
 * segment), sans se connaitre. C'est le decouplage du diagramme de
 * communication du dossier.
 */
@Injectable()
export class GamificationListener {
  private readonly logger = new Logger(GamificationListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(TRAJET_EFFECTUE_EVENT)
  async handleTrajetEffectue(event: TrajetEffectueEvent): Promise<void> {
    try {
      if (trajetSuspect(event.segments)) {
        this.logger.warn(
          `Trajet ${event.trajetId} suspect (vitesse incoherente avec un mode declare) : aucun point attribue.`,
        );
        return;
      }

      const distanceTotaleMetres = event.segments.reduce(
        (total, segment) => total + segment.distanceMetres,
        0,
      );
      const co2Grammes = event.segments.reduce(
        (total, segment) =>
          total + calculerCo2Grammes(segment.mode, segment.distanceMetres),
        0,
      );
      const co2EviteGrammes = calculerCo2EviteGrammes(
        distanceTotaleMetres,
        co2Grammes,
      );
      const points = calculerPoints(co2EviteGrammes);

      if (points <= 0) return;

      await this.prisma.recompense.create({
        data: { utilisateurId: event.utilisateurId, type: 'trajet', points },
      });
    } catch (error) {
      // Un evenement en echec ne doit jamais faire planter le process :
      // l'utilisateur a deja recu la confirmation de son trajet, seuls les
      // points de ce trajet sont perdus.
      this.logger.warn(
        `Traitement TrajetEffectue (gamification) echoue pour le trajet ${event.trajetId} : ${(error as Error).message}`,
      );
    }
  }
}
