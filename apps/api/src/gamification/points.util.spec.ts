import {
  calculerPoints,
  segmentSuspect,
  trajetSuspect,
  type SegmentPourAntiFraude,
} from './points.util';

describe('calculerPoints', () => {
  it('attribue 1 point tous les 10g de CO2 evite', () => {
    expect(calculerPoints(1000)).toBe(100);
    expect(calculerPoints(50)).toBe(5);
  });

  it('arrondit au point le plus proche', () => {
    expect(calculerPoints(24)).toBe(2); // 2.4 -> 2
    expect(calculerPoints(26)).toBe(3); // 2.6 -> 3
  });

  it('ne renvoie jamais un nombre de points negatif', () => {
    expect(calculerPoints(-500)).toBe(0);
  });

  it("renvoie 0 pour un trajet qui n'evite aucun CO2", () => {
    expect(calculerPoints(0)).toBe(0);
  });
});

describe('segmentSuspect', () => {
  function segment(
    overrides: Partial<SegmentPourAntiFraude>,
  ): SegmentPourAntiFraude {
    return {
      mode: 'velo',
      distanceMetres: 5000,
      dureeSecondes: 900,
      ...overrides,
    };
  }

  it('accepte un velo a une vitesse plausible (20 km/h)', () => {
    // 5000m en 900s = 20 km/h
    expect(segmentSuspect(segment({ mode: 'velo' }))).toBe(false);
  });

  it("signale un 'velo' roulant a une vitesse de voiture (90 km/h)", () => {
    // 5000m en 200s = 90 km/h
    expect(segmentSuspect(segment({ mode: 'velo', dureeSecondes: 200 }))).toBe(
      true,
    );
  });

  it('accepte une marche a vitesse normale (5 km/h)', () => {
    // 1000m en 720s = 5 km/h
    expect(
      segmentSuspect(
        segment({ mode: 'marche', distanceMetres: 1000, dureeSecondes: 720 }),
      ),
    ).toBe(false);
  });

  it('signale une marche a vitesse de vehicule (40 km/h)', () => {
    // 1000m en 90s = 40 km/h
    expect(
      segmentSuspect(
        segment({ mode: 'marche', distanceMetres: 1000, dureeSecondes: 90 }),
      ),
    ).toBe(true);
  });

  it("n'applique aucun plafond a la voiture", () => {
    expect(
      segmentSuspect(
        segment({ mode: 'voiture', distanceMetres: 50000, dureeSecondes: 60 }),
      ),
    ).toBe(false);
  });

  it('signale une distance non nulle sur une duree nulle ou negative', () => {
    expect(
      segmentSuspect(segment({ dureeSecondes: 0, distanceMetres: 100 })),
    ).toBe(true);
    expect(
      segmentSuspect(segment({ dureeSecondes: -5, distanceMetres: 100 })),
    ).toBe(true);
  });

  it('accepte une duree nulle si la distance est aussi nulle', () => {
    expect(
      segmentSuspect(segment({ dureeSecondes: 0, distanceMetres: 0 })),
    ).toBe(false);
  });
});

describe('trajetSuspect', () => {
  it('renvoie false si tous les segments sont plausibles', () => {
    const segments: SegmentPourAntiFraude[] = [
      { mode: 'marche', distanceMetres: 500, dureeSecondes: 400 },
      { mode: 'bus', distanceMetres: 3000, dureeSecondes: 300 },
    ];
    expect(trajetSuspect(segments)).toBe(false);
  });

  it("renvoie true des qu'un seul segment est suspect, meme entoure de segments legitimes", () => {
    const segments: SegmentPourAntiFraude[] = [
      { mode: 'marche', distanceMetres: 500, dureeSecondes: 400 },
      { mode: 'velo', distanceMetres: 5000, dureeSecondes: 200 }, // 90 km/h
      { mode: 'bus', distanceMetres: 3000, dureeSecondes: 300 },
    ];
    expect(trajetSuspect(segments)).toBe(true);
  });
});
