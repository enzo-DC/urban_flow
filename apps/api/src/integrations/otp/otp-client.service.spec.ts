import { ConfigService } from '@nestjs/config';
import { OtpClientService } from './otp-client.service';

const OTP_URL = 'https://example.test/otp/routers/default';
const GRAPHQL_URL = `${OTP_URL}/index/graphql`;

function jsonResponse(body: unknown, status = 200): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}

function buildConfig(): ConfigService {
  return {
    getOrThrow: () => OTP_URL,
  } as unknown as ConfigService;
}

describe('OtpClientService', () => {
  const originalFetch = global.fetch;

  afterEach(() => {
    global.fetch = originalFetch;
    jest.restoreAllMocks();
  });

  it('convertit les edges planConnection en itineraires avec le mode traduit', async () => {
    global.fetch = jest.fn((url: string) => {
      expect(url).toBe(GRAPHQL_URL);
      return Promise.resolve(
        jsonResponse({
          data: {
            planConnection: {
              edges: [
                {
                  node: {
                    duration: 325,
                    legs: [
                      {
                        mode: 'WALK',
                        duration: 100,
                        distance: 150.5,
                        from: { lat: 43.6045, lon: 1.4442 },
                        to: { lat: 43.6045057, lon: 1.4455115 },
                      },
                      {
                        mode: 'SUBWAY',
                        duration: 225,
                        distance: 2876.26,
                        from: { lat: 43.6045057, lon: 1.4455115 },
                        to: { lat: 43.5932124, lon: 1.4192796 },
                      },
                    ],
                  },
                },
              ],
            },
          },
        }),
      );
    });

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 43.6045, longitude: 1.4442 },
      { latitude: 43.5932124, longitude: 1.4192796 },
    );

    expect(result).toEqual([
      {
        dureeSecondes: 325,
        legs: [
          {
            mode: 'marche',
            dureeSecondes: 100,
            distanceMetres: 150.5,
            depart: { latitude: 43.6045, longitude: 1.4442 },
            arrivee: { latitude: 43.6045057, longitude: 1.4455115 },
          },
          {
            mode: 'metro',
            dureeSecondes: 225,
            distanceMetres: 2876.26,
            depart: { latitude: 43.6045057, longitude: 1.4455115 },
            arrivee: { latitude: 43.5932124, longitude: 1.4192796 },
          },
        ],
      },
    ]);
  });

  it('transmet le nom des points de depart/arrivee de chaque segment (affichage du detail d’itineraire)', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          planConnection: {
            edges: [
              {
                node: {
                  duration: 225,
                  legs: [
                    {
                      mode: 'SUBWAY',
                      duration: 225,
                      distance: 2876.26,
                      from: {
                        lat: 43.6045057,
                        lon: 1.4455115,
                        name: 'Capitole',
                      },
                      to: {
                        lat: 43.5932124,
                        lon: 1.4192796,
                        name: 'Basso Cambo',
                      },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 43.6045057, longitude: 1.4455115 },
      { latitude: 43.5932124, longitude: 1.4192796 },
    );

    expect(result[0].legs[0].departNom).toBe('Capitole');
    expect(result[0].legs[0].arriveeNom).toBe('Basso Cambo');
  });

  it('transmet preferences.accessibility.wheelchair.enabled selon le parametre accessible', async () => {
    let corpsRecu: { variables: { preferences: unknown } } | undefined;
    global.fetch = jest.fn((_url: string, init: RequestInit) => {
      corpsRecu = JSON.parse(init.body as string) as typeof corpsRecu;
      return Promise.resolve(
        jsonResponse({ data: { planConnection: { edges: [] } } }),
      );
    });

    const client = new OtpClientService(buildConfig());
    await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
      true,
    );

    expect(corpsRecu?.variables.preferences).toEqual({
      accessibility: { wheelchair: { enabled: true } },
    });
  });

  it('retire le prefixe de feed OTP des identifiants de ligne et de voyage', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          planConnection: {
            edges: [
              {
                node: {
                  duration: 325,
                  legs: [
                    {
                      mode: 'SUBWAY',
                      duration: 325,
                      distance: 2876.26,
                      from: { lat: 0, lon: 0 },
                      to: { lat: 0, lon: 0 },
                      route: { gtfsId: '1:line:61' },
                      trip: { gtfsId: '1:2349722' },
                      legGeometry: null,
                    },
                    {
                      mode: 'WALK',
                      duration: 60,
                      distance: 50,
                      from: { lat: 0, lon: 0 },
                      to: { lat: 0, lon: 0 },
                      route: null,
                      trip: null,
                      legGeometry: null,
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result[0].legs[0].ligneId).toBe('line:61');
    expect(result[0].legs[0].voyageId).toBe('2349722');
    expect(result[0].legs[1].ligneId).toBeUndefined();
    expect(result[0].legs[1].voyageId).toBeUndefined();
  });

  it('recupere la trace (polyline encodee) de legGeometry pour affichage carte', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          planConnection: {
            edges: [
              {
                node: {
                  duration: 100,
                  legs: [
                    {
                      mode: 'WALK',
                      duration: 100,
                      distance: 150,
                      from: { lat: 0, lon: 0 },
                      to: { lat: 0, lon: 0 },
                      route: null,
                      trip: null,
                      legGeometry: { points: 'cociGgayGBe@Ac@AK' },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result[0].legs[0].trace).toBe('cociGgayGBe@Ac@AK');
  });

  it('retombe sur le mode bus pour un mode OTP sans equivalent direct', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        data: {
          planConnection: {
            edges: [
              {
                node: {
                  duration: 60,
                  legs: [
                    {
                      mode: 'FERRY',
                      duration: 60,
                      distance: 500,
                      from: { lat: 0, lon: 0 },
                      to: { lat: 0, lon: 0 },
                    },
                  ],
                },
              },
            ],
          },
        },
      }),
    );

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result[0].legs[0].mode).toBe('bus');
  });

  it('renvoie un tableau vide sans exception si OTP repond une erreur GraphQL', async () => {
    global.fetch = jest.fn().mockResolvedValue(
      jsonResponse({
        errors: [{ message: 'origin not found' }],
      }),
    );

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result).toEqual([]);
  });

  it('renvoie un tableau vide sans exception si OTP est indisponible', async () => {
    global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result).toEqual([]);
  });

  it('renvoie un tableau vide sans exception si OTP repond un statut HTTP en erreur', async () => {
    global.fetch = jest.fn().mockResolvedValue(jsonResponse({}, 502));

    const client = new OtpClientService(buildConfig());
    const result = await client.planifier(
      { latitude: 0, longitude: 0 },
      { latitude: 0, longitude: 0 },
    );

    expect(result).toEqual([]);
  });

  describe('arretsDansZone', () => {
    it('convertit les arrets OTP (gtfsId complet, mode traduit)', async () => {
      global.fetch = jest.fn((url: string) => {
        expect(url).toBe(GRAPHQL_URL);
        return Promise.resolve(
          jsonResponse({
            data: {
              stopsByBbox: [
                {
                  gtfsId: '1:stop_point:SP_1595',
                  name: 'Concorde',
                  lat: 43.6103122,
                  lon: 1.4436469,
                  vehicleMode: 'BUS',
                },
                {
                  gtfsId: '1:stop_point:SP_2676',
                  name: "Jeanne d'Arc",
                  lat: 43.6091267,
                  lon: 1.4457313,
                  vehicleMode: 'SUBWAY',
                },
              ],
            },
          }),
        );
      });

      const client = new OtpClientService(buildConfig());
      const result = await client.arretsDansZone(43.6, 1.44, 43.62, 1.45);

      expect(result).toEqual([
        {
          id: '1:stop_point:SP_1595',
          nom: 'Concorde',
          position: { latitude: 43.6103122, longitude: 1.4436469 },
          mode: 'bus',
        },
        {
          id: '1:stop_point:SP_2676',
          nom: "Jeanne d'Arc",
          position: { latitude: 43.6091267, longitude: 1.4457313 },
          mode: 'metro',
        },
      ]);
    });

    it('plafonne le nombre d’arrets renvoyes (carte lisible a un zoom large)', async () => {
      const stops = Array.from({ length: 250 }, (_, i) => ({
        gtfsId: `1:stop_point:SP_${i}`,
        name: `Arret ${i}`,
        lat: 43.6,
        lon: 1.44,
        vehicleMode: 'BUS',
      }));
      global.fetch = jest
        .fn()
        .mockResolvedValue(jsonResponse({ data: { stopsByBbox: stops } }));

      const client = new OtpClientService(buildConfig());
      const result = await client.arretsDansZone(43.5, 1.4, 43.7, 1.5);

      expect(result).toHaveLength(200);
    });

    it('renvoie un tableau vide sans exception si OTP est indisponible', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      const client = new OtpClientService(buildConfig());
      const result = await client.arretsDansZone(0, 0, 0, 0);

      expect(result).toEqual([]);
    });
  });

  describe('prochainsPassages', () => {
    const maintenant = 1_788_537_709; // epoch seconde fixe pour un calcul de dansMinutes deterministe.

    beforeEach(() => {
      jest.spyOn(Date, 'now').mockReturnValue(maintenant * 1000);
    });

    it('convertit les horaires theoriques OTP (ligne, destination, minutes, mode, voyageId)', async () => {
      global.fetch = jest.fn((url: string) => {
        expect(url).toBe(GRAPHQL_URL);
        return Promise.resolve(
          jsonResponse({
            data: {
              stop: {
                stoptimesWithoutPatterns: [
                  {
                    // Dans 4 min (240s) par rapport a `maintenant`.
                    serviceDay: maintenant - 100,
                    realtimeDeparture: 340,
                    headsign: 'Basso Cambo',
                    trip: {
                      gtfsId: '1:2349722',
                      route: { shortName: 'A', mode: 'SUBWAY' },
                    },
                  },
                ],
              },
            },
          }),
        );
      });

      const client = new OtpClientService(buildConfig());
      const result = await client.prochainsPassages('1:stop_point:SP_1912');

      expect(result).toEqual([
        {
          ligne: 'A',
          destination: 'Basso Cambo',
          mode: 'metro',
          dansMinutes: 4,
          voyageId: '2349722',
        },
      ]);
    });

    it('ignore les horaires sans route associee', async () => {
      global.fetch = jest.fn().mockResolvedValue(
        jsonResponse({
          data: {
            stop: {
              stoptimesWithoutPatterns: [
                {
                  serviceDay: maintenant,
                  realtimeDeparture: 0,
                  headsign: null,
                  trip: { gtfsId: '1:x', route: null },
                },
              ],
            },
          },
        }),
      );

      const client = new OtpClientService(buildConfig());
      const result = await client.prochainsPassages('1:stop_point:SP_1912');

      expect(result).toEqual([]);
    });

    it('renvoie un tableau vide sans exception si l’arret est introuvable', async () => {
      global.fetch = jest
        .fn()
        .mockResolvedValue(jsonResponse({ data: { stop: null } }));

      const client = new OtpClientService(buildConfig());
      const result = await client.prochainsPassages('id-inconnu');

      expect(result).toEqual([]);
    });

    it('renvoie un tableau vide sans exception si OTP est indisponible', async () => {
      global.fetch = jest.fn().mockRejectedValue(new Error('network down'));

      const client = new OtpClientService(buildConfig());
      const result = await client.prochainsPassages('1:stop_point:SP_1912');

      expect(result).toEqual([]);
    });
  });
});
