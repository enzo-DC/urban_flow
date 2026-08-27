import type { Metadata } from 'next';
import Link from 'next/link';
import { InscriptionForm } from './inscription-form';

export const metadata: Metadata = {
  title: 'Créer un compte — UrbanFlow Mobility',
};

export default function InscriptionPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="mark" aria-hidden="true">
            U
          </span>
          <h1>Créer un compte</h1>
        </div>

        <InscriptionForm />

        <p className="auth-footer">
          Déjà un compte ? <Link href="/connexion">Se connecter</Link>
        </p>
      </div>
    </main>
  );
}
