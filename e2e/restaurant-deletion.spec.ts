import { expect, test } from '@playwright/test';

test.describe('Suppression intégrée d’un restaurant par l’admin', () => {
  let deletes: number;
  let rejectDeletion: boolean;
  let nativeDialogs: number;

  test.beforeEach(async ({ page }) => {
    deletes = 0;
    rejectDeletion = false;
    nativeDialogs = 0;
    let deleted = false;
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'admin-test', name: 'Admin Test', email: 'admin@example.org', role: 'Admin Principal',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-restaurant-deletion-test-token', expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
    });
    // All API requests are simulated; no real restaurant, user, wallet or SMS is touched.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'DELETE') {
        expect(path).toBe('/api/v1/restaurants/restaurant-test');
        deletes += 1;
        if (rejectDeletion) {
          await route.fulfill({ status: 403, json: { message: 'Suppression refusée.' } });
        } else {
          deleted = true;
          await route.fulfill({ status: 204 });
        }
      } else if (path === '/api/v1/restaurants') {
        const restaurant = {
          registrationNumber: 'SN-TEST', ownerId: 'owner-test', phoneNumber: '770001122',
          country: 'Sénégal', city: 'Dakar', district: 'Grand Yoff', street: 'Rue Test',
          status: 'ACTIVE', paymentEligibilityStatus: 'ELIGIBLE', createdAt: '2026-10-15T02:00:00Z',
        };
        await route.fulfill({ json: [
          ...(!deleted ? [{ ...restaurant, id: 'restaurant-test', name: 'Restaurant Test' }] : []),
          { ...restaurant, id: 'restaurant-kept', name: 'Restaurant Conservé' },
        ] });
      } else if (path.includes('/notifications')) {
        await route.fulfill({ json: { success: true, data: {
          items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0,
        } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'No data in this local test' } });
      }
    });
    page.on('dialog', async dialog => {
      nativeDialogs += 1;
      await dialog.dismiss();
    });
    await page.goto('/restaurants');
    await expect(page.locator('td[data-label="Restaurant"]').filter({ hasText: 'Restaurant Test' })).toBeVisible();
  });

  test.afterEach(() => expect(nativeDialogs).toBe(0));

  async function openConfirmation(page: import('@playwright/test').Page) {
    const row = page.getByRole('row').filter({ has: page.getByText('Restaurant Test', { exact: true }) });
    await row.getByRole('button', { name: 'Actions restaurant', exact: true }).click();
    await page.getByText('Supprimer', { exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toContainText('Restaurant Test');
    await expect(dialog).toContainText('historique');
    expect(deletes).toBe(0);
    return dialog;
  }

  test('annuler et Échap conservent le restaurant sans appeler la suppression', async ({ page }) => {
    const dialog = await openConfirmation(page);
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(deletes).toBe(0);
    await openConfirmation(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    expect(deletes).toBe(0);
  });

  test('supprimer retire seulement le restaurant sélectionné et persiste après rechargement', async ({ page }) => {
    const dialog = await openConfirmation(page);
    await dialog.getByRole('button', { name: 'Supprimer le restaurant', exact: true }).click();
    await expect(page.getByText('Le restaurant Restaurant Test a été supprimé. Son historique est conservé.')).toBeVisible();
    await expect(page.locator('td[data-label="Restaurant"]')).toHaveText(['Restaurant Conservé']);
    expect(deletes).toBe(1);
    await page.reload();
    await expect(page.locator('td[data-label="Restaurant"]')).toHaveText(['Restaurant Conservé']);
  });

  test('un refus affiche un message et conserve le restaurant', async ({ page }) => {
    rejectDeletion = true;
    const dialog = await openConfirmation(page);
    await dialog.getByRole('button', { name: 'Supprimer le restaurant', exact: true }).click();
    await expect(page.getByText('Suppression refusée.', { exact: true })).toBeVisible();
    await expect(page.locator('td[data-label="Restaurant"]')).toHaveCount(2);
    expect(deletes).toBe(1);
  });
});
