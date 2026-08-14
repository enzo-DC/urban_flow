import { ConfigService } from '@nestjs/config';
import { RedisService } from './redis.service';

jest.mock('ioredis', () => {
  return jest.fn().mockImplementation(() => ({
    get: jest.fn(),
    set: jest.fn(),
    quit: jest.fn(),
  }));
});

function buildConfig(): ConfigService {
  return {
    getOrThrow: () => 'redis://localhost:6379',
  } as unknown as ConfigService;
}

describe('RedisService.getOrSet', () => {
  it("appelle loader() et met en cache si rien n'est en cache", async () => {
    const service = new RedisService(buildConfig());
    (service.client.get as jest.Mock).mockResolvedValue(null);
    const loader = jest.fn().mockResolvedValue({ value: 42 });

    const result = await service.getOrSet('key', 60, loader);

    expect(result).toEqual({ value: 42 });
    expect(loader).toHaveBeenCalledTimes(1);
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock, pas une vraie methode liee a `this`.
    expect(service.client.set).toHaveBeenCalledWith(
      'key',
      JSON.stringify({ value: 42 }),
      'EX',
      60,
    );
  });

  it('renvoie la valeur en cache sans appeler loader() si presente', async () => {
    const service = new RedisService(buildConfig());
    (service.client.get as jest.Mock).mockResolvedValue(
      JSON.stringify({ value: 'cached' }),
    );
    const loader = jest.fn();

    const result = await service.getOrSet('key', 60, loader);

    expect(result).toEqual({ value: 'cached' });
    expect(loader).not.toHaveBeenCalled();
  });
});
