import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Test e2e : necessite la base postgis + Valkey locaux
// (docker compose up -d db cache).
describe('RGPD — export et suppression de compte (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-gdpr-${randomUUID()}@urbanflow.test`;
  const password = 'correct-horse-battery-staple';

  beforeAll(async () => {
    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix('api/v1');
    app.use(cookieParser());
    app.useGlobalPipes(
      new ValidationPipe({ whitelist: true, forbidNonWhitelisted: true }),
    );
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it('exporte toutes les donnees puis supprime reellement le compte', async () => {
    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, consentementRgpd: true })
      .expect(201);

    const accessToken = (registerRes.body as { accessToken: string })
      .accessToken;
    expect(accessToken).toEqual(expect.any(String));

    const exportRes = await request(app.getHttpServer())
      .get('/api/v1/moi/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const exported = exportRes.body as {
      email: string;
      motDePasseHash?: string;
      consentementRgpdAt: string;
    };
    expect(exported.email).toBe(email);
    expect(exported.consentementRgpdAt).toEqual(expect.any(String));
    // Le hash du mot de passe ne doit jamais figurer dans l'export.
    expect(exported.motDePasseHash).toBeUndefined();

    await request(app.getHttpServer())
      .delete('/api/v1/moi')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(204);

    // Le compte n'existe plus reellement : reconnexion refusee.
    await request(app.getHttpServer())
      .post('/api/v1/auth/login')
      .send({ email, password })
      .expect(401);

    // Et plus aucune donnee a exporter (pas un flag "deleted", une suppression reelle).
    await request(app.getHttpServer())
      .get('/api/v1/moi/export')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(404);
  });

  it("refuse l'acces a /moi/export sans authentification", async () => {
    await request(app.getHttpServer()).get('/api/v1/moi/export').expect(401);
  });
});
