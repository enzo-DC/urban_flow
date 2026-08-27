import type { VehiculeDisponible } from '@urbanflow/shared';
import type { FournisseurMobilite } from '../integrations/fournisseur-mobilite.interface';
import type { PerturbationTrajet } from '../integrations/gtfs-rt/perturbation.interface';
import type { TisseoGtfsRtService } from '../integrations/gtfs-rt/tisseo-gtfs-rt.service';
import type { OtpClientService } from '../integrations/otp/otp-client.service';
import type { OtpItineraire } from '../integrations/otp/otp.types';
import type { RedisService } from '../redis/redis.service';
import type { RequeteItineraireDto } from './dto/requete-itineraire.dto';
import { ItinerairesService } from './itineraires.service';

const DEPART = { latitude: 43.6045, longitude: 1.4442 };
const ARRIVEE = { latitude: 43.6355, longitude: 1.3902 };

function otpItineraire(overrides: Partial<OtpItineraire> = {}): OtpItineraire {
  return {
    dureeSecondes: 600,
    legs: [
      {
        mode: 'marche',
        dureeSecondes: 600,
        distanceMetres: 800,
        depart: DEPART,
        arrivee: ARRIVEE,
      },
    ],
    ...overrides,
  };
}

function buildOtp(
  itineraires: OtpItineraire[] = [],
  fail = false,
): OtpClientService {
  return {
    planifier: jest.fn(() =>
      fail
        ? Promise.reject(new Error('otp down'))
        : Promise.resolve(itineraires),
    ),
  } as unknown as OtpClientService;
}

function buildGtfsRt(
  perturbations: PerturbationTrajet[] = [],
): TisseoGtfsRtService {
  return {
    getPerturbations: jest.fn().mockResolvedValue(perturbations),
  } as unknown as TisseoGtfsRtService;
}

function buildFournisseur(
  vehicules: VehiculeDisponible[],
): FournisseurMobilite {
  return {
    nom: 'test',
    disponibilites: jest.fn().mockResolvedValue(vehicules),
  };
}

function buildRedis(cached: string | null = null): RedisService {
  return {
    client: {
      get: jest.fn().mockResolvedValue(cached),
      set: jest.fn().mockResolvedValue('OK'),
    },
  } as unknown as RedisService;
}

const REQUETE: RequeteItineraireDto = { depart: DEPART, arrivee: ARRIVEE };

