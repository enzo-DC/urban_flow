'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { IconLeaf, IconRoute, IconUser } from './icons';

// Barre de navigation à trois entrées imposée par la maquette V1 (voir
// markdown/claude-rule-frontend.md, « Écrans ») — ne pas en ajouter une
// quatrième sans validation. Masquée sur les écrans hors périmètre nav
// (pré-authentification, repli hors-ligne) : usePathname() plutôt qu'une
// lecture de cookie côté serveur, pour ne pas rendre dynamique des pages
// autrement statiques (connexion/inscription) ou dépendantes du réseau
// (hors-ligne doit rester précachable telle quelle, voir hors-ligne/page.tsx).
const ONGLETS = [
  { href: '/planificateur', label: 'Itinéraire', Icon: IconRoute },
  { href: '/mon-impact', label: 'Mon impact', Icon: IconLeaf },
  { href: '/profil', label: 'Profil', Icon: IconUser },
] as const;

const MASQUEE_SUR = ['/connexion', '/inscription', '/hors-ligne'];

export function NavBar() {
  const pathname = usePathname();

  if (MASQUEE_SUR.some((route) => pathname === route)) {
    return null;
  }

  return (
    <nav className="app-nav" aria-label="Navigation principale">
      <Link
        href="/planificateur"
        className="app-nav-brand"
        aria-label="UrbanFlow — accueil"
      >
        <span className="mark" aria-hidden="true">
          U
        </span>
        <span className="app-nav-wordmark">UrbanFlow</span>
      </Link>

      <ul className="app-nav-links">
        {ONGLETS.map(({ href, label, Icon }) => {
          const actif = pathname === href || pathname.startsWith(`${href}/`);
          return (
            <li key={href}>
              <Link
                href={href}
                className="app-nav-item"
                aria-current={actif ? 'page' : undefined}
              >
                <Icon className="app-nav-icon" />
                <span>{label}</span>
              </Link>
            </li>
          );
        })}
      </ul>
    </nav>
  );
}
