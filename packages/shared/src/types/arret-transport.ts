import type { Coordonnees } from './coordonnees';
import type { ModeTransport } from './mode-transport';

/** Un arrêt de transport en commun (bus, métro, tram), issu du graphe OTP. */
export interface ArretTransport {
  id: string;
  nom: string;
  position: Coordonnees;
  mode: ModeTransport;
}
