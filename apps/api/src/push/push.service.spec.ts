import webpush from 'web-push';
import { ConfigService } from '@nestjs/config';
import type { PrismaService } from '../prisma/prisma.service';
import type { AbonnerPushDto } from './dto/abonner-push.dto';
import { PushService } from './push.service';

jest.mock('web-push');

const CONFIG: Record<string, string> = {
  VAPID_SUBJECT: 'mailto:contact@example.test',
  VAPID_PUBLIC_KEY: 'public-key',
  VAPID_PRIVATE_KEY: 'private-key',
};

function buildConfig(): ConfigService {
  return {
    getOrThrow: (key: string) => CONFIG[key],
  } as unknown as ConfigService;
}

function buildPrisma(): PrismaService {
  return {
    abonnementPush: {
      upsert: jest.fn().mockResolvedValue({}),
      deleteMany: jest.fn().mockResolvedValue({ count: 1 }),
      delete: jest.fn().mockResolvedValue({}),
      findMany: jest.fn().mockResolvedValue([]),
    },
  } as unknown as PrismaService;
}

describe('PushService', () => {
  afterEach(() => jest.clearAllMocks());

  it('configure les cles VAPID au demarrage du module', () => {
    const service = new PushService(buildConfig(), buildPrisma());
    service.onModuleInit();

    expect(webpush.setVapidDetails).toHaveBeenCalledWith(
      'mailto:contact@example.test',
      'public-key',
      'private-key',
    );
  });

  it('expose la cle publique (non secrete par design)', () => {
    const service = new PushService(buildConfig(), buildPrisma());
    expect(service.clePublique()).toBe('public-key');
  });

  it('upsert un abonnement par endpoint (evite les doublons si resouscription)', async () => {
    const prisma = buildPrisma();
    const service = new PushService(buildConfig(), prisma);
    const dto: AbonnerPushDto = {
      endpoint: 'https://push.example.test/abc',
      keys: { p256dh: 'p256dh-key', auth: 'auth-key' },
    };

    await service.abonner('user-1', dto);

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.abonnementPush.upsert).toHaveBeenCalledWith({
      where: { endpoint: 'https://push.example.test/abc' },
      create: {
        utilisateurId: 'user-1',
        endpoint: 'https://push.example.test/abc',
        clePublique: 'p256dh-key',
        cleAuth: 'auth-key',
      },
      update: {
        utilisateurId: 'user-1',
        clePublique: 'p256dh-key',
        cleAuth: 'auth-key',
      },
    });
  });

  it("envoie une notification a chaque abonnement de l'utilisateur", async () => {
    const prisma = buildPrisma();
    (prisma.abonnementPush.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', endpoint: 'e1', clePublique: 'p1', cleAuth: 'a1' },
      { id: 'a2', endpoint: 'e2', clePublique: 'p2', cleAuth: 'a2' },
    ]);
    (webpush.sendNotification as jest.Mock).mockResolvedValue({});
    const service = new PushService(buildConfig(), prisma);

    await service.envoyerATous('user-1', { titre: 'T', corps: 'C' });

    expect(webpush.sendNotification).toHaveBeenCalledTimes(2);
  });

  it('supprime automatiquement un abonnement expire (410 Gone)', async () => {
    const prisma = buildPrisma();
    (prisma.abonnementPush.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', endpoint: 'e1', clePublique: 'p1', cleAuth: 'a1' },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue({
      statusCode: 410,
    });
    const service = new PushService(buildConfig(), prisma);

    await service.envoyerATous('user-1', { titre: 'T', corps: 'C' });

    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.abonnementPush.delete).toHaveBeenCalledWith({
      where: { id: 'a1' },
    });
  });

  it("ne plante jamais si l'envoi echoue pour une raison autre qu'un abonnement expire", async () => {
    const prisma = buildPrisma();
    (prisma.abonnementPush.findMany as jest.Mock).mockResolvedValue([
      { id: 'a1', endpoint: 'e1', clePublique: 'p1', cleAuth: 'a1' },
    ]);
    (webpush.sendNotification as jest.Mock).mockRejectedValue(
      new Error('service indisponible'),
    );
    const service = new PushService(buildConfig(), prisma);

    await expect(
      service.envoyerATous('user-1', { titre: 'T', corps: 'C' }),
    ).resolves.toBeUndefined();
    // eslint-disable-next-line @typescript-eslint/unbound-method -- jest.fn() mock.
    expect(prisma.abonnementPush.delete).not.toHaveBeenCalled();
  });
});
