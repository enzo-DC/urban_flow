import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Interval } from '@nestjs/schedule';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { RedisService } from '../../redis/redis.service';
import { fetchWithTimeout } from '../http-client.util';
import { PerturbationTrajet } from './perturbation.interface';

const { ScheduleRelationship } = transit_realtime.TripDescriptor;

const TIMEOUT_MS = 5000;
// Dans la fourchette 30-60s imposee par le projet pour le rafraichissement GTFS-RT.
const REFRESH_INTERVAL_MS = 45_000;
const CACHE_KEY = 'gtfs-rt:tisseo:perturbations';
// > REFRESH_INTERVAL_MS : un cycle de rafraichissement rate ne vide pas le cache.
const CACHE_TTL_SECONDS = 120;
// En dessous de ce seuil, le retard n'est pas assez significatif pour alerter.
const RETARD_SEUIL_SECONDES = 120;

/**
 * Decode le flux GTFS-RT Tisseo (Protocol Buffers, pas du JSON) et expose les
 * perturbations (annulations, ajouts, retards significatifs) via un cache
 * rafraichi par une tache planifiee — jamais a la demande, contrairement aux
 * fournisseurs GBFS : le flux n'annonce pas son propre TTL, on impose le
 * notre.
 */
@Injectable()
export class TisseoGtfsRtService implements OnModuleInit {
  private readonly logger = new Logger(TisseoGtfsRtService.name);
  private readonly feedUrl: string;

  constructor(
    private readonly redis: RedisService,
    private readonly config: ConfigService,
  ) {
    this.feedUrl = this.config.getOrThrow<string>('TISSEO_GTFS_RT_URL');
  }

  async onModuleInit(): Promise<void> {
    await this.rafraichir();
  }

  @Interval(REFRESH_INTERVAL_MS)
  async rafraichir(): Promise<void> {
    try {
      const perturbations = await this.fetchPerturbations();
      await this.redis.client.set(
        CACHE_KEY,
        JSON.stringify(perturbations),
        'EX',
        CACHE_TTL_SECONDS,
      );
      this.logger.log(
        `GTFS-RT Tisseo rafraichi : ${perturbations.length} perturbation(s).`,
      );
    } catch (error) {
      // Degradation gracieuse : on garde la derniere version en cache (TTL
      // glissant) plutot que d'ecraser par un etat vide a chaque echec —
      // observe en pratique, ce flux beta repond parfois 502.
      this.logger.warn(
        `Rafraichissement GTFS-RT Tisseo echoue : ${(error as Error).message}`,
      );
    }
  }

  async getPerturbations(): Promise<PerturbationTrajet[]> {
    const cached = await this.redis.client.get(CACHE_KEY);
    return cached ? (JSON.parse(cached) as PerturbationTrajet[]) : [];
  }

  private async fetchPerturbations(): Promise<PerturbationTrajet[]> {
    const response = await fetchWithTimeout(this.feedUrl, {
      timeoutMs: TIMEOUT_MS,
    });
    if (!response.ok) {
      throw new Error(`${this.feedUrl} a repondu ${response.status}`);
    }
    const buffer = Buffer.from(await response.arrayBuffer());
    const feed = transit_realtime.FeedMessage.decode(buffer);

    const perturbations: PerturbationTrajet[] = [];
    for (const entity of feed.entity) {
      const perturbation = this.toPerturbation(entity);
      if (perturbation) perturbations.push(perturbation);
    }
    return perturbations;
  }

  private toPerturbation(
    entity: transit_realtime.IFeedEntity,
  ): PerturbationTrajet | null {
    const tripUpdate = entity.tripUpdate;
    if (!tripUpdate?.trip) return null;

    // protobuf.js renvoie "" (pas undefined) pour un champ string optionnel
    // absent du message decode : || est necessaire, ?? ne suffit pas.
    const tripId = tripUpdate.trip.tripId || entity.id;
    const routeId = tripUpdate.trip.routeId || undefined;

    if (
      tripUpdate.trip.scheduleRelationship === ScheduleRelationship.CANCELED
    ) {
      return { tripId, routeId, statut: 'ANNULE' };
    }
    if (tripUpdate.trip.scheduleRelationship === ScheduleRelationship.ADDED) {
      return { tripId, routeId, statut: 'AJOUTE' };
    }

    const retardSecondes = this.retardMaximal(tripUpdate.stopTimeUpdate);
    if (
      retardSecondes !== null &&
      Math.abs(retardSecondes) >= RETARD_SEUIL_SECONDES
    ) {
      return { tripId, routeId, statut: 'RETARDE', retardSecondes };
    }

    return null;
  }

  private retardMaximal(
    stopTimeUpdates:
      transit_realtime.TripUpdate.IStopTimeUpdate[] | null | undefined,
  ): number | null {
    if (!stopTimeUpdates?.length) return null;
    const dernier = stopTimeUpdates[stopTimeUpdates.length - 1];
    return dernier.departure?.delay ?? dernier.arrival?.delay ?? null;
  }
}
