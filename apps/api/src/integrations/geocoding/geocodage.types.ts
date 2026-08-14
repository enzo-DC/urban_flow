import type { Coordonnees } from '@urbanflow/shared';

export interface LieuGeocode {
  label: string;
  position: Coordonnees;
}

export interface NominatimResultat {
  display_name: string;
  lat: string;
  lon: string;
}
