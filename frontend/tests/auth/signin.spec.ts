import { test, expect } from '@playwright/test';

test.describe('Authentication Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to the sign-in page
    await page.goto('/auth/signin');
  });

  test('should display sign-in form correctly', async ({ page }) => {
    // Check that the sign-in form is displayed
    await expect(page.getByRole('heading', { name: /se connecter/i })).toBeVisible();
    await expect(page.getByLabel(/adresse email/i)).toBeVisible();
    await expect(page.getByLabel(/mot de passe/i)).toBeVisible();
    await expect(page.getByRole('button', { name: /se connecter/i })).toBeVisible();
  });

  test('should show validation errors for empty form', async ({ page }) => {
    // Click sign-in without filling the form
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Check for validation errors
    await expect(page.getByText(/email.*required/i)).toBeVisible();
    await expect(page.getByText(/password.*required/i)).toBeVisible();
  });

  test('should show error for invalid credentials', async ({ page }) => {
    // Fill form with invalid credentials
    await page.getByLabel(/adresse email/i).fill('invalid@example.com');
    await page.getByLabel(/mot de passe/i).fill('wrongpassword');
    
    // Submit form
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Check for error message
    await expect(page.getByText(/invalid credentials/i)).toBeVisible();
  });

  test('should successfully sign in with valid credentials', async ({ page }) => {
    // Fill form with valid test credentials
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByLabel(/mot de passe/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
    await expect(page.getByText(/bonjour/i)).toBeVisible();
  });

  test('should handle OAuth sign-in options', async ({ page }) => {
    // Check that OAuth buttons are present
    await expect(page.getByRole('button', { name: /google/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /facebook/i })).toBeVisible();
    await expect(page.getByRole('button', { name: /apple/i })).toBeVisible();
  });

  test('should navigate to sign-up page', async ({ page }) => {
    // Click on sign-up link
    await page.getByRole('link', { name: /créer un compte/i }).click();

    // Should navigate to sign-up page
    await expect(page).toHaveURL(/signup/);
  });

  test('should navigate to forgot password page', async ({ page }) => {
    // Click on forgot password link
    await page.getByRole('link', { name: /mot de passe oublié/i }).click();

    // Should navigate to forgot password page
    await expect(page).toHaveURL(/forgot-password/);
  });

  test('should toggle password visibility', async ({ page }) => {
    const passwordInput = page.getByLabel(/mot de passe/i);
    const toggleButton = page.getByRole('button').filter({ has: page.locator('svg') }).nth(0);

    // Password should be hidden by default
    await expect(passwordInput).toHaveAttribute('type', 'password');

    // Click toggle to show password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'text');

    // Click again to hide password
    await toggleButton.click();
    await expect(passwordInput).toHaveAttribute('type', 'password');
  });

  test('should handle 2FA code input when required', async ({ page }) => {
    // Fill form with credentials that require 2FA
    await page.getByLabel(/adresse email/i).fill('2fa@example.com');
    await page.getByLabel(/mot de passe/i).fill('password123');
    
    // Submit form
    await page.getByRole('button', { name: /se connecter/i }).click();

    // 2FA field should appear
    await expect(page.getByLabel(/code de vérification/i)).toBeVisible();

    // Fill 2FA code
    await page.getByLabel(/code de vérification/i).fill('123456');
    
    // Submit again
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Should redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should remember user preference', async ({ page }) => {
    const rememberCheckbox = page.getByLabel(/se souvenir de moi/i);

    // Check the remember me option
    await rememberCheckbox.check();
    await expect(rememberCheckbox).toBeChecked();

    // Fill and submit form
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByLabel(/mot de passe/i).fill('password123');
    await page.getByRole('button', { name: /se connecter/i }).click();

    // Check that user is redirected and session is persistent
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should have proper accessibility attributes', async ({ page }) => {
    // Check form accessibility
    await expect(page.getByRole('form')).toBeVisible();
    
    // Check input labels are properly associated
    const emailInput = page.getByLabel(/adresse email/i);
    const passwordInput = page.getByLabel(/mot de passe/i);
    
    await expect(emailInput).toHaveAttribute('type', 'email');
    await expect(emailInput).toHaveAttribute('autocomplete', 'email');
    await expect(passwordInput).toHaveAttribute('type', 'password');
    await expect(passwordInput).toHaveAttribute('autocomplete', 'current-password');

    // Check button accessibility
    const signInButton = page.getByRole('button', { name: /se connecter/i });
    await expect(signInButton).toHaveAttribute('type', 'submit');
  });

  test('should redirect authenticated users away from sign-in', async ({ page }) => {
    // First, sign in the user
    await page.goto('/auth/signin');
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByLabel(/mot de passe/i).fill('password123');
    await page.getByRole('button', { name: /se connecter/i }).click();
    
    // Wait for redirect to dashboard
    await expect(page).toHaveURL(/dashboard/);

    // Try to navigate back to sign-in
    await page.goto('/auth/signin');

    // Should redirect back to dashboard
    await expect(page).toHaveURL(/dashboard/);
  });
});