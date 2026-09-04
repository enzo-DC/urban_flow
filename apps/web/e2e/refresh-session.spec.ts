import { expect, test } from '@playwright/test';

// Regression : access_token (15 min) expire bien avant refresh_token (7 j) —
// c'est le fonctionnement normal. Avant correction, l'absence du cookie
// access_token (supprime par le navigateur a expiration) faisait echouer
// callAuthenticated() sans jamais tenter le refresh, forcant une
// reconnexion manuelle. Simule l'expiration en supprimant uniquement
// access_token (pas refresh_token) plutot que d'attendre 15 minutes.
test('reste connecte sur une page authentifiee apres expiration du seul access_token', async ({
  page,
  context,
}) => {
  const email = `refresh-${Date.now()}@urbanflow.test`;
  await page.goto('/connexion');
  await page.request.post('/api/auth/register', {
    data: { email, password: 'MotDePasse123!', consentementRgpd: true },
  });

  await context.clearCookies({ name: 'access_token' });
  const cookiesApresSuppression = await context.cookies();
  expect(cookiesApresSuppression.some((c) => c.name === 'access_token')).toBe(
    false,
  );
  expect(cookiesApresSuppression.some((c) => c.name === 'refresh_token')).toBe(
    true,
  );

  await page.goto('/profil');
  await expect(page).toHaveURL(/\/profil$/);
  await expect(page.getByRole('heading', { name: 'Profil' })).toBeVisible();
  // Attend que ProfilForm ait fini son fetch('/api/profil') cote client
  // (c'est ce fetch qui declenche le refresh) — le titre h1 statique du
  // Server Component ne suffit pas a le garantir.
  await expect(page.getByText('Modes préférés')).toBeVisible();

  // Le refresh reussi doit avoir repose un access_token frais.
  const cookiesApresRefresh = await context.cookies();
  expect(cookiesApresRefresh.some((c) => c.name === 'access_token')).toBe(true);
});
