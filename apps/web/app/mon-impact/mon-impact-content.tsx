'use client';

import type {
  GamificationResume,
  ImpactCarbone,
  Palier,
} from '@urbanflow/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lireHorsLigne, sauvegarderHorsLigne } from '../_lib/offline-store';
import { NotificationsPush } from './notifications-push';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

const ORDRE_PALIERS: Palier[] = ['bronze', 'argent', 'or', 'platine'];
const BADGE_INFO: Record<Palier, { label: string; seuil: string }> = {
  bronze: { label: 'Bronze', seuil: '100 pts' },
  argent: { label: 'Argent', seuil: '500 pts' },
  or: { label: 'Or', seuil: '2 000 pts' },
  platine: { label: 'Platine', seuil: '10 000 pts' },
};

export function MonImpactContent() {
  const router = useRouter();
  const [impact, setImpact] = useState<ImpactCarbone | null>(null);
  const [gamification, setGamification] = useState<GamificationResume | null>(
    null,
  );
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function chargerDepuisLeCache() {
      const [impactCache, gamificationCache] = await Promise.all([
        lireHorsLigne<ImpactCarbone>('impact'),
        lireHorsLigne<GamificationResume>('gamification'),
      ]);
      if (cancelled) return;
      if (impactCache && gamificationCache) {
        setImpact(impactCache);
        setGamification(gamificationCache);
        setHorsLigne(true);
      } else {
        setErreur(true);
      }
      setLoading(false);
    }

    async function load() {
      try {
        const [resImpact, resGamification] = await Promise.all([
          fetch('/api/impact'),
          fetch('/api/gamification'),
        ]);

        if (resImpact.status === 401 || resGamification.status === 401) {
          router.push('/connexion');
          return;
        }
        if (!resImpact.ok || !resGamification.ok) {
          throw new Error('reponse API non ok');
        }

        const impactBody = (await resImpact.json()) as ImpactCarbone;
        const gamificationBody =
          (await resGamification.json()) as GamificationResume;
        if (cancelled) return;
        setImpact(impactBody);
        setGamification(gamificationBody);
        setHorsLigne(false);
        setLoading(false);
        void sauvegarderHorsLigne('impact', impactBody);
        void sauvegarderHorsLigne('gamification', gamificationBody);
      } catch {
        // Reseau indisponible (ou reponse invalide) : on retombe sur la
        // derniere version connue en IndexedDB plutot que de rester
        // bloque sur "Chargement…".
        if (!cancelled) await chargerDepuisLeCache();
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  if (loading) {
    return <p className="privacy-copy">Chargement…</p>;
  }

  if (erreur || !impact || !gamification) {
    return (
      <p className="form-banner error" role="alert">
        Impossible de charger ton impact pour le moment.
      </p>
    );
  }

  if (impact.nombreTrajets === 0) {
    return (
      <div className="impact-empty">
        <p>Tu n’as pas encore enregistré de trajet.</p>
        <a href="/planificateur">Planifier un trajet →</a>
      </div>
    );
  }

  return (
    <div className="auth-form">
      {horsLigne && (
        <p className="form-banner info" role="status">
          Mode hors-ligne — dernières données connues.
        </p>
      )}
      <div className="impact-hero">
        <span className="valeur">{impact.kmVoitureEvites.toFixed(1)} km</span>
        <span className="label">de trajet en voiture évités</span>
        <span className="sous-valeur">
          soit {(impact.co2EviteGrammesTotal / 1000).toFixed(1)} kg de CO2
          évités
        </span>
      </div>

      <div className="impact-stats">
        <div className="impact-stat">
          <strong>{impact.nombreTrajets}</strong>
          <span>trajets enregistrés</span>
        </div>
        <div className="impact-stat">
          <strong>{(impact.co2EviteGrammesTotal / 1000).toFixed(1)} kg</strong>
          <span>CO2 évités au total</span>
        </div>
        <div className="impact-stat">
          <strong>{gamification.pointsTotal}</strong>
          <span>points</span>
        </div>
      </div>

      <div>
        <p className="section-title">Badges</p>
        <div className="chip-group">
          {ORDRE_PALIERS.map((palier) => {
            const debloque = gamification.badges.includes(palier);
            return (
              <span
                key={palier}
                className={`chip${debloque ? ' chip-debloque' : ' chip-verrouille'}`}
                title={
                  debloque
                    ? undefined
                    : `À partir de ${BADGE_INFO[palier].seuil}`
                }
              >
                {BADGE_INFO[palier].label}
              </span>
            );
          })}
        </div>
      </div>

      <NotificationsPush />

      <div>
        <p className="section-title">Derniers trajets</p>
        <div className="impact-historique">
          {impact.historique.map((trajet) => (
            <div key={trajet.trajetId} className="impact-row">
              <span className="date">{formatDate(trajet.effectueLe)}</span>
              <span className="co2-evite">-{trajet.co2EviteGrammes} g CO2</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
