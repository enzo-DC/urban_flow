import * as Sentry from '@sentry/nextjs';

// Desactive tant qu'aucun DSN n'est fourni (dev/test) — actif uniquement une
// fois deploye avec un vrai projet Sentry (Phase 12). NEXT_PUBLIC_* : seul
// prefixe que Next.js inline dans le bundle navigateur, un DSN Sentry n'est
// pas un secret (il ne permet que d'envoyer des evenements, jamais d'en lire).
if (process.env.NEXT_PUBLIC_SENTRY_DSN) {
  Sentry.init({
    dsn: process.env.NEXT_PUBLIC_SENTRY_DSN,
    environment: process.env.NODE_ENV ?? 'development',
  });
}

export const onRouterTransitionStart = Sentry.captureRouterTransitionStart;
