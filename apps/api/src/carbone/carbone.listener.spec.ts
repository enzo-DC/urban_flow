import type { PrismaService } from '../prisma/prisma.service';
import { TrajetEffectueEvent } from '../trajets/events/trajet-effectue.event';
import { CarboneListener } from './carbone.listener';

function buildPrisma(): PrismaService {
  return {
    empreinteCarbone: {
      create: jest.fn().mockResolvedValue({}),
    },
  } as unknown as PrismaService;
}

describe('CarboneListener', () => {
  it('calcule le CO2 et le CO2 evite a partir des segments bruts (mode + distance)', async () => {
    const prisma = buildPrisma();
    const listener = new CarboneListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      { mode: 'marche', distanceMetres: 500 },
      { mode: 'bus', distanceMetres: 3000 },
    ]);

    await listener.handleTrajetEffectue(event);

    // co2 = 0 (marche) + 276 (bus, 92g/km*3km) = 276
    // distance totale = 3500m -> voiture equivalente = round(214*3.5) = 749
    // co2 evite = 749 - 276 = 473
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.empreinteCarbone.create).toHaveBeenCalledWith({
      data: { trajetId: 'trajet-1', co2Grammes: 276, co2EviteGrammes: 473 },
    });
  });

  it('ne jette jamais si la persistance echoue (degradation gracieuse)', async () => {
    const prisma = buildPrisma();
    (prisma.empreinteCarbone.create as jest.Mock).mockRejectedValue(
      new Error('db down'),
    );
    const listener = new CarboneListener(prisma);
    const event = new TrajetEffectueEvent('trajet-1', 'user-1', [
      { mode: 'marche', distanceMetres: 500 },
    ]);

    await expect(listener.handleTrajetEffectue(event)).resolves.toBeUndefined();
  });
});
