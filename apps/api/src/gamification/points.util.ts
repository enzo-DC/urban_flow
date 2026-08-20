import type { ModeTransport } from '@urbanflow/shared';

// 1 point tous les 10g de CO2 evite : un trajet typique (quelques km a
// velo/pied plutot qu'en voiture) evite de l'ordre de 500 a 2000g, donc
// rapporte 50 a 200 points — ordre de grandeur "jeu" lisible, pas un ratio
// officiel (aucune reference ADEME n'existe pour un bareme de points).
const GRAMMES_CO2_PAR_POINT = 10;

/**
 * Vitesses maximales plausibles par mode (km/h) — regle anti-fraude : un
 * mode dont la vitesse moyenne mesuree (distance/duree du segment) depasse
 * ce plafond n'est pas credible (ex. un "velo" a 90 km/h est en realite un
 * trajet voiture, cf. markdown/claude-rule-backend.md). Marges volontairement
 * larges (VTT/velo electrique, aleas de circulation) pour ne pas penaliser
 * des trajets legitimes rapides. Pas de plafond pour la voiture : c'est deja
 * le mode de reference le moins vertueux, rien a detecter au-dela.
 */
const VITESSE_MAX_KMH: Partial<Record<ModeTransport, number>> = {
  marche: 7,
  velo: 35,
  trottinette: 30,
  scooter: 50,
  bus: 60,
  metro: 80,
  tram: 70,
};

export interface SegmentPourAntiFraude {
  mode: ModeTransport;
  distanceMetres: number;
  dureeSecondes: number;
}

export function segmentSuspect(segment: SegmentPourAntiFraude): boolean {
  const plafond = VITESSE_MAX_KMH[segment.mode];
  if (plafond === undefined) return false;
  // Distance reelle sur duree nulle/negative : donnee incoherente, jamais
  // credible quel que soit le mode.
  if (segment.dureeSecondes <= 0) return segment.distanceMetres > 0;
  const vitesseKmh = (segment.distanceMetres * 3.6) / segment.dureeSecondes;
  return vitesseKmh > plafond;
}

/**
 * Un seul segment suspect invalide l'attribution de points pour tout le
 * trajet : melanger un segment truque a des segments legitimes ne doit pas
 * permettre de recuperer partiellement des points.
 */
export function trajetSuspect(segments: SegmentPourAntiFraude[]): boolean {
  return segments.some(segmentSuspect);
}

export function calculerPoints(co2EviteGrammes: number): number {
  return Math.max(0, Math.round(co2EviteGrammes / GRAMMES_CO2_PAR_POINT));
}
