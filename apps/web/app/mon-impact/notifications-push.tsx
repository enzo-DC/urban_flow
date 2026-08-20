'use client';

import { useState } from 'react';

function urlBase64ToUint8Array(base64String: string): Uint8Array<ArrayBuffer> {
  const padding = '='.repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, '+').replace(/_/g, '/');
  const rawData = atob(base64);
  const bytes = new Uint8Array(new ArrayBuffer(rawData.length));
  for (let i = 0; i < rawData.length; i += 1) {
    bytes[i] = rawData.charCodeAt(i);
  }
  return bytes;
}

type Etat =
  'inconnu' | 'non-supporte' | 'inactif' | 'actif' | 'refuse' | 'erreur';

// Ce composant n'est jamais rendu pendant le SSR (mon-impact-content.tsx ne
// le monte qu'apres un chargement client-side reussi) : la valeur initiale
// peut donc lire navigator/Notification directement sans risque de plantage
// serveur ni de decalage d'hydratation — pas besoin d'effet pour ca.
function etatInitial(): Etat {
  if (typeof window === 'undefined') return 'inconnu';
  if (!('serviceWorker' in navigator) || !('PushManager' in window)) {
    return 'non-supporte';
  }
  return Notification.permission === 'denied' ? 'refuse' : 'inactif';
}

export function NotificationsPush() {
  const [etat, setEtat] = useState<Etat>(etatInitial);

  async function activer() {
    try {
      const permission = await Notification.requestPermission();
      if (permission !== 'granted') {
        setEtat('refuse');
        return;
      }

      const reg = await navigator.serviceWorker.register('/sw.js');
      await navigator.serviceWorker.ready;

      const cleRes = await fetch('/api/push/cle-publique');
      const { clePublique } = (await cleRes.json()) as { clePublique: string };

      const subscription = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(clePublique),
      });

      await fetch('/api/push/abonnement', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(subscription.toJSON()),
      });

      setEtat('actif');
    } catch {
      setEtat('erreur');
    }
  }

  if (etat === 'non-supporte' || etat === 'inconnu') return null;

  const description =
    etat === 'actif'
      ? 'Activées : tu seras prévenu à chaque badge débloqué.'
      : etat === 'refuse'
        ? 'Permission refusée dans le navigateur.'
        : etat === 'erreur'
          ? 'Impossible d’activer les notifications pour le moment.'
          : 'Sois prévenu dès qu’un badge est débloqué.';

  return (
    <div className="toggle-row">
      <span className="label">
        <strong>Notifications</strong>
        <span>{description}</span>
      </span>
      {etat === 'inactif' && (
        <button
          type="button"
          className="btn btn-primary"
          onClick={() => void activer()}
        >
          Activer
        </button>
      )}
    </div>
  );
}
