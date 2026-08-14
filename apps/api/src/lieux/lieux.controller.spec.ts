import type { NominatimGeocodageService } from '../integrations/geocoding/nominatim-geocodage.service';
import { LieuxController } from './lieux.controller';

describe('LieuxController', () => {
  it('delegue la recherche au service de geocodage avec la requete recue', async () => {
    const resultats = [
      {
        label: 'Place du Capitole, Toulouse',
        position: { latitude: 1, longitude: 2 },
      },
    ];
    const geocodage = {
      rechercherAdresse: jest.fn().mockResolvedValue(resultats),
    } as unknown as NominatimGeocodageService;

    const controller = new LieuxController(geocodage);
    const result = await controller.rechercher({ q: 'Place du Capitole' });

    expect(result).toBe(resultats);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(geocodage.rechercherAdresse).toHaveBeenCalledWith(
      'Place du Capitole',
    );
  });
});
