import type { Metadata } from 'next';
import { HorsLigneContent } from './hors-ligne-content';

export const metadata: Metadata = {
  title: 'Hors ligne — UrbanFlow Mobility',
};

// Page de repli du service worker (voir app/sw.ts, fallbacks.entries) pour
// toute navigation qui echoue faute de reseau — par exemple l'ouverture de
// l'app installee en mode avion. Ne depend d'aucune donnee serveur (pas de
// cookies(), pas de redirect) puisqu'elle doit pouvoir etre precachee et
// servie integralement hors-ligne.
export default function HorsLignePage() {
  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <h1>Hors ligne</h1>
        </div>
        <HorsLigneContent />
      </div>
    </main>
  );
}
