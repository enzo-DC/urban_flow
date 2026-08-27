import * as Sentry from '@sentry/nextjs';

// Desactive tant qu'aucun DSN n'est fourni (dev/test) — actif uniquement une
// fois deploye avec un vrai projet Sentry (Phase 12).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
  });
}
