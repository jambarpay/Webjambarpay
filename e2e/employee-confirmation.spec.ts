import { expect, test } from '@playwright/test';

test.describe('Confirmation intégrée de suppression d’un salarié', () => {
  let deletes: number;
  let nativeDialogs: number;

  test.beforeEach(async ({ page }) => {
    deletes = 0;
    nativeDialogs = 0;
    let deleted = false;
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'company-test', name: 'Entreprise Exemple', email: 'entreprise@example.org', role: 'Entreprise',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-confirmation-test-token', expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
    });
    // All API calls are intercepted: these checks never delete real data or send a message.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (request.method() === 'DELETE') {
        expect(path).toBe('/api/v1/users/company/company-test/employees/employee-test');
        deletes += 1;
        deleted = true;
        await route.fulfill({ json: { success: true, data: null } });
      } else if (path.endsWith('/employees/page')) {
        const content = deleted ? [] : [{
          id: 'employee-test', firstName: 'Awa', lastName: 'Diop', email: 'awa@example.org',
          phoneNumber: '770001122', status: 'PENDING_OTP',
        }];
        await route.fulfill({ json: { success: true, data: {
          content, page: 0, size: 10, totalElements: content.length, totalPages: content.length ? 1 : 0,
        } } });
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
    await page.goto('/enterprise-employees');
    await expect(page.getByRole('button', { name: 'Actions pour Awa Diop' })).toBeVisible();
  });

  test.afterEach(() => expect(nativeDialogs).toBe(0));

  async function openConfirmation(page: import('@playwright/test').Page) {
    await page.getByRole('button', { name: 'Actions pour Awa Diop' }).click();
    await page.getByText('Supprimer le salarié', { exact: true }).click();
    const dialog = page.getByRole('alertdialog');
    await expect(dialog).toBeVisible();
    await expect(dialog).toContainText('Awa Diop');
    await expect(dialog).toContainText('Cette action est irréversible');
    await expect(dialog.getByRole('button', { name: 'Annuler', exact: true })).toBeFocused();
    expect(deletes).toBe(0);
    return dialog;
  }

  test('Annuler, Échap et fermer conservent le salarié sans appeler la suppression', async ({ page }, testInfo) => {
    const dialog = await openConfirmation(page);
    await page.screenshot({ path: testInfo.outputPath('employee-delete-confirmation.png') });
    await dialog.getByRole('button', { name: 'Annuler', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(deletes).toBe(0);

    await openConfirmation(page);
    await page.keyboard.press('Escape');
    await expect(dialog).not.toBeVisible();
    await expect(page.getByRole('button', { name: 'Actions pour Awa Diop' })).toBeVisible();
    expect(deletes).toBe(0);

    await openConfirmation(page);
    await dialog.getByRole('button', { name: 'Fermer sans confirmer', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    expect(deletes).toBe(0);
  });

  test('Entrée sur le bouton initialement sélectionné annule sans supprimer', async ({ page }) => {
    const dialog = await openConfirmation(page);
    await page.keyboard.press('Enter');
    await expect(dialog).not.toBeVisible();
    expect(deletes).toBe(0);
  });

  test('Supprimer le salarié effectue un seul appel après confirmation', async ({ page }) => {
    const dialog = await openConfirmation(page);
    await dialog.getByRole('button', { name: 'Supprimer le salarié', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.getByText('Le salarié Awa Diop a été supprimé.')).toBeVisible();
    await expect(page.getByRole('button', { name: 'Actions pour Awa Diop' })).toHaveCount(0);
    expect(deletes).toBe(1);
  });
});
