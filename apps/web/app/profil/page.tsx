import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { peutEtreAuthentifie } from '../_lib/auth-cookies';
import { IconChevronLeft } from '../components/icons';
import { ProfilForm } from './profil-form';

export const metadata: Metadata = {
  title: 'Profil — UrbanFlow Mobility',
};

export default async function ProfilPage() {
  const cookieStore = await cookies();
  if (!peutEtreAuthentifie(cookieStore)) {
    redirect('/connexion');
  }

  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <Link href="/" className="back" aria-label="Retour à l’accueil">
            <IconChevronLeft />
          </Link>
          <h1>Profil</h1>
        </div>
        <ProfilForm />
      </div>
    </main>
  );
}
