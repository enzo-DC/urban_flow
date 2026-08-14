import type { Coordonnees } from './coordonnees';
import type { ModeTransport } from './mode-transport';

export interface Segment {
  mode: ModeTransport;
  depart: Coordonnees;
  arrivee: Coordonnees;
  distanceMetres: number;
  dureeSecondes: number;
  /** Identifiant de ligne ou d'opérateur, absent pour la marche */
  operateur?: string;
  co2Grammes: number;
  /** Trace du segment, polyline encodée (format Google, précision 5), pour affichage carte. */
  trace?: string;
}
