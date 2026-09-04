import type { OtpClientService } from '../integrations/otp/otp-client.service';
import { ArretsController } from './arrets.controller';

describe('ArretsController', () => {
  it('delegue la recherche au client OTP avec la zone recue', async () => {
    const arrets = [
      {
        id: 'stop_point:SP_1595',
        nom: 'Concorde',
        position: { latitude: 43.6103122, longitude: 1.4436469 },
        mode: 'bus' as const,
      },
    ];
    const otp = {
      arretsDansZone: jest.fn().mockResolvedValue(arrets),
    } as unknown as OtpClientService;

    const controller = new ArretsController(otp);
    const result = await controller.parZone({
      minLat: 43.6,
      minLon: 1.44,
      maxLat: 43.62,
      maxLon: 1.45,
    });

    expect(result).toBe(arrets);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(otp.arretsDansZone).toHaveBeenCalledWith(43.6, 1.44, 43.62, 1.45);
  });
});
