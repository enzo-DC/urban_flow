import type { Coordonnees } from './coordonnees';
import type { ModeTransport } from './mode-transport';

/** Un véhicule ou une station en libre-service, tel que remonté par un opérateur. */
export interface VehiculeDisponible {
  id: string;
  mode: ModeTransport;
  position: Coordonnees;
  disponible: number;
  /** Stations à quai (VéloToulouse) uniquement — absent pour le free-floating (Yego). */
  nom?: string;
  adresse?: string;
  capacite?: number;
  /** Free-floating (Yego) uniquement — autonomie restante du véhicule. */
  autonomieMetres?: number;
}
