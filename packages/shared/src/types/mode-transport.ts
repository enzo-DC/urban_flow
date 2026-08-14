export const MODES_TRANSPORT = [
  'marche',
  'velo',
  'trottinette',
  'scooter',
  'bus',
  'metro',
  'tram',
  'voiture',
] as const;

export type ModeTransport = (typeof MODES_TRANSPORT)[number];
