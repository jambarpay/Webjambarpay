import { expect, test } from '@playwright/test';

test.describe('Catégories de partenaires dans l’admin', () => {
  let partnerType: string;
  let submittedType: string | undefined;
  let rejectUpdate: boolean;

  test.beforeEach(async ({ page }) => {
    partnerType = 'RESTAURANT';
    submittedType = undefined;
    rejectUpdate = false;
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'admin-test', name: 'Admin Test', email: 'admin@example.org', role: 'Admin Principal',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-category-test-token', expiresAt: new Date(Date.now() + 120_000).toISOString(),
      }));
    });
    // All API requests are mocked: no real owner, wallet, payment or SMS is created.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const partner = {
        id: 'partner-test', name: 'Partenaire Test', registrationNumber: 'REG-TEST',
        ownerId: 'owner-kept', phoneNumber: '770001122', country: 'Sénégal', city: 'Dakar',
        district: 'Grand Yoff', street: 'Rue Test', status: 'SUSPENDED',
        paymentEligibilityStatus: 'SUSPENDED', partnerType, createdAt: '2026-10-15T12:00:00Z',
      };
      if ((request.method() === 'POST' && path === '/api/v1/restaurants') ||
          (request.method() === 'PUT' && path === '/api/v1/restaurants/partner-test')) {
        const payload = request.postDataJSON();
        submittedType = payload.partnerType;
        if (rejectUpdate) {
          await route.fulfill({ status: 400, json: { message: 'Catégorie refusée.' } });
          return;
        }
        expect(payload.partnerType).toMatch(/^(RESTAURANT|SHOP|SUPERMARKET|MARKET)$/);
        expect(payload.paymentEligibilityStatus).toBeUndefined();
        expect(payload.status).toBeUndefined();
        partnerType = payload.partnerType;
        await route.fulfill({ json: { ...partner, ...payload, ownerId: 'owner-kept', partnerType } });
      } else if (path === '/api/v1/restaurants') {
        await route.fulfill({ json: [partner] });
      } else if (path.includes('/notifications')) {
        await route.fulfill({ json: { success: true, data: {
          items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0,
        } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'No data in this local test' } });
      }
    });
  });

  test('la création enregistre le type choisi et le conserve après rechargement', async ({ page }) => {
    await page.goto('/restaurants/add');
    await page.getByRole('radio', { name: /^Boutique/ }).check();
    await page.locator('#restaurant-name').fill('Boutique Test');
    await page.locator('#owner-email').fill('owner@example.org');
    await page.locator('#restaurant-phone-number').fill('770001122');
    await page.locator('#owner-name').fill('Awa Ndiaye');
    await page.locator('#restaurant-location').fill('Grand Yoff');
    await page.getByRole('button', { name: 'Inscrire le partenaire', exact: true }).click();
    await expect(page).toHaveURL(/\/restaurants$/);
    await expect(page.locator('td[data-label="Catégorie"]')).toHaveText(['Boutique']);
    expect(submittedType).toBe('SHOP');
    await page.reload();
    await expect(page.locator('td[data-label="Catégorie"]')).toHaveText(['Boutique']);
  });

  test('la modification conserve le statut inactif et persiste le changement de catégorie', async ({ page }) => {
    await page.goto('/restaurants');
    await page.getByRole('button', { name: 'Actions restaurant', exact: true }).click();
    await page.getByText('Modifier', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await expect(dialog.getByRole('radio', { name: /^Restaurant/ })).toBeChecked();
    await dialog.getByRole('radio', { name: /^Supermarché/ }).check();
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(dialog).not.toBeVisible();
    await expect(page.locator('td[data-label="Catégorie"]')).toHaveText(['Supermarché']);
    await expect(page.locator('td[data-label="Statut"]')).toContainText('Inactif');
    expect(submittedType).toBe('SUPERMARKET');
    await page.reload();
    await expect(page.locator('td[data-label="Catégorie"]')).toHaveText(['Supermarché']);
  });

  test('une catégorie refusée ne remplace pas la catégorie enregistrée', async ({ page }) => {
    rejectUpdate = true;
    await page.goto('/restaurants');
    await page.getByRole('button', { name: 'Actions restaurant', exact: true }).click();
    await page.getByText('Modifier', { exact: true }).click();
    const dialog = page.getByRole('dialog');
    await dialog.getByRole('radio', { name: /^Marché/ }).check();
    await dialog.getByRole('button', { name: 'Enregistrer', exact: true }).click();
    await expect(page.getByText('Catégorie refusée.', { exact: true })).toBeVisible();
    await expect(dialog).toBeVisible();
    await expect(page.locator('td[data-label="Catégorie"]')).toHaveText(['Restaurant']);
    expect(partnerType).toBe('RESTAURANT');
  });
});
