import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '../prisma/prisma.service';
import type { EnregistrerTrajetDto } from './dto/enregistrer-trajet.dto';
import { TRAJET_EFFECTUE_EVENT } from './events/trajet-effectue.event';
import { TrajetsService } from './trajets.service';

const DEPART = { latitude: 43.6045, longitude: 1.4442 };
const ARRIVEE = { latitude: 43.6355, longitude: 1.3902 };

function buildPrisma(): PrismaService {
  return {
    creerItineraireEffectue: jest.fn().mockResolvedValue('itineraire-1'),
    trajet: {
      create: jest.fn().mockResolvedValue({
        id: 'trajet-1',
        effectueLe: new Date('2026-08-20T10:00:00.000Z'),
      }),
    },
    operateur: {
      upsert: jest.fn().mockResolvedValue({ id: 'operateur-1' }),
    },
  } as unknown as PrismaService;
}

function buildEventEmitter(): EventEmitter2 {
  return { emit: jest.fn() } as unknown as EventEmitter2;
}

const DTO_MARCHE_BUS: EnregistrerTrajetDto = {
  depart: DEPART,
  arrivee: ARRIVEE,
  segments: [
    {
      mode: 'marche',
      depart: DEPART,
      arrivee: DEPART,
      distanceMetres: 500,
      dureeSecondes: 400,
    },
    {
      mode: 'bus',
      depart: DEPART,
      arrivee: ARRIVEE,
      distanceMetres: 3000,
      dureeSecondes: 900,
      operateur: 'line:61',
    },
  ],
};

describe('TrajetsService', () => {
  it("persiste l'itineraire avec le CO2 recalcule cote serveur par segment", async () => {
    const prisma = buildPrisma();
    const service = new TrajetsService(prisma, buildEventEmitter());

    const resultat = await service.enregistrer('user-1', DTO_MARCHE_BUS);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.creerItineraireEffectue).toHaveBeenCalledWith({
      dureeSecondes: 1300,
      co2Grammes: 276, // marche: 0 + bus: 92g/km * 3km = 276
      depart: DEPART,
      arrivee: ARRIVEE,
      segments: [
        expect.objectContaining({
          ordre: 0,
          mode: 'marche',
          co2Grammes: 0,
          operateurId: null,
        }),
        expect.objectContaining({
          ordre: 1,
          mode: 'bus',
          co2Grammes: 276,
          operateurId: 'operateur-1',
        }),
      ],
    });
    expect(resultat).toEqual({
      trajetId: 'trajet-1',
      effectueLe: new Date('2026-08-20T10:00:00.000Z'),
      co2Grammes: 276,
    });
  });

  it("cree le trajet lie a l'utilisateur et a l'itineraire persiste", async () => {
    const prisma = buildPrisma();
    const service = new TrajetsService(prisma, buildEventEmitter());

    await service.enregistrer('user-1', DTO_MARCHE_BUS);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.trajet.create).toHaveBeenCalledWith({
      data: { utilisateurId: 'user-1', itineraireId: 'itineraire-1' },
    });
  });

  it('resout (upsert) un operateur uniquement pour les segments qui en fournissent un', async () => {
    const prisma = buildPrisma();
    const service = new TrajetsService(prisma, buildEventEmitter());

    await service.enregistrer('user-1', DTO_MARCHE_BUS);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.operateur.upsert).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.operateur.upsert).toHaveBeenCalledWith({
      where: { nom: 'line:61' },
      create: { nom: 'line:61', typeService: 'transport_commun' },
      update: {},
    });
  });

  it('publie TrajetEffectue avec uniquement mode+distance, jamais de CO2 ni de trace', async () => {
    const prisma = buildPrisma();
    const eventEmitter = buildEventEmitter();
    const service = new TrajetsService(prisma, eventEmitter);

    await service.enregistrer('user-1', DTO_MARCHE_BUS);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      TRAJET_EFFECTUE_EVENT,
      expect.objectContaining({
        trajetId: 'trajet-1',
        utilisateurId: 'user-1',
        segments: [
          { mode: 'marche', distanceMetres: 500 },
          { mode: 'bus', distanceMetres: 3000 },
        ],
      }),
    );
  });
});
