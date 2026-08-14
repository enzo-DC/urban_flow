import { calculerCo2Grammes } from './facteurs-co2';

describe('calculerCo2Grammes', () => {
  it('renvoie 0 pour la marche et le velo quelle que soit la distance', () => {
    expect(calculerCo2Grammes('marche', 5000)).toBe(0);
    expect(calculerCo2Grammes('velo', 12000)).toBe(0);
  });

  it('applique le facteur du mode a la distance en kilometres', () => {
    // bus : 103 g/km -> 3 km = 309 g
    expect(calculerCo2Grammes('bus', 3000)).toBe(309);
  });

  it('arrondit le resultat au gramme le plus proche', () => {
    // metro : 4 g/km -> 1.25 km = 5 g
    expect(calculerCo2Grammes('metro', 1250)).toBe(5);
  });

  it('la voiture emet nettement plus que le transport en commun a distance egale', () => {
    const distance = 5000;
    expect(calculerCo2Grammes('voiture', distance)).toBeGreaterThan(
      calculerCo2Grammes('bus', distance),
    );
  });
});
