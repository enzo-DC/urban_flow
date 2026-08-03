import type { Coordonnees } from './coordonnees';
import type { Segment } from './segment';

export type CritereTri = 'duree' | 'co2' | 'prix';

export interface Itineraire {
  id: string;
  depart: Coordonnees;
  arrivee: Coordonnees;
  segments: Segment[];
  dureeSecondes: number;
  co2Grammes: number;
}

export interface RequeteItineraire {
  depart: Coordonnees;
  arrivee: Coordonnees;
  modesAutorises?: Segment['mode'][];
  critereTri?: CritereTri;
}
