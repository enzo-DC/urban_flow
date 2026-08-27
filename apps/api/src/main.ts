// Doit s'importer avant tout le reste pour instrumenter correctement le
// reste de l'application (voir README @sentry/nestjs).
import './instrument';
import cookieParser from 'cookie-parser';
import helmet from 'helmet';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.use(cookieParser());
  // API JSON pure (aucune page HTML servie) : la CSP par defaut de helmet
  // n'a pas d'interet ici, contrairement aux en-tetes de durcissement
  // (X-Content-Type-Options, HSTS, etc.) — CSP est geree cote web
  // (apps/web/next.config.ts) qui sert reellement du HTML.
  app.use(helmet({ contentSecurityPolicy: false }));
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );
  app.enableCors({
    origin: process.env.WEB_ORIGIN ?? 'http://localhost:3000',
    credentials: true,
  });
  await app.listen(process.env.PORT ?? 3000);
}
void bootstrap();
