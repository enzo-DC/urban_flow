import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import {
  TRAJET_EFFECTUE_EVENT,
  TrajetEffectueEvent,
} from '../trajets/events/trajet-effectue.event';
import { calculerCo2EviteGrammes, calculerCo2Grammes } from './facteurs-ademe';

/**
 * Consomme TrajetEffectue sans jamais importer le module trajets au-dela de
 * son contrat d'evenement (segments : mode + distance) — recalcule son
 * propre CO2 a partir de ces faits bruts plutot que de faire confiance a un
 * total deja tire par l'emetteur, meme si le resultat est identique en
 * pratique (meme table de reference). Vraie independance, pas une simple
 * notification.
 */
@Injectable()
export class CarboneListener {
  private readonly logger = new Logger(CarboneListener.name);

  constructor(private readonly prisma: PrismaService) {}

  @OnEvent(TRAJET_EFFECTUE_EVENT)
  async handleTrajetEffectue(event: TrajetEffectueEvent): Promise<void> {
    try {
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

      await this.prisma.empreinteCarbone.create({
        data: { trajetId: event.trajetId, co2Grammes, co2EviteGrammes },
      });
    } catch (error) {
      // Un evenement en echec ne doit jamais faire planter le process :
      // l'utilisateur a deja recu la confirmation de son trajet (branche
      // trajets), seul l'enrichissement carbone est perdu pour ce trajet.
      this.logger.warn(
        `Traitement TrajetEffectue echoue pour le trajet ${event.trajetId} : ${(error as Error).message}`,
      );
    }
  }
}
