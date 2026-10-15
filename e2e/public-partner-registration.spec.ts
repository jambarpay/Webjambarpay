import { expect, Page, test } from '@playwright/test';

test.describe('Formulaire public Devenir partenaire', () => {
  let submissions: Record<string, unknown>[];
  let rejectRegistration: boolean;

  test.beforeEach(async ({ page }) => {
    submissions = [];
    rejectRegistration = false;
    // Every API is simulated: no real account, wallet, payment or SMS is created.
    await page.route('**/api/v1/**', async route => {
      if (route.request().method() === 'POST' &&
          new URL(route.request().url()).pathname === '/api/v1/auth/register/organization') {
        submissions.push(route.request().postDataJSON());
        await route.fulfill(rejectRegistration
          ? { status: 503, json: { message: 'Inscription temporairement indisponible.' } }
          : { status: 201, json: { success: true, data: { id: 'local-created-user' } } });
      } else {
        await route.fulfill({ status: 404, json: { message: 'No API data in this test' } });
      }
    });
  });

  async function fillDetails(page: Page) {
    await page.locator('#companyName').fill('Partenaire Test');
    await page.locator('#email').fill('awa@example.org');
    await page.locator('#phone').fill('77 000 11 22');
    await page.locator('#hrManager').fill('Awa Ndiaye');
    await page.locator('#location').fill('Grand Yoff');
    await page.locator('#city').fill('Dakar');
    await page.locator('#password').fill('ExamplePassword123');
    await page.locator('#confirmPassword').fill('ExamplePassword123');
  }

  test('présente quatre catégories, puis les informations, sans appel API prématuré', async ({ page }, testInfo) => {
    await page.goto('/register?type=restaurant');
    await expect(page.getByRole('heading', { name: 'Devenir partenaire', exact: true })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(4);
    await expect(page.locator('#companyName')).toHaveCount(0);
    await page.getByRole('radio', { name: /^Boutique/ }).check();
    await page.screenshot({ path: testInfo.outputPath('registration-categories.png'), fullPage: true });
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.locator('.selected-category')).toContainText('Boutique');
    await expect(page.locator('#companyName')).toBeVisible();
    expect(submissions).toHaveLength(0);
    await page.screenshot({ path: testInfo.outputPath('registration-details.png'), fullPage: true });
    const dimensions = await page.evaluate(() => ({
      width: document.documentElement.clientWidth, scroll: document.documentElement.scrollWidth,
    }));
    expect(dimensions.scroll).toBeLessThanOrEqual(dimensions.width + 1);
    if (testInfo.project.name === 'desktop-chrome') {
      await expectFitsViewport(page);
    } else {
      // On a phone, keep natural scrolling instead of clipping fields or shrinking text.
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.mouse.wheel(0, 500);
      await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBeGreaterThan(0);
      await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).scrollIntoViewIfNeeded();
      await expect(page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true })).toBeInViewport();
    }
  });

  async function expectFitsViewport(page: Page) {
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollHeight - document.documentElement.clientHeight,
    )).toBeLessThanOrEqual(1);
    await expect.poll(() => page.evaluate(() =>
      document.documentElement.scrollWidth - document.documentElement.clientWidth,
    )).toBeLessThanOrEqual(1);
    await expect(page.getByRole('link', { name: 'Se connecter', exact: true })).toBeInViewport();
    await expect(page.getByRole('button', { name: /^(Continuer|Créer mon compte partenaire)$/ })).toBeInViewport();
  }

  test('les deux étapes tiennent sans défilement aux résolutions courantes sur ordinateur', async ({ page }) => {
    for (const viewport of [
      { width: 1280, height: 720 },
      { width: 1366, height: 768 },
      { width: 1600, height: 780 },
      { width: 1920, height: 1080 },
    ]) {
      await page.setViewportSize(viewport);
      await page.goto('/register?type=restaurant');
      await expect(page.getByRole('radio')).toHaveCount(4);
      await expectFitsViewport(page);
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await expect(page.locator('#companyName')).toBeVisible();
      await expectFitsViewport(page);
    }
    expect(submissions).toHaveLength(0);
  });

  test('garde tous les champs accessibles sur un écran peu haut', async ({ page }) => {
    await page.setViewportSize({ width: 1280, height: 540 });
    await page.goto('/register?type=restaurant');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await fillDetails(page);
    await page.getByRole('link', { name: 'Se connecter', exact: true }).scrollIntoViewIfNeeded();
    await expect(page.getByRole('link', { name: 'Se connecter', exact: true })).toBeInViewport();
    await expect.poll(() => page.evaluate(() => document.scrollingElement?.scrollTop ?? 0)).toBeGreaterThan(0);
    await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Votre compte partenaire a été créé.');
    expect(submissions).toHaveLength(1);
  });

  for (const category of [
    { label: 'Restaurant', code: 'RESTAURANT' },
    { label: 'Boutique', code: 'SHOP' },
    { label: 'Supermarché', code: 'SUPERMARKET' },
    { label: 'Marché', code: 'MARKET' },
  ]) {
    test(`inscrit un partenaire ${category.label} avec le contrat existant`, async ({ page }) => {
      await page.goto('/register?type=restaurant');
      await page.getByRole('radio', { name: new RegExp(`^${category.label}`) }).check();
      await page.getByRole('button', { name: 'Continuer', exact: true }).click();
      await fillDetails(page);
      await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
      await expect(page.getByRole('status')).toContainText('Votre compte partenaire a été créé.');
      expect(submissions).toHaveLength(1);
      expect(submissions[0]).toMatchObject({
        partnerType: category.code, role: 'RESTAURANT', organizationName: 'Partenaire Test',
        phoneNumber: '770001122', firstName: 'Awa', lastName: 'Ndiaye',
      });
      await expect(page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true })).toBeDisabled();
    });
  }

  test('permet de changer de catégorie sans perdre les informations saisies', async ({ page }) => {
    await page.goto('/register?type=restaurant');
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await fillDetails(page);
    await page.getByRole('button', { name: 'Modifier', exact: true }).click();
    await page.getByRole('radio', { name: /^Marché/ }).check();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await expect(page.locator('#companyName')).toHaveValue('Partenaire Test');
    await expect(page.locator('#password')).toHaveValue('ExamplePassword123');
    await expect(page.locator('.selected-category')).toContainText('Marché');
    await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
    await expect(page.getByRole('status')).toBeVisible();
    expect(submissions[0]['partnerType']).toBe('MARKET');
  });

  test('bloque les confirmations incorrectes et conserve les données après une erreur serveur', async ({ page }) => {
    await page.goto('/register?type=restaurant');
    await page.getByRole('radio', { name: /^Boutique/ }).check();
    await page.getByRole('button', { name: 'Continuer', exact: true }).click();
    await fillDetails(page);
    await page.locator('#confirmPassword').fill('DifferentPassword123');
    await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
    await expect(page.getByText('Les mots de passe ne correspondent pas.', { exact: true })).toBeVisible();
    expect(submissions).toHaveLength(0);
    await page.locator('#confirmPassword').fill('ExamplePassword123');
    rejectRegistration = true;
    await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
    await expect(page.getByRole('alert')).toContainText('Inscription temporairement indisponible.');
    await expect(page.locator('#companyName')).toHaveValue('Partenaire Test');
    await expect(page.locator('.selected-category')).toContainText('Boutique');
    expect(submissions).toHaveLength(1);
    rejectRegistration = false;
    await page.getByRole('button', { name: 'Créer mon compte partenaire', exact: true }).click();
    await expect(page.getByRole('status')).toBeVisible();
    expect(submissions).toHaveLength(2);
  });

  test('conserve le parcours entreprise sans catégorie partenaire', async ({ page }) => {
    await page.goto('/register?type=enterprise');
    await expect(page.getByRole('heading', { name: 'Inscrire votre entreprise', exact: true })).toBeVisible();
    await expect(page.getByRole('radio')).toHaveCount(0);
    await fillDetails(page);
    await page.locator('#sector').fill('Services');
    await page.locator('#employeeCount').fill('5');
    await page.locator('#ninea').fill('SN-DKR-123456');
    await page.getByRole('button', { name: 'S’inscrire', exact: true }).click();
    await expect(page.getByRole('status')).toContainText('Entreprise inscrite avec succès.');
    expect(submissions[0]['role']).toBe('ENTREPRISE');
    expect(submissions[0]['partnerType']).toBeUndefined();
  });
});
