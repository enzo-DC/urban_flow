import { expect, test } from '@playwright/test';

test('Capitole -> Blagnac renvoie plusieurs options triables', async ({
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

  const resultats = page.locator('.trip-card');
  await expect(resultats.first()).toBeVisible({ timeout: 15_000 });
  const nombreOptions = await resultats.count();
  expect(nombreOptions).toBeGreaterThan(1);

  // Le tri par duree est actif par defaut (correction du tri lui-meme
  // verifiee cote backend, itineraires.service.spec.ts).
  await expect(
    page.getByRole('button', { name: 'Le plus rapide' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Le moins de CO2' }).click();
  await expect(
    page.getByRole('button', { name: 'Le moins de CO2' }),
  ).toHaveAttribute('aria-pressed', 'true');

  await page.getByRole('button', { name: 'Rechercher un itinéraire' }).click();
  await expect(resultats.first()).toBeVisible({ timeout: 15_000 });
  await expect(page.locator('.form-banner.error')).toHaveCount(0);
  expect(await resultats.count()).toBeGreaterThan(1);
});
