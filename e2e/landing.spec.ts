import { expect, test } from '@playwright/test';

test.describe('page publique Jambaar Pay', () => {
  test.beforeEach(async ({ page }) => {
    await page.goto('/');
  });

  test('présente la marque et permet d’accéder à la connexion', async ({ page }) => {
    await expect(page).toHaveTitle(/JambaarPay|Jambaar Pay/i);
    await expect(page.getByRole('link', { name: /connexion|connecter/i }).first()).toBeVisible();
    await expect(page.locator('h1')).toBeVisible();
  });

  test('publie les métadonnées SEO essentielles', async ({ page }) => {
    await expect(page.locator('meta[name="description"]')).toHaveAttribute('content', /fintech sénégalaise/i);
    await expect(page.locator('meta[name="robots"]')).toHaveAttribute('content', /index, follow/i);
    await expect(page.locator('meta[property="og:title"]')).toHaveAttribute('content', /Jambaar Pay/i);
    const structuredData = await page.locator('script[type="application/ld+json"]').textContent();
    expect(structuredData).toContain('FinanceApplication');
  });

  test('ne provoque pas de défilement horizontal', async ({ page }) => {
    const dimensions = await page.evaluate(() => ({
      clientWidth: document.documentElement.clientWidth,
      scrollWidth: document.documentElement.scrollWidth,
    }));

    expect(dimensions.scrollWidth).toBeLessThanOrEqual(dimensions.clientWidth + 1);
  });

  test('utilise des URL publiques propres sans fragment', async ({ page }) => {
    await page.goto('/forfaits');

    await expect(page).toHaveURL(/\/forfaits$/);
    await expect(page.locator('#forfaits')).toBeInViewport();
    await expect(page.locator('#forfaits')).toContainText('75 000');
    await expect(page.locator('#forfaits')).toContainText('150 000');
    await expect(page.locator('#forfaits')).toContainText('250 000');
    await expect(page.locator('#forfaits')).toContainText('FCFA / mois + 1 % sur le volume');
    expect(new URL(page.url()).hash).toBe('');
  });
});
