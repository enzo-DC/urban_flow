import { Injectable, NotFoundException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { UpdateProfilDto } from './dto/update-profil.dto';

const NOT_FOUND_CODE = 'P2025';

@Injectable()
export class UsersService {
  constructor(private readonly prisma: PrismaService) {}

  /**
   * Identite + profil de mobilite — utilise par l'ecran Profil, plus leger
   * que l'export RGPD complet (pas l'historique des trajets/recompenses).
   */
  async getProfile(userId: string) {
    try {
      return await this.prisma.utilisateur.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          createdAt: true,
          profilMobilite: {
            select: {
              modesPreferes: true,
              besoinsAccessibilite: true,
              updatedAt: true,
            },
          },
        },
      });
    } catch (error) {
      throw mapNotFound(error);
    }
  }

  /**
   * Cree ou met a jour le profil de mobilite (upsert : un utilisateur n'a
   * pas forcement de ProfilMobilite des l'inscription).
   */
  updateProfil(userId: string, dto: UpdateProfilDto) {
    return this.prisma.profilMobilite.upsert({
      where: { utilisateurId: userId },
      create: {
        utilisateurId: userId,
        modesPreferes: dto.modesPreferes ?? [],
        besoinsAccessibilite: dto.besoinsAccessibilite ?? false,
      },
      update: {
        ...(dto.modesPreferes !== undefined && {
          modesPreferes: dto.modesPreferes,
        }),
        ...(dto.besoinsAccessibilite !== undefined && {
          besoinsAccessibilite: dto.besoinsAccessibilite,
        }),
      },
    });
  }

  /**
   * Archive complete des donnees d'un utilisateur (droit d'acces RGPD).
   * Le hash du mot de passe n'est jamais expose. Les colonnes geography
   * (trace GPS) ne sont de toute facon pas accessibles via Prisma Client —
   * seul l'agregat (duree, CO2) est conserve, conformement a la minimisation.
   */
  async exportData(userId: string) {
    try {
      return await this.prisma.utilisateur.findUniqueOrThrow({
        where: { id: userId },
        select: {
          id: true,
          email: true,
          consentementRgpdAt: true,
          createdAt: true,
          updatedAt: true,
          profilMobilite: true,
          recompenses: true,
          trajets: {
            select: {
              id: true,
              effectueLe: true,
              empreinteCarbone: true,
              itineraire: {
                select: {
                  id: true,
                  dureeSecondes: true,
                  co2Grammes: true,
                  createdAt: true,
                },
              },
            },
          },
        },
      });
    } catch (error) {
      throw mapNotFound(error);
    }
  }

  /**
   * Suppression effective (pas un flag `deleted`). Les entites liees
   * (profil, trajets, empreintes, recompenses) partent en cascade — voir
   * onDelete: Cascade dans prisma/schema.prisma.
   */
  async deleteAccount(userId: string): Promise<void> {
    try {
      await this.prisma.utilisateur.delete({ where: { id: userId } });
    } catch (error) {
      throw mapNotFound(error);
    }
  }
}

function mapNotFound(error: unknown): unknown {
  if (
    error instanceof Prisma.PrismaClientKnownRequestError &&
    error.code === NOT_FOUND_CODE
  ) {
    return new NotFoundException('Compte introuvable.');
  }
  return error;
}
