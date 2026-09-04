import type { Metadata } from 'next';
import Link from 'next/link';
import { IconChevronLeft } from '../components/icons';

export const metadata: Metadata = {
  title: 'Mentions légales — UrbanFlow Mobility',
};

// Page statique, sans cookies() ni donnée serveur : accessible sans compte,
// avant même la création d'un compte (LCEN — l'éditeur et les sources de
// données doivent rester identifiables sans authentification).
export default function MentionsLegalesPage() {
  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <Link href="/profil" className="back" aria-label="Retour au profil">
            <IconChevronLeft />
          </Link>
          <h1>Mentions légales</h1>
        </div>

        <div>
          <p className="section-title">Éditeur</p>
          <p className="privacy-copy">
            UrbanFlow Mobility est un projet réalisé par Enzo Couteau dans le
            cadre de la certification RNCP 36146 (Concepteur Développeur de
            Solutions Digitales). Ce n&rsquo;est pas un service commercial.
            Contact :{' '}
            <a href="mailto:enzocouteau.3008.2005@gmail.com">
              enzocouteau.3008.2005@gmail.com
            </a>
            .
          </p>
        </div>

        <div>
          <p className="section-title">Hébergement</p>
          <p className="privacy-copy">
            OVHcloud SAS — 2 rue Kellermann, 59100 Roubaix, France. Mentions
            légales complètes de l&rsquo;hébergeur :{' '}
            <a
              href="https://www.ovhcloud.com/fr/mentions-legales/"
              target="_blank"
              rel="noopener noreferrer"
            >
              ovhcloud.com/fr/mentions-legales
            </a>
            .
          </p>
        </div>

        <div>
          <p className="section-title">Fond de carte</p>
          <p className="privacy-copy">
            Les tuiles cartographiques et les données d&rsquo;itinéraire
            piéton/vélo reposent sur{' '}
            <a
              href="https://www.openstreetmap.org/copyright"
              target="_blank"
              rel="noopener noreferrer"
            >
              © les contributeurs OpenStreetMap
            </a>
            , sous licence{' '}
            <a
              href="https://opendatacommons.org/licenses/odbl/"
              target="_blank"
              rel="noopener noreferrer"
            >
              Open Database License (ODbL)
            </a>
            .
          </p>
        </div>

        <div>
          <p className="section-title">Réseau Tisséo</p>
          <p className="privacy-copy">
            Les horaires théoriques (arrêts, lignes) proviennent du jeu de
            données ouvert{' '}
            <a
              href="https://data.toulouse-metropole.fr/explore/dataset/tisseo-gtfs/information/"
              target="_blank"
              rel="noopener noreferrer"
            >
              « Tisséo : réseau transport urbain toulousain »
            </a>{' '}
            (Toulouse Métropole Data), sous licence{' '}
            <a
              href="https://data.toulouse-metropole.fr/page/licence"
              target="_blank"
              rel="noopener noreferrer"
            >
              ODbL
            </a>
            . L&rsquo;information temps réel (perturbations) et le géocodage
            d&rsquo;adresses utilisent l&rsquo;API OpenData Tisséo, réservée par
            ses conditions d&rsquo;usage aux services complémentaires (temps
            réel, calcul d&rsquo;itinéraire) et non à l&rsquo;extraction du
            référentiel — c&rsquo;est pourquoi ce dernier vient du jeu de
            données ouvert ci-dessus, pas de l&rsquo;API.
          </p>
          <p className="privacy-copy" style={{ marginTop: 8 }}>
            « Tisséo » est une marque déposée dont l&rsquo;usage exclusif
            appartient au réseau Tisséo ; elle n&rsquo;est ni utilisée dans le
            nom d&rsquo;UrbanFlow Mobility, ni dans son identité visuelle.
            Mentions légales Tisséo :{' '}
            <a
              href="https://www.tisseo.fr/mentions-legales"
              target="_blank"
              rel="noopener noreferrer"
            >
              tisseo.fr/mentions-legales
            </a>
            .
          </p>
        </div>

        <div>
          <p className="section-title">Vélos et scooters en libre-service</p>
          <p className="privacy-copy">
            La disponibilité des stations VélôToulouse et des scooters Yego
            provient des flux publics GBFS (General Bikeshare Feed
            Specification) mis à disposition par leurs opérateurs respectifs.
          </p>
        </div>

        <div>
          <p className="section-title">Données personnelles</p>
          <p className="privacy-copy">
            Le traitement de tes données (compte, trajets, export, suppression)
            est détaillé sur la page{' '}
            <Link href="/profil/confidentialite">Mes données</Link>.
          </p>
        </div>
      </div>
    </main>
  );
}
