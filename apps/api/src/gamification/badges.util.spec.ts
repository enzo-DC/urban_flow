import { paliersFranchis } from './badges.util';

describe('paliersFranchis', () => {
  it('ne renvoie rien en dessous du premier seuil', () => {
    expect(paliersFranchis(50, [])).toEqual([]);
  });

  it('renvoie bronze des que le seuil est atteint', () => {
    expect(paliersFranchis(100, [])).toEqual(['bronze']);
  });

  it('ne renvoie pas un palier deja debloque', () => {
    expect(paliersFranchis(150, ['bronze'])).toEqual([]);
  });

  it('renvoie tous les paliers franchis simultanement, sans en sauter un seul', () => {
    // Un premier trajet consequent peut faire franchir plusieurs seuils
    // d'un coup : bronze et argent doivent etre attribues tous les deux,
    // pas seulement le plus eleve.
    expect(paliersFranchis(600, [])).toEqual(['bronze', 'argent']);
  });

  it('renvoie tous les seuils si le total les depasse tous', () => {
    expect(paliersFranchis(50_000, [])).toEqual([
      'bronze',
      'argent',
      'or',
      'platine',
    ]);
  });

  it('ne renvoie que les paliers pas encore debloques', () => {
    expect(paliersFranchis(2500, ['bronze', 'argent'])).toEqual(['or']);
  });

  it('renvoie un tableau vide si tous les paliers accessibles sont deja debloques', () => {
    expect(
      paliersFranchis(50_000, ['bronze', 'argent', 'or', 'platine']),
    ).toEqual([]);
  });
});
