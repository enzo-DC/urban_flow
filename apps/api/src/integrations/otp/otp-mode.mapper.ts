import type { ModeTransport } from '@urbanflow/shared';

// OTP expose un Mode plus riche (rail, ferry, avion, taxi...) que le
// ModeTransport du projet, cale sur le reseau Tisseo reellement dessservi a
// Toulouse. Les modes qui n'ont pas d'equivalent direct retombent sur 'bus'
// (transport collectif generique) plutot que de faire planter le mapping.
const OTP_VERS_MODE_TRANSPORT: Record<string, ModeTransport> = {
  WALK: 'marche',
  BICYCLE: 'velo',
  SCOOTER: 'trottinette',
  CAR: 'voiture',
  CARPOOL: 'voiture',
  TAXI: 'voiture',
  SUBWAY: 'metro',
  TRAM: 'tram',
  CABLE_CAR: 'tram',
  GONDOLA: 'tram',
  FUNICULAR: 'tram',
  MONORAIL: 'tram',
  BUS: 'bus',
  TROLLEYBUS: 'bus',
  COACH: 'bus',
  RAIL: 'bus',
  FERRY: 'bus',
};

const MODE_PAR_DEFAUT: ModeTransport = 'bus';

export function versModeTransport(modeOtp: string): ModeTransport {
  return OTP_VERS_MODE_TRANSPORT[modeOtp] ?? MODE_PAR_DEFAUT;
}
