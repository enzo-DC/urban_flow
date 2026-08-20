import { EventEmitter2 } from '@nestjs/event-emitter';
import type { PrismaService } from '../prisma/prisma.service';
import { BADGE_DEBLOQUE_EVENT } from './events/badge-debloque.event';
import { GamificationService } from './gamification.service';

function buildPrisma(overrides: {
  totalPoints: number | null;
  badgesExistants: string[];
}): PrismaService {
  return {
    recompense: {
      create: jest.fn().mockResolvedValue({}),
      aggregate: jest.fn().mockResolvedValue({
        _sum: { points: overrides.totalPoints },
      }),
      findMany: jest
        .fn()
        .mockResolvedValue(overrides.badgesExistants.map((type) => ({ type }))),
    },
  } as unknown as PrismaService;
}

function buildEventEmitter(): EventEmitter2 {
  return { emit: jest.fn() } as unknown as EventEmitter2;
}

describe('GamificationService.attribuerPointsEtVerifierPaliers', () => {
  it('persiste les points du trajet sous le type "trajet"', async () => {
    const prisma = buildPrisma({ totalPoints: 47, badgesExistants: [] });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await service.attribuerPointsEtVerifierPaliers('user-1', 47);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenNthCalledWith(1, {
      data: { utilisateurId: 'user-1', type: 'trajet', points: 47 },
    });
  });

  it('ne debloque aucun badge si le total reste sous le premier seuil', async () => {
    const prisma = buildPrisma({ totalPoints: 47, badgesExistants: [] });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await service.attribuerPointsEtVerifierPaliers('user-1', 47);

    // Un seul appel a create (les points), aucun pour un badge.
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('debloque le badge bronze et publie BadgeDebloque quand le total franchit 100', async () => {
    const prisma = buildPrisma({ totalPoints: 120, badgesExistants: [] });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await service.attribuerPointsEtVerifierPaliers('user-1', 120);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenNthCalledWith(2, {
      data: { utilisateurId: 'user-1', type: 'badge:bronze', points: 0 },
    });
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).toHaveBeenCalledWith(
      BADGE_DEBLOQUE_EVENT,
      expect.objectContaining({ utilisateurId: 'user-1', palier: 'bronze' }),
    );
  });

  it('ne redebloque jamais un badge deja possede', async () => {
    const prisma = buildPrisma({
      totalPoints: 150,
      badgesExistants: ['badge:bronze'],
    });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await service.attribuerPointsEtVerifierPaliers('user-1', 50);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenCalledTimes(1); // que les points
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });

  it('debloque plusieurs badges en un seul trajet si plusieurs seuils sont franchis', async () => {
    const prisma = buildPrisma({ totalPoints: 600, badgesExistants: [] });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await service.attribuerPointsEtVerifierPaliers('user-1', 600);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenCalledTimes(3); // points + bronze + argent
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).toHaveBeenCalledTimes(2);
  });

  it('gere une somme nulle (premier trajet du compte) sans planter', async () => {
    const prisma = buildPrisma({ totalPoints: null, badgesExistants: [] });
    const eventEmitter = buildEventEmitter();
    const service = new GamificationService(prisma, eventEmitter);

    await expect(
      service.attribuerPointsEtVerifierPaliers('user-1', 0),
    ).resolves.toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(eventEmitter.emit).not.toHaveBeenCalled();
  });
});

describe('GamificationService.monResume', () => {
  it('renvoie le total de points et les badges debloques', async () => {
    const prisma = buildPrisma({
      totalPoints: 642,
      badgesExistants: ['badge:bronze', 'badge:argent'],
    });
    const service = new GamificationService(prisma, buildEventEmitter());

    const resume = await service.monResume('user-1');

    expect(resume).toEqual({
      pointsTotal: 642,
      badges: ['bronze', 'argent'],
    });
  });

  it('renvoie 0 point et aucun badge pour un compte sans trajet', async () => {
    const prisma = buildPrisma({ totalPoints: null, badgesExistants: [] });
    const service = new GamificationService(prisma, buildEventEmitter());

    const resume = await service.monResume('user-1');

    expect(resume).toEqual({ pointsTotal: 0, badges: [] });
  });
});
