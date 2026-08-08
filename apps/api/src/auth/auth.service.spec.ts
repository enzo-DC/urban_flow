import { ConflictException, UnauthorizedException } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import * as argon2 from 'argon2';
import { AuthService } from './auth.service';

const CONFIG: Record<string, string> = {
  JWT_SECRET: 'test-access-secret',
  JWT_REFRESH_SECRET: 'test-refresh-secret',
  JWT_ACCESS_TTL: '15m',
  JWT_REFRESH_TTL: '7d',
};

interface UtilisateurRecord {
  id: string;
  email: string;
  motDePasseHash: string;
  consentementRgpdAt?: Date;
}

interface CreateArgs {
  data: {
    email: string;
    motDePasseHash: string;
    consentementRgpdAt: Date;
  };
}

function buildAuthService() {
  const store = new Map<string, string>();
  const prisma = {
    utilisateur: {
      findUnique: jest.fn<Promise<UtilisateurRecord | null>, [unknown]>(),
      create: jest.fn<Promise<UtilisateurRecord>, [CreateArgs]>(),
    },
  };
  const redis = {
    client: {
      get: jest.fn((key: string) => Promise.resolve(store.get(key) ?? null)),
      set: jest.fn((key: string, value: string) => {
        store.set(key, value);
        return Promise.resolve('OK');
      }),
      del: jest.fn((key: string) => {
        store.delete(key);
        return Promise.resolve(1);
      }),
    },
  };
  const config = {
    get: (key: string, fallback?: string) => CONFIG[key] ?? fallback,
    getOrThrow: (key: string) => {
      const value = CONFIG[key];
      if (!value) throw new Error(`Missing config: ${key}`);
      return value;
    },
  } as unknown as ConfigService;

  const service = new AuthService(
    prisma as never,
    redis as never,
    new JwtService(),
    config,
  );

  return { service, prisma, redis };
}

describe('AuthService', () => {
  it("hache le mot de passe et n'enregistre jamais le mot de passe en clair", async () => {
    const { service, prisma } = buildAuthService();
    prisma.utilisateur.findUnique.mockResolvedValue(null);
    prisma.utilisateur.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );

    await service.register({
      email: 'demo@urbanflow.test',
      password: 'super-secret-pw',
      consentementRgpd: true,
    });

    const createArgs = prisma.utilisateur.create.mock.calls[0][0];
    expect(createArgs.data.motDePasseHash).not.toBe('super-secret-pw');
    expect(createArgs.data.motDePasseHash).toMatch(/^\$argon2/);
    expect(createArgs.data.consentementRgpdAt).toBeInstanceOf(Date);
  });

  it('refuse l’inscription si un compte existe déjà avec cet e-mail', async () => {
    const { service, prisma } = buildAuthService();
    prisma.utilisateur.findUnique.mockResolvedValue({ id: 'existing' });

    await expect(
      service.register({
        email: 'demo@urbanflow.test',
        password: 'super-secret-pw',
        consentementRgpd: true,
      }),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('connecte un utilisateur avec le bon mot de passe et renvoie une paire de tokens', async () => {
    const { service, prisma } = buildAuthService();
    prisma.utilisateur.findUnique.mockResolvedValue(null);
    prisma.utilisateur.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );
    await service.register({
      email: 'demo@urbanflow.test',
      password: 'super-secret-pw',
      consentementRgpd: true,
    });

    prisma.utilisateur.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@urbanflow.test',
      motDePasseHash:
        prisma.utilisateur.create.mock.calls[0][0].data.motDePasseHash,
    });

    const tokens = await service.login({
      email: 'demo@urbanflow.test',
      password: 'super-secret-pw',
    });

    expect(tokens.accessToken).toEqual(expect.any(String));
    expect(tokens.refreshToken).toEqual(expect.any(String));
  });

  it('rejette la connexion avec un mauvais mot de passe', async () => {
    const { service, prisma } = buildAuthService();
    prisma.utilisateur.findUnique.mockResolvedValue({
      id: 'user-1',
      email: 'demo@urbanflow.test',
      motDePasseHash: await argon2.hash('super-secret-pw'),
    });

    await expect(
      service.login({ email: 'demo@urbanflow.test', password: 'wrong' }),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });

  it('rafraîchit les tokens et invalide le refresh token précédent (rotation)', async () => {
    const { service, prisma } = buildAuthService();
    prisma.utilisateur.findUnique.mockResolvedValue(null);
    prisma.utilisateur.create.mockImplementation(({ data }) =>
      Promise.resolve({ id: 'user-1', ...data }),
    );
    const first = await service.register({
      email: 'demo@urbanflow.test',
      password: 'super-secret-pw',
      consentementRgpd: true,
    });

    const second = await service.refresh(first.refreshToken);
    expect(second.accessToken).toEqual(expect.any(String));

    // Le refresh token initial ne doit plus être valide (rotation à usage unique).
    await expect(service.refresh(first.refreshToken)).rejects.toBeInstanceOf(
      UnauthorizedException,
    );
  });
});
