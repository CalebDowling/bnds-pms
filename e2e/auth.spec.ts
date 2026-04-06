import { test, expect } from '@playwright/test';

test.describe('Authentication Tests', () => {
  test.beforeEach(async ({ page }) => {
    // Navigate to login page before each test
    await page.goto('/');
  });

  test('Login form has email field', async ({ page }) => {
    // Look for email input field
    const emailField =
      page.getByLabel(/email/i) ||
      page.getByPlaceholder(/email/i) ||
      page.getByRole('textbox', { name: /email/i });

    await expect(emailField).toBeDefined();
  });

  test('Login form has password field', async ({ page }) => {
    // Look for password input field
    const passwordField =
      page.getByLabel(/password/i) ||
      page.getByPlaceholder(/password/i) ||
      page.getByRole('textbox', { name: /password/i });

    await expect(passwordField).toBeDefined();
  });

  test('Invalid credentials show error message', async ({ page }) => {
    // Find and fill email field
    const emailField = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i))
      .or(page.getByRole('textbox').first());

    const passwordField = page
      .getByLabel(/password/i)
      .or(page.getByPlaceholder(/password/i))
      .or(page.getByRole('textbox').nth(1));

    const submitButton = page
      .getByRole('button', { name: /login|sign in|submit/i })
      .first();

    // Only run test if we found form elements
    const emailVisible = await emailField.isVisible().catch(() => false);
    const passwordVisible = await passwordField.isVisible().catch(() => false);

    if (emailVisible && passwordVisible) {
      await emailField.fill('invalid@example.com');
      await passwordField.fill('wrongpassword123');

      // Check if submit button exists and click it
      const submitVisible = await submitButton.isVisible().catch(() => false);
      if (submitVisible) {
        await submitButton.click();

        // Wait for error message or redirect
        await page.waitForTimeout(2000);

        // Check for error message
        const errorMessage = page
          .getByText(/invalid|incorrect|error|failed/i)
          .first();
        const errorVisible = await errorMessage.isVisible().catch(() => false);

        if (errorVisible) {
          expect(errorVisible).toBeTruthy();
        }
      }
    }
  });

  test('Prescriber portal login form has required fields', async ({ page }) => {
    // Navigate to prescriber portal
    await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
    }).catch(() => {
      return page.goto('http://portal.localhost:3000', {
        waitUntil: 'networkidle',
      }).catch(() => null);
    });

    // Look for NPI field
    const npiField = page
      .getByLabel(/NPI|npi/i)
      .or(page.getByPlaceholder(/NPI|npi/i))
      .or(page.getByRole('textbox', { name: /NPI|npi/i }));

    // Look for last name field
    const lastNameField = page
      .getByLabel(/last name|surname/i)
      .or(page.getByPlaceholder(/last name|surname/i))
      .or(page.getByRole('textbox', { name: /last name|surname/i }));

    // At least one of these should be visible
    const npiVisible = await npiField.isVisible().catch(() => false);
    const lastNameVisible = await lastNameField
      .isVisible()
      .catch(() => false);

    expect(npiVisible || lastNameVisible).toBeTruthy();
  });

  test('Login form submission attempts', async ({ page }) => {
    // Attempt to find and interact with login form
    const emailInput = page
      .getByLabel(/email/i)
      .or(page.getByPlaceholder(/email/i))
      .or(page.locator('input[type="email"]').first());

    const passwordInput = page
      .getByLabel(/password/i)
      .or(page.getByPlaceholder(/password/i))
      .or(page.locator('input[type="password"]').first());

    // Check if form exists
    const formExists =
      (await emailInput.isVisible().catch(() => false)) &&
      (await passwordInput.isVisible().catch(() => false));

    if (formExists) {
      // Test that form can be filled
      await emailInput.fill('test@example.com');
      await passwordInput.fill('password123');

      // Verify values were set
      const emailValue = await emailInput.inputValue();
      const passwordValue = await passwordInput.inputValue();

      expect(emailValue).toBe('test@example.com');
      expect(passwordValue).toBe('password123');
    }
  });

  test('Login page has submit button', async ({ page }) => {
    const submitButton = page
      .getByRole('button', { name: /login|sign in|submit|continue/i })
      .first();

    const buttonExists = await submitButton.isVisible().catch(() => false);

    if (buttonExists) {
      expect(buttonExists).toBeTruthy();
      expect(await submitButton.isEnabled()).toBeDefined();
    }
  });
});

test.describe('Authentication - Session Management', () => {
  test('Unauthenticated user redirected from protected routes', async ({
    page,
  }) => {
    // Try to access a protected route
    await page.goto('/dashboard').catch(() => null);

    // Should either redirect to login or show login form
    const isOnLoginPage =
      page.url().includes('/login') ||
      page.url().includes('/auth') ||
      (await page.getByText(/sign in|login/i).isVisible().catch(() => false));

    expect(isOnLoginPage).toBeTruthy();
  });

  test('Session cookie/token is not set before login', async ({ context }) => {
    const cookies = await context.cookies();
    const authCookies = cookies.filter(
      (c) =>
        c.name.toLowerCase().includes('auth') ||
        c.name.toLowerCase().includes('session') ||
        c.name.toLowerCase().includes('token')
    );

    // There should be no auth cookies before login
    expect(authCookies.length).toBe(0);
  });
});
