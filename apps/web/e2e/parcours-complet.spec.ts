import { expect, test } from '@playwright/test';

// Scenario e2e bout en bout, entierement via l'UI (aucun appel API direct) :
// inscription -> planification -> enregistrement du trajet -> consultation
// de l'impact carbone. Les briques individuelles sont deja couvertes
// separement (planificateur.spec.ts, accessibilite.spec.ts) ; celui-ci
// verifie que l'enchainement reel fonctionne de bout en bout.
test('inscription puis planification puis consultation de l’impact carbone', async ({
  page,
}) => {
  const email = `parcours-${Date.now()}@urbanflow.test`;
  const motDePasse = 'MotDePasse123!';

  await page.goto('/inscription');
  await page.getByLabel('Adresse e-mail').fill(email);
  await page.getByLabel('Mot de passe', { exact: true }).fill(motDePasse);
  await page.getByLabel('Confirmer le mot de passe').fill(motDePasse);
  await page.locator('#consentement-rgpd').check();
  await page.getByRole('button', { name: 'Créer mon compte' }).click();

  // Redirige vers "/" puis, cookie access_token pose, vers /planificateur.
  await page.waitForURL('/planificateur');

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
  await resultats.first().click();

  // Choisir un itineraire navigue vers la page dediee « trajet complet »
  // (etape par etape, prochains passages) plutot que de rester sur le
  // planificateur.
  await page.waitForURL('/planificateur/trajet');
  await expect(page.locator('.trip-detail-step').first()).toBeVisible({
    timeout: 15_000,
  });

  await page.getByRole('button', { name: 'J’ai fait ce trajet' }).click();

  await page.waitForURL('/mon-impact');
  await expect(page.locator('.impact-hero')).toBeVisible();
  await expect(page.locator('.impact-stat').first()).toContainText('1');
  await expect(page.getByText(/trajets enregistrés/)).toBeVisible();
});
