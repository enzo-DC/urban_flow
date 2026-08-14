import type { VehiculeDisponible } from '@urbanflow/shared';

export type { VehiculeDisponible };

/**
 * Interface commune a tout operateur de mobilite (GBFS, GTFS-RT, ...).
 * Ajouter un operateur = ajouter une implementation de cette interface et
 * l'enregistrer sous FOURNISSEUR_MOBILITE_TOKEN — jamais toucher au coeur
 * (voir markdown/claude-rule-backend.md).
 *
 * Chaque implementation est responsable de sa propre degradation gracieuse :
 * en cas d'echec (timeout, flux invalide), elle renvoie un tableau vide
 * plutot que de laisser une exception remonter et faire echouer l'appel
 * groupe (Promise.allSettled) dans lequel elle sera utilisee.
 */
export interface FournisseurMobilite {
  readonly nom: string;
  disponibilites(): Promise<VehiculeDisponible[]>;
}

export const FOURNISSEUR_MOBILITE_TOKEN = 'FOURNISSEUR_MOBILITE';
