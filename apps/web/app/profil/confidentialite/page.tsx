import type { Metadata } from 'next';
import { cookies } from 'next/headers';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { peutEtreAuthentifie } from '../../_lib/auth-cookies';
import { IconChevronLeft, IconShield } from '../../components/icons';
import { ConfidentialiteActions } from './confidentialite-actions';

export const metadata: Metadata = {
  title: 'Mes données — UrbanFlow Mobility',
};

export default async function ConfidentialitePage() {
  const cookieStore = await cookies();
  if (!peutEtreAuthentifie(cookieStore)) {
    redirect('/connexion');
  }

  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <Link href="/profil" className="back" aria-label="Retour au profil">
            <IconChevronLeft />
          </Link>
          <h1>Mes données</h1>
        </div>

        <div style={{ display: 'flex', justifyContent: 'center' }}>
          <span
            className="icon-box"
            style={{ width: 52, height: 52 }}
            aria-hidden="true"
          >
            <IconShield />
          </span>
        </div>

        <p className="privacy-copy">
          Conformément au RGPD, tu peux à tout moment récupérer l&apos;ensemble
          de tes données ou supprimer définitivement ton compte. Ton tracé GPS
          brut n&apos;est jamais conservé — seuls la distance, le mode et le CO₂
          associés à chaque trajet le sont.
        </p>

        <ConfidentialiteActions />
      </div>
    </main>
  );
}
