import { expect, Page, test } from '@playwright/test';

const chargePath = '/enterprise-employees/charge-balances';
const employee = {
  id: 'employee-test', firstName: 'Awa', lastName: 'Diop', email: 'awa@example.org',
  phoneNumber: '770001122', status: 'ACTIVE',
};

test.describe('Rechargement des comptes par Kkiapay', () => {
  let checkoutError: string | null;
  let topupError: boolean;
  let checkoutRequests: number;
  let financialCalls: string[];

  test.beforeEach(async ({ page }) => {
    checkoutError = null;
    topupError = false;
    checkoutRequests = 0;
    financialCalls = [];
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'company-test', name: 'Entreprise Exemple', email: 'entreprise@example.org', role: 'Entreprise',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-checkout-test-token', expiresAt: new Date(Date.now() + 60_000).toISOString(),
      }));
    });
    // All provider and financial requests stay in the browser test.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      if (path === '/api/v1/wave/checkout-links') {
        checkoutRequests += 1;
        expect(request.headers()['authorization']).toBe('Bearer local-checkout-test-token');
        const payload = request.postDataJSON();
        expect(payload.amount).toBe(2500);
        expect(payload.paymentMethod).toBe('momo');
        expect(payload.callbackUrl).toBe(new URL(chargePath, page.url()).href);
        if (checkoutError) {
          await route.fulfill({ status: 400, json: { code: 'PAYMENT_REQUEST_REJECTED', message: checkoutError } });
        } else {
          const paymentUrl = new URL('/api/v1/wave/checkout/test-payload.signature', page.url());
          paymentUrl.searchParams.set('callback', payload.callbackUrl);
          await route.fulfill({ json: { paymentUrl: paymentUrl.href } });
        }
      } else if (path.startsWith('/api/v1/wave/checkout/')) {
        expect(request.headers()['authorization']).toBeUndefined();
        const callback = new URL(request.url()).searchParams.get('callback')!;
        const complete = new URL(callback);
        complete.searchParams.set('transactionId', 'transaction-test');
        complete.searchParams.set('status', 'success');
        await route.fulfill({ contentType: 'text/html', body: `<!doctype html>
          <title>Paiement de test</title><a href="${complete.href}">Confirmer le paiement de test</a>` });
      } else if (path.endsWith('/wallet-test/top-up')) {
        financialCalls.push('top-up');
        expect(request.postDataJSON()).toEqual({
          amount: 2500, currency: 'XOF', providerTransactionId: 'transaction-test',
        });
        await route.fulfill(topupError
          ? { status: 503, json: { message: 'Le portefeuille est temporairement indisponible.' } }
          : { json: { id: 'wallet-test', balance: 2500 } });
      } else if (path.endsWith('/wallets/bulk-transfers')) {
        financialCalls.push('bulk-transfers');
        expect(request.postDataJSON()).toEqual({
          sourceOwnerId: 'company-test', sourceWalletType: 'COMPANY',
          destinationOwnerIds: ['employee-test'], destinationWalletType: 'EMPLOYEE', amount: 2500, currency: 'XOF',
        });
        await route.fulfill({ json: { destinationCount: 1, totalAmount: 2500 } });
      } else if (path.endsWith('/employees/page')) {
        await route.fulfill({ json: { data: {
          content: [employee], page: 0, size: 10, totalElements: 1, totalPages: 1,
        } } });
      } else if (path.endsWith('/employees')) {
        await route.fulfill({ json: { data: [employee] } });
      } else if (path.includes('/wallets/owners/')) {
        await route.fulfill({ json: { id: 'wallet-test', balance: 0, currency: 'XOF', active: true } });
      } else if (path.includes('/notifications')) {
        await route.fulfill({ json: { data: {
          items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0,
        } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'No data in this local test' } });
      }
    });
  });

  async function reviewCharge(page: Page) {
    await page.goto(chargePath);
    await expect(page.getByText('1 comptes seront crédités')).toBeVisible();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByLabel('Montant par salarié').fill('2500');
    await page.getByRole('button', { name: 'Voir le récapitulatif' }).click();
  }

  test('ouvre le paiement puis vérifie la transaction avant de créditer les salariés', async ({ page }) => {
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('link', { name: 'Confirmer le paiement de test' })).toBeVisible();
    expect(financialCalls).toEqual([]);
    await page.getByRole('link', { name: 'Confirmer le paiement de test' }).click();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    await expect(page.getByText(/1 compte\(s\) chargé\(s\)/)).toBeVisible();
    expect(checkoutRequests).toBe(1);
    expect(financialCalls).toEqual(['top-up', 'bulk-transfers']);
    expect(await page.evaluate(() => sessionStorage.getItem('jp_pending_employee_topup'))).toBeNull();
  });

  test('affiche le motif du 400 et permet une nouvelle tentative', async ({ page }) => {
    checkoutError = 'Checkout signing secret is not configured';
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('alert')).toHaveText(checkoutError);
    await expect(page.getByRole('button', { name: 'Payer avec KkiaPay' })).toBeEnabled();
    expect(await page.evaluate(() => sessionStorage.getItem('jp_pending_employee_topup'))).toBeNull();
    expect(financialCalls).toEqual([]);
    checkoutError = null;
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('link', { name: 'Confirmer le paiement de test' })).toBeVisible();
    expect(checkoutRequests).toBe(2);
  });

  test('conserve la demande et affiche le 503 au retour sans transférer de solde', async ({ page }) => {
    topupError = true;
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await page.getByRole('link', { name: 'Confirmer le paiement de test' }).click();
    await expect(page.getByRole('alert')).toHaveText('Le portefeuille est temporairement indisponible.');
    expect(financialCalls).toEqual(['top-up']);
    expect(await page.evaluate(() => sessionStorage.getItem('jp_pending_employee_topup'))).not.toBeNull();
  });
});
