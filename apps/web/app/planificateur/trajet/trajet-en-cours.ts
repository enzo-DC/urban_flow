import type {
  Itineraire,
  LieuGeocode,
  VehiculeDisponible,
} from '@urbanflow/shared';

// Cle IndexedDB (offline-store) utilisee pour transmettre l'itineraire choisi
// entre /planificateur et /planificateur/trajet — aucun endpoint ne permet
// de retrouver un itineraire calcule par son id (le graphe OTP est
// interroge a la volee, rien n'est persiste cote serveur), donc pas de
// parametre d'URL possible ici. Cle partagee entre les deux pages pour
// eviter toute divergence de nom.
export const TRAJET_EN_COURS_CLE = 'trajet-en-cours';

export interface TrajetEnCours {
  itineraire: Itineraire;
  depart: LieuGeocode | null;
  arrivee: LieuGeocode | null;
  disponibilites: VehiculeDisponible[];
}
