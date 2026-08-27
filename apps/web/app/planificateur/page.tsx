import { PlanificateurForm } from './planificateur-form';

export default function PlanificateurPage() {
  return (
    <main className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <h1>Planifier un trajet</h1>
        </div>
        <PlanificateurForm />

        <p className="privacy-copy">
          Recherche d&rsquo;adresses : données Tisséo, sous licence{' '}
          <a
            href="https://data.toulouse-metropole.fr/page/licence"
            target="_blank"
            rel="noopener noreferrer"
          >
            ODbL
          </a>
          .
        </p>
      </div>
    </main>
  );
}
