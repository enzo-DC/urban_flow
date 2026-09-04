import type { TisseoGtfsRtService } from '../integrations/gtfs-rt/tisseo-gtfs-rt.service';
import type { OtpClientService } from '../integrations/otp/otp-client.service';
import { ArretsService } from './arrets.service';

describe('ArretsService', () => {
  describe('prochainsPassages', () => {
    it('renvoie les passages tels quels sans perturbation correspondante', async () => {
      const otp = {
        prochainsPassages: jest.fn().mockResolvedValue([
          {
            ligne: 'A',
            destination: 'Basso Cambo',
            mode: 'metro',
            dansMinutes: 4,
            voyageId: '2349722',
          },
        ]),
      } as unknown as OtpClientService;
      const gtfsRt = {
        getPerturbations: jest.fn().mockResolvedValue([]),
      } as unknown as TisseoGtfsRtService;

      const service = new ArretsService(otp, gtfsRt);
      const result = await service.prochainsPassages('1:stop_point:SP_1912');

      expect(result).toEqual([
        {
          ligne: 'A',
          destination: 'Basso Cambo',
          mode: 'metro',
          dansMinutes: 4,
        },
      ]);
    });

    it('marque un passage retarde quand une perturbation correspond au meme voyage', async () => {
      const otp = {
        prochainsPassages: jest.fn().mockResolvedValue([
          {
            ligne: 'A',
            destination: 'Basso Cambo',
            mode: 'metro',
            dansMinutes: 4,
            voyageId: '2349722',
          },
        ]),
      } as unknown as OtpClientService;
      const gtfsRt = {
        getPerturbations: jest
          .fn()
          .mockResolvedValue([
            { tripId: '2349722', statut: 'RETARDE', retardSecondes: 180 },
          ]),
      } as unknown as TisseoGtfsRtService;

      const service = new ArretsService(otp, gtfsRt);
      const result = await service.prochainsPassages('1:stop_point:SP_1912');

      expect(result).toEqual([
        {
          ligne: 'A',
          destination: 'Basso Cambo',
          mode: 'metro',
          dansMinutes: 4,
          perturbation: 'RETARDE',
          retardMinutes: 3,
        },
      ]);
    });

    it('marque un passage annule quand la perturbation correspondante est une annulation', async () => {
      const otp = {
        prochainsPassages: jest.fn().mockResolvedValue([
          {
            ligne: 'A',
            destination: 'Basso Cambo',
            mode: 'metro',
            dansMinutes: 4,
            voyageId: '2349722',
          },
        ]),
      } as unknown as OtpClientService;
      const gtfsRt = {
        getPerturbations: jest
          .fn()
          .mockResolvedValue([{ tripId: '2349722', statut: 'ANNULE' }]),
      } as unknown as TisseoGtfsRtService;

      const service = new ArretsService(otp, gtfsRt);
      const result = await service.prochainsPassages('1:stop_point:SP_1912');

      expect(result[0].perturbation).toBe('ANNULE');
      expect(result[0].retardMinutes).toBeUndefined();
    });

    it('ignore une perturbation AJOUTE (voyage non prevu, sans rapport avec un horaire theorique existant)', async () => {
      const otp = {
        prochainsPassages: jest.fn().mockResolvedValue([
          {
            ligne: 'A',
            destination: 'Basso Cambo',
            mode: 'metro',
            dansMinutes: 4,
            voyageId: '2349722',
          },
        ]),
      } as unknown as OtpClientService;
      const gtfsRt = {
        getPerturbations: jest
          .fn()
          .mockResolvedValue([{ tripId: '2349722', statut: 'AJOUTE' }]),
      } as unknown as TisseoGtfsRtService;

      const service = new ArretsService(otp, gtfsRt);
      const result = await service.prochainsPassages('1:stop_point:SP_1912');

      expect(result[0].perturbation).toBeUndefined();
    });
  });
});
