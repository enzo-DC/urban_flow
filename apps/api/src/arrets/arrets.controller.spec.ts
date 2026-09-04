import type { ArretsService } from './arrets.service';
import { ArretsController } from './arrets.controller';

describe('ArretsController', () => {
  it('delegue la recherche par zone au service avec les coordonnees recues', async () => {
    const arrets = [
      {
        id: '1:stop_point:SP_1595',
        nom: 'Concorde',
        position: { latitude: 43.6103122, longitude: 1.4436469 },
        mode: 'bus' as const,
      },
    ];
    const service = {
      parZone: jest.fn().mockResolvedValue(arrets),
    } as unknown as ArretsService;

    const controller = new ArretsController(service);
    const result = await controller.parZone({
      minLat: 43.6,
      minLon: 1.44,
      maxLat: 43.62,
      maxLon: 1.45,
    });

    expect(result).toBe(arrets);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(service.parZone).toHaveBeenCalledWith(43.6, 1.44, 43.62, 1.45);
  });

  it('delegue les prochains passages au service avec l’identifiant recu', async () => {
    const passages = [
      {
        ligne: 'A',
        destination: 'Basso Cambo',
        mode: 'metro' as const,
        dansMinutes: 4,
      },
    ];
    const service = {
      prochainsPassages: jest.fn().mockResolvedValue(passages),
    } as unknown as ArretsService;

    const controller = new ArretsController(service);
    const result = await controller.prochainsPassages({
      id: '1:stop_point:SP_1912',
    });

    expect(result).toBe(passages);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(service.prochainsPassages).toHaveBeenCalledWith(
      '1:stop_point:SP_1912',
    );
  });
});
