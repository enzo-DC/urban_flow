import { Injectable, Logger } from '@nestjs/common';
import { RedisService } from '../../redis/redis.service';
import { fetchWithTimeout } from '../http-client.util';
import type { LieuGeocode, NominatimResultat } from './geocodage.types';

const TIMEOUT_MS = 4000;
const NOMINATIM_URL = 'https://nominatim.openstreetmap.org/search';
// Nominatim demande un User-Agent identifiable (politique d'usage), pas un
// user-agent HTTP generique.
const USER_AGENT = 'UrbanFlowMobility/1.0 (projet pedagogique RNCP)';
const LIMIT_RESULTATS = 5;
// La politique d'usage de Nominatim impose de mettre en cache et de ne pas
// repeter des requetes identiques : une adresse ne bouge pas, 24h est un TTL
// sur, largement superieur au rythme auquel elle pourrait changer.
const CACHE_TTL_SECONDES = 86_400;
// Biaise (sans filtrer strictement, bounded=0) les resultats vers
// l'agglomeration toulousaine : le produit est scope a Toulouse.
const VIEWBOX_TOULOUSE = '1.2,43.8,1.6,43.4';

/**
 * Geocodage texte -> coordonnees via Nominatim (OSM), en repli du service
 * places de l'API Tisseo (qui necessite une cle attribuee manuellement, non
 * disponible en developpement — voir docs/avancement.md Phase 6).
 */
@Injectable()
export class NominatimGeocodageService {
  private readonly logger = new Logger(NominatimGeocodageService.name);

  constructor(private readonly redis: RedisService) {}

  async rechercherAdresse(requete: string): Promise<LieuGeocode[]> {
    const cle = `geocodage:nominatim:${requete.trim().toLowerCase()}`;
    try {
      // interroger() jette en cas d'echec : getOrSet ne met alors rien en
      // cache, un echec transitoire de Nominatim n'est jamais fige 24h.
      return await this.redis.getOrSet(cle, CACHE_TTL_SECONDES, () =>
        this.interroger(requete),
      );
    } catch (error) {
      this.logger.warn(
        `Geocodage Nominatim echoue : ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async interroger(requete: string): Promise<LieuGeocode[]> {
    const url = new URL(NOMINATIM_URL);
    url.searchParams.set('q', requete);
    url.searchParams.set('format', 'jsonv2');
    url.searchParams.set('limit', String(LIMIT_RESULTATS));
    url.searchParams.set('countrycodes', 'fr');
    url.searchParams.set('viewbox', VIEWBOX_TOULOUSE);

    const response = await fetchWithTimeout(url.toString(), {
      timeoutMs: TIMEOUT_MS,
      headers: { 'User-Agent': USER_AGENT },
    });
    if (!response.ok) {
      throw new Error(`${NOMINATIM_URL} a repondu ${response.status}`);
    }
    const resultats = (await response.json()) as NominatimResultat[];
    return resultats.map((resultat) => ({
      label: resultat.display_name,
      position: {
        latitude: Number(resultat.lat),
        longitude: Number(resultat.lon),
      },
    }));
  }
}
