import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { peutEtreAuthentifie } from '../_lib/auth-cookies';
import { IconChevronLeft } from '../components/icons';
import { MonImpactContent } from './mon-impact-content';

export const metadata: Metadata = {
  title: 'Mon impact — UrbanFlow Mobility',
};

export default async function MonImpactPage() {
  const cookieStore = await cookies();
  if (!peutEtreAuthentifie(cookieStore)) {
    redirect('/connexion');
  }

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
          <h1>Mon impact</h1>
        </div>
        <MonImpactContent />
      </div>
    </main>
  );
}
