import { Injectable } from '@nestjs/common';
import type { ImpactCarbone } from '@urbanflow/shared';
import { PrismaService } from '../prisma/prisma.service';
import { kmVoitureEquivalents } from './facteurs-ademe';

const TAILLE_HISTORIQUE = 10;

@Injectable()
export class CarboneService {
  constructor(private readonly prisma: PrismaService) {}

  async monImpact(utilisateurId: string): Promise<ImpactCarbone> {
    const [agregat, historique] = await Promise.all([
      this.prisma.empreinteCarbone.aggregate({
        where: { trajet: { utilisateurId } },
        _sum: { co2EviteGrammes: true },
        _count: true,
      }),
      this.prisma.empreinteCarbone.findMany({
        where: { trajet: { utilisateurId } },
        include: { trajet: true },
        orderBy: { trajet: { effectueLe: 'desc' } },
        take: TAILLE_HISTORIQUE,
      }),
    ]);

    const co2EviteGrammesTotal = agregat._sum.co2EviteGrammes ?? 0;

    return {
      co2EviteGrammesTotal,
      kmVoitureEvites: kmVoitureEquivalents(co2EviteGrammesTotal),
      nombreTrajets: agregat._count,
      historique: historique.map((empreinte) => ({
        trajetId: empreinte.trajetId,
        effectueLe: empreinte.trajet.effectueLe.toISOString(),
        co2Grammes: empreinte.co2Grammes,
        co2EviteGrammes: empreinte.co2EviteGrammes,
      })),
    };
  }
}
