import type { LieuGeocode } from '@urbanflow/shared';

export type { LieuGeocode };

export interface TisseoPlace {
  label: string;
  x: string;
  y: string;
}

export interface TisseoPlacesResponse {
  placesList: {
    place: TisseoPlace[];
  };
}
