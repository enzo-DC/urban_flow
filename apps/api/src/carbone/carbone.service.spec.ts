import type { PrismaService } from '../prisma/prisma.service';
import { CarboneService } from './carbone.service';

function buildPrisma(overrides: {
  sommeCo2Evite: number | null;
  nombreTrajets: number;
  historique: {
    trajetId: string;
    co2Grammes: number;
    co2EviteGrammes: number;
    trajet: { effectueLe: Date };
  }[];
}): PrismaService {
  return {
    empreinteCarbone: {
      aggregate: jest.fn().mockResolvedValue({
        _sum: { co2EviteGrammes: overrides.sommeCo2Evite },
        _count: overrides.nombreTrajets,
      }),
      findMany: jest.fn().mockResolvedValue(overrides.historique),
    },
  } as unknown as PrismaService;
}

describe('CarboneService', () => {
  it('agrege le CO2 evite total et le convertit en km voiture equivalents', async () => {
    const prisma = buildPrisma({
      sommeCo2Evite: 2140, // -> 10 km voiture (214 g/km)
      nombreTrajets: 3,
      historique: [
        {
          trajetId: 'trajet-1',
          co2Grammes: 100,
          co2EviteGrammes: 900,
          trajet: { effectueLe: new Date('2026-08-20T10:00:00.000Z') },
        },
      ],
    });
    const service = new CarboneService(prisma);

    const impact = await service.monImpact('user-1');

    expect(impact.co2EviteGrammesTotal).toBe(2140);
    expect(impact.kmVoitureEvites).toBeCloseTo(10, 5);
    expect(impact.nombreTrajets).toBe(3);
    expect(impact.historique).toEqual([
      {
        trajetId: 'trajet-1',
        effectueLe: '2026-08-20T10:00:00.000Z',
        co2Grammes: 100,
        co2EviteGrammes: 900,
      },
    ]);
  });

  it("renvoie 0 (pas null) quand aucun trajet n'existe encore", async () => {
    const prisma = buildPrisma({
      sommeCo2Evite: null,
      nombreTrajets: 0,
      historique: [],
    });
    const service = new CarboneService(prisma);

    const impact = await service.monImpact('user-1');

    expect(impact.co2EviteGrammesTotal).toBe(0);
    expect(impact.kmVoitureEvites).toBe(0);
    expect(impact.nombreTrajets).toBe(0);
    expect(impact.historique).toEqual([]);
  });

  it("ne calcule l'impact que pour l'utilisateur demande", async () => {
    const prisma = buildPrisma({
      sommeCo2Evite: 0,
      nombreTrajets: 0,
      historique: [],
    });
    const service = new CarboneService(prisma);

    await service.monImpact('user-42');

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.empreinteCarbone.aggregate).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trajet: { utilisateurId: 'user-42' } },
      }),
    );
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.empreinteCarbone.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { trajet: { utilisateurId: 'user-42' } },
      }),
    );
  });
});
