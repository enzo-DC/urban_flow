import { versDirectionFrancaise, versNomRue } from './otp-direction.mapper';

describe('versDirectionFrancaise', () => {
  it('traduit les directions connues', () => {
    expect(versDirectionFrancaise('LEFT')).toBe('Tournez à gauche');
    expect(versDirectionFrancaise('RIGHT')).toBe('Tournez à droite');
    expect(versDirectionFrancaise('CONTINUE')).toBe('Continuez');
    expect(versDirectionFrancaise('DEPART')).toBe('Départ');
  });

  it('retombe sur "Continuez" pour une direction inconnue', () => {
    expect(versDirectionFrancaise('UNE_VALEUR_JAMAIS_VUE')).toBe('Continuez');
  });
});

describe('versNomRue', () => {
  it('traduit les libelles generiques OTP', () => {
    expect(versNomRue('road')).toBe('route');
    expect(versNomRue('path')).toBe('chemin');
    expect(versNomRue('bike path')).toBe('piste cyclable');
  });

  it('laisse un vrai nom de rue inchange', () => {
    expect(versNomRue('Rue Pargaminières')).toBe('Rue Pargaminières');
  });

  it('renvoie undefined si aucun nom n’est fourni', () => {
    expect(versNomRue(null)).toBeUndefined();
  });
});
