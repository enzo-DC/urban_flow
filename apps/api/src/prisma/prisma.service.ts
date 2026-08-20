import { Injectable, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';
import type { Coordonnees } from '@urbanflow/shared';

interface SegmentAPersister {
  ordre: number;
  mode: string;
  distanceMetres: number;
  dureeSecondes: number;
  co2Grammes: number;
  operateurId: string | null;
  depart: Coordonnees;
  arrivee: Coordonnees;
}

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

  /**
   * Persiste un itineraire effectue et ses segments. Les colonnes geography
   * sont en Unsupported() (voir itinerairesProchesDuDepart) : impossible de
   * passer par `create()`, tout l'insert doit rester en SQL natif. Les deux
   * ids sont generes cote application (pas de DEFAULT gen_random_uuid() en
   * base) pour rester coherent avec le `@default(uuid())` du schema Prisma.
   * Transactionnel : un segment en echec ne doit jamais laisser un
   * itineraire orphelin sans ses segments.
   */
  async creerItineraireEffectue(input: {
    dureeSecondes: number;
    co2Grammes: number;
    depart: Coordonnees;
    arrivee: Coordonnees;
    segments: SegmentAPersister[];
  }): Promise<string> {
    const itineraireId = crypto.randomUUID();

    await this.$transaction([
      this.$executeRaw`
        INSERT INTO "itineraires" ("id", "dureeSecondes", "co2Grammes", "depart", "arrivee")
        VALUES (
          ${itineraireId}, ${input.dureeSecondes}, ${input.co2Grammes},
          ST_MakePoint(${input.depart.longitude}, ${input.depart.latitude})::geography,
          ST_MakePoint(${input.arrivee.longitude}, ${input.arrivee.latitude})::geography
        )
      `,
      ...input.segments.map(
        (segment) => this.$executeRaw`
          INSERT INTO "segments"
            ("id", "itineraireId", "ordre", "mode", "distanceMetres", "dureeSecondes", "co2Grammes", "operateurId", "depart", "arrivee")
          VALUES (
            ${crypto.randomUUID()}, ${itineraireId}, ${segment.ordre}, ${segment.mode},
            ${segment.distanceMetres}, ${segment.dureeSecondes}, ${segment.co2Grammes}, ${segment.operateurId},
            ST_MakePoint(${segment.depart.longitude}, ${segment.depart.latitude})::geography,
            ST_MakePoint(${segment.arrivee.longitude}, ${segment.arrivee.latitude})::geography
          )
        `,
      ),
    ]);

    return itineraireId;
  }
}
