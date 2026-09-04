import type { Coordonnees } from './coordonnees';
import type { EtapeMarche } from './etape-marche';
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
  /** Nom du point de départ/arrivée (arrêt, adresse), pour affichage du détail. */
  departNom?: string;
  arriveeNom?: string;
  /** Transport en commun uniquement : nom de ligne affiché (ex. "A", "78") et direction (terminus). */
  ligne?: string;
  direction?: string;
  /** Transport en commun uniquement : horaire théorique de départ du point d'embarquement (ISO 8601). */
  departHeure?: string;
  /** Marche uniquement : étapes détaillées (virages, rues), pour la navigation pas à pas. */
  etapes?: EtapeMarche[];
}
