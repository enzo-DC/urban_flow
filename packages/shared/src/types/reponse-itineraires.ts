import type { Itineraire } from './itineraire';
import type { VehiculeDisponible } from './vehicule-disponible';

export interface ReponseItineraires {
  itineraires: Itineraire[];
  /** Vehicules en libre-service disponibles autour de la recherche (tous operateurs confondus). */
  disponibilites: VehiculeDisponible[];
}
