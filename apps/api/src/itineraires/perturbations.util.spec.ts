import type { PerturbationTrajet } from '../integrations/gtfs-rt/perturbation.interface';
import type { OtpItineraire } from '../integrations/otp/otp.types';
import { appliquerPerturbations } from './perturbations.util';

const COORD = { latitude: 0, longitude: 0 };

function itineraire(
  legs: Partial<OtpItineraire['legs'][number]>[],
): OtpItineraire {
  return {
    dureeSecondes: 1000,
    legs: legs.map((leg) => ({
      mode: 'metro',
      dureeSecondes: 300,
      distanceMetres: 2000,
      depart: COORD,
      arrivee: COORD,
      ...leg,
    })),
  };
}

describe('appliquerPerturbations', () => {
  it("renvoie l'itineraire inchange si aucune perturbation n'est active", () => {
    const it = itineraire([{ ligneId: 'line:61', voyageId: '123' }]);
    expect(appliquerPerturbations(it, [])).toBe(it);
  });

  it('renvoie null si un segment correspond a une annulation (par voyageId)', () => {
    const it = itineraire([{ ligneId: 'line:61', voyageId: '123' }]);
    const perturbations: PerturbationTrajet[] = [
      { tripId: '123', routeId: 'line:61', statut: 'ANNULE' },
    ];
    expect(appliquerPerturbations(it, perturbations)).toBeNull();
  });

  it('ne fait jamais retomber le rapprochement sur routeId seul (regression reelle)', () => {
    // Un voyage precis (voyageId '123') sur la ligne 'line:61' ne doit pas
    // etre annule parce qu'un AUTRE voyage de la meme ligne (tripId '999')
    // est perturbe — bug reel decouvert en testant contre le vrai flux
    // GTFS-RT (ligne tres frequentee, dizaines de perturbations actives
    // simultanement, vidait systematiquement les resultats de recherche).
    const it = itineraire([{ ligneId: 'line:61', voyageId: '123' }]);
    const perturbations: PerturbationTrajet[] = [
      { tripId: '999', routeId: 'line:61', statut: 'ANNULE' },
    ];
    expect(appliquerPerturbations(it, perturbations)).toBe(it);
  });

  it('ignore un segment sans voyageId meme si sa ligne a une perturbation active', () => {
    const it = itineraire([{ ligneId: 'line:61', voyageId: undefined }]);
    const perturbations: PerturbationTrajet[] = [
      { tripId: '999', routeId: 'line:61', statut: 'ANNULE' },
    ];
    expect(appliquerPerturbations(it, perturbations)).toBe(it);
  });

  it('ajoute le retard a la duree totale si un segment est retarde', () => {
    const it = itineraire([{ ligneId: 'line:61', voyageId: '123' }]);
    const perturbations: PerturbationTrajet[] = [
      {
        tripId: '123',
        routeId: 'line:61',
        statut: 'RETARDE',
        retardSecondes: 180,
      },
    ];
    const resultat = appliquerPerturbations(it, perturbations);
    expect(resultat?.dureeSecondes).toBe(1180);
  });

  it('ignore les segments sans ligneId ni voyageId (marche)', () => {
    const it = itineraire([{ ligneId: undefined, voyageId: undefined }]);
    const perturbations: PerturbationTrajet[] = [
      { tripId: '123', routeId: 'line:61', statut: 'ANNULE' },
    ];
    expect(appliquerPerturbations(it, perturbations)).toBe(it);
  });

  it("un statut AJOUTE n'a aucun effet sur le calcul d'itineraire", () => {
    const it = itineraire([{ ligneId: 'line:61', voyageId: '123' }]);
    const perturbations: PerturbationTrajet[] = [
      { tripId: '123', routeId: 'line:61', statut: 'AJOUTE' },
    ];
    expect(appliquerPerturbations(it, perturbations)).toBe(it);
  });
});
