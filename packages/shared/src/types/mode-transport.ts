export const MODES_TRANSPORT = [
  'marche',
  'velo',
  'trottinette',
  'bus',
  'metro',
  'tram',
  'voiture',
] as const;

export type ModeTransport = (typeof MODES_TRANSPORT)[number];
