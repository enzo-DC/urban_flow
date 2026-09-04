import { expect, test } from '@playwright/test';

// Le detail complet des noms d'arrets pour chaque segment de transport en
// commun est verifie en conditions reelles contre la production (voir
// docs/avancement.md) — le graphe OTP local peut etre perime et ne renvoyer
// qu'un itineraire a pied, insuffisant pour exercer cette partie ici. Ce
// test verifie la structure qui, elle, ne depend pas de la fraicheur du
// graphe : un segment par mode de l'itineraire selectionne, avec son
// libelle.
test("le detail de l'itineraire selectionne liste un segment par mode", async ({
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

  // Compte les modes sur la carte AVANT de cliquer : le clic navigue vers
  // /planificateur/trajet, ou la carte de resultat n'existe plus.
  const modesDansLaCarte = await page
    .locator('.trip-card')
    .first()
    .locator('.trip-mode')
    .count();
  await page.locator('.trip-card').first().click();

  await page.waitForURL('/planificateur/trajet');
  const detail = page.locator('.trip-detail');
  await expect(detail).toBeVisible();

  const modesDansLeDetail = await detail.locator('.trip-detail-row').count();
  expect(modesDansLeDetail).toBe(modesDansLaCarte);
});
