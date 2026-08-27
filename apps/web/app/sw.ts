/// <reference lib="esnext" />
/// <reference lib="webworker" />
import { defaultCache } from '@serwist/turbopack/worker';
import { Serwist } from 'serwist';
import type { PrecacheEntry, SerwistGlobalConfig } from 'serwist';
import { runtimeCachingUrbanFlow } from './sw-runtime-caching';

declare global {
  interface WorkerGlobalScope extends SerwistGlobalConfig {
    __SW_MANIFEST: (PrecacheEntry | string)[] | undefined;
  }
}

declare const self: ServiceWorkerGlobalScope;

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  // Nos regles d'abord (premiere regle qui matche gagne) ; le reste des
  // requetes retombe sur la liste recommandee par Next.js.
  runtimeCaching: [...runtimeCachingUrbanFlow, ...defaultCache],
});

serwist.addEventListeners();

// Reception des notifications Web Push (Phase 8) — deplace ici depuis
// l'ancien public/sw.js manuel, desormais genere par Serwist.
self.addEventListener('push', (event) => {
  const donnees = event.data
    ? (event.data.json() as { titre?: string; corps?: string })
    : {};
  event.waitUntil(
    self.registration.showNotification(donnees.titre || 'UrbanFlow Mobility', {
      body: donnees.corps || '',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(self.clients.openWindow('/mon-impact'));
});
