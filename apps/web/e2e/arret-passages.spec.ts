import { expect, test } from '@playwright/test';

// Regression : MapLibre ferme un Popup tout seul des son ouverture si
// closeOnClick n'est pas explicitement desactive — le clic qui vient
// d'ouvrir le popup (sur un marqueur, au-dessus du canvas de la carte) est
// lui-meme interprete comme « un clic ailleurs sur la carte ». Trouve en
// instrumentant popup.isOpen() en conditions reelles (Playwright), pas
// suppose : passait de true a false en moins d'une seconde sans qu'aucun
// code du composant n'appelle .remove().
test('cliquer sur un arret affiche un popup avec les prochains passages', async ({
  page,
}) => {
  await page.goto('/planificateur');

  await page.getByLabel('Départ').fill('Place du Capitole, Toulouse');
  await page
    .locator('.search-results li button')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.search-results li button').first().click();

  await page.getByLabel('Destination').fill('Aéroport Toulouse-Blagnac');
  await page
    .locator('.search-results li button')
    .first()
    .waitFor({ state: 'visible', timeout: 10_000 });
  await page.locator('.search-results li button').first().click();

  await page.getByRole('button', { name: 'Rechercher un itinéraire' }).click();
  await page.locator('.trip-card').first().waitFor({ state: 'visible' });
  await page.locator('.trip-card').first().click();

  // Laisse le temps a fitBounds + moveend + chargement des arrets.
  await page.locator('.arret-point').first().waitFor({ state: 'attached' });

  // Un arret pris au hasard peut se trouver sous les controles zoom/geoloc
  // (coin haut-droit) ou sous un autre arret tres proche (plusieurs points
  // d'arret reels partagent le meme nom de lieu) : cible celui dont le
  // centre n'est effectivement recouvert par rien d'autre, en une seule
  // passe cote navigateur pour eviter tout ecart entre la verification et
  // le clic.
  const cibleTrouvee = await page.evaluate(() => {
    const points = Array.from(
      document.querySelectorAll<HTMLElement>('.arret-point'),
    );
    for (const point of points) {
      const rect = point.getBoundingClientRect();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      if (cx > window.innerWidth - 80 && cy < 200) continue; // controles carte
      if (document.elementFromPoint(cx, cy) === point) {
        point.setAttribute('data-e2e-cible', '1');
        return point.getAttribute('aria-label');
      }
    }
    return null;
  });
  expect(cibleTrouvee).not.toBeNull();

  await page.locator('[data-e2e-cible="1"]').click();

  const titre = page.locator('.popup-arret-titre');
  await expect(titre).toBeVisible();
  await expect(titre).not.toHaveText('');

  // Reste ouvert (pas de fermeture spontanee due a closeOnClick) et la
  // requete finit par resoudre — donnee reelle si le calendrier GTFS du
  // graphe OTP est a jour pour aujourd'hui, message de repli sinon (les
  // deux sont un succes fonctionnel, la donnee elle-meme depend de
  // l'environnement — voir docs/avancement.md).
  const corps = page.locator('.popup-arret-corps');
  await expect(corps).not.toHaveText('Chargement…', { timeout: 10_000 });
  await expect(page.locator('.maplibregl-popup')).toHaveCount(1);
});
