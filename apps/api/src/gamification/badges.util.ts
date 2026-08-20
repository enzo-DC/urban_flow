export type Palier = 'bronze' | 'argent' | 'or' | 'platine';

// Seuils en points cumules (1 point = 10g de CO2 evite, voir points.util.ts) :
// bronze reste atteignable apres quelques trajets courts, platine demande un
// usage soutenu dans la duree. Choix produit (progression motivante), pas
// une reference externe — a l'inverse de la table ADEME, il n'existe pas de
// bareme officiel pour des paliers de gamification.
const SEUILS_PALIERS: { palier: Palier; pointsRequis: number }[] = [
  { palier: 'bronze', pointsRequis: 100 },
  { palier: 'argent', pointsRequis: 500 },
  { palier: 'or', pointsRequis: 2000 },
  { palier: 'platine', pointsRequis: 10_000 },
];

export const PALIERS_ORDONNES: readonly Palier[] = SEUILS_PALIERS.map(
  (s) => s.palier,
);

/**
 * Tous les paliers desormais atteints par ce total de points mais pas
 * encore debloques — jamais un seul : si un trajet fait franchir plusieurs
 * seuils d'un coup (gros trajet initial), tous doivent etre attribues,
 * aucun ne doit etre silencieusement saute.
 */
export function paliersFranchis(
  pointsCumules: number,
  paliersDejaDebloques: readonly Palier[],
): Palier[] {
  return SEUILS_PALIERS.filter(
    ({ palier, pointsRequis }) =>
      pointsCumules >= pointsRequis && !paliersDejaDebloques.includes(palier),
  ).map(({ palier }) => palier);
}
