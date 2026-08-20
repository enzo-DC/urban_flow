'use client';

import type { ImpactCarbone } from '@urbanflow/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

function formatDate(iso: string): string {
  return new Date(iso).toLocaleDateString('fr-FR', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  });
}

export function MonImpactContent() {
  const router = useRouter();
  const [impact, setImpact] = useState<ImpactCarbone | null>(null);
  const [loading, setLoading] = useState(true);
  const [erreur, setErreur] = useState(false);

  useEffect(() => {
    let cancelled = false;

    async function load() {
      const res = await fetch('/api/impact');
      if (res.status === 401) {
        router.push('/connexion');
        return;
      }
      if (!res.ok) {
        if (!cancelled) {
          setErreur(true);
          setLoading(false);
        }
        return;
      }
      const body = (await res.json()) as ImpactCarbone;
      if (!cancelled) {
        setImpact(body);
        setLoading(false);
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

  if (erreur || !impact) {
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
      </div>

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
