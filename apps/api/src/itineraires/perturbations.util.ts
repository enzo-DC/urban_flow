import type { PerturbationTrajet } from '../integrations/gtfs-rt/perturbation.interface';
import type { OtpItineraire } from '../integrations/otp/otp.types';

function trouverPerturbation(
  ligneId: string | undefined,
  voyageId: string | undefined,
  perturbations: PerturbationTrajet[],
): PerturbationTrajet | undefined {
  if (!ligneId && !voyageId) return undefined;
  return perturbations.find(
    (p) =>
      (voyageId && p.tripId === voyageId) || (ligneId && p.routeId === ligneId),
  );
}

/**
 * Applique les perturbations GTFS-RT connues a un itineraire OTP : un
 * segment annule invalide l'itineraire entier (il ne circulera pas), un
 * retard significatif s'ajoute a la duree totale. Un trajet ajoute (statut
 * AJOUTE) n'a pas d'effet ici — pertinent pour un tableau d'affichage temps
 * reel, pas pour un calcul d'itineraire.
 */
export function appliquerPerturbations(
  itineraire: OtpItineraire,
  perturbations: PerturbationTrajet[],
): OtpItineraire | null {
  if (perturbations.length === 0) return itineraire;

  let dureeSupplementaire = 0;
  for (const leg of itineraire.legs) {
    const perturbation = trouverPerturbation(
      leg.ligneId,
      leg.voyageId,
      perturbations,
    );
    if (!perturbation) continue;
    if (perturbation.statut === 'ANNULE') return null;
    if (perturbation.statut === 'RETARDE' && perturbation.retardSecondes) {
      dureeSupplementaire += perturbation.retardSecondes;
    }
  }

  if (dureeSupplementaire === 0) return itineraire;
  return {
    ...itineraire,
    dureeSecondes: itineraire.dureeSecondes + dureeSupplementaire,
  };
}
