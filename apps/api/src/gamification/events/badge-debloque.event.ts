import type { Palier } from '../badges.util';

export const BADGE_DEBLOQUE_EVENT = 'gamification.badge_debloque';

/**
 * Evenement interne au module gamification, distinct de TrajetEffectue :
 * un badge nouvellement debloque est une consequence de la gamification,
 * pas un fait brut du trajet. Le module push (Phase 8, branche suivante)
 * s'y abonne pour declencher une notification, sans que la gamification
 * ait besoin de connaitre l'existence du push — meme logique de
 * decouplage par evenement que TrajetEffectue.
 */
export class BadgeDebloqueEvent {
  constructor(
    public readonly utilisateurId: string,
    public readonly palier: Palier,
  ) {}
}
