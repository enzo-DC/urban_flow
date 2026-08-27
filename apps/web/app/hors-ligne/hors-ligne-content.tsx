'use client';

import type { GamificationResume, ImpactCarbone } from '@urbanflow/shared';
import { useEffect, useState } from 'react';
import { lireHorsLigne } from '../_lib/offline-store';

interface DonneesConnues {
  impact: ImpactCarbone | null;
  gamification: GamificationResume | null;
}

export function HorsLigneContent() {
  const [donnees, setDonnees] = useState<DonneesConnues | 'chargement'>(
    'chargement',
  );

  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const [impact, gamification] = await Promise.all([
        lireHorsLigne<ImpactCarbone>('impact'),
        lireHorsLigne<GamificationResume>('gamification'),
      ]);
      if (!cancelled) setDonnees({ impact, gamification });
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  if (donnees === 'chargement') {
    return <p className="privacy-copy">Chargement…</p>;
  }

  return (
    <div className="auth-form">
      <p className="form-banner info" role="status">
        Pas de connexion — voici tes dernières données connues.
      </p>

      {donnees.impact && donnees.gamification ? (
        <div className="impact-stats">
          <div className="impact-stat">
            <strong>{donnees.impact.nombreTrajets}</strong>
            <span>trajets enregistrés</span>
          </div>
          <div className="impact-stat">
            <strong>
              {(donnees.impact.co2EviteGrammesTotal / 1000).toFixed(1)} kg
            </strong>
            <span>CO2 évités au total</span>
          </div>
          <div className="impact-stat">
            <strong>{donnees.gamification.pointsTotal}</strong>
            <span>points</span>
          </div>
        </div>
      ) : (
        <p className="privacy-copy">
          Aucune donnée locale disponible pour l’instant.
        </p>
      )}

      <button
        type="button"
        className="btn btn-primary btn-block"
        onClick={() => window.location.reload()}
      >
        Réessayer
      </button>
    </div>
  );
}
