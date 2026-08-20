import type { PrismaService } from '../prisma/prisma.service';
import { TrajetEffectueEvent } from '../trajets/events/trajet-effectue.event';
import { GamificationListener } from './gamification.listener';

function buildPrisma(): PrismaService {
  return {
    recompense: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('GamificationListener', () => {
  it('attribue des points ponderes par le CO2 evite pour un trajet plausible', async () => {
    const prisma = buildPrisma();
    const listener = new GamificationListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      { mode: 'marche', distanceMetres: 500, dureeSecondes: 400 },
      { mode: 'bus', distanceMetres: 3000, dureeSecondes: 900 },
    ]);

    await listener.handleTrajetEffectue(event);

    // co2 reel = 276 (bus 92g/km*3km), distance totale = 3.5km ->
    // voiture equivalente = 749, co2 evite = 473 -> points = round(47.3) = 47
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).toHaveBeenCalledWith({
      data: { utilisateurId: 'user-1', type: 'trajet', points: 47 },
    });
  });

  it("n'attribue aucun point si un segment est suspect (anti-fraude)", async () => {
    const prisma = buildPrisma();
    const listener = new GamificationListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      // 5000m en 200s = 90 km/h declare en velo : implausible.
      { mode: 'velo', distanceMetres: 5000, dureeSecondes: 200 },
    ]);

    await listener.handleTrajetEffectue(event);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).not.toHaveBeenCalled();
  });

  it("n'attribue aucun point si le trajet n'evite aucun CO2 (100% voiture)", async () => {
    const prisma = buildPrisma();
    const listener = new GamificationListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      { mode: 'voiture', distanceMetres: 5000, dureeSecondes: 600 },
    ]);

    await listener.handleTrajetEffectue(event);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.recompense.create).not.toHaveBeenCalled();
  });

  it('ne jette jamais si la persistance echoue (degradation gracieuse)', async () => {
    const prisma = buildPrisma();
    (prisma.recompense.create as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );
    const listener = new GamificationListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      { mode: 'marche', distanceMetres: 500, dureeSecondes: 400 },
    ]);

    await expect(listener.handleTrajetEffectue(event)).resolves.toBeUndefined();
  });
});
