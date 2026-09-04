import type {
  Coordonnees,
  EtapeMarche,
  ModeTransport,
} from '@urbanflow/shared';

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
  /** Nom du point de depart/arrivee (arret, adresse) — pour affichage du detail d'itineraire. */
  departNom?: string;
  arriveeNom?: string;
  /** Transport en commun uniquement : nom de ligne affiche et direction (terminus). */
  ligne?: string;
  direction?: string;
  /** Transport en commun uniquement : horaire theorique de depart du point d'embarquement (ISO 8601). */
  departHeure?: string;
  /** Marche uniquement : etapes detaillees (virages, rues). */
  etapes?: EtapeMarche[];
}

export interface OtpItineraire {
  dureeSecondes: number;
  legs: OtpLeg[];
}

interface OtpGraphQlPlace {
  lat: number;
  lon: number;
  name: string | null;
  stop: { gtfsId: string } | null;
  departure: { scheduledTime: string } | null;
  arrival: { scheduledTime: string } | null;
}

export interface OtpGraphQlStep {
  streetName: string | null;
  relativeDirection: string;
  distance: number;
}

export interface OtpGraphQlLegNode {
  mode: string;
  duration: number;
  distance: number;
  from: OtpGraphQlPlace;
  to: OtpGraphQlPlace;
  route: { gtfsId: string; shortName: string | null } | null;
  trip: { gtfsId: string } | null;
  headsign: string | null;
  legGeometry: { points: string } | null;
  steps: OtpGraphQlStep[] | null;
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

export interface OtpGraphQlStopNode {
  gtfsId: string;
  name: string;
  lat: number;
  lon: number;
  vehicleMode: string | null;
}

export interface OtpGraphQlStopsResponse {
  data?: { stopsByBbox: OtpGraphQlStopNode[] };
  errors?: { message: string }[];
}

export interface OtpGraphQlStoptimeNode {
  realtimeDeparture: number;
  serviceDay: number;
  headsign: string | null;
  trip: {
    gtfsId: string;
    route: { shortName: string | null; mode: string } | null;
  } | null;
}

export interface OtpGraphQlStopResponse {
  data?: {
    stop: {
      name: string;
      stoptimesWithoutPatterns: OtpGraphQlStoptimeNode[];
    } | null;
  };
  errors?: { message: string }[];
}

/** Passage OTP brut (horaire theorique), avant croisement avec les
 * perturbations GTFS-RT — voir ArretsService.prochainsPassages. */
export interface OtpProchainPassage {
  ligne: string;
  destination: string;
  mode: ModeTransport;
  dansMinutes: number;
  /** Identifiant de voyage GTFS (prefixe de feed OTP retire), pour croiser
   * avec PerturbationTrajet.tripId (meme format que le flux GTFS-RT brut). */
  voyageId?: string;
}
