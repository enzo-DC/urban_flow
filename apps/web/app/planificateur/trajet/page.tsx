import type { Metadata } from 'next';
import { TrajetContent } from './trajet-content';

export const metadata: Metadata = {
  title: 'Trajet — UrbanFlow Mobility',
};

// Pas de cookies()/redirect() ici : l'itineraire vient d'IndexedDB (cote
// client uniquement, voir trajet-en-cours.ts), la page reste utilisable
// sans compte comme le reste du planificateur.
export default function TrajetPage() {
  return <TrajetContent />;
}
