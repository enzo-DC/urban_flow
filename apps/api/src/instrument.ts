import * as Sentry from '@sentry/nestjs';

// Desactive tant qu'aucun DSN n'est fourni (dev/test) : aucune tentative de
// connexion, aucun bruit — actif uniquement une fois deploye avec un vrai
// projet Sentry (SENTRY_DSN dans le .env de production, voir Phase 12).
if (process.env.SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
  });
}
