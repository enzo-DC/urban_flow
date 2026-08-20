import { Injectable, Logger } from '@nestjs/common';
import { OnEvent } from '@nestjs/event-emitter';
import type { Palier } from '../gamification/badges.util';
import {
  BADGE_DEBLOQUE_EVENT,
  BadgeDebloqueEvent,
} from '../gamification/events/badge-debloque.event';
import { PushService } from './push.service';

const MESSAGE_PAR_PALIER: Record<Palier, string> = {
  bronze: 'Tu as débloqué le badge Bronze !',
  argent: 'Tu as débloqué le badge Argent !',
  or: 'Tu as débloqué le badge Or !',
  platine: 'Tu as débloqué le badge Platine !',
};

/**
 * S'abonne a BadgeDebloque (module gamification) sans que la gamification
 * ait besoin de connaitre l'existence du push — meme decouplage par
 * evenement que TrajetEffectue.
 */
@Injectable()
export class PushListener {
  private readonly logger = new Logger(PushListener.name);

  constructor(private readonly push: PushService) {}

  @OnEvent(BADGE_DEBLOQUE_EVENT)
  async handleBadgeDebloque(event: BadgeDebloqueEvent): Promise<void> {
    try {
      await this.push.envoyerATous(event.utilisateurId, {
        titre: 'Nouveau badge débloqué !',
        corps: MESSAGE_PAR_PALIER[event.palier],
      });
    } catch (error) {
      this.logger.warn(
        `Notification push echouee pour le badge ${event.palier} (${event.utilisateurId}) : ${(error as Error).message}`,
      );
    }
  }
}
