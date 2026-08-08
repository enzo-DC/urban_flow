import { randomUUID } from 'node:crypto';
import {
  ConflictException,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

interface TokenPair {
  accessToken: string;
  refreshToken: string;
}

interface RefreshPayload {
  sub: string;
  jti: string;
}

@Injectable()
export class AuthService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly jwt: JwtService,
    private readonly config: ConfigService,
  ) {}

  async register(dto: RegisterDto): Promise<TokenPair> {
    const existing = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (existing) {
      throw new ConflictException('Un compte existe déjà avec cet e-mail.');
    }

    const motDePasseHash = await argon2.hash(dto.password);

    const utilisateur = await this.prisma.utilisateur.create({
      data: {
        email: dto.email,
        motDePasseHash,
        // Consentement horodate au moment de l'inscription — jamais retroactif.
        consentementRgpdAt: new Date(),
      },
    });

    return this.issueTokens(utilisateur.id);
  }

  async login(dto: LoginDto): Promise<TokenPair> {
    const utilisateur = await this.prisma.utilisateur.findUnique({
      where: { email: dto.email },
    });
    if (!utilisateur) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    const valid = await argon2.verify(utilisateur.motDePasseHash, dto.password);
    if (!valid) {
      throw new UnauthorizedException('Identifiants invalides.');
    }

    return this.issueTokens(utilisateur.id);
  }

  async refresh(refreshToken: string): Promise<TokenPair> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const storedUserId = await this.redis.client.get(`refresh:${payload.jti}`);
    if (!storedUserId || storedUserId !== payload.sub) {
      throw new UnauthorizedException('Session expirée, reconnecte-toi.');
    }

    // Rotation : un refresh token ne sert qu'une fois.
    await this.redis.client.del(`refresh:${payload.jti}`);

    return this.issueTokens(payload.sub);
  }

  async logout(refreshToken: string | undefined): Promise<void> {
    if (!refreshToken) return;
    try {
      const payload = await this.verifyRefreshToken(refreshToken);
      await this.redis.client.del(`refresh:${payload.jti}`);
    } catch {
      // Token deja invalide/expire : rien a nettoyer.
    }
  }

  private async verifyRefreshToken(
    refreshToken: string,
  ): Promise<RefreshPayload> {
    try {
      return await this.jwt.verifyAsync<RefreshPayload>(refreshToken, {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
      });
    } catch {
      throw new UnauthorizedException('Session expirée, reconnecte-toi.');
    }
  }

  private async issueTokens(userId: string): Promise<TokenPair> {
    const jti = randomUUID();
    const accessTtlSeconds = parseTtlToSeconds(
      this.config.get<string>('JWT_ACCESS_TTL', '15m'),
    );
    const refreshTtlSeconds = parseTtlToSeconds(
      this.config.get<string>('JWT_REFRESH_TTL', '7d'),
    );

    const accessToken = await this.jwt.signAsync(
      { sub: userId },
      {
        secret: this.config.getOrThrow<string>('JWT_SECRET'),
        expiresIn: accessTtlSeconds,
      },
    );

    const refreshToken = await this.jwt.signAsync(
      { sub: userId, jti },
      {
        secret: this.config.getOrThrow<string>('JWT_REFRESH_SECRET'),
        expiresIn: refreshTtlSeconds,
      },
    );

    await this.redis.client.set(
      `refresh:${jti}`,
      userId,
      'EX',
      refreshTtlSeconds,
    );

    return { accessToken, refreshToken };
  }
}

function parseTtlToSeconds(ttl: string): number {
  const match = /^(\d+)([smhd])$/.exec(ttl);
  if (!match) return 60 * 60 * 24 * 7;
  const value = Number(match[1]);
  const multipliers: Record<string, number> = {
    s: 1,
    m: 60,
    h: 3600,
    d: 86400,
  };
  return value * multipliers[match[2]];
}
