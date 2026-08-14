'use client';

import { useRouter } from 'next/navigation';
import { useState } from 'react';
import { IconDownload, IconTrash } from '../../components/icons';

export function ConfidentialiteActions() {
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleDelete() {
    const confirmed = window.confirm(
      'Supprimer définitivement ton compte ? Cette action ne peut pas être annulée.',
    );
    if (!confirmed) return;

    setDeleting(true);
    setError(null);
    try {
      const res = await fetch('/api/profil', { method: 'DELETE' });
      if (res.status === 401) {
        router.push('/connexion');
        return;
      }
      if (!res.ok) {
        setError('Impossible de supprimer le compte pour le moment. Réessaie.');
        return;
      }
      router.push('/connexion');
      router.refresh();
    } catch {
      setError('Impossible de supprimer le compte pour le moment. Réessaie.');
    } finally {
      setDeleting(false);
    }
  }

  return (
    <>
      <a href="/api/profil/export" className="list-row">
        <span className="icon-box">
          <IconDownload />
        </span>
        <span className="body">
          <strong>Télécharger mes données</strong>
          <span>Archive JSON — profil, trajets, badges</span>
        </span>
      </a>

      <div className="danger-zone">
        <strong style={{ fontSize: 13, color: 'var(--alert)' }}>
          Zone à risque
        </strong>
        <p>
          La suppression de ton compte est définitive et immédiate. Cette action
          ne peut pas être annulée.
        </p>
        {error && (
          <p className="form-banner error" role="alert">
            {error}
          </p>
        )}
        <button
          type="button"
          className="btn btn-danger btn-block"
          disabled={deleting}
          onClick={() => void handleDelete()}
        >
          <IconTrash />
          {deleting ? 'Suppression…' : 'Supprimer mon compte'}
        </button>
      </div>
    </>
  );
}
