import type { Metadata } from 'next';
import Link from 'next/link';
import { ConnexionForm } from './connexion-form';

export const metadata: Metadata = {
  title: 'Connexion — UrbanFlow Mobility',
};

export default function ConnexionPage() {
  return (
    <main className="auth-shell">
      <div className="auth-card">
        <div className="auth-brand">
          <span className="mark" aria-hidden="true">
            U
          </span>
          <h1>UrbanFlow</h1>
          <span>Se connecter à mon compte</span>
        </div>

        <ConnexionForm />

        <p className="auth-footer">
          Pas encore de compte ?{' '}
          <Link href="/inscription">Créer un compte</Link>
        </p>
        <p className="auth-footer">
          <Link href="/mentions-legales">Mentions légales</Link>
        </p>
      </div>
    </main>
  );
}
