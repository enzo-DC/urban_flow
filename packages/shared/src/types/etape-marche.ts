/** Une étape de marche à pied (virage, rue à suivre) — pour la navigation détaillée. */
export interface EtapeMarche {
  /** Instruction en français ("Tournez à gauche", "Continuez"...). */
  direction: string;
  rue?: string;
  distanceMetres: number;
}
