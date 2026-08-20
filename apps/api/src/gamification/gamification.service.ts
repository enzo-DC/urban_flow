import { Injectable } from '@nestjs/common';
import { EventEmitter2 } from '@nestjs/event-emitter';
import { PrismaService } from '../prisma/prisma.service';
import { paliersFranchis, type Palier } from './badges.util';
import {
  BADGE_DEBLOQUE_EVENT,
  BadgeDebloqueEvent,
} from './events/badge-debloque.event';

const PREFIXE_BADGE = 'badge:';

@Injectable()
export class GamificationService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly eventEmitter: EventEmitter2,
  ) {}

  /**
   * Attribue les points d'un trajet puis verifie si le nouveau total en
   * points cumules fait franchir un ou plusieurs paliers — jamais l'inverse
   * (verifier les paliers avant d'avoir persiste les points donnerait un
   * total perime).
   */
  async attribuerPointsEtVerifierPaliers(
    utilisateurId: string,
    points: number,
  ): Promise<void> {
    await this.prisma.recompense.create({
      data: { utilisateurId, type: 'trajet', points },
    });

    const [agregat, badges] = await Promise.all([
      this.prisma.recompense.aggregate({
        where: { utilisateurId, type: 'trajet' },
        _sum: { points: true },
      }),
      this.prisma.recompense.findMany({
        where: { utilisateurId, type: { startsWith: PREFIXE_BADGE } },
        select: { type: true },
      }),
    ]);

    const totalPoints = agregat._sum.points ?? 0;
    const dejaDebloques = badges.map(
      (b) => b.type.slice(PREFIXE_BADGE.length) as Palier,
    );
    const nouveaux = paliersFranchis(totalPoints, dejaDebloques);

    for (const palier of nouveaux) {
      await this.prisma.recompense.create({
        data: { utilisateurId, type: `${PREFIXE_BADGE}${palier}`, points: 0 },
      });
      this.eventEmitter.emit(
        BADGE_DEBLOQUE_EVENT,
        new BadgeDebloqueEvent(utilisateurId, palier),
      );
    }
  }
}
