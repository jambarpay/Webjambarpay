import { expect, Page, test } from '@playwright/test';

const chargePath = '/enterprise-employees/charge-balances';
const storageKey = 'jp_employee_topup_company-test';
const employee = {
  id: 'employee-test', firstName: 'Awa', lastName: 'Diop', email: 'awa@example.org',
  phoneNumber: '770001122', status: 'ACTIVE',
};

test.describe('Chargement des salariés par une demande KkiaPay', () => {
  let createError: string | null;
  let completionError: boolean;
  let loseCompletionResponse: boolean;
  let createRequestIds: string[];
  let completeRequests: number;
  let creditsApplied: number;
  let completed: boolean;
  let legacyCalls: string[];

  test.beforeEach(async ({ page }) => {
    createError = null;
    completionError = false;
    loseCompletionResponse = false;
    createRequestIds = [];
    completeRequests = 0;
    creditsApplied = 0;
    completed = false;
    legacyCalls = [];
    await page.addInitScript(() => {
      sessionStorage.setItem('jp_user', JSON.stringify({
        id: 'company-test', name: 'Entreprise Exemple', email: 'entreprise@example.org', role: 'Entreprise',
      }));
      sessionStorage.setItem('jp_access_token', JSON.stringify({
        value: 'local-checkout-test-token', expiresAt: new Date(Date.now() + (new URL(location.href).searchParams.get('expiredTest') === 'true' ? -60_000 : 60_000)).toISOString(),
      }));
    });
    // No request reaches KkiaPay or a real wallet service.
    await page.route('**/api/v1/**', async route => {
      const request = route.request();
      const path = new URL(request.url()).pathname;
      const intent = {
        id: 'topup-test', requestId: createRequestIds.at(-1) ?? 'test-request',
        status: completed ? 'COMPLETED' : 'PENDING', employeeIds: ['employee-test'],
        amountPerEmployee: 2500, totalAmount: 2500, currency: 'XOF', reason: '',
        paymentUrl: new URL('/api/v1/wave/checkout/test.signature', page.url()).href,
        expiresAt: new Date(Date.now() + 1800000).toISOString(), sandbox: true,
        transactionId: completed ? 'transaction-test' : null,
      };
      if (path === '/api/v1/auth/login') {
        await route.fulfill({ json: { success: true, data: {
          accessToken: 'local-checkout-test-token', tokenType: 'Bearer', expiresAt: (Date.now() + 60_000) / 1000,
          profile: { id: 'company-test', name: 'Entreprise Exemple', email: 'entreprise@example.org', role: 'ENTREPRISE' },
        } } });
      } else if (path === '/api/v1/wallets/employee-topups') {
        expect(request.headers()['authorization']).toBe('Bearer local-checkout-test-token');
        const payload = request.postDataJSON();
        expect(payload.employeeIds).toEqual(['employee-test']);
        expect(payload.amountPerEmployee).toBe(2500);
        expect(payload.callbackUrl).toBe(new URL(chargePath, page.url()).href);
        expect(payload.requestId).toMatch(/^[a-f0-9-]{36}$/);
        createRequestIds.push(payload.requestId);
        await route.fulfill(createError
          ? { status: 503, json: { code: 'CHECKOUT_UNAVAILABLE', message: createError } }
          : { json: { ...intent, requestId: payload.requestId } });
      } else if (path === '/api/v1/wallets/employee-topups/topup-test/complete') {
        expect(request.postDataJSON()).toEqual({ transactionId: 'transaction-test' });
        completeRequests += 1;
        if (completionError) {
          await route.fulfill({ status: 503, json: { message: 'La vérification est temporairement indisponible.' } });
          return;
        }
        if (!completed) creditsApplied += 1;
        completed = true;
        if (loseCompletionResponse) await route.abort();
        else await route.fulfill({ json: { ...intent, status: 'COMPLETED', transactionId: 'transaction-test' } });
      } else if (path === '/api/v1/wallets/employee-topups/topup-test'
        || path === '/api/v1/wallets/employee-topups/topup-test/checkout') {
        await route.fulfill({ json: intent });
      } else if (path.startsWith('/api/v1/wave/checkout/')) {
        const callback = new URL(chargePath, page.url());
        callback.searchParams.set('topUpId', 'topup-test');
        callback.searchParams.set('transactionId', 'transaction-test');
        callback.searchParams.set('status', 'success');
        await route.fulfill({ contentType: 'text/html', body: `<!doctype html>
          <title>Paiement de test</title><a href="${callback.href}">Confirmer le paiement de test</a>` });
      } else if (path.endsWith('/top-up') || path.endsWith('/bulk-transfers') || path === '/api/v1/wave/checkout-links') {
        legacyCalls.push(path);
        await route.fulfill({ status: 500, json: { message: 'Legacy payment path must not be used' } });
      } else if (path.endsWith('/employees/page')) {
        await route.fulfill({ json: { data: {
          content: [employee], page: 0, size: 10, totalElements: 1, totalPages: 1,
        } } });
      } else if (path.endsWith('/employees')) {
        await route.fulfill({ json: { data: [employee, { ...employee, id: 'inactive-test', status: 'PENDING_OTP' }] } });
      } else if (path.includes('/wallets/owners/')) {
        await route.fulfill({ json: { id: 'wallet-test', balance: 0, currency: 'XOF', active: true } });
      } else if (path.includes('/notifications')) {
        await route.fulfill({ json: { data: {
          items: [], page: 0, size: 20, totalElements: 0, totalPages: 0, unreadCount: 0,
        } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'Demande introuvable.' } });
      }
    });
  });

  test.afterEach(() => { expect(legacyCalls).toEqual([]); });

  async function reviewCharge(page: Page) {
    await page.goto(chargePath);
    await expect(page.getByText('1 comptes seront crédités')).toBeVisible();
    await expect(page.getByText(/1 salarié\(s\) avec un compte inactif/)).toBeVisible();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await page.getByLabel('Montant par salarié').fill('2500');
    await page.getByRole('button', { name: 'Voir le récapitulatif' }).click();
  }

  test('enregistre le chargement puis confirme une seule opération côté serveur', async ({ page }) => {
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('link', { name: 'Confirmer le paiement de test' })).toBeVisible();
    expect(creditsApplied).toBe(0);
    await page.getByRole('link', { name: 'Confirmer le paiement de test' }).click();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    await expect(page.getByText(/1 compte\(s\) chargé\(s\)/)).toBeVisible();
    expect(createRequestIds).toHaveLength(1);
    expect(completeRequests).toBe(1);
    expect(creditsApplied).toBe(1);
    expect(await page.evaluate(key => sessionStorage.getItem(key), storageKey)).toBeNull();
  });

  test('réutilise la référence de demande après un échec de création', async ({ page }) => {
    createError = 'Le service de paiement est indisponible.';
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('alert')).toHaveText(createError);
    createError = null;
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await expect(page.getByRole('link', { name: 'Confirmer le paiement de test' })).toBeVisible();
    expect(createRequestIds).toHaveLength(2);
    expect(new Set(createRequestIds).size).toBe(1);
    expect(creditsApplied).toBe(0);
  });

  test('reprend la vérification après un 503 sans rouvrir le paiement', async ({ page }) => {
    completionError = true;
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await page.getByRole('link', { name: 'Confirmer le paiement de test' }).click();
    await expect(page.getByRole('alert')).toHaveText('La vérification est temporairement indisponible.');
    await expect(page.getByRole('button', { name: 'Payer avec KkiaPay' })).toHaveCount(0);
    completionError = false;
    await page.getByRole('button', { name: 'Vérifier le paiement', exact: true }).click();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    expect(createRequestIds).toHaveLength(1);
    expect(completeRequests).toBe(2);
    expect(creditsApplied).toBe(1);
  });

  test('retrouve une confirmation réussie lorsque la réponse réseau a été perdue', async ({ page }) => {
    loseCompletionResponse = true;
    await reviewCharge(page);
    await page.getByRole('button', { name: 'Payer avec KkiaPay' }).click();
    await page.getByRole('link', { name: 'Confirmer le paiement de test' }).click();
    await expect(page.getByRole('alert')).toBeVisible();
    expect(creditsApplied).toBe(1);
    await page.reload();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    expect(completeRequests).toBe(1);
    expect(creditsApplied).toBe(1);
  });

  test('retrouve la demande serveur même sans stockage navigateur', async ({ page }) => {
    await page.goto(`${chargePath}?topUpId=topup-test&transactionId=transaction-test`);
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    expect(completeRequests).toBe(1);
    expect(creditsApplied).toBe(1);
  });

  test('reprend la confirmation après reconnexion si la session a expiré', async ({ page }) => {
    await page.goto(`${chargePath}?topUpId=topup-test&transactionId=transaction-test&expiredTest=true`);
    await expect(page).toHaveURL(/\/login\?returnUrl=/);
    await page.getByLabel('Adresse email', { exact: true }).fill('entreprise@example.org');
    await page.getByLabel('Mot de passe', { exact: true }).fill('test-password-only');
    await page.getByRole('button', { name: 'Se connecter', exact: true }).click();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    expect(creditsApplied).toBe(1);
  });

  test('vérifie une référence connue sans lancer un deuxième paiement', async ({ page }) => {
    await page.goto(`${chargePath}?topUpId=topup-test`);
    await page.getByLabel('Référence du paiement KkiaPay').fill('transaction-test');
    await page.getByRole('button', { name: 'Vérifier cette référence' }).click();
    await expect(page).toHaveURL(/\/enterprise-employees$/);
    expect(createRequestIds).toHaveLength(0);
    expect(creditsApplied).toBe(1);
  });

  test('reprend le lien de paiement de la même demande après un retour sans transaction', async ({ page }) => {
    await page.goto(`${chargePath}?topUpId=topup-test`);
    await expect(page.getByRole('button', { name: 'Reprendre le paiement' })).toBeVisible();
    await page.getByRole('button', { name: 'Reprendre le paiement' }).click();
    await expect(page.getByRole('link', { name: 'Confirmer le paiement de test' })).toBeVisible();
    expect(createRequestIds).toHaveLength(0);
    expect(creditsApplied).toBe(0);
  });
});
