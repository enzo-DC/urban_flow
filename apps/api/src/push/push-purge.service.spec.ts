import { PushPurgeService } from './push-purge.service';

interface DeleteManyArgs {
  where: {
    OR: [
      { derniereUtilisationLe: null; createdAt: { lt: Date } },
      { derniereUtilisationLe: { lt: Date } },
    ];
  };
}

function buildPrisma(count: number) {
  return {
    abonnementPush: {
      deleteMany: jest
        .fn<Promise<{ count: number }>, [DeleteManyArgs]>()
        .mockResolvedValue({ count }),
    },
  };
}

describe('PushPurgeService', () => {
  it('purge les abonnements jamais utilises et trop anciens, ou inactifs depuis 90 jours', async () => {
    const prisma = buildPrisma(2);
    const service = new PushPurgeService(prisma as never);

    await service.purgerAbonnementsObsoletes();

    const [jamaisUtilise, inactifDepuis] =
      prisma.abonnementPush.deleteMany.mock.calls[0][0].where.OR;
    const seuil = jamaisUtilise.createdAt.lt;
    expect(seuil.getTime()).toBeLessThan(Date.now());
    expect(inactifDepuis.derniereUtilisationLe.lt.getTime()).toBe(
      seuil.getTime(),
    );
  });

  it('ne plante pas quand aucun abonnement obsolete ne matche', async () => {
    const service = new PushPurgeService(buildPrisma(0) as never);
    await expect(service.purgerAbonnementsObsoletes()).resolves.toBeUndefined();
  });
});
