import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { YegoScooterProvider } from './yego-scooter.provider';

const DISCOVERY_URL = 'https://example.test/gbfs';
const STATUS_URL = 'https://example.test/free_bike_status';

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

describe('YegoScooterProvider', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('ne retient que les scooters ni reserves ni desactives', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn((url: string) => {
      if (url === DISCOVERY_URL) {
        return Promise.resolve(
          jsonResponse({
            data: {
              fr: { feeds: [{ name: 'free_bike_status', url: STATUS_URL }] },
            },
          }),
        );
      }
      if (url === STATUS_URL) {
        return Promise.resolve(
          jsonResponse({
            ttl: 240,
            data: {
              bikes: [
                {
                  bike_id: 'a',
                  lat: 43.6,
                  lon: 1.44,
                  is_reserved: false,
                  is_disabled: false,
                },
                {
                  bike_id: 'b',
                  lat: 43.5,
                  lon: 1.3,
                  is_reserved: true,
                  is_disabled: false,
                },
                {
                  bike_id: 'c',
                  lat: 43.5,
                  lon: 1.3,
                  is_reserved: false,
                  is_disabled: true,
                },
              ],
            },
          }),
        );
      }
      return Promise.reject(new Error(`URL inattendue : ${url}`));
    });

    const provider = new YegoScooterProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual([
      {
        id: 'a',
        mode: 'scooter',
        position: { latitude: 43.6, longitude: 1.44 },
        disponible: 1,
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      'gbfs:yego:disponibilites',
      JSON.stringify(result),
      'EX',
      240,
    );
  });

  it('transmet l’autonomie restante (current_range_meters) quand le flux la fournit', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn((url: string) => {
      if (url === DISCOVERY_URL) {
        return Promise.resolve(
          jsonResponse({
            data: {
              fr: { feeds: [{ name: 'free_bike_status', url: STATUS_URL }] },
            },
          }),
        );
      }
      if (url === STATUS_URL) {
        return Promise.resolve(
          jsonResponse({
            ttl: 240,
            data: {
              bikes: [
                {
                  bike_id: 'a',
                  lat: 43.6,
                  lon: 1.44,
                  is_reserved: false,
                  is_disabled: false,
                  current_range_meters: 41500,
                },
              ],
            },
          }),
        );
      }
      return Promise.reject(new Error(`URL inattendue : ${url}`));
    });

    const provider = new YegoScooterProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual([
      {
        id: 'a',
        mode: 'scooter',
        position: { latitude: 43.6, longitude: 1.44 },
        disponible: 1,
        autonomieMetres: 41500,
      },
    ]);
  });

  it('renvoie un tableau vide sans exception si le flux est indisponible', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const provider = new YegoScooterProvider(redis, buildConfig());
    const result = await provider.disponibilites();

    expect(result).toEqual([]);
  });
});
