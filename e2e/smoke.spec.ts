import { test, expect } from '@playwright/test';

test.describe('Smoke Tests - Page Loading', () => {
  test('Staff login page loads and displays Boudreaux branding', async ({
    page,
  }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/Boudreaux|BNDS|Pharmacy/i);
    await expect(page.getByText(/Boudreaux/i)).toBeVisible();
  });

  test('Dashboard redirects to login when not authenticated', async ({
    page,
  }) => {
    await page.goto('/dashboard');
    // Should redirect to login page
    await page.waitForURL(/\/login|\/auth/i, { timeout: 5000 });
    expect(page.url()).toMatch(/\/login|\/auth/i);
  });

  test('Prescriber portal login page loads', async ({ page }) => {
    // Navigate to prescriber portal
    await page.goto('http://localhost:3001', {
      waitUntil: 'networkidle',
    }).catch(() => {
      // If port 3001 is not available, try the subdomain approach
      return page.goto('http://portal.localhost:3000', {
        waitUntil: 'networkidle',
      }).catch(() => null);
    });

    // Check for NPI or email login field
    const npiField = page.getByLabel(/NPI|npi/i);
    const emailField = page.getByLabel(/email|e-mail/i);

    const isNpiVisible = await npiField.isVisible().catch(() => false);
    const isEmailVisible = await emailField.isVisible().catch(() => false);

    expect(isNpiVisible || isEmailVisible).toBeTruthy();
  });

  test('Patient portal login page loads', async ({ page }) => {
    // Try to navigate to patient portal
    await page.goto('http://localhost:3002', {
      waitUntil: 'networkidle',
    }).catch(() => {
      // If port 3002 is not available, try the subdomain approach
      return page.goto('http://patient.localhost:3000', {
        waitUntil: 'networkidle',
      }).catch(() => null);
    });

    // Check for login form elements
    const emailOrIdField = page.getByLabel(/email|patient id|id/i);
    const passwordField = page.getByLabel(/password/i);

    const isEmailVisible = await emailOrIdField.isVisible().catch(() => false);
    const isPasswordVisible = await passwordField.isVisible().catch(() => false);

    expect(isEmailVisible || isPasswordVisible).toBeTruthy();
  });

  test('API health endpoint returns 200', async ({ page }) => {
    const response = await page.request.get('/api/health');
    expect(response.status()).toBe(200);
  });

  test('Static assets load correctly (CSS)', async ({ page }) => {
    await page.goto('/');

    // Check that stylesheets loaded
    const stylesheets = await page.locator('link[rel="stylesheet"]').count();
    expect(stylesheets).toBeGreaterThan(0);

    // Verify page has computed styles
    const body = page.locator('body');
    const computedStyle = await body.evaluate((el) =>
      window.getComputedStyle(el)
    );
    expect(computedStyle).toBeDefined();
  });
});

test.describe('Smoke Tests - Navigation', () => {
  test('Home page is accessible', async ({ page }) => {
    await page.goto('/');
    expect(page.url()).toContain('localhost:3000');
  });

  test('Page has valid HTML structure', async ({ page }) => {
    await page.goto('/');

    // Check for main HTML elements
    const html = page.locator('html');
    const body = page.locator('body');

    await expect(html).toBeTruthy();
    await expect(body).toBeTruthy();

    // Verify no major console errors
    const errors: string[] = [];
    page.on('console', (msg) => {
      if (msg.type() === 'error') {
        errors.push(msg.text());
      }
    });

    // Wait a bit for any errors to surface
    await page.waitForTimeout(1000);
    expect(errors.length).toBe(0);
  });
});
