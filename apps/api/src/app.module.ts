import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { EventEmitterModule } from '@nestjs/event-emitter';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { IntegrationsModule } from './integrations/integrations.module';
import { ItinerairesModule } from './itineraires/itineraires.module';
import { LieuxModule } from './lieux/lieux.module';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { TrajetsModule } from './trajets/trajets.module';
import { UsersModule } from './users/users.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      // .env (local, host="localhost") passe avant ../../.env (racine, host="db" pour Docker) :
      // dotenv ne surcharge pas une variable deja definie, donc le premier fichier gagne.
      envFilePath: ['.env', '../../.env'],
    }),
    EventEmitterModule.forRoot(),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    IntegrationsModule,
    ItinerairesModule,
    LieuxModule,
    TrajetsModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
