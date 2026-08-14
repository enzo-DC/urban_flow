import type { Coordonnees, ModeTransport } from '@urbanflow/shared';

export interface OtpLeg {
  mode: ModeTransport;
  dureeSecondes: number;
  distanceMetres: number;
  depart: Coordonnees;
  arrivee: Coordonnees;
  /** Identifiant de ligne GTFS (prefixe de feed OTP retire), absent hors transport en commun. */
  ligneId?: string;
  /** Identifiant de voyage GTFS (prefixe de feed OTP retire), absent hors transport en commun. */
  voyageId?: string;
  /** Trace du segment, polyline encodee (format Google, precision 5), pour affichage carte. */
  trace?: string;
}

export interface OtpItineraire {
  dureeSecondes: number;
  legs: OtpLeg[];
}

export interface OtpGraphQlLegNode {
  mode: string;
  duration: number;
  distance: number;
  from: { lat: number; lon: number };
  to: { lat: number; lon: number };
  route: { gtfsId: string } | null;
  trip: { gtfsId: string } | null;
  legGeometry: { points: string } | null;
}

export interface OtpGraphQlPlanNode {
  duration: number;
  legs: OtpGraphQlLegNode[];
}

export interface OtpGraphQlResponse {
  data?: {
    planConnection: {
      edges: { node: OtpGraphQlPlanNode }[];
    };
  };
  errors?: { message: string }[];
}
