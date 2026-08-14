import { PlanificateurForm } from './planificateur-form';

export default function PlanificateurPage() {
  return (
    <div className="page-shell">
      <div className="page-card">
        <div className="page-header">
          <h1>Planifier un trajet</h1>
        </div>
        <PlanificateurForm />
      </div>
    </div>
  );
}
