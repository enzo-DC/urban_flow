import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import {
  FournisseurMobilite,
  VehiculeDisponible,
} from '../fournisseur-mobilite.interface';
import { fetchWithTimeout } from '../http-client.util';
import {
  findFeedUrl,
  GbfsDiscoveryResponse,
  GbfsStationInformationResponse,
  GbfsStationStatusResponse,
} from './gbfs.types';
import { RedisService } from '../../redis/redis.service';

const TIMEOUT_MS = 4000;
const FALLBACK_TTL_SECONDS = 60;
const CACHE_KEY = 'gbfs:velotoulouse:disponibilites';

/**
 * VelôToulouse (GBFS, stations a quai — pas de free-floating).
 * Auto-discovery obligatoire : on ne code jamais en dur les URLs des
 * sous-flux, elles peuvent changer entre deux appels au flux racine.
 */
@Injectable()
export class VeloToulouseProvider implements FournisseurMobilite {
  readonly nom = 'VeloToulouse';

  private readonly logger = new Logger(VeloToulouseProvider.name);
  private readonly discoveryUrl: string;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.discoveryUrl = this.config.getOrThrow<string>('GBFS_VELOTOULOUSE_URL');
  }

  async disponibilites(): Promise<VehiculeDisponible[]> {
    const cached = await this.redis.client.get(CACHE_KEY);
    if (cached) {
      return JSON.parse(cached) as VehiculeDisponible[];
    }

    try {
      const { stations, ttlSeconds } = await this.fetchDisponibilites();
      await this.redis.client.set(
        CACHE_KEY,
        JSON.stringify(stations),
        'EX',
        ttlSeconds,
      );
      return stations;
    } catch (error) {
      // Degradation gracieuse : une source tierce cassee ne fait jamais
      // echouer la reponse globale, juste une liste vide pour cet operateur.
      this.logger.warn(
        `Flux GBFS ${this.nom} indisponible : ${(error as Error).message}`,
      );
      return [];
    }
  }

  private async fetchDisponibilites(): Promise<{
    stations: VehiculeDisponible[];
    ttlSeconds: number;
  }> {
    const discovery = await this.fetchJson<GbfsDiscoveryResponse>(
      this.discoveryUrl,
    );
    const statusUrl = findFeedUrl(discovery, 'station_status');
    const infoUrl = findFeedUrl(discovery, 'station_information');
    if (!statusUrl || !infoUrl) {
      throw new Error('flux station_status/station_information introuvable');
    }

    const [status, info] = await Promise.all([
      this.fetchJson<GbfsStationStatusResponse>(statusUrl),
      this.fetchJson<GbfsStationInformationResponse>(infoUrl),
    ]);

    const infoParStation = new Map(
      info.data.stations.map((station) => [station.station_id, station]),
    );

    const stations: VehiculeDisponible[] = [];
    for (const station of status.data.stations) {
      const details = infoParStation.get(station.station_id);
      if (!details) continue;
      stations.push({
        id: station.station_id,
        mode: 'velo',
        position: { latitude: details.lat, longitude: details.lon },
        disponible: station.num_bikes_available,
        nom: details.name,
        adresse: details.address,
        capacite: details.capacity,
      });
    }

    return { stations, ttlSeconds: status.ttl || FALLBACK_TTL_SECONDS };
  }

  private async fetchJson<T>(url: string): Promise<T> {
    const response = await fetchWithTimeout(url, { timeoutMs: TIMEOUT_MS });
    if (!response.ok) {
      throw new Error(`${url} a repondu ${response.status}`);
    }
    return (await response.json()) as T;
  }
}
