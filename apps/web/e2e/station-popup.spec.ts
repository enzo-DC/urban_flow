import { expect, test } from '@playwright/test';

test('cliquer sur une station vélo/scooter affiche le détail (nom, adresse, disponibilité)', async ({
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
  // Choisir un itineraire n'est plus necessaire : la carte affiche desormais
  // un apercu du premier resultat des la recherche (voir choisirItineraire
  // dans planificateur-form.tsx).
  await page.locator('.station-point').first().waitFor({ state: 'attached' });

  // Meme ciblage robuste que arret-passages.spec.ts : une station peut se
  // trouver sous les controles carte ou tres proche d'une autre.
  const cibleTrouvee = await page.evaluate(() => {
    const points = Array.from(
      document.querySelectorAll<HTMLElement>('.station-point'),
    );
    for (const point of points) {
      const rect = point.getBoundingClientRect();
      const cx = rect.x + rect.width / 2;
      const cy = rect.y + rect.height / 2;
      if (cx > window.innerWidth - 80 && cy < 200) continue;
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
  await expect(page.locator('.popup-station-detail')).toBeVisible();
  await expect(page.locator('.maplibregl-popup')).toHaveCount(1);
});
