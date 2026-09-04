import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FournisseurMobilite,
  VehiculeDisponible,
} from '../fournisseur-mobilite.interface';
import {
  findFeedUrl,
  GbfsDiscoveryResponse,
  GbfsFreeVehicleStatusResponse,
} from '../gbfs/gbfs.types';
import { fetchWithTimeout } from '../http-client.util';
import { RedisService } from '../../redis/redis.service';

const TIMEOUT_MS = 4000;
const FALLBACK_TTL_SECONDS = 60;
const CACHE_KEY = 'gbfs:yego:disponibilites';

/**
 * YEGO (scooters electriques en libre-service, free-floating — pas de
 * stations). Deuxieme implementation de FournisseurMobilite : la forme du
 * flux differe totalement de VelôToulouse (free_bike_status vs
 * station_status + station_information), et pourtant aucun changement au
 * coeur (interface, module, cache) n'a ete necessaire pour l'accueillir.
 */
@Injectable()
export class YegoScooterProvider implements FournisseurMobilite {
  readonly nom = 'Yego';

  private readonly logger = new Logger(YegoScooterProvider.name);
  private readonly discoveryUrl: string;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.discoveryUrl = this.config.getOrThrow<string>('GBFS_YEGO_URL');
  }

  async disponibilites(): Promise<VehiculeDisponible[]> {
    const cached = await this.redis.client.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as VehiculeDisponible[];
    }

    try {
      const { vehicules, ttlSeconds } = await this.fetchDisponibilites();
      await this.redis.client.set(
        CACHE_KEY,
        JSON.stringify(vehicules),
        'EX',
        ttlSeconds,
      );
      return vehicules;
    } catch (error) {
      this.logger.warn(
        `Flux GBFS ${this.nom} indisponible : ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async fetchDisponibilites(): Promise<{
    vehicules: VehiculeDisponible[];
    ttlSeconds: number;
  }> {
    const discovery = await this.fetchJson<GbfsDiscoveryResponse>(
      this.discoveryUrl,
    );
    const statusUrl = findFeedUrl(discovery, 'free_bike_status');
    if (!statusUrl) {
      throw new Error('flux free_bike_status introuvable');
    }

    const status =
      await this.fetchJson<GbfsFreeVehicleStatusResponse>(statusUrl);

    const vehicules: VehiculeDisponible[] = status.data.bikes
      .filter((bike) => !bike.is_reserved && !bike.is_disabled)
      .map((bike) => ({
        id: bike.bike_id,
        mode: 'scooter',
        position: { latitude: bike.lat, longitude: bike.lon },
        disponible: 1,
        autonomieMetres: bike.current_range_meters,
      }));

    return { vehicules, ttlSeconds: status.ttl || FALLBACK_TTL_SECONDS };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetchWithTimeout(url, { timeoutMs: TIMEOUT_MS });
    if (!response.ok) {
      throw new Error(`${url} a repondu ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
