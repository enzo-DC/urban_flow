import type { ModeTransport } from '@urbanflow/shared';

export const TRAJET_EFFECTUE_EVENT = 'trajet.effectue';

export interface SegmentEffectue {
  mode: ModeTransport;
  distanceMetres: number;
}

/**
 * Evenement publie a chaque trajet enregistre. Ne transporte que des faits
 * bruts (mode + distance par segment) — jamais de CO2 deja calcule : chaque
 * consommateur (carbone, puis gamification en Phase 8) derive son propre
 * etat a partir des faits, il ne fait jamais confiance a une conclusion
 * deja tiree par un autre module. Jamais de trace GPS : elle n'est meme
 * pas acceptee en entree (voir EnregistrerTrajetDto).
 */
export class TrajetEffectueEvent {
  constructor(
    public readonly trajetId: string,
    public readonly utilisateurId: string,
    public readonly segments: SegmentEffectue[],
  ) {}
}
