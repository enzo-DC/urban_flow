import type { ModeTransport } from '@urbanflow/shared';

export const TRAJET_EFFECTUE_EVENT = 'trajet.effectue';

export interface SegmentEffectue {
  mode: ModeTransport;
  distanceMetres: number;
  dureeSecondes: number;
}

/**
 * Evenement publie a chaque trajet enregistre. Ne transporte que des faits
 * bruts (mode + distance + duree par segment) — jamais de CO2 deja calcule :
 * chaque consommateur (carbone, puis gamification) derive son propre etat a
 * partir des faits, il ne fait jamais confiance a une conclusion deja tiree
 * par un autre module. dureeSecondes ajoutee en Phase 8 (necessaire a la
 * regle anti-fraude vitesse moyenne de la gamification, absente du besoin
 * initial de la Phase 7) — evolution normale d'un contrat d'evenement au
 * fil des consommateurs, pas une dette technique. Jamais de trace GPS :
 * elle n'est meme pas acceptee en entree (voir EnregistrerTrajetDto).
 */
export class TrajetEffectueEvent {
  constructor(
    public readonly trajetId: string,
    public readonly utilisateurId: string,
    public readonly segments: SegmentEffectue[],
  ) {}
}
