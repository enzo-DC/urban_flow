import type { Itineraire, ModeTransport } from '@urbanflow/shared';

const LABEL_MODE: Record<ModeTransport, string> = {
  marche: 'Marche',
  velo: 'Vélo',
  trottinette: 'Trottinette',
  scooter: 'Scooter',
  bus: 'Bus',
  metro: 'Métro',
  tram: 'Tram',
  voiture: 'Voiture',
};

export function formatDuree(secondes: number): string {
  const minutes = Math.round(secondes / 60);
  if (minutes < 60) return `${minutes} min`;
  const heures = Math.floor(minutes / 60);
  const reste = minutes % 60;
  return reste === 0 ? `${heures} h` : `${heures} h ${reste}`;
}

interface CarteResultatProps {
  itineraire: Itineraire;
  selectionne: boolean;
  onSelect: () => void;
}

export function CarteResultat({
  itineraire,
  selectionne,
  onSelect,
}: CarteResultatProps) {
  return (
    <button
      type="button"
      className="trip-card"
      aria-pressed={selectionne}
      onClick={onSelect}
    >
      <div className="trip-card-modes">
        {itineraire.segments.map((segment, index) => (
          <span key={index} className={`trip-mode trip-mode-${segment.mode}`}>
            {LABEL_MODE[segment.mode]}
          </span>
        ))}
      </div>
      <div className="trip-card-stats">
        <span className="trip-stat">
          <strong>{formatDuree(itineraire.dureeSecondes)}</strong>
          <span>durée</span>
        </span>
        <span className="trip-stat">
          <strong>{itineraire.co2Grammes} g</strong>
          <span>CO2</span>
        </span>
      </div>
    </button>
  );
}