describe('ItinerairesService', () => {
  it('agrege OTP, calcule le CO2 par segment et met en cache le resultat', async () => {
    const otp = buildOtp([
      otpItineraire({
        dureeSecondes: 900,
        legs: [
          {
            mode: 'bus',
            dureeSecondes: 900,
            distanceMetres: 3000,
            depart: DEPART,
            arrivee: ARRIVEE,
          },
        ],
      }),
    ]);
    const gtfsRt = buildGtfsRt([]);
    const velo = buildFournisseur([
      { id: 'v1', mode: 'velo', position: DEPART, disponible: 4 },
    ]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [velo], redis);
    const reponse = await service.planifier(REQUETE);

    expect(reponse.itineraires).toHaveLength(1);
    expect(reponse.itineraires[0].dureeSecondes).toBe(900);
    expect(reponse.itineraires[0].co2Grammes).toBe(276); // bus 92g/km * 3km
    expect(reponse.itineraires[0].segments[0].co2Grammes).toBe(276);
    expect(reponse.disponibilites).toEqual([
      { id: 'v1', mode: 'velo', position: DEPART, disponible: 4 },
    ]);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).toHaveBeenCalledWith(
      expect.stringContaining(
        'itineraires:standard:43.6045,1.4442:43.6355,1.3902',
      ),
      expect.any(String),
      'EX',
      60,
    );
  });

  it('transmet accessible a OTP et isole son cache de la recherche standard', async () => {
    const otp = buildOtp([otpItineraire()]);
    const gtfsRt = buildGtfsRt([]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [], redis);
    await service.planifier({ ...REQUETE, accessible: true });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(otp.planifier).toHaveBeenCalledWith(DEPART, ARRIVEE, true);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.get).toHaveBeenCalledWith(
      expect.stringContaining('itineraires:pmr:'),
    );
  });

  it('sert le cache sans appeler les sources externes si une entree est presente', async () => {
    const reponseCachee = {
      itineraires: [
        {
          id: 'cached',
          depart: DEPART,
          arrivee: ARRIVEE,
          segments: [],
          dureeSecondes: 100,
          co2Grammes: 0,
        },
      ],
      disponibilites: [],
    };
    const redis = buildRedis(JSON.stringify(reponseCachee));
    const otp = buildOtp([otpItineraire()]);
    const gtfsRt = buildGtfsRt([]);

    const service = new ItinerairesService(otp, gtfsRt, [], redis);
    const reponse = await service.planifier(REQUETE);

    expect(reponse.itineraires[0].id).toBe('cached');
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(otp.planifier).not.toHaveBeenCalled();
  });

  it('degradation gracieuse : OTP en echec ne fait pas planter la reponse et rend quand meme les disponibilites', async () => {
    const otp = buildOtp([], true);
    const gtfsRt = buildGtfsRt([]);
    const velo = buildFournisseur([
      { id: 'v1', mode: 'velo', position: DEPART, disponible: 2 },
    ]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [velo], redis);
    const reponse = await service.planifier(REQUETE);

    expect(reponse.itineraires).toEqual([]);
    expect(reponse.disponibilites).toHaveLength(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(redis.client.set).not.toHaveBeenCalled();
  });

  it('exclut les itineraires dont un segment de transport en commun est annule', async () => {
    const otp = buildOtp([
      otpItineraire({
        legs: [
          {
            mode: 'metro',
            dureeSecondes: 300,
            distanceMetres: 2000,
            depart: DEPART,
            arrivee: ARRIVEE,
            ligneId: 'line:61',
            voyageId: '123',
          },
        ],
      }),
    ]);
    const gtfsRt = buildGtfsRt([
      { tripId: '123', routeId: 'line:61', statut: 'ANNULE' },
    ]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [], redis);
    const reponse = await service.planifier(REQUETE);

    expect(reponse.itineraires).toEqual([]);
  });

  it('filtre les itineraires utilisant un mode non autorise', async () => {
    const otp = buildOtp([
      otpItineraire({
        legs: [
          {
            mode: 'voiture',
            dureeSecondes: 400,
            distanceMetres: 5000,
            depart: DEPART,
            arrivee: ARRIVEE,
          },
        ],
      }),
      otpItineraire({
        legs: [
          {
            mode: 'marche',
            dureeSecondes: 600,
            distanceMetres: 800,
            depart: DEPART,
            arrivee: ARRIVEE,
          },
        ],
      }),
    ]);
    const gtfsRt = buildGtfsRt([]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [], redis);
    const reponse = await service.planifier({
      ...REQUETE,
      modesAutorises: ['marche'],
    });

    expect(reponse.itineraires).toHaveLength(1);
    expect(reponse.itineraires[0].segments[0].mode).toBe('marche');
  });

  it('trie par co2Grammes croissant quand critereTri = co2', async () => {
    const otp = buildOtp([
      otpItineraire({
        dureeSecondes: 100,
        legs: [
          {
            mode: 'voiture',
            dureeSecondes: 100,
            distanceMetres: 5000,
            depart: DEPART,
            arrivee: ARRIVEE,
          },
        ],
      }),
      otpItineraire({
        dureeSecondes: 900,
        legs: [
          {
            mode: 'marche',
            dureeSecondes: 900,
            distanceMetres: 800,
            depart: DEPART,
            arrivee: ARRIVEE,
          },
        ],
      }),
    ]);
    const gtfsRt = buildGtfsRt([]);
    const redis = buildRedis(null);

    const service = new ItinerairesService(otp, gtfsRt, [], redis);
    const reponse = await service.planifier({
      ...REQUETE,
      critereTri: 'co2',
    });

    expect(reponse.itineraires[0].segments[0].mode).toBe('marche');
    expect(reponse.itineraires[1].segments[0].mode).toBe('voiture');
  });
});
