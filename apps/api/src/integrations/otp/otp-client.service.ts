import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { ArretTransport, Coordonnees } from '@urbanflow/shared';
import { fetchWithTimeout } from '../http-client.util';
import { versModeTransport } from './otp-mode.mapper';
import type {
  OtpGraphQlResponse,
  OtpGraphQlStopsResponse,
  OtpItineraire,
  OtpGraphQlPlanNode,
} from './otp.types';

const TIMEOUT_MS = 4000;

const STOPS_QUERY = `
  query StopsByBbox($minLat: Float!, $minLon: Float!, $maxLat: Float!, $maxLon: Float!) {
    stopsByBbox(minLat: $minLat, minLon: $minLon, maxLat: $maxLat, maxLon: $maxLon) {
      gtfsId
      name
      lat
      lon
      vehicleMode
    }
  }
`;

// Au-dela, la liste devient illisible sur la carte (zoom large) — mieux vaut
// ne rien afficher que noyer les marqueurs de depart/arrivee/itineraire.
const MAX_ARRETS = 200;

const PLAN_QUERY = `
  query Plan($origine: PlanLabeledLocationInput!, $destination: PlanLabeledLocationInput!, $preferences: PlanPreferencesInput) {
    planConnection(origin: $origine, destination: $destination, preferences: $preferences) {
      edges {
        node {
          duration
          legs {
            mode
            duration
            distance
            from { lat lon }
            to { lat lon }
            route { gtfsId }
            trip { gtfsId }
            legGeometry { points }
          }
        }
      }
    }
  }
`;

// OTP prefixe les gtfsId avec l'identifiant interne du feed ("1:line:61"),
// absent du flux GTFS-RT brut ("line:61") — verifie en comparant les deux en
// conditions reelles avant d'ecrire cette fonction.
function retirerPrefixeFeed(gtfsId: string): string {
  return gtfsId.replace(/^[^:]+:/, '');
}

function versLocation(coordonnees: Coordonnees) {
  return {
    location: {
      coordinate: {
        latitude: coordonnees.latitude,
        longitude: coordonnees.longitude,
      },
    },
  };
}

/**
 * Client GraphQL vers OpenTripPlanner. `planConnection` (pas `plan`, deprecie
 * depuis OTP 2.x) — verifie contre une instance reelle (requete Capitole ->
 * Blagnac) avant d'ecrire ce client.
 */
@Injectable()
export class OtpClientService {
  private readonly logger = new Logger(OtpClientService.name);
  private readonly graphqlUrl: string;

  constructor(private readonly config: ConfigService) {
    const otpUrl = this.config.getOrThrow<string>('OTP_URL');
    this.graphqlUrl = `${otpUrl}/index/graphql`;
  }

  async planifier(
    depart: Coordonnees,
    arrivee: Coordonnees,
    accessible = false,
  ): Promise<OtpItineraire[]> {
    try {
      const response = await fetchWithTimeout(this.graphqlUrl, {
        timeoutMs: TIMEOUT_MS,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: PLAN_QUERY,
          variables: {
            origine: versLocation(depart),
            destination: versLocation(arrivee),
            // wheelchair.enabled fait bien plus que filtrer un champ : verifie
            // en conditions reelles, OTP ecarte les trajets dont les arrets ou
            // vehicules ne sont pas GTFS wheelchair_accessible (repli sur une
            // marche a pied bien plus longue si aucune option accessible
            // n'existe). accessibilityScore reste toujours `null` sur notre
            // build OTP (fonctionnalite sandbox non activee) : pas expose.
            preferences: {
              accessibility: { wheelchair: { enabled: accessible } },
            },
          },
        }),
      });
      if (!response.ok) {
        throw new Error(`${this.graphqlUrl} a repondu ${response.status}`);
      }
      const payload = (await response.json()) as OtpGraphQlResponse;
      if (payload.errors?.length) {
        throw new Error(payload.errors.map((e) => e.message).join('; '));
      }
      const edges = payload.data?.planConnection.edges ?? [];
      return edges.map((edge) => this.versItineraire(edge.node));
    } catch (error) {
      this.logger.warn(
        `Planification OTP echouee : ${(error as Error).message}`,
      );
      return [];
    }
  }

  /**
   * Arrets de transport en commun dans une zone (carte du planificateur).
   * Vient du graphe OTP — construit a partir du jeu de donnees ouvert GTFS
   * de Toulouse Metropole (infra/otp/scripts/fetch-data.sh), jamais de
   * l'API Tisseo elle-meme : conforme a leurs conditions d'usage, qui
   * reservent l'API aux services temps reel/calcul d'itineraire et
   * interdisent d'en extraire le referentiel (voir /mentions-legales).
   */
  async arretsDansZone(
    minLat: number,
    minLon: number,
    maxLat: number,
    maxLon: number,
  ): Promise<ArretTransport[]> {
    try {
      const response = await fetchWithTimeout(this.graphqlUrl, {
        timeoutMs: TIMEOUT_MS,
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          query: STOPS_QUERY,
          variables: { minLat, minLon, maxLat, maxLon },
        }),
      });
      if (!response.ok) {
        throw new Error(`${this.graphqlUrl} a repondu ${response.status}`);
      }
      const payload = (await response.json()) as OtpGraphQlStopsResponse;
      if (payload.errors?.length) {
        throw new Error(payload.errors.map((e) => e.message).join('; '));
      }
      const stops = payload.data?.stopsByBbox ?? [];
      return stops.slice(0, MAX_ARRETS).map((stop) => ({
        id: retirerPrefixeFeed(stop.gtfsId),
        nom: stop.name,
        position: { latitude: stop.lat, longitude: stop.lon },
        mode: versModeTransport(stop.vehicleMode ?? ''),
      }));
    } catch (error) {
      this.logger.warn(
        `Recherche d'arrets OTP echouee : ${(error as Error).message}`,
      );
      return [];
    }
  }

  private versItineraire(node: OtpGraphQlPlanNode): OtpItineraire {
    return {
      dureeSecondes: node.duration,
      legs: node.legs.map((leg) => ({
        mode: versModeTransport(leg.mode),
        dureeSecondes: leg.duration,
        distanceMetres: leg.distance,
        depart: { latitude: leg.from.lat, longitude: leg.from.lon },
        arrivee: { latitude: leg.to.lat, longitude: leg.to.lon },
        ligneId: leg.route ? retirerPrefixeFeed(leg.route.gtfsId) : undefined,
        voyageId: leg.trip ? retirerPrefixeFeed(leg.trip.gtfsId) : undefined,
        trace: leg.legGeometry?.points,
      })),
    };
  }
}
