import { ConfigService } from '@nestjs/config';
import { transit_realtime } from 'gtfs-realtime-bindings';
import { RedisService } from '../../redis/redis.service';
import { TisseoGtfsRtService } from './tisseo-gtfs-rt.service';

const FEED_URL = 'https://example.test/GtfsRt.pb';
const CACHE_KEY = 'gtfs-rt:tisseo:perturbations';

function pbResponse(
  entities: transit_realtime.IFeedEntity[],
  status = 200,
): Response {
  const feed = transit_realtime.FeedMessage.encode({
    header: { gtfsRealtimeVersion: '2.0' },
    entity: entities,
  }).finish();
  return new Response(feed, { status });
}

function buildConfig(): ConfigService {
  return {
    getOrThrow: () => FEED_URL,
  } as unknown as ConfigService;
}

function buildRedis(): RedisService {
  return {
    client: {
      get: jest.fn().mockResolvedValue(null),
      set: jest.fn().mockResolvedValue('OK'),
    },
  } as unknown as RedisService;
}

describe('TisseoGtfsRtService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('detecte un trajet annule', async () => {
    const redis = buildRedis();
    global.fetch = jest.fn().mockResolvedValue(
      pbResponse([
        {
          id: 'e1',
          tripUpdate: {
            trip: {
              tripId: 'trip-1',
              routeId: 'route-1',
              scheduleRelationship: 3,
            },
          },
        },
      ]),
    );

    const service = new TisseoGtfsRtService(redis, buildConfig());
    await service.rafraichir();

    const expected = [
      { tripId: 'trip-1', routeId: 'route-1', statut: 'ANNULE' },
    ];
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      CACHE_KEY,
      JSON.stringify(expected),
      'EX',
      120,
    );
  });

  it('detecte un trajet ajoute', async () => {
    const redis = buildRedis();
    global.fetch = jest.fn().mockResolvedValue(
      pbResponse([
        {
          id: 'e2',
          tripUpdate: {
            trip: { tripId: 'trip-2', scheduleRelationship: 1 },
          },
        },
      ]),
    );

    const service = new TisseoGtfsRtService(redis, buildConfig());
    await service.rafraichir();

    const expected = [{ tripId: 'trip-2', statut: 'AJOUTE' }];
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      CACHE_KEY,
      JSON.stringify(expected),
      'EX',
      120,
    );
  });

  it('signale un retard au dela du seuil de 120s', async () => {
    const redis = buildRedis();
    global.fetch = jest.fn().mockResolvedValue(
      pbResponse([
        {
          id: 'e3',
          tripUpdate: {
            trip: { tripId: 'trip-3' },
            stopTimeUpdate: [{ departure: { delay: 180 } }],
          },
        },
      ]),
    );

    const service = new TisseoGtfsRtService(redis, buildConfig());
    await service.rafraichir();

    const expected = [
      { tripId: 'trip-3', statut: 'RETARDE', retardSecondes: 180 },
    ];
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      CACHE_KEY,
      JSON.stringify(expected),
      'EX',
      120,
    );
  });

  it('ignore un retard sous le seuil de 120s', async () => {
    const redis = buildRedis();
    global.fetch = jest.fn().mockResolvedValue(
      pbResponse([
        {
          id: 'e4',
          tripUpdate: {
            trip: { tripId: 'trip-4' },
            stopTimeUpdate: [{ departure: { delay: 60 } }],
          },
        },
      ]),
    );

    const service = new TisseoGtfsRtService(redis, buildConfig());
    await service.rafraichir();

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(CACHE_KEY, '[]', 'EX', 120);
  });

  it('degrade gracieusement (ne jette pas, garde le cache existant) si le flux echoue', async () => {
    const redis = buildRedis();
    global.fetch = jest.fn().mockRejectedValue(new Error('502 Bad Gateway'));

    const service = new TisseoGtfsRtService(redis, buildConfig());
    await expect(service.rafraichir()).resolves.toBeUndefined();

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('getPerturbations lit uniquement le cache, sans declencher de fetch', async () => {
    const cached = [{ tripId: 'trip-5', statut: 'ANNULE' }];
    const redis = {
      client: {
        get: jest.fn().mockResolvedValue(JSON.stringify(cached)),
        set: jest.fn(),
      },
    } as unknown as RedisService;
    global.fetch = jest.fn();

    const service = new TisseoGtfsRtService(redis, buildConfig());
    const result = await service.getPerturbations();

    expect(result).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });
});
