import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  constructor(configService: ConfigService) {
    const adapter = new PrismaPg({
      connectionString: configService.getOrThrow<string>('DATABASE_URL'),
    });
    super({ adapter });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  /**
   * Requête de référence pour toute recherche de proximité du projet : les colonnes
   * geography ne sont pas exposées par Prisma Client (Unsupported), donc SQL natif.
   */
  itinerairesProchesDuDepart(
    longitude: number,
    latitude: number,
    rayonMetres: number,
  ) {
    return this.$queryRaw<{ id: string; distanceMetres: number }[]>`
      SELECT "id", ST_Distance("depart", ST_MakePoint(${longitude}, ${latitude})::geography) AS "distanceMetres"
      FROM "itineraires"
      WHERE ST_DWithin("depart", ST_MakePoint(${longitude}, ${latitude})::geography, ${rayonMetres})
      ORDER BY "distanceMetres" ASC
    `;
  }
}
