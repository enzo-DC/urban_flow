import { randomUUID } from 'node:crypto';
import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '@prisma/client';

// Coordonnees synthetiques (Toulouse) — jamais de position reelle en base de developpement.
const CAPITOLE = { longitude: 1.4442, latitude: 43.6047 };
const BLAGNAC = { longitude: 1.3928, latitude: 43.6357 };

const adapter = new PrismaPg({
  connectionString: process.env.DATABASE_URL,
});
const prisma = new PrismaClient({ adapter });

async function main() {
  const tisseo = await prisma.operateur.upsert({
    where: { nom: 'Tisseo' },
    update: {},
    create: { nom: 'Tisseo', typeService: 'bus' },
  });

  const utilisateur = await prisma.utilisateur.upsert({
    where: { email: 'demo@urbanflow.test' },
    update: {},
    create: {
      email: 'demo@urbanflow.test',
      // Placeholder : le hachage argon2 arrive avec l'authentification (Phase 4).
      motDePasseHash: 'seed-placeholder-hash',
      consentementRgpdAt: new Date(),
      profilMobilite: {
        create: {
          modesPreferes: ['bus', 'velo'],
          besoinsAccessibilite: false,
        },
      },
    },
  });

  const itineraireId = randomUUID();
  await prisma.$executeRaw`
    INSERT INTO "itineraires" ("id", "dureeSecondes", "co2Grammes", "depart", "arrivee", "createdAt")
    VALUES (
      ${itineraireId},
      1080,
      420,
      ST_MakePoint(${CAPITOLE.longitude}, ${CAPITOLE.latitude})::geography,
      ST_MakePoint(${BLAGNAC.longitude}, ${BLAGNAC.latitude})::geography,
      now()
    )
  `;

  await prisma.$executeRaw`
    INSERT INTO "segments" ("id", "itineraireId", "ordre", "mode", "distanceMetres", "dureeSecondes", "co2Grammes", "operateurId", "depart", "arrivee")
    VALUES (
      ${randomUUID()},
      ${itineraireId},
      1,
      'bus',
      8200,
      1080,
      420,
      ${tisseo.id},
      ST_MakePoint(${CAPITOLE.longitude}, ${CAPITOLE.latitude})::geography,
      ST_MakePoint(${BLAGNAC.longitude}, ${BLAGNAC.latitude})::geography
    )
  `;

  await prisma.trajet.create({
    data: {
      utilisateurId: utilisateur.id,
      itineraireId,
      empreinteCarbone: {
        create: { co2Grammes: 420, co2EviteGrammes: 1800 },
      },
    },
  });

  await prisma.recompense.create({
    data: { utilisateurId: utilisateur.id, type: 'premier_trajet', points: 50 },
  });

  console.log('Seed termine.');
}

main()
  .catch((error: unknown) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
