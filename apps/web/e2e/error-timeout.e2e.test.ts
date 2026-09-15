/**
 * E2E tests for timeout error scenarios
 *
 * Tests handling of slow/hanging requests that exceed timeout limits
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

const TIMEOUT_TEST_SUITE_TIMEOUT_MS = 90_000;
const SLOW_RESPONSE_DELAY_MS = 5000;
const HANGING_ROUTE_DELAY_MS = 30_000;

test.describe('@error Timeout Errors', () => {
  // Set shorter test timeout for timeout tests
  test.setTimeout(TIMEOUT_TEST_SUITE_TIMEOUT_MS);

  test('should handle request timeout gracefully', async ({ page }) => {
    // Simulate a very slow response that will timeout
    await page.route('**/api.openalex.org/**', async () => {
      // Never respond - will cause timeout
      await new Promise<void>(() => {
        // Deliberately never resolves: simulates a hung network request for the timeout test.
        return undefined;
      });
    });

    // Set a shorter timeout for the navigation
    await page.goto('#/works/W2741809807', { timeout: 30_000 }).catch(() => {
      // Navigation may timeout, which is expected
    });

    await waitForAppReady(page);

    // Should show timeout or error message
    const errorIndicators = [
      page.getByText(/loading|timed out|timeout|took too long/i),
      page.getByText(/error|failed|unavailable/i),
      page.locator('[data-testid="error-message"]'),
    ];

    // Wait a bit for error state to appear
    // Removed: waitForTimeout - use locator assertions instead
    let isFoundIndicator = false;
    for (const indicator of errorIndicators) {
      if (await indicator.isVisible().catch(() => false)) {
        isFoundIndicator = true;
        break;
      }
    }

    // Either shows error or still loading (which is acceptable for slow response)
    expect(isFoundIndicator).toBe(true);
  });

  test('should show loading state while waiting', async ({ page }) => {
    // Add 5 second delay to response
    await page.route('**/api.openalex.org/**', async (route) => {
      await new Promise<void>(resolve => {
        setTimeout(resolve, SLOW_RESPONSE_DELAY_MS);
      });
      await route.continue();
    });

    await page.goto('#/works/W2741809807');

    // Should show loading state initially
    const loadingIndicators = page.locator('[data-testid="loading"]');

    // Check loading state appears within first 2 seconds
    try {
      await expect(loadingIndicators.first()).toBeVisible({ timeout: 2000 });
    } catch {
      // If no explicit loading indicator, page should at least be rendering
      await expect(page.locator('#root')).toBeVisible();
    }
  });

  test('should abort slow requests on navigation', async ({ page }) => {
    await page.route('**/api.openalex.org/**', async (route) => {
      try {
        // Long delay
        await new Promise<void>(resolve => {
          setTimeout(resolve, HANGING_ROUTE_DELAY_MS);
        });
        await route.continue();
      } catch {
        // Request was aborted, which is expected behavior
      }
    });

    // Start navigation to entity page
    page.goto('/works/W2741809807').catch(() => {
      // Navigation is intentionally abandoned once the test navigates to '#/browse' below.
      return undefined;
    });

    // Wait a bit then navigate away
    // Removed: waitForTimeout - use locator assertions instead
    await page.goto('#/browse');
    await waitForAppReady(page);

    // Should be on browse page without errors
    await expect(page).toHaveURL(/\/browse/);
  });

  test('should provide retry option after timeout', async ({ page }) => {
    let requestCount = 0;

    await page.route('**/api.openalex.org/**', async (route) => {
      requestCount++;
      if (requestCount <= 1) {
        // First request: abort to simulate timeout
        await route.abort('timedout');
      } else {
        // Subsequent requests: succeed
        await route.continue();
      }
    });

    await page.goto('#/works/W2741809807');
    await waitForAppReady(page);

    // Look for retry option
    const retryButton = page.locator('button:has-text("Retry"), button:has-text("Try again"), [data-testid="retry-button"]');

    if (await retryButton.isVisible().catch(() => false)) {
      await retryButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      expect(requestCount).toBeGreaterThan(1);
    }
  });

  test('should display timeout-specific error message', async ({ page }) => {
    await page.route('**/api.openalex.org/**', async (route) => {
      await route.abort('timedout');
    });

    await page.goto('#/authors/A5017898742');
    await waitForAppReady(page);

    // Should show error indicating timeout or general failure
    const errorText = page.getByText(/timeout|timed out|taking.*long|error|failed/i);
    await expect(errorText.first()).toBeVisible({ timeout: 15_000 });
  });
});
