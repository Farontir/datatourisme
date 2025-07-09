import { test, expect } from '@playwright/test';

test.describe('Complete Booking Flow', () => {
  test.beforeEach(async ({ page }) => {
    // Sign in as test user first
    await page.goto('/auth/signin');
    await page.getByLabel(/adresse email/i).fill('test@example.com');
    await page.getByLabel(/mot de passe/i).fill('password123');
    await page.getByRole('button', { name: /se connecter/i }).click();
    await expect(page).toHaveURL(/dashboard/);
  });

  test('should complete full booking flow from search to confirmation', async ({ page }) => {
    // Step 1: Search for a resource
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();

    // Wait for search results
    await expect(page.getByText(/château de versailles/i)).toBeVisible();

    // Step 2: Select a resource
    await page.getByText(/château de versailles/i).first().click();

    // Should navigate to resource detail page
    await expect(page).toHaveURL(/resource/);
    await expect(page.getByRole('heading', { name: /château de versailles/i })).toBeVisible();

    // Step 3: Start booking process
    await page.getByRole('button', { name: /réserver/i }).click();

    // Should navigate to booking flow
    await expect(page).toHaveURL(/booking/);

    // Step 4: Select date and time
    await expect(page.getByText(/sélection de date/i)).toBeVisible();
    
    // Pick a date (assuming calendar is available)
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7); // Book for next week
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();
    
    // Select time slot
    await page.getByText(/14:00/i).click();
    
    // Continue to next step
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 5: Enter guest details
    await expect(page.getByText(/détails des invités/i)).toBeVisible();
    
    await page.getByLabel(/nombre d'adultes/i).selectOption('2');
    await page.getByLabel(/nombre d'enfants/i).selectOption('1');
    
    // Fill guest information
    await page.getByLabel(/nom/i).fill('Dupont');
    await page.getByLabel(/prénom/i).fill('Jean');
    await page.getByLabel(/email/i).fill('jean.dupont@example.com');
    await page.getByLabel(/téléphone/i).fill('0123456789');
    
    // Continue to payment
    await page.getByRole('button', { name: /continuer/i }).click();

    // Step 6: Payment information
    await expect(page.getByText(/paiement/i)).toBeVisible();
    
    // Check that price is calculated and displayed
    await expect(page.getByText(/total/i)).toBeVisible();
    await expect(page.getByText(/€/)).toBeVisible();

    // Fill payment form (using test card)
    const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');
    await cardFrame.getByPlaceholder(/numéro de carte/i).fill('4242424242424242');
    await cardFrame.getByPlaceholder(/mm \/ aa/i).fill('12/25');
    await cardFrame.getByPlaceholder(/cvc/i).fill('123');
    
    // Fill billing address
    await page.getByLabel(/nom sur la carte/i).fill('Jean Dupont');
    await page.getByLabel(/adresse/i).fill('123 Rue de la Paix');
    await page.getByLabel(/ville/i).fill('Paris');
    await page.getByLabel(/code postal/i).fill('75001');
    await page.getByLabel(/pays/i).selectOption('FR');

    // Submit payment
    await page.getByRole('button', { name: /payer maintenant/i }).click();

    // Step 7: Confirmation
    await expect(page).toHaveURL(/booking\/confirmation/);
    await expect(page.getByText(/confirmation de réservation/i)).toBeVisible();
    await expect(page.getByText(/votre réservation est confirmée/i)).toBeVisible();
    
    // Check confirmation details
    await expect(page.getByText(/château de versailles/i)).toBeVisible();
    await expect(page.getByText(/numéro de confirmation/i)).toBeVisible();
    
    // Check for download links
    await expect(page.getByRole('link', { name: /télécharger le billet/i })).toBeVisible();
    await expect(page.getByRole('link', { name: /ajouter au calendrier/i })).toBeVisible();
  });

  test('should handle payment failure gracefully', async ({ page }) => {
    // Navigate to booking flow
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.getByText(/château de versailles/i).first().click();
    await page.getByRole('button', { name: /réserver/i }).click();

    // Quick booking flow
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();
    await page.getByText(/14:00/i).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Fill guest details
    await page.getByLabel(/nombre d'adultes/i).selectOption('1');
    await page.getByLabel(/nom/i).fill('Test');
    await page.getByLabel(/prénom/i).fill('User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Use a card that will be declined
    const cardFrame = page.frameLocator('iframe[name*="__privateStripeFrame"]');
    await cardFrame.getByPlaceholder(/numéro de carte/i).fill('4000000000000002');
    await cardFrame.getByPlaceholder(/mm \/ aa/i).fill('12/25');
    await cardFrame.getByPlaceholder(/cvc/i).fill('123');
    
    await page.getByLabel(/nom sur la carte/i).fill('Test User');
    await page.getByLabel(/adresse/i).fill('123 Test St');
    await page.getByLabel(/ville/i).fill('Paris');
    await page.getByLabel(/code postal/i).fill('75001');

    // Submit payment
    await page.getByRole('button', { name: /payer maintenant/i }).click();

    // Should show error message
    await expect(page.getByText(/paiement refusé/i)).toBeVisible();
    
    // Should stay on payment page
    await expect(page).toHaveURL(/booking/);
    
    // User should be able to try again
    await expect(page.getByRole('button', { name: /réessayer/i })).toBeVisible();
  });

  test('should save booking progress and allow resumption', async ({ page }) => {
    // Start booking flow
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.getByText(/château de versailles/i).first().click();
    await page.getByRole('button', { name: /réserver/i }).click();

    // Fill some details
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();
    await page.getByText(/14:00/i).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Fill partial guest details
    await page.getByLabel(/nombre d'adultes/i).selectOption('2');
    await page.getByLabel(/nom/i).fill('Dupont');

    // Navigate away (simulate closing browser/tab)
    await page.goto('/dashboard');

    // Navigate back to booking
    await page.goto('/booking');

    // Should resume from where left off
    await expect(page.getByDisplayValue('Dupont')).toBeVisible();
    await expect(page.getByDisplayValue('2')).toBeVisible();
  });

  test('should show real-time availability updates', async ({ page }) => {
    // Navigate to booking flow
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.getByText(/château de versailles/i).first().click();
    await page.getByRole('button', { name: /réserver/i }).click();

    // Select a date
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();

    // Check availability indicators
    await expect(page.getByText(/places disponibles/i)).toBeVisible();
    
    // Time slots should show availability
    const timeSlot = page.getByText(/14:00/i);
    await expect(timeSlot).toBeVisible();
    
    // Should show remaining spots
    await expect(page.getByText(/\d+ places? restantes?/)).toBeVisible();
  });

  test('should apply discount codes correctly', async ({ page }) => {
    // Navigate through booking flow to payment
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.getByText(/château de versailles/i).first().click();
    await page.getByRole('button', { name: /réserver/i }).click();

    // Quick selection
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();
    await page.getByText(/14:00/i).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Fill minimum guest details
    await page.getByLabel(/nombre d'adultes/i).selectOption('1');
    await page.getByLabel(/nom/i).fill('Test');
    await page.getByLabel(/prénom/i).fill('User');
    await page.getByLabel(/email/i).fill('test@example.com');
    await page.getByRole('button', { name: /continuer/i }).click();

    // Get original price
    const originalPrice = await page.getByText(/total.*€/).textContent();

    // Apply discount code
    await page.getByPlaceholder(/code promo/i).fill('DISCOUNT10');
    await page.getByRole('button', { name: /appliquer/i }).click();

    // Check that discount is applied
    await expect(page.getByText(/remise appliquée/i)).toBeVisible();
    
    // New total should be different
    const newPrice = await page.getByText(/total.*€/).textContent();
    expect(newPrice).not.toBe(originalPrice);
  });

  test('should handle group bookings correctly', async ({ page }) => {
    // Navigate to booking flow
    await page.goto('/search');
    await page.getByPlaceholder(/rechercher/i).fill('Château de Versailles');
    await page.getByRole('button', { name: /rechercher/i }).click();
    await page.getByText(/château de versailles/i).first().click();
    await page.getByRole('button', { name: /réserver/i }).click();

    // Select date and time
    const tomorrow = new Date();
    tomorrow.setDate(tomorrow.getDate() + 7);
    const dateStr = tomorrow.toLocaleDateString('fr-FR');
    
    await page.getByRole('button', { name: new RegExp(dateStr) }).click();
    await page.getByText(/14:00/i).click();
    await page.getByRole('button', { name: /continuer/i }).click();

    // Select large group
    await page.getByLabel(/nombre d'adultes/i).selectOption('15');
    await page.getByLabel(/nombre d'enfants/i).selectOption('5');

    // Should show group discount message
    await expect(page.getByText(/tarif de groupe appliqué/i)).toBeVisible();

    // Should show different pricing
    await expect(page.getByText(/tarif.*groupe/i)).toBeVisible();

    // Fill group leader details
    await page.getByLabel(/nom du responsable/i).fill('Martin');
    await page.getByLabel(/prénom du responsable/i).fill('Pierre');
    await page.getByLabel(/email/i).fill('pierre.martin@example.com');
    await page.getByLabel(/organisation/i).fill('École Primaire de Paris');

    // Should have group-specific fields
    await expect(page.getByLabel(/besoins spéciaux/i)).toBeVisible();
    
    await page.getByRole('button', { name: /continuer/i }).click();

    // Payment page should show group pricing
    await expect(page.getByText(/réservation de groupe/i)).toBeVisible();
  });
});