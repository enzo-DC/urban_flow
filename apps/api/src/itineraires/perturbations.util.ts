import type { PerturbationTrajet } from '../integrations/gtfs-rt/perturbation.interface';
import type { OtpItineraire } from '../integrations/otp/otp.types';

/**
 * Uniquement par voyageId (tripId), jamais par ligneId (routeId) seul.
 *
 * Piege reel decouvert en testant contre le vrai flux GTFS-RT : une ligne
 * tres frequentee peut avoir des dizaines d'entites de perturbation actives
 * simultanement (une par voyage de la journee). Faire retomber le
 * rapprochement sur routeId des que voyageId ne correspond pas fait
 * remonter un faux positif quasi systematique — un voyage parfaitement
 * normal se fait annuler parce qu'un AUTRE voyage de la meme ligne, a une
 * autre heure, est perturbe. Verifie en conditions reelles : la ligne 99
 * avait 22 entites de perturbation actives, dont une annulation sur un
 * voyage totalement different de celui propose par OTP — ca vidait
 * systematiquement les resultats de recherche pour cette ligne.
 */
function trouverPerturbation(
  voyageId: string | undefined,
  perturbations: PerturbationTrajet[],
): PerturbationTrajet | undefined {
  if (!voyageId) return undefined;
  return perturbations.find((p) => p.tripId === voyageId);
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
    const perturbation = trouverPerturbation(leg.voyageId, perturbations);
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
