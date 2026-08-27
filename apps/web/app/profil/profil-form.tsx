'use client';

import { MODES_TRANSPORT, type ModeTransport } from '@urbanflow/shared';
import { useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';
import { lireHorsLigne, sauvegarderHorsLigne } from '../_lib/offline-store';

const MODE_LABELS: Record<ModeTransport, string> = {
  marche: 'Marche',
  velo: 'Vélo',
  trottinette: 'Trottinette',
  scooter: 'Scooter',
  bus: 'Bus',
  metro: 'Métro',
  tram: 'Tram',
  voiture: 'Voiture',
};

interface ProfileData {
  email: string;
  createdAt: string;
  profilMobilite: {
    modesPreferes: ModeTransport[];
    besoinsAccessibilite: boolean;
  } | null;
}

export function ProfilForm() {
  const router = useRouter();
  const [profile, setProfile] = useState<ProfileData | null>(null);
  const [modesPreferes, setModesPreferes] = useState<ModeTransport[]>([]);
  const [besoinsAccessibilite, setBesoinsAccessibilite] = useState(false);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [horsLigne, setHorsLigne] = useState(false);
  const [message, setMessage] = useState<{
    kind: 'success' | 'error';
    text: string;
  } | null>(null);

  useEffect(() => {
    let cancelled = false;

    function appliquer(data: ProfileData) {
      setProfile(data);
      setModesPreferes(data.profilMobilite?.modesPreferes ?? []);
      setBesoinsAccessibilite(
        data.profilMobilite?.besoinsAccessibilite ?? false,
      );
    }

    async function load() {
      try {
        const res = await fetch('/api/profil');
        if (res.status === 401) {
          router.push('/connexion');
          return;
        }
        if (!res.ok) throw new Error('reponse API non ok');

        const data = (await res.json()) as ProfileData;
        if (cancelled) return;
        appliquer(data);
        setHorsLigne(false);
        setLoading(false);
        void sauvegarderHorsLigne('profil', data);
      } catch {
        const donneesCache = await lireHorsLigne<ProfileData>('profil');
        if (cancelled) return;
        if (donneesCache) {
          appliquer(donneesCache);
          setHorsLigne(true);
        }
        setLoading(false);
      }
    }

    void load();
    return () => {
      cancelled = true;
    };
  }, [router]);

  function toggleMode(mode: ModeTransport) {
    setModesPreferes((current) =>
      current.includes(mode)
        ? current.filter((item) => item !== mode)
        : [...current, mode],
    );
  }

  async function handleSave() {
    setSaving(true);
    setMessage(null);
    try {
      const res = await fetch('/api/profil', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ modesPreferes, besoinsAccessibilite }),
      });
      if (res.status === 401) {
        router.push('/connexion');
        return;
      }
      if (!res.ok) {
        setMessage({
          kind: 'error',
          text: 'Impossible d’enregistrer les préférences. Réessaie.',
        });
        return;
      }
      setMessage({ kind: 'success', text: 'Préférences enregistrées.' });
    } catch {
      setMessage({
        kind: 'error',
        text: 'Impossible d’enregistrer les préférences. Réessaie.',
      });
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <p className="privacy-copy">Chargement…</p>;
  }

  if (!profile) {
    return (
      <p className="form-banner error" role="alert">
        Impossible de charger ton profil pour le moment.
      </p>
    );
  }

  return (
    <div className="auth-form">
      {horsLigne && (
        <p className="form-banner info" role="status">
          Mode hors-ligne — dernières données connues.
        </p>
      )}
      <div className="profile-head">
        <span className="avatar" aria-hidden="true">
          {profile.email.charAt(0).toUpperCase()}
        </span>
        <span>
          <strong>{profile.email}</strong>
        </span>
      </div>

      {message && (
        <p className={`form-banner ${message.kind}`} role="alert">
          {message.text}
        </p>
      )}

      <div>
        <p className="section-title">Modes préférés</p>
        <div className="chip-group">
          {MODES_TRANSPORT.map((mode) => (
            <button
              key={mode}
              type="button"
              className="chip"
              aria-pressed={modesPreferes.includes(mode)}
              onClick={() => toggleMode(mode)}
            >
              {MODE_LABELS[mode]}
            </button>
          ))}
        </div>
      </div>

      <div className="toggle-row">
        <span className="label">
          <strong>Itinéraires accessibles</strong>
          <span>Priorité aux options PMR</span>
        </span>
        <button
          type="button"
          className="toggle"
          role="switch"
          aria-checked={besoinsAccessibilite}
          aria-label="Itinéraires accessibles"
          onClick={() => setBesoinsAccessibilite((value) => !value)}
        />
      </div>

      <button
        type="button"
        className="btn btn-primary btn-block"
        disabled={saving}
        onClick={() => void handleSave()}
      >
        {saving ? 'Enregistrement…' : 'Enregistrer'}
      </button>

      <a href="/profil/confidentialite" className="auth-footer">
        Confidentialité et mes données →
      </a>
    </div>
  );
}
