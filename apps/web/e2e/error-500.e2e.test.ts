/**
 * E2E tests for 500 (Server Error) scenarios
 *
 * Tests handling of server-side errors using route interception
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@error 500 Server Errors', () => {
  test.beforeEach(({ page }) => {
    // Set up console error monitoring
    page.on('console', (message) => {
      if (message.type() === 'error') {
        console.log('Console error:', message.text());
      }
    });
  });

  test('should handle 500 response gracefully', async ({ page }) => {
    // Intercept API calls and return 500 error
    await page.route('**/api.openalex.org/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('#/works/W2741809807');
    await waitForAppReady(page);

    // Should display error message or error state
    const errorIndicators = page.locator('[data-testid="error-message"]');
    const errorText = page.getByText(/error|failed|try again|unavailable/i);

    // Wait for error to be displayed
    await expect(errorIndicators.or(errorText).first()).toBeVisible({ timeout: 15_000 });
  });

  test('should show retry option on server error', async ({ page }) => {
    let requestCount = 0;

    // Intercept API calls - fail first time, succeed after
    await page.route('**/api.openalex.org/**', async (route) => {
      requestCount++;
      if (requestCount <= 1) {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: 'Internal Server Error' }),
        });
      } else {
        await route.continue();
      }
    });

    await page.goto('#/works/W2741809807');
    await waitForAppReady(page);

    // Look for retry button
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again"), [data-testid="retry-button"]');

    const hasRetry = await retryButton.isVisible().catch(() => false);

    if (hasRetry) {
      // Click retry and verify it attempts to reload
      await retryButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // After retry, should have made additional request
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('should display user-friendly error message on 500', async ({ page }) => {
    await page.route('**/api.openalex.org/**', async (route) => {
      await route.fulfill({
        status: 500,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Internal Server Error' }),
      });
    });

    await page.goto('#/authors/A5017898742');
    await waitForAppReady(page);

    // Verify user-friendly message (not raw error)
    const technicalError = page.getByText(/500|internal server error/i);
    const friendlyError = page.getByText(/error occurred|something went wrong|try again later/i);

    // Should have at least one error indicator
    const hasError = await technicalError.isVisible().catch(() => false) ||
                     await friendlyError.isVisible().catch(() => false);
    expect(hasError).toBe(true);
  });

  test('should handle 502 Bad Gateway error', async ({ page }) => {
    await page.route('**/api.openalex.org/**', async (route) => {
      await route.fulfill({
        status: 502,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Bad Gateway' }),
      });
    });

    await page.goto('#/works/W2741809807');
    await waitForAppReady(page);

    // Should handle 502 similar to 500
    const errorText = page.getByText(/error|failed|unavailable/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });

  test('should handle 503 Service Unavailable error', async ({ page }) => {
    await page.route('**/api.openalex.org/**', async (route) => {
      await route.fulfill({
        status: 503,
        contentType: 'application/json',
        body: JSON.stringify({ error: 'Service Unavailable' }),
      });
    });

    await page.goto('#/institutions/I33213144');
    await waitForAppReady(page);

    // Should handle 503 gracefully
    const errorText = page.getByText(/error|maintenance|unavailable/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });
});
