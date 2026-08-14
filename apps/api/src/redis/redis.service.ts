import { Injectable, OnModuleDestroy } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import Redis from 'ioredis';

@Injectable()
export class RedisService implements OnModuleDestroy {
  readonly client: Redis;

  constructor(configService: ConfigService) {
    this.client = new Redis(configService.getOrThrow<string>('CACHE_URL'));
  }

  async onModuleDestroy() {
    await this.client.quit();
  }

  /**
   * Motif cache-aside generique : sert la valeur en cache si presente, sinon
   * appelle loader() et met en cache le resultat avec le TTL donne. ttlSeconds
   * doit rester aligne sur la fraicheur reelle de la donnee (ex. le `ttl`
   * annonce par un flux GBFS), pas une valeur arbitraire.
   */
  async getOrSet<T>(
    key: string,
    ttlSeconds: number,
    loader: () => Promise<T>,
  ): Promise<T> {
    const cached = await this.client.get(key);
    if (cached !== null) {
      return JSON.parse(cached) as T;
    }
    const value = await loader();
    await this.client.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    return value;
  }
}
