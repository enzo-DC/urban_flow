import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import type { Coordonnees } from '@urbanflow/shared';
import { fetchWithTimeout } from '../http-client.util';
import { versModeTransport } from './otp-mode.mapper';
import type {
  OtpGraphQlResponse,
  OtpItineraire,
  OtpGraphQlPlanNode,
} from './otp.types';

const TIMEOUT_MS = 4000;

const PLAN_QUERY = `
  query Plan($origine: PlanLabeledLocationInput!, $destination: PlanLabeledLocationInput!) {
    planConnection(origin: $origine, destination: $destination) {
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
      })),
    };
  }
}
