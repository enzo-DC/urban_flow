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
});
