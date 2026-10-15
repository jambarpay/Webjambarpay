import { expect, test } from '@playwright/test';

test.describe('Actions administrateur sur une entreprise', () => {
  let activations: number;
  let deletions: number;
  let accountStatus: 'DISABLED' | 'ACTIVE';
  const conflict = 'Cette entreprise possède encore des comptes rattachés. Sa suppression est impossible.';

  test.beforeEach(async ({ page }) => {
    activations = 0;
    deletions = 0;
    accountStatus = 'DISABLED';
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'admin-test', name: 'Admin Test', email: 'admin@example.org', role: 'Admin Principal',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-admin-actions-test-token', expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
    });

    // Intercept every API call: no real account is changed and no SMS is sent.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === '/api/v1/users/role/ENTREPRISE' && request.method() === 'GET') {
        await route.fulfill({ json: { success: true, data: [{
          id: 'enterprise-test', firstName: 'Entreprise', lastName: 'Exemple',
          phoneNumber: '770001122', role: 'ENTREPRISE', status: accountStatus,
          createdAt: '2026-10-14T12:00:00Z',
        }] } });
      } else if (path === '/api/v1/users/admin/activate' && request.method() === 'POST') {
        expect(request.postDataJSON()).toEqual({ userId: 'enterprise-test', status: 'ACTIVE' });
        activations += 1;
        accountStatus = 'ACTIVE';
        await route.fulfill({ json: { success: true, data: null } });
      } else if (path === '/api/v1/users/admin/enterprise-test' && request.method() === 'DELETE') {
        deletions += 1;
        await route.fulfill({ status: 409, json: { success: false, message: conflict, errorCode: 'CONFLICT' } });
      } else if (path.includes('/notifications')) {
        await route.fulfill({ json: { success: true, data: {
          items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0,
        } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'No data in this local test' } });
      }
    });
    await page.goto('/companies');
    await expect(page.getByRole('button', { name: 'Actions entreprise', exact: true })).toBeVisible();
  });

  test('annuler une réactivation ne modifie pas le compte', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions entreprise', exact: true }).click();
    await page.getByText('Réactiver', { exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Entreprise Exemple');
    expect(activations).toBe(0);
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(activations).toBe(0);
    expect(deletions).toBe(0);
    await expect(page.locator('td[data-label="Statut"]')).toHaveText('Inactif');
  });

  test('réactiver met à jour le statut et reste actif après rechargement', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions entreprise', exact: true }).click();
    await page.getByText('Réactiver', { exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await dialog.getByRole('button', { name: 'Réactiver l’entreprise', exact: true }).click();
    await expect(page.getByText('Entreprise réactivée avec succès.', { exact: true })).toBeVisible();
    await expect(page.locator('td[data-label="Statut"]')).toHaveText('Actif');
    expect(activations).toBe(1);
    expect(deletions).toBe(0);

    await page.reload();
    await expect(page.locator('td[data-label="Statut"]')).toHaveText('Actif');
    await page.getByRole('button', { name: 'Actions entreprise', exact: true }).click();
    await expect(page.getByText('Désactiver', { exact: true })).toBeVisible();
    await expect(page.getByText('Réactiver', { exact: true })).toHaveCount(0);
  });

  test('une suppression refusée affiche la raison et conserve l’entreprise', async ({ page }) => {
    await page.getByRole('button', { name: 'Actions entreprise', exact: true }).click();
    await page.getByText('Supprimer définitivement', { exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    expect(deletions).toBe(0);
    await dialog.getByRole('button', { name: 'Supprimer l’entreprise', exact: true }).click();
    await expect(page.getByText(conflict, { exact: true })).toBeVisible();
    await expect(page.locator('td[data-label="Entreprise"]')).toHaveText('Entreprise Exemple');
    expect(deletions).toBe(1);
    expect(activations).toBe(0);
  });
});
