import type { Coordonnees } from './coordonnees';
import type { ModeTransport } from './mode-transport';

/** Un véhicule ou une station en libre-service, tel que remonté par un opérateur. */
export interface VehiculeDisponible {
  id: string;
  mode: ModeTransport;
  position: Coordonnees;
  disponible: number;
}
