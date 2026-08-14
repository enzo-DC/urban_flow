import type { ModeTransport } from '@urbanflow/shared';

/**
 * Ordres de grandeur (g CO2e / passager.km) pour comparer les options au
 * moment de la planification. Table volontairement simple et non
 * versionnee — la table de reference ADEME versionnee (Phase 7) servira au
 * calcul definitif enregistre a la fin d'un trajet reellement effectue.
 */
const FACTEUR_CO2_G_PAR_KM: Record<ModeTransport, number> = {
  marche: 0,
  velo: 0,
  trottinette: 25,
  scooter: 30,
  bus: 103,
  metro: 4,
  tram: 4,
  voiture: 193,
};

export function calculerCo2Grammes(
  mode: ModeTransport,
  distanceMetres: number,
): number {
  const km = distanceMetres / 1000;
  return Math.round(FACTEUR_CO2_G_PAR_KM[mode] * km);
}
