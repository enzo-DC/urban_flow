/// <reference lib="esnext" />
/// <reference lib="webworker" />
import {
  CacheableResponsePlugin,
  CacheFirst,
  ExpirationPlugin,
  NetworkFirst,
} from 'serwist';
import type { RuntimeCaching } from 'serwist';

const JOUR_SECONDES = 24 * 60 * 60;

/**
 * Regles propres a UrbanFlow, evaluees avant `defaultCache` (premiere regle
 * qui matche gagne) — voir markdown/PROGRAMME_PRODUCTION.md Phase 9.
 */
export const runtimeCachingUrbanFlow: RuntimeCaching[] = [
  // App shell : bundles JS/CSS/fonts sous /_next/static, ils sont hashes par
  // leur contenu (un changement de code change l'URL), donc cache-first sans
  // risque de servir une version perimee.
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin && url.pathname.startsWith('/_next/static/'),
    handler: new CacheFirst({
      cacheName: 'app-shell',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 128,
          maxAgeSeconds: 30 * JOUR_SECONDES,
          maxAgeFrom: 'last-used',
        }),
      ],
    }),
  },
  // Tuiles cartographiques OSM : cross-origin, changent rarement. Cache-first
  // avec expiration pour limiter la charge sur tile.openstreetmap.org (leur
  // politique d'usage demande explicitement un cache client).
  {
    matcher: ({ url }) => url.origin === 'https://tile.openstreetmap.org',
    handler: new CacheFirst({
      cacheName: 'tuiles-carte',
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({
          maxEntries: 300,
          maxAgeSeconds: 30 * JOUR_SECONDES,
        }),
      ],
    }),
  },
  // Donnees temps reel (impact, gamification, lieux, itineraires...) :
  // network-first avec repli sur le cache pour un ecran "Mon impact"
  // consultable hors-ligne. /api/auth est exclu (jamais mis en cache) meme
  // si ces routes sont deja en POST et donc hors du filtre GET par defaut.
  {
    matcher: ({ url, sameOrigin }) =>
      sameOrigin &&
      url.pathname.startsWith('/api/') &&
      !url.pathname.startsWith('/api/auth/'),
    handler: new NetworkFirst({
      cacheName: 'donnees-api',
      networkTimeoutSeconds: 4,
      plugins: [
        new CacheableResponsePlugin({ statuses: [0, 200] }),
        new ExpirationPlugin({ maxEntries: 50, maxAgeSeconds: JOUR_SECONDES }),
      ],
    }),
  },
];
