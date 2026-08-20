export type Palier = 'bronze' | 'argent' | 'or' | 'platine';

export interface GamificationResume {
  pointsTotal: number;
  badges: Palier[];
}
