import { ConfigService } from '@nestjs/config';
import { RedisService } from '../../redis/redis.service';
import { TisseoGeocodageService } from './tisseo-geocodage.service';

const API_KEY = 'test-key';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildConfig(): ConfigService {
  return {
    getOrThrow: () => API_KEY,
  } as unknown as ConfigService;
}

function buildRedis(cached: string | null = null): RedisService {
  const redis = {
    client: {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue('OK'),
    },
  };
  return {
    ...redis,
    async getOrSet<T>(
      key: string,
      ttl: number,
      loader: () => Promise<T>,
    ): Promise<T> {
      const existing = (await redis.client.get(key)) as string | null;
      if (existing !== null) return JSON.parse(existing) as T;
      const value = await loader();
      await redis.client.set(key, JSON.stringify(value), 'EX', ttl);
      return value;
    },
  } as unknown as RedisService;
}

describe('TisseoGeocodageService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('convertit les resultats Tisseo (x/y) en LieuGeocode et met en cache', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn((url: string) => {
      expect(url).toContain('api.tisseo.fr/v2/places.json');
      expect(url).toContain('term=Place+du+Capitole');
      expect(url).toContain(`key=${API_KEY}`);
      return Promise.resolve(
        jsonResponse({
          placesList: {
            place: [
              {
                label: 'Place du Capitole (Toulouse)',
                x: '1.4433',
                y: '43.6044',
              },
            ],
          },
        }),
      );
    });

    const service = new TisseoGeocodageService(redis, buildConfig());
    const result = await service.rechercherAdresse('Place du Capitole');

    expect(result).toEqual([
      {
        label: 'Place du Capitole (Toulouse)',
        position: { latitude: 43.6044, longitude: 1.4433 },
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      'geocodage:tisseo:place du capitole',
      JSON.stringify(result),
      'EX',
      86_400,
    );
  });

  it('traite un 404 comme une absence de resultats, pas un echec (piege verifie en reel)', async () => {
    const redis = buildRedis(null);
    global.fetch = jest
      .fn()
      .mockResolvedValue(jsonResponse({ placesList: { place: [] } }, 404));

    const service = new TisseoGeocodageService(redis, buildConfig());
    const result = await service.rechercherAdresse('termeIntrouvable');

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      'geocodage:tisseo:termeintrouvable',
      '[]',
      'EX',
      86_400,
    );
  });

  it('sert le cache sans appeler Tisseo si une entree est presente', async () => {
    const cached = [
      { label: 'Adresse en cache', position: { latitude: 1, longitude: 1 } },
    ];
    const redis = buildRedis(JSON.stringify(cached));
    global.fetch = jest.fn();

    const service = new TisseoGeocodageService(redis, buildConfig());
    const result = await service.rechercherAdresse('adresse en cache');

    expect(result).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renvoie un tableau vide sans mettre en cache si la cle est refusee (403)', async () => {
    const redis = buildRedis(null);
    global.fetch = jest
      .fn()
      .mockResolvedValue(new Response('"FORBIDDEN ACCESS"', { status: 403 }));

    const service = new TisseoGeocodageService(redis, buildConfig());
    const result = await service.rechercherAdresse('Place du Capitole');

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('renvoie un tableau vide sans mettre en cache si le flux est indisponible', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const service = new TisseoGeocodageService(redis, buildConfig());
    const result = await service.rechercherAdresse('Place du Capitole');

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });
});
