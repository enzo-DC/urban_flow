'use client';

import type {
  CritereTri,
  Itineraire,
  LieuGeocode,
  ReponseItineraires,
} from '@urbanflow/shared';
import dynamic from 'next/dynamic';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { CarteResultat, formatDuree } from './carte-resultat';
import { ChampAdresse } from './champ-adresse';

const CartePlanificateur = dynamic(
  () => import('./carte-planificateur').then((mod) => mod.CartePlanificateur),
  {
    ssr: false,
    loading: () => <div className="map-shell map-shell-loading" />,
  },
);

const CRITERES: { valeur: CritereTri; label: string }[] = [
  { valeur: 'duree', label: 'Le plus rapide' },
  { valeur: 'co2', label: 'Le moins de CO2' },
];

const GEOLOC_TIMEOUT_MS = 8000;

export function PlanificateurForm() {
  const router = useRouter();
  const [depart, setDepart] = useState<LieuGeocode | null>(null);
  const [arrivee, setArrivee] = useState<LieuGeocode | null>(null);
  const [critereTri, setCritereTri] = useState<CritereTri>('duree');
  const [accessible, setAccessible] = useState(false);
  const [itineraires, setItineraires] = useState<Itineraire[]>([]);
  const [selectionId, setSelectionId] = useState<string | null>(null);
  const [pending, setPending] = useState(false);
  const [erreur, setErreur] = useState<string | null>(null);
  const [geolocEnCours, setGeolocEnCours] = useState(false);
  const [enregistrement, setEnregistrement] = useState<
    'idle' | 'pending' | 'error'
  >('idle');

  const itineraireSelectionne =
    itineraires.find((it) => it.id === selectionId) ?? itineraires[0] ?? null;

  // Pre-coche le trajet accessible si l'utilisateur connecte l'a deja
  // demande dans son profil ; reste decochable au cas par cas, et ne fait
  // rien pour un invite (401 ignore, le planificateur reste utilisable sans
  // compte).
  useEffect(() => {
    let cancelled = false;
    void (async () => {
      const res = await fetch('/api/profil').catch(() => null);
      if (!res?.ok || cancelled) return;
      const data = (await res.json()) as {
        profilMobilite: { besoinsAccessibilite: boolean } | null;
      };
      if (data.profilMobilite?.besoinsAccessibilite) setAccessible(true);
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function utiliserMaPosition() {
    if (!navigator.geolocation) {
      setErreur(
        'La géolocalisation n’est pas disponible sur cet appareil. Saisis ton point de départ.',
      );
      return;
    }
    setGeolocEnCours(true);
    navigator.geolocation.getCurrentPosition(
      (position) => {
        setDepart({
          label: 'Ma position',
          position: {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          },
        });
        setGeolocEnCours(false);
      },
      () => {
        setErreur(
          'Géolocalisation refusée ou indisponible. Saisis ton point de départ.',
        );
        setGeolocEnCours(false);
      },
      { timeout: GEOLOC_TIMEOUT_MS },
    );
  }

  async function rechercher() {
    if (!depart || !arrivee) {
      setErreur('Choisis un point de départ et une destination.');
      return;
    }
    setPending(true);
    setErreur(null);
    setItineraires([]);
    setSelectionId(null);
    try {
      const res = await fetch('/api/itineraires', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depart: depart.position,
          arrivee: arrivee.position,
          critereTri,
          accessible,
        }),
      });
      if (!res.ok) {
        setErreur(
          'Impossible de calculer un itinéraire pour le moment. Réessaie.',
        );
        return;
      }
      const body = (await res.json()) as ReponseItineraires;
      setItineraires(body.itineraires);
      if (body.itineraires.length === 0) {
        setErreur('Aucun itinéraire trouvé pour ce trajet.');
      }
    } catch {
      setErreur(
        'Impossible de calculer un itinéraire pour le moment. Réessaie.',
      );
    } finally {
      setPending(false);
    }
  }

  async function enregistrerTrajet() {
    if (!itineraireSelectionne) return;
    setEnregistrement('pending');
    try {
      const res = await fetch('/api/trajets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          depart: itineraireSelectionne.depart,
          arrivee: itineraireSelectionne.arrivee,
          // Ne transmet que ce que l'API accepte : ni id ni co2Grammes
          // (jamais fait confiance a un total calcule cote client), ni
          // trace (jamais collectee ni transmise, RGPD).
          segments: itineraireSelectionne.segments.map((segment) => ({
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

  return (
    <div className="planner-form">
      <div className="planner-fields">
        <ChampAdresse
          id="depart"
          label="Départ"
          valeur={depart}
          onSelect={setDepart}
          placeholder="Adresse, lieu…"
        />
        <button
          type="button"
          className="btn-geoloc"
          onClick={utiliserMaPosition}
          disabled={geolocEnCours}
        >
          {geolocEnCours ? 'Localisation…' : 'Utiliser ma position'}
        </button>
        <ChampAdresse
          id="arrivee"
          label="Destination"
          valeur={arrivee}
          onSelect={setArrivee}
          placeholder="Adresse, lieu…"
        />
      </div>

      <div className="chip-group" role="group" aria-label="Trier par">
        {CRITERES.map((critere) => (
          <button
            key={critere.valeur}
            type="button"
            className="chip"
            aria-pressed={critereTri === critere.valeur}
            onClick={() => setCritereTri(critere.valeur)}
          >
            {critere.label}
          </button>
        ))}
      </div>

      <div className="toggle-row">
        <span className="label">
          <strong>Itinéraire accessible</strong>
          <span>Privilégie les options accessibles PMR</span>
        </span>
        <button
          type="button"
          className="toggle"
          role="switch"
          aria-checked={accessible}
          aria-label="Itinéraire accessible"
          onClick={() => setAccessible((value) => !value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={pending}
        onClick={() => void rechercher()}
      >
        {pending ? 'Recherche…' : 'Rechercher un itinéraire'}
      </button>

      {erreur && (
        <p className="form-banner error" role="alert">
          {erreur}
        </p>
      )}

      <CartePlanificateur
        depart={depart}
        arrivee={arrivee}
        itineraire={itineraireSelectionne}
      />

      {itineraires.length > 0 && (
        <div
          className="trip-results"
          role="list"
          aria-label="Itinéraires trouvés"
        >
          {itineraires.map((itineraire) => (
            <CarteResultat
              key={itineraire.id}
              itineraire={itineraire}
              selectionne={itineraire.id === itineraireSelectionne?.id}
              onSelect={() => setSelectionId(itineraire.id)}
            />
          ))}
        </div>
      )}

      {itineraireSelectionne && (
        <div className="trip-confirm">
          <p>
            Itinéraire sélectionné :{' '}
            {formatDuree(itineraireSelectionne.dureeSecondes)},{' '}
            {itineraireSelectionne.co2Grammes} g de CO2.
          </p>
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
      )}
    </div>
  );
}
