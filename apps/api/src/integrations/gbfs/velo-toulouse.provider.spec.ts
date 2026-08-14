import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { VeloToulouseProvider } from './velo-toulouse.provider';

const DISCOVERY_URL = 'https://example.test/gbfs.json';
const STATUS_URL = 'https://example.test/station_status.json';
const INFO_URL = 'https://example.test/station_information.json';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildConfig(): ConfigService {
  return {
    getOrThrow: () => DISCOVERY_URL,
  } as unknown as ConfigService;
}

function buildRedis(cached: string | null = null): RedisService {
  return {
    client: {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue('OK'),
    },
  } as unknown as RedisService;
}

describe('VeloToulouseProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('assemble les stations a partir des flux GBFS et les met en cache avec le ttl du flux', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn((url: string) => {
      if (url === DISCOVERY_URL) {
        return Promise.resolve(
          jsonResponse({
            data: {
              fr: {
                feeds: [
                  { name: 'station_information', url: INFO_URL },
                  { name: 'station_status', url: STATUS_URL },
                ],
              },
            },
          }),
        );
      }
      if (url === INFO_URL) {
        return Promise.resolve(
          jsonResponse({
            data: { stations: [{ station_id: '1', lat: 43.6, lon: 1.44 }] },
          }),
        );
      }
      if (url === STATUS_URL) {
        return Promise.resolve(
          jsonResponse({
            ttl: 45,
            data: { stations: [{ station_id: '1', num_bikes_available: 5 }] },
          }),
        );
      }
      return Promise.reject(new Error(`URL inattendue : ${url}`));
    });

    const provider = new VeloToulouseProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual([
      {
        id: '1',
        mode: 'velo',
        position: { latitude: 43.6, longitude: 1.44 },
        disponible: 5,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      'gbfs:velotoulouse:disponibilites',
      JSON.stringify(result),
      'EX',
      45,
    );
  });

  it('sert le cache sans appeler les flux si une entree est presente', async () => {
    const cachedStations = [
      {
        id: '2',
        mode: 'velo',
        position: { latitude: 1, longitude: 1 },
        disponible: 3,
      },
    ];
    const redis = buildRedis(JSON.stringify(cachedStations));
    global.fetch = jest.fn();

    const provider = new VeloToulouseProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual(cachedStations);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renvoie un tableau vide sans exception si le flux est indisponible', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const provider = new VeloToulouseProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual([]);
  });
});
