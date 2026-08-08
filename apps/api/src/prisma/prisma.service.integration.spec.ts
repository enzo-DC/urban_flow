import 'dotenv/config';
import { ConfigService } from '@nestjs/config';
import { PrismaService } from './prisma.service';

// Test d'integration : necessite la base postgis locale (docker compose up -d db)
// et un jeu de donnees issu de `pnpm db:seed`.
describe('PrismaService — recherche de proximite (ST_DWithin)', () => {
  let prisma: PrismaService;

  beforeAll(async () => {
    prisma = new PrismaService(new ConfigService());
    await prisma.$connect();
  });

  afterAll(async () => {
    await prisma.$disconnect();
  });

  it('trouve un itineraire dont le depart est proche du point recherche', async () => {
    // Capitole, Toulouse — correspond au depart seede par prisma/seed.ts.
    const resultats = await prisma.itinerairesProchesDuDepart(
      1.4442,
      43.6047,
      300,
    );

    expect(resultats.length).toBeGreaterThan(0);
    expect(resultats[0].distanceMetres).toBeLessThan(300);
  });

  it('ne retourne rien pour un point trop eloigne de tout depart connu', async () => {
    // Paris — largement hors du rayon de recherche.
    const resultats = await prisma.itinerairesProchesDuDepart(
      2.3522,
      48.8566,
      300,
    );

    expect(resultats).toHaveLength(0);
  });
});
