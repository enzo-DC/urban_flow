export interface TrajetHistorique {
  trajetId: string;
  effectueLe: string;
  co2Grammes: number;
  co2EviteGrammes: number;
}

export interface ImpactCarbone {
  co2EviteGrammesTotal: number;
  kmVoitureEvites: number;
  nombreTrajets: number;
  historique: TrajetHistorique[];
}
