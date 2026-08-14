import type { Coordonnees, ModeTransport } from '@urbanflow/shared';

export interface OtpLeg {
  mode: ModeTransport;
  dureeSecondes: number;
  distanceMetres: number;
  depart: Coordonnees;
  arrivee: Coordonnees;
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
