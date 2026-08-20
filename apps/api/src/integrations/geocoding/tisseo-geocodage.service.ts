import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { fetchWithTimeout } from '../http-client.util';
import type { LieuGeocode, TisseoPlacesResponse } from './geocodage.types';

const TIMEOUT_MS = 4000;
const PLACES_URL = 'https://api.tisseo.fr/v2/places.json';
// Adresses, arrets et points d'interet ne changent pas d'une minute a
// l'autre ; un TTL genereux limite les appels repetes (usage "raisonnable"
// des ressources serveur impose par les conditions d'usage de la cle).
const CACHE_TTL_SECONDES = 86_400;

/**
 * Geocodage texte -> coordonnees via l'API places de Tisseo (cle attribuee
 * manuellement, voir docs/avancement.md Phase 6). Remplace le repli
 * Nominatim initial. Usage conforme au mail Tisseo (opendata@tisseo.fr,
 * 2026-08-18) : cette cle sert la recherche a la demande pour alimenter un
 * calcul d'itineraire, jamais l'extraction en masse du referentiel
 * arrets/lignes — celui-ci reste sur le jeu de donnees GTFS deja utilise
 * pour construire le graphe OTP (infra/otp/).
 */
@Injectable()
export class TisseoGeocodageService {
  private readonly logger = new Logger(TisseoGeocodageService.name);
  private readonly apiKey: string;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.apiKey = this.config.getOrThrow<string>('TISSEO_API_KEY');
  }

  async rechercherAdresse(requete: string): Promise<LieuGeocode[]> {
    const cle = `geocodage:tisseo:${requete.trim().toLowerCase()}`;
    try {
      // interroger() jette en cas d'echec reel : getOrSet ne met alors rien
      // en cache, un echec transitoire n'est jamais fige 24h.
      return await this.redis.getOrSet(cle, CACHE_TTL_SECONDES, () =>
        this.interroger(requete),
      );
    } catch (error) {
      this.logger.warn(`Geocodage Tisseo echoue : ${(error as Error).message}`);
      return [];
    }
  }

  private async interroger(requete: string): Promise<LieuGeocode[]> {
    const url = new URL(PLACES_URL);
    url.searchParams.set('term', requete);
    url.searchParams.set('key', this.apiKey);

    const response = await fetchWithTimeout(url.toString(), {
      timeoutMs: TIMEOUT_MS,
    });
    // Piege verifie en conditions reelles : Tisseo repond 404 (avec un
    // corps JSON valide, placesList.place vide) aussi bien pour "aucun
    // resultat" que pour un terme vide — ce n'est pas un echec du service.
    if (!response.ok && response.status !== 404) {
      throw new Error(`${PLACES_URL} a repondu ${response.status}`);
    }
    const payload = (await response.json()) as TisseoPlacesResponse;
    return payload.placesList.place.map((place) => ({
      label: place.label,
      position: {
        latitude: Number(place.y),
        longitude: Number(place.x),
      },
    }));
  }
}
