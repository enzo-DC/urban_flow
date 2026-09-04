'use client';

import dynamic from 'next/dynamic';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lireHorsLigne } from '../../_lib/offline-store';
import { IconChevronLeft } from '../../components/icons';
import { formatDuree, LABEL_MODE } from '../carte-resultat';
import { TRAJET_EN_COURS_CLE, type TrajetEnCours } from './trajet-en-cours';

const CartePlanificateur = dynamic(
  () => import('../carte-planificateur').then((mod) => mod.CartePlanificateur),
  {
    ssr: false,
    loading: () => <div className="map-shell map-shell-loading" />,
  },
);

function formatHeureDepart(iso: string): string {
  const date = new Date(iso);
  const heure = date.toLocaleTimeString('fr-FR', {
    hour: '2-digit',
    minute: '2-digit',
  });
  const minutes = Math.round((date.getTime() - Date.now()) / 60_000);
  if (minutes <= 0) return `${heure} (imminent)`;
  return `${heure} (dans ${minutes} min)`;
}

export function TrajetContent() {
  const router = useRouter();
  const [trajet, setTrajet] = useState<TrajetEnCours | null>(null);
  const [chargement, setChargement] = useState(true);
  const [enregistrement, setEnregistrement] = useState<
    'idle' | 'pending' | 'error'
  >('idle');

  useEffect(() => {
    let annule = false;
    void (async () => {
      const donnees = await lireHorsLigne<TrajetEnCours>(TRAJET_EN_COURS_CLE);
      if (annule) return;
      if (!donnees) {
        // Arrivee directe sur cette page (rechargement, lien partage…) sans
        // etre passe par la selection d'un itineraire : rien a afficher.
        router.replace('/planificateur');
        return;
      }
      setTrajet(donnees);
      setChargement(false);
    })();
    return () => {
      annule = true;
    };
  }, [router]);

  async function enregistrerTrajet() {
    if (!trajet) return;
    setEnregistrement('pending');
    try {
      const res = await fetch('/api/trajets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depart: trajet.itineraire.depart,
          arrivee: trajet.itineraire.arrivee,
          // Ne transmet que ce que l'API accepte : ni id ni co2Grammes
          // (jamais fait confiance a un total calcule cote client), ni
          // trace (jamais collectee ni transmise, RGPD).
          segments: trajet.itineraire.segments.map((segment) => ({
            mode: segment.mode,
            depart: segment.depart,
            arrivee: segment.arrivee,
            distanceMetres: segment.distanceMetres,
            dureeSecondes: segment.dureeSecondes,
            operateur: segment.operateur,
          })),
        }),
      });
      if (res.status === 401) {
        router.push('/connexion');
        return;
      }
      if (!res.ok) {
        setEnregistrement('error');
        return;
      }
      router.push('/mon-impact');
    } catch {
      setEnregistrement('error');
    }
  }

  if (chargement || !trajet) {
    return (
      <main className="page-shell">
        <div className="page-card">
          <p className="privacy-copy">Chargement…</p>
        </div>
      </main>
    );
  }

  const { itineraire } = trajet;

  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <Link
            href="/planificateur"
            className="back"
            aria-label="Retour au planificateur"
          >
            <IconChevronLeft />
          </Link>
          <h1>Trajet</h1>
        </div>

        <CartePlanificateur
          depart={trajet.depart}
          arrivee={trajet.arrivee}
          itineraire={itineraire}
          disponibilites={trajet.disponibilites}
        />

        <p className="privacy-copy">
          {formatDuree(itineraire.dureeSecondes)}, {itineraire.co2Grammes} g de
          CO2.
        </p>

        <ol className="trip-detail" aria-label="Étapes du trajet">
          {itineraire.segments.map((segment, index) => (
            <li key={index} className="trip-detail-step">
              <div className="trip-detail-row">
                <span className={`trip-mode trip-mode-${segment.mode}`}>
                  {LABEL_MODE[segment.mode]}
                </span>
                <span className="trip-detail-duree">
                  {formatDuree(segment.dureeSecondes)}
                </span>
              </div>

              {segment.mode === 'marche' ? (
                <>
                  <p className="trip-detail-texte">
                    {Math.round(segment.distanceMetres)} m à pied
                    {segment.arriveeNom &&
                      segment.arriveeNom !== 'Destination' &&
                      ` jusqu'à ${segment.arriveeNom}`}
                  </p>
                  {segment.etapes && segment.etapes.length > 0 && (
                    <details className="trip-detail-etapes">
                      <summary>
                        Voir les {segment.etapes.length} étapes à pied
                      </summary>
                      <ol>
                        {segment.etapes.map((etape, etapeIndex) => (
                          <li key={etapeIndex}>
                            {etape.direction}
                            {etape.rue && ` sur ${etape.rue}`} (
                            {Math.round(etape.distanceMetres)} m)
                          </li>
                        ))}
                      </ol>
                    </details>
                  )}
                </>
              ) : (
                <div className="trip-detail-transit">
                  <p className="trip-detail-texte">
                    {segment.ligne && (
                      <span className="popup-passage-ligne">
                        {segment.ligne}
                      </span>
                    )}{' '}
                    {segment.direction && `Direction ${segment.direction}`}
                  </p>
                  {segment.departNom && segment.arriveeNom && (
                    <p className="trip-detail-texte">
                      {segment.departNom} → {segment.arriveeNom}
                    </p>
                  )}
                  {segment.departHeure && (
                    <p className="trip-detail-heure">
                      Départ à {formatHeureDepart(segment.departHeure)}
                    </p>
                  )}
                </div>
              )}
            </li>
          ))}
        </ol>

        <button
          type="button"
          className="btn btn-primary btn-block"
          disabled={enregistrement === 'pending'}
          onClick={() => void enregistrerTrajet()}
        >
          {enregistrement === 'pending'
            ? 'Enregistrement…'
            : 'J’ai fait ce trajet'}
        </button>
        {enregistrement === 'error' && (
          <p className="form-banner error" role="alert">
            Impossible d’enregistrer ce trajet pour le moment. Réessaie.
          </p>
        )}
      </div>
    </main>
  );
}
