import { RedisService } from '../../redis/redis.service';
import { NominatimGeocodageService } from './nominatim-geocodage.service';

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
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

describe('NominatimGeocodageService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('convertit les resultats Nominatim en LieuGeocode et met en cache', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn((url: string) => {
      expect(url).toContain('nominatim.openstreetmap.org/search');
      expect(url).toContain('q=Place+du+Capitole');
      return Promise.resolve(
        jsonResponse([
          {
            display_name: 'Place du Capitole, Toulouse, France',
            lat: '43.6043987',
            lon: '1.4433516',
          },
        ]),
      );
    });

    const service = new NominatimGeocodageService(redis);
    const result = await service.rechercherAdresse('Place du Capitole');

    expect(result).toEqual([
      {
        label: 'Place du Capitole, Toulouse, France',
        position: { latitude: 43.6043987, longitude: 1.4433516 },
      },
    ]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      'geocodage:nominatim:place du capitole',
      JSON.stringify(result),
      'EX',
      86_400,
    );
  });

  it('sert le cache sans appeler Nominatim si une entree est presente', async () => {
    const cached = [
      { label: 'Adresse en cache', position: { latitude: 1, longitude: 1 } },
    ];
    const redis = buildRedis(JSON.stringify(cached));
    global.fetch = jest.fn();

    const service = new NominatimGeocodageService(redis);
    const result = await service.rechercherAdresse('adresse en cache');

    expect(result).toEqual(cached);
    expect(global.fetch).not.toHaveBeenCalled();
  });

  it('renvoie un tableau vide sans mettre en cache si Nominatim est indisponible', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const service = new NominatimGeocodageService(redis);
    const result = await service.rechercherAdresse('adresse inexistante');

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('renvoie un tableau vide sans mettre en cache si Nominatim repond un statut en erreur', async () => {
    const redis = buildRedis(null);
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 503));

    const service = new NominatimGeocodageService(redis);
    const result = await service.rechercherAdresse('adresse inexistante');

    expect(result).toEqual([]);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });
});
