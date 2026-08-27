import type { NextConfig } from 'next';
import { withSerwist } from '@serwist/turbopack';
import { withSentryConfig } from '@sentry/nextjs';

// Sans nonce (voir https://nextjs.org/docs/app/guides/content-security-policy
// "Without Nonces") : un CSP a base de nonce exige que TOUTES les pages
// soient en rendu dynamique (Next ne peut injecter un nonce que par requete),
// ce qui desactiverait le rendu statique de /connexion, /inscription et
// /planificateur — verifie en conditions reelles (next build && next start) :
// avec un nonce, les scripts de ces pages statiques sont bloques (aucun
// nonce disponible au moment du build). script-src reste donc en
// 'unsafe-inline', le compromis documente par Next.js lui-meme pour ce cas.
const CSP = [
  `default-src 'self'`,
  `script-src 'self' 'unsafe-inline'`,
  `style-src 'self' 'unsafe-inline'`,
  `img-src 'self' data:`,
  // Tuiles OSM : MapLibre les recupere via fetch(), pas <img> — connect-src,
  // pas img-src. Meme origine mise en cache par le service worker.
  `connect-src 'self' https://tile.openstreetmap.org`,
  `font-src 'self'`,
  `manifest-src 'self'`,
  `worker-src 'self'`,
  `frame-ancestors 'none'`,
  `base-uri 'self'`,
  `form-action 'self'`,
].join('; ');

const SECURITY_HEADERS = [
  { key: 'Content-Security-Policy', value: CSP },
  { key: 'X-Content-Type-Options', value: 'nosniff' },
  { key: 'X-Frame-Options', value: 'DENY' },
  { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
  // Sans effet tant que servi en HTTP (localhost, dev/Docker) — les
  // navigateurs ignorent HSTS hors HTTPS. Prend effet des le passage en
  // TLS (Caddy/Let's Encrypt, Phase 12).
  {
    key: 'Strict-Transport-Security',
    value: 'max-age=63072000; includeSubDomains',
  },
];

const nextConfig: NextConfig = {
  async headers() {
    return [{ source: '/(.*)', headers: SECURITY_HEADERS }];
  },
};

export default withSentryConfig(withSerwist(nextConfig), {
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
  // Absent tant qu'aucun projet Sentry reel n'existe (voir Phase 12,
  // docs/avancement.md) : l'upload des source maps est alors simplement
  // desactive, sans faire echouer le build.
  authToken: process.env.SENTRY_AUTH_TOKEN,
  silent: true,
});
