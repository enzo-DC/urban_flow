import { Module } from '@nestjs/common';
import { APP_FILTER, APP_GUARD } from '@nestjs/core';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { minutes, ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { SentryGlobalFilter, SentryModule } from '@sentry/nestjs/setup';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { CarboneModule } from './carbone/carbone.module';
import { GamificationModule } from './gamification/gamification.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ItinerairesModule } from './itineraires/itineraires.module';
import { LieuxModule } from './lieux/lieux.module';
import { PrismaModule } from './prisma/prisma.module';
import { PushModule } from './push/push.module';
import { RedisModule } from './redis/redis.module';
import { TrajetsModule } from './trajets/trajets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    // Premier import (recommandation @sentry/nestjs) — no-op tant que
    // SENTRY_DSN n'est pas defini (voir instrument.ts).
    SentryModule.forRoot(),
    ConfigModule.forRoot({
      isGlobal: true,
      // .env (local, host="localhost") passe avant ../../.env (racine, host="db" pour Docker) :
      // dotenv ne surcharge pas une variable deja definie, donc le premier fichier gagne.
      envFilePath: ['.env', '../../.env'],
    }),
    // Limite globale generreuse (usage normal de l'app) ; les endpoints
    // sensibles (auth/login, auth/register) resserrent via @Throttle().
    ThrottlerModule.forRoot([{ ttl: minutes(1), limit: 60 }]),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    ItinerairesModule,
    LieuxModule,
    TrajetsModule,
    CarboneModule,
    GamificationModule,
    PushModule,
  ],
  controllers: [AppController],
  providers: [
    AppService,
    { provide: APP_GUARD, useClass: ThrottlerGuard },
    // Doit etre enregistre avant tout autre filtre d'exception (aucun autre
    // ici) pour capturer les erreurs non gerees vers Sentry.
    { provide: APP_FILTER, useClass: SentryGlobalFilter },
  ],
})
export class AppModule {}
