import { randomUUID } from 'node:crypto';
import { INestApplication, ValidationPipe } from '@nestjs/common';
import { Test, TestingModule } from '@nestjs/testing';
import cookieParser from 'cookie-parser';
import request from 'supertest';
import { App } from 'supertest/types';
import { AppModule } from './../src/app.module';

// Test e2e : necessite la base postgis + Valkey locaux
// (docker compose up -d db cache).
describe('Profil de mobilite (e2e)', () => {
  let app: INestApplication<App>;
  const email = `e2e-profil-${randomUUID()}@urbanflow.test`;
  const password = 'correct-horse-battery-staple';
  let accessToken: string;

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

    const registerRes = await request(app.getHttpServer())
      .post('/api/v1/auth/register')
      .send({ email, password, consentementRgpd: true })
      .expect(201);
    accessToken = (registerRes.body as { accessToken: string }).accessToken;
  });

  afterAll(async () => {
    await request(app.getHttpServer())
      .delete('/api/v1/moi')
      .set('Authorization', `Bearer ${accessToken}`);
    await app.close();
  });

  it("n'a pas de profil de mobilite juste apres l'inscription", async () => {
    const res = await request(app.getHttpServer())
      .get('/api/v1/moi')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);

    const body = res.body as { email: string; profilMobilite: null };
    expect(body.email).toBe(email);
    expect(body.profilMobilite).toBeNull();
  });

  it('rejette un mode de transport inconnu', async () => {
    await request(app.getHttpServer())
      .patch('/api/v1/moi/profil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ modesPreferes: ['fusee'] })
      .expect(400);
  });

  it('cree puis met a jour le profil de mobilite (upsert)', async () => {
    const created = await request(app.getHttpServer())
      .patch('/api/v1/moi/profil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ modesPreferes: ['velo', 'metro'], besoinsAccessibilite: false })
      .expect(200);

    expect((created.body as { modesPreferes: string[] }).modesPreferes).toEqual(
      ['velo', 'metro'],
    );

    const updated = await request(app.getHttpServer())
      .patch('/api/v1/moi/profil')
      .set('Authorization', `Bearer ${accessToken}`)
      .send({ besoinsAccessibilite: true })
      .expect(200);

    const body = updated.body as {
      modesPreferes: string[];
      besoinsAccessibilite: boolean;
    };
    // Le champ non envoye (modesPreferes) doit etre conserve, pas efface.
    expect(body.modesPreferes).toEqual(['velo', 'metro']);
    expect(body.besoinsAccessibilite).toBe(true);

    const profile = await request(app.getHttpServer())
      .get('/api/v1/moi')
      .set('Authorization', `Bearer ${accessToken}`)
      .expect(200);
    expect(
      (
        profile.body as {
          profilMobilite: { besoinsAccessibilite: boolean };
        }
      ).profilMobilite.besoinsAccessibilite,
    ).toBe(true);
  });
});
