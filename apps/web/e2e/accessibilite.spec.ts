import { AxeBuilder } from '@axe-core/playwright';
import { expect, test, type Page } from '@playwright/test';

// Zero violation critique en CI (regle du dossier, voir markdown/CLAUDE.md) ;
// les violations d'un autre niveau sont journalisees mais ne font pas
// echouer le test — elles restent un signal a traiter, pas un blocage.
async function verifierPage(page: Page, url: string) {
  await page.goto(url);
  const resultats = await new AxeBuilder({ page }).analyze();

  const critiques = resultats.violations.filter((v) => v.impact === 'critical');
  const autres = resultats.violations.filter((v) => v.impact !== 'critical');
  if (autres.length > 0) {
    console.log(
      `${url} — violations non critiques :`,
      autres.map((v) => `${v.id} (${v.impact})`),
    );
  }

  expect(
    critiques,
    critiques.map((v) => `${v.id}: ${v.description}`).join('\n'),
  ).toHaveLength(0);
}

test.describe('Accessibilite (axe-core) — pages principales', () => {
  test('connexion', async ({ page }) => {
    await verifierPage(page, '/connexion');
  });

  test('inscription', async ({ page }) => {
    await verifierPage(page, '/inscription');
  });

  test('planificateur', async ({ page }) => {
    await verifierPage(page, '/planificateur');
  });

  test('mon impact et profil (utilisateur connecte)', async ({ page }) => {
    const email = `verif-a11y-${Date.now()}@example.com`;
    await page.goto('/connexion');
    await page.request.post('/api/auth/register', {
      data: { email, password: 'MotDePasse123!', consentementRgpd: true },
    });

    await verifierPage(page, '/mon-impact');
    await verifierPage(page, '/profil');
  });
});
