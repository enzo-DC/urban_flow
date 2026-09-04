import type { ModeTransport } from './mode-transport';

/** Un prochain passage a un arret, horaire theorique OTP croise avec les
 * perturbations GTFS-RT Tisseo deja recuperees par le projet. */
export interface ProchainPassage {
  ligne: string;
  destination: string;
  mode: ModeTransport;
  dansMinutes: number;
  perturbation?: 'RETARDE' | 'ANNULE';
  retardMinutes?: number;
}
