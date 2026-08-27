import { Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import webpush from 'web-push';
import { PrismaService } from '../prisma/prisma.service';
import type { AbonnerPushDto } from './dto/abonner-push.dto';

interface Notification {
  titre: string;
  corps: string;
}

interface AbonnementStocke {
  id: string;
  endpoint: string;
  clePublique: string;
  cleAuth: string;
}

@Injectable()
export class PushService implements OnModuleInit {
  private readonly logger = new Logger(PushService.name);

  constructor(
    private readonly config: ConfigService,
    private readonly prisma: PrismaService,
  ) {}

  onModuleInit(): void {
    webpush.setVapidDetails(
      this.config.getOrThrow<string>('VAPID_SUBJECT'),
      this.config.getOrThrow<string>('VAPID_PUBLIC_KEY'),
      this.config.getOrThrow<string>('VAPID_PRIVATE_KEY'),
    );
  }

  clePublique(): string {
    return this.config.getOrThrow<string>('VAPID_PUBLIC_KEY');
  }

  async abonner(utilisateurId: string, dto: AbonnerPushDto): Promise<void> {
    await this.prisma.abonnementPush.upsert({
      where: { endpoint: dto.endpoint },
      create: {
        utilisateurId,
        endpoint: dto.endpoint,
        clePublique: dto.keys.p256dh,
        cleAuth: dto.keys.auth,
      },
      update: {
        utilisateurId,
        clePublique: dto.keys.p256dh,
        cleAuth: dto.keys.auth,
      },
    });
  }

  async desabonner(utilisateurId: string, endpoint: string): Promise<void> {
    await this.prisma.abonnementPush.deleteMany({
      where: { utilisateurId, endpoint },
    });
  }

  async envoyerATous(
    utilisateurId: string,
    notification: Notification,
  ): Promise<void> {
    const abonnements = await this.prisma.abonnementPush.findMany({
      where: { utilisateurId },
    });
    await Promise.allSettled(
      abonnements.map((abonnement) => this.envoyer(abonnement, notification)),
    );
  }

  private async envoyer(
    abonnement: AbonnementStocke,
    notification: Notification,
  ): Promise<void> {
    try {
      await webpush.sendNotification(
        {
          endpoint: abonnement.endpoint,
          keys: { p256dh: abonnement.clePublique, auth: abonnement.cleAuth },
        },
        JSON.stringify(notification),
      );
      // Marque l'abonnement comme reellement utilise — sert a la purge des
      // abonnements devenus obsoletes sans jamais avoir declenche de 404/410
      // (voir push.purge.service.ts).
      await this.prisma.abonnementPush
        .update({
          where: { id: abonnement.id },
          data: { derniereUtilisationLe: new Date() },
        })
        .catch(() => undefined);
    } catch (error) {
      const statusCode = (error as { statusCode?: number }).statusCode;
      // 404/410 : l'abonnement n'existe plus cote navigateur (desinstalle,
      // permission revoquee...) — le supprimer plutot que de reessayer
      // indefiniment contre un endpoint mort.
      if (statusCode === 404 || statusCode === 410) {
        await this.prisma.abonnementPush
          .delete({ where: { id: abonnement.id } })
          .catch(() => undefined);
        return;
      }
      this.logger.warn(
        `Envoi push echoue (${abonnement.endpoint}) : ${(error as Error).message}`,
      );
    }
  }
}
