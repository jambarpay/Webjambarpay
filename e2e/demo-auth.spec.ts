import { expect, test } from '@playwright/test';

const demoAccounts = [
  { label: 'Admin', email: 'adminjambar@jambaarpay.com', route: '/dashboard' },
  { label: 'Entreprise', email: 'entreprise@jambaarpay.com', route: '/enterprise-dashboard' },
  { label: 'Restaurant', email: 'restaurant@jambaarpay.com', route: '/restaurant-dashboard' },
] as const;

for (const account of demoAccounts) {
  test(`ouvre l’espace ${account.label} avec le compte temporaire`, async ({ page }) => {
    await page.goto('/login');
    await page.getByRole('button', { name: new RegExp(`Utiliser le compte ${account.label}`) }).click();

    await expect(page.locator('#email')).toHaveValue(account.email);
    await page.getByRole('button', { name: 'Se connecter' }).click();
    await expect(page).toHaveURL(new RegExp(`${account.route}$`));
  });
}
