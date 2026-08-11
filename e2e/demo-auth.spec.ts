import { expect, test } from '@playwright/test';

test('valide les champs obligatoires de connexion', async ({ page }) => {
  await page.goto('/login');
  await page.getByRole('button', { name: 'Se connecter' }).click();

  await expect(page.getByText('Veuillez renseigner votre adresse email.')).toBeVisible();
  await expect(page.getByText('Veuillez renseigner votre mot de passe.')).toBeVisible();
});

test('redirige un visiteur non connecté vers la connexion', async ({ page }) => {
  await page.goto('/dashboard');
  await expect(page).toHaveURL(/\/login$/);
});

test('protège également les espaces métier par rôle', async ({ page }) => {
  await page.goto('/enterprise-dashboard');
  await expect(page).toHaveURL(/\/login$/);
});
