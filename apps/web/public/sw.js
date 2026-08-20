// Service worker minimal, uniquement pour la reception des notifications
// Web Push (Phase 8). Les strategies de cache/mode hors-ligne d'une PWA
// complete (manifest, installabilite) sont le sujet de la Phase 9 — ce
// fichier sera etendu (ou remplace par Serwist) a ce moment-la, pas
// avant : pas de scope au-dela du strict necessaire pour ce qui est
// demande maintenant.
self.addEventListener('push', (event) => {
  const donnees = event.data ? event.data.json() : {};
  event.waitUntil(
    self.registration.showNotification(donnees.titre || 'UrbanFlow Mobility', {
      body: donnees.corps || '',
    }),
  );
});

self.addEventListener('notificationclick', (event) => {
  event.notification.close();
  event.waitUntil(clients.openWindow('/mon-impact'));
});
