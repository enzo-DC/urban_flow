import { Injectable, Logger } from '@nestjs/common';
import { CronExpression, Cron } from '@nestjs/schedule';
import { PrismaService } from '../prisma/prisma.service';

// Assez long pour ne jamais purger un abonnement simplement peu sollicite
// (un badge peut se debloquer une fois tous les quelques mois) — vise les
// abonnements reellement obsoletes, pas seulement inactifs.
const SEUIL_JOURS = 90;

/**
 * Purge RGPD (minimisation des donnees) des abonnements Web Push devenus
 * obsoletes sans jamais avoir declenche d'erreur 404/410 cote navigateur
 * (donnees effacees, extension bloquant les notifications, etc.) — le
 * nettoyage reactif de push.service.ts ne couvre pas ce cas.
 */
@Injectable()
export class PushPurgeService {
  private readonly logger = new Logger(PushPurgeService.name);

  constructor(private readonly prisma: PrismaService) {}

  @Cron(CronExpression.EVERY_DAY_AT_3AM)
  async purgerAbonnementsObsoletes(): Promise<void> {
    const seuil = new Date(Date.now() - SEUIL_JOURS * 24 * 60 * 60 * 1000);

    const { count } = await this.prisma.abonnementPush.deleteMany({
      where: {
        OR: [
          { derniereUtilisationLe: null, createdAt: { lt: seuil } },
          { derniereUtilisationLe: { lt: seuil } },
        ],
      },
    });

    if (count > 0) {
      this.logger.log(`${count} abonnement(s) push obsolete(s) purge(s).`);
    }
  }
}
