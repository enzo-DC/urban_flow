import { MODES_TRANSPORT } from '@urbanflow/shared';
import {
  calculerCo2EviteGrammes,
  calculerCo2Grammes,
  kmVoitureEquivalents,
  sourceFacteur,
} from './facteurs-ademe';

describe('calculerCo2Grammes', () => {
  it('renvoie 0 pour la marche et le velo quelle que soit la distance', () => {
    expect(calculerCo2Grammes('marche', 8000)).toBe(0);
    expect(calculerCo2Grammes('velo', 15000)).toBe(0);
  });

  it('applique le facteur du mode a la distance en kilometres', () => {
    // bus : 92 g/km -> 3 km = 276 g
    expect(calculerCo2Grammes('bus', 3000)).toBe(276);
    // voiture : 214 g/km -> 5 km = 1070 g
    expect(calculerCo2Grammes('voiture', 5000)).toBe(1070);
  });

  it('arrondit le resultat au gramme le plus proche', () => {
    // metro : 3.8 g/km -> 1.25 km = 4.75 -> arrondi a 5
    expect(calculerCo2Grammes('metro', 1250)).toBe(5);
  });

  it('la voiture emet nettement plus que le transport en commun a distance egale', () => {
    const distance = 5000;
    expect(calculerCo2Grammes('voiture', distance)).toBeGreaterThan(
      calculerCo2Grammes('bus', distance),
    );
    expect(calculerCo2Grammes('bus', distance)).toBeGreaterThan(
      calculerCo2Grammes('metro', distance),
    );
  });

  it('trottinette et scooter partagent le meme facteur (logistique de collecte assimilee)', () => {
    expect(calculerCo2Grammes('trottinette', 4000)).toBe(
      calculerCo2Grammes('scooter', 4000),
    );
  });

  it('chaque mode de la table a une source documentee et non vide', () => {
    for (const mode of MODES_TRANSPORT) {
      expect(sourceFacteur(mode).length).toBeGreaterThan(0);
    }
  });
});

describe('calculerCo2EviteGrammes', () => {
  it('calcule le delta par rapport a un trajet equivalent en voiture', () => {
    // 5 km : voiture = 1070 g, trajet reel (bus) = 460 g -> evite 610 g
    const reel = calculerCo2Grammes('bus', 5000);
    expect(calculerCo2EviteGrammes(5000, reel)).toBe(1070 - reel);
  });

  it("ne renvoie jamais un delta negatif (un trajet en voiture n'evite rien)", () => {
    const distance = 5000;
    const co2Voiture = calculerCo2Grammes('voiture', distance);
    // Un trajet reel plus emetteur que la reference voiture (cas
    // theorique, ex. plusieurs segments voiture) ne doit jamais afficher
    // un "CO2 evite" negatif a l'utilisateur.
    expect(calculerCo2EviteGrammes(distance, co2Voiture + 500)).toBe(0);
  });

  it("un trajet 100% marche evite l'integralite du CO2 voiture equivalent", () => {
    const distance = 3000;
    const co2Voiture = calculerCo2Grammes('voiture', distance);
    expect(calculerCo2EviteGrammes(distance, 0)).toBe(co2Voiture);
  });
});

describe('kmVoitureEquivalents', () => {
  it('convertit un montant de CO2 en kilometres de voiture equivalents', () => {
    // voiture : 214 g/km -> 2140 g = 10 km
    expect(kmVoitureEquivalents(2140)).toBeCloseTo(10, 5);
  });

  it("est l'inverse exact de calculerCo2Grammes pour la voiture", () => {
    const distanceMetres = 4200;
    const co2 = calculerCo2Grammes('voiture', distanceMetres);
    expect(kmVoitureEquivalents(co2)).toBeCloseTo(distanceMetres / 1000, 1);
  });
});
