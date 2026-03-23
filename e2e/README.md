# BNDS PMS E2E Tests

Playwright End-to-End tests for the Boudreaux's Pharmacy Management System (BNDS PMS).

## Test Files

- **smoke.spec.ts** - Smoke tests verifying core page loads and accessibility
  - Staff login page loads with Boudreaux branding
  - Dashboard authentication redirect
  - Prescriber and patient portal login pages
  - API health endpoint
  - Static asset loading (CSS)
  - Navigation and HTML structure

- **auth.spec.ts** - Authentication flow tests
  - Login form field validation
  - Invalid credential error handling
  - Prescriber portal field validation
  - Form submission capabilities
  - Session management and unauthenticated redirects

## Running Tests

### Prerequisites

Ensure the development server is running:
```bash
npm run dev
```

### Run all tests
```bash
npm run test:e2e
```

### Run tests with UI mode
```bash
npm run test:e2e:ui
```

### Run tests in debug mode
```bash
npm run test:e2e:debug
```

### Run specific test file
```bash
npx playwright test e2e/smoke.spec.ts
```

### Run tests in headed mode (see browser)
```bash
npx playwright test --headed
```

## Configuration

The Playwright configuration is in `playwright.config.ts`:

- **Base URL**: Defaults to `http://localhost:3000` or `PLAYWRIGHT_BASE_URL` env var
- **Browser**: Chrome (Chromium) only for now
- **Timeout**: 30 seconds per test
- **Screenshots**: Captured on test failure
- **Reports**: HTML report generated in `playwright-report/`

## Test Portals

The tests check for multiple portals:

- **Staff Portal**: `http://localhost:3000/` (default)
- **Prescriber Portal**: `http://localhost:3001/` or `http://portal.localhost:3000/`
- **Patient Portal**: `http://localhost:3002/` or `http://patient.localhost:3000/`

## Test Approach

Tests are designed to be:
- **Simple and focused** - Each test checks one specific thing
- **Non-destructive** - No data mutations or test data cleanup needed
- **Resilient** - Handle variations in form markup and missing portals gracefully
- **Smoke tests** - Verify pages load and basic functionality works

## Viewing Reports

After tests run, view the HTML report:
```bash
npx playwright show-report
```

## CI Integration

For CI/CD pipelines, tests run with:
- Single worker (no parallelization)
- 2 retries on failure
- HTML report for artifacts
- Screenshots of failures for debugging

Set `CI=true` when running in CI environment.
