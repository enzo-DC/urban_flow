export interface PerturbationTrajet {
  tripId: string;
  routeId?: string;
  statut: 'ANNULE' | 'AJOUTE' | 'RETARDE';
  retardSecondes?: number;
}
