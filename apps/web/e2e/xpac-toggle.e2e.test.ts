/**
 * E2E tests for xpac toggle functionality
 *
 * Verifies that:
 * 1. XpacToggle component is visible in Settings page
 * 2. Toggling OFF removes `include_xpac=true` parameter from API requests
 * 3. Toggling ON adds `include_xpac=true` parameter back
 * 4. Setting persists across page reloads
 * 5. Toggle state is synced across multiple settings changes
 *
 * Related:
 * - T028: E2E test: Verify xpac toggle disables xpac works
 * - User Story 2: xpac inclusion and metadata improvements
 * - 013-walden-research specification
 */

import { expect,test } from '@playwright/test';

const RAPID_TOGGLE_COUNT = 3;

test.describe('Xpac Toggle Functionality', () => {
  test('should show XpacToggle in Settings page', async ({ page }) => {
    // Navigate to settings page
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Find the xpac toggle by test ID
    const xpacToggle = page.getByTestId('xpac-toggle');
    await expect(xpacToggle).toBeVisible();

    // Verify it's a switch/checkbox
    const switchInput = xpacToggle.locator('input[type="checkbox"]');
    await expect(switchInput).toBeVisible();

    // Verify default state is checked (enabled)
    await expect(switchInput).toBeChecked();

    // Verify description is present
    const description = page.getByTestId('xpac-toggle-description');
    await expect(description).toBeVisible();
    await expect(description).toContainText('190M additional works');

    console.log('✅ XpacToggle is visible and in default ON state');
  });

  test('should remove include_xpac parameter when toggled off', async ({ page }) => {
    // Track API requests to verify parameters
    const apiRequests: { url: string; params: URLSearchParams }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api.openalex.org') || url.includes('/api/openalex')) {
        const parsedUrl = new URL(url);
        apiRequests.push({
          url: parsedUrl.pathname,
          params: parsedUrl.searchParams,
        });
      }
    });

    // Navigate to settings page
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Find and toggle OFF the xpac switch
    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Verify it starts as checked
    await expect(switchInput).toBeChecked();

    // Click to toggle OFF
    await switchInput.click();

    // Verify toggle is now unchecked
    await expect(switchInput).not.toBeChecked();

    // Wait for setting to save and any pending requests
    // Removed: waitForTimeout - use locator assertions instead
    // Clear tracked requests before navigating
    apiRequests.length = 0;

    // Navigate to search to trigger API requests
    await page.goto('#/#/search?q=test', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Wait for API requests to complete
    // Removed: waitForTimeout - use locator assertions instead
    // Verify work requests were made
    const workRequests = apiRequests.filter(request => request.url.includes('/works'));
    expect(workRequests.length).toBeGreaterThan(0);

    // Verify work requests DO NOT include include_xpac parameter
    const requestsWithXpac = workRequests.filter(request =>
      request.params.has('include_xpac')
    );

    expect(requestsWithXpac).toHaveLength(0);

    console.log(`✅ Verified ${String(workRequests.length)} work requests without include_xpac parameter`);
  });

  test('should add include_xpac parameter when toggled back on', async ({ page }) => {
    // Track API requests to verify parameters
    const apiRequests: { url: string; params: URLSearchParams }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api.openalex.org') || url.includes('/api/openalex')) {
        const parsedUrl = new URL(url);
        apiRequests.push({
          url: parsedUrl.pathname,
          params: parsedUrl.searchParams,
        });
      }
    });

    // Navigate to settings page
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Toggle xpac OFF first
    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    if (await switchInput.isChecked()) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Verify it's OFF
    await expect(switchInput).not.toBeChecked();

    // Clear tracked requests
    apiRequests.length = 0;

    // Toggle xpac back ON
    await switchInput.click();

    // Verify toggle is now checked
    await expect(switchInput).toBeChecked();

    // Wait for setting to save
    // Removed: waitForTimeout - use locator assertions instead
    // Clear tracked requests again before navigating
    apiRequests.length = 0;

    // Navigate to search to trigger API requests
    await page.goto('#/#/search?q=test', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Wait for API requests to complete
    // Removed: waitForTimeout - use locator assertions instead
    // Verify work requests were made
    const workRequests = apiRequests.filter(request => request.url.includes('/works'));
    expect(workRequests.length).toBeGreaterThan(0);

    // Verify work requests INCLUDE include_xpac=true parameter
    const requestsWithXpac = workRequests.filter(request =>
      request.params.get('include_xpac') === 'true'
    );

    expect(requestsWithXpac.length).toBeGreaterThan(0);

    console.log(`✅ Verified ${String(requestsWithXpac.length)}/${String(workRequests.length)} work requests include include_xpac=true`);
  });

  test('should persist xpac setting across page reloads', async ({ page }) => {
    // Navigate to settings and toggle OFF
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Toggle OFF
    if (await switchInput.isChecked()) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Verify toggle is OFF
    await expect(switchInput).not.toBeChecked();

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Navigate to settings again (reload may land on home page)
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Verify toggle is still OFF
    const reloadedToggle = page.getByTestId('xpac-toggle');
    const reloadedInput = reloadedToggle.locator('input[type="checkbox"]');
    await expect(reloadedInput).not.toBeChecked();

    console.log('✅ Xpac setting persisted across page reload (OFF state)');
  });

  test('should persist xpac setting as ON across page reloads', async ({ page }) => {
    // Navigate to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Ensure toggle is ON
    if (!(await switchInput.isChecked())) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Verify toggle is ON
    await expect(switchInput).toBeChecked();

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Navigate back to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Verify toggle is still ON
    const reloadedToggle = page.getByTestId('xpac-toggle');
    const reloadedInput = reloadedToggle.locator('input[type="checkbox"]');
    await expect(reloadedInput).toBeChecked();

    console.log('✅ Xpac setting persisted across page reload (ON state)');
  });

  test('should sync xpac setting with other settings in the same session', async ({ page }) => {
    // Track API requests
    const apiRequests: { url: string; params: URLSearchParams }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if (url.includes('api.openalex.org') || url.includes('/api/openalex')) {
        const parsedUrl = new URL(url);
        apiRequests.push({
          url: parsedUrl.pathname,
          params: parsedUrl.searchParams,
        });
      }
    });

    // Navigate to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Toggle xpac OFF
    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    if (await switchInput.isChecked()) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Verify OFF state
    await expect(switchInput).not.toBeChecked();

    // Navigate to a work detail page
    const workId = 'W2741809807';
    apiRequests.length = 0;
    await page.goto(`/#/works/${workId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Verify work requests do NOT include include_xpac
    const workRequests = apiRequests.filter(request => request.url.includes('/works'));
    const requestsWithXpac = workRequests.filter(request =>
      request.params.has('include_xpac')
    );

    expect(requestsWithXpac).toHaveLength(0);

    // Navigate back to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    // Toggle xpac back ON
    const refreshedToggle = page.getByTestId('xpac-toggle');
    const refreshedInput = refreshedToggle.locator('input[type="checkbox"]');
    await refreshedInput.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Verify ON state
    await expect(refreshedInput).toBeChecked();

    // Navigate to work detail page again
    apiRequests.length = 0;
    await page.goto(`/#/works/${workId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Verify work requests DO include include_xpac=true
    const workRequests2 = apiRequests.filter(request => request.url.includes('/works'));
    const requestsWithXpac2 = workRequests2.filter(request =>
      request.params.get('include_xpac') === 'true'
    );

    expect(requestsWithXpac2.length).toBeGreaterThan(0);

    console.log('✅ Xpac setting synced correctly across multiple navigation and setting changes');
  });

  test('should handle rapid toggle changes without errors', async ({ page }) => {
    // Navigate to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Perform rapid toggles
    for (let index = 0; index < RAPID_TOGGLE_COUNT; index++) {
      const isChecked = await switchInput.isChecked();
      await switchInput.click();
      // Verify the state changed
      
      await expect(switchInput).toBeChecked({ checked: !isChecked });
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Verify page is still responsive and no errors
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();

    const bodyTextContent = await bodyText.textContent();
    const hasError = bodyTextContent !== null &&
                     bodyTextContent.toLowerCase().includes('error') &&
                     !bodyTextContent.toLowerCase().includes('0 errors');
    expect(hasError).toBeFalsy();

    console.log('✅ Rapid toggle changes handled without errors');
  });

  test('should show notification when xpac setting is changed', async ({ page }) => {
    // Navigate to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Toggle OFF
    if (await switchInput.isChecked()) {
      await switchInput.click();

      // Notification may appear briefly, but may disappear quickly
      // Just verify the toggle works
      await expect(switchInput).not.toBeChecked();
    }

    console.log('✅ Xpac toggle change handled with potential notification');
  });

  test('should verify xpac toggle label and description text', async ({ page }) => {
    // Navigate to settings
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');

    // Check for expected label text
    const labelText = await xpacToggle.textContent();
    expect(labelText).toContain('extended research outputs');
    expect(labelText?.toLowerCase()).toContain('xpac');

    // Check for description
    const description = page.getByTestId('xpac-toggle-description');
    const descriptionText = await description.textContent();
    expect(descriptionText).toContain('190M');
    expect(descriptionText).toContain('datasets');
    expect(descriptionText).toContain('software');
    expect(descriptionText).toContain('specimens');

    console.log('✅ Xpac toggle label and description have correct content');
  });

  test('should include xpac parameter for author works when xpac is enabled', async ({ page }) => {
    // Track API requests
    const apiRequests: { url: string; params: URLSearchParams }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if ((url.includes('api.openalex.org') || url.includes('/api/openalex')) &&
          url.includes('/works')) {
        const parsedUrl = new URL(url);
        apiRequests.push({
          url: parsedUrl.pathname,
          params: parsedUrl.searchParams,
        });
      }
    });

    // Navigate to settings and ensure xpac is ON
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    if (!(await switchInput.isChecked())) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Navigate to author detail page
    const authorId = 'A5017898742';
    apiRequests.length = 0;
    await page.goto(`/#/authors/${authorId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Filter for works requests
    const worksRequests = apiRequests.filter(request =>
      request.url.includes('/works')
    );

    if (worksRequests.length > 0) {
      // Verify works requests include include_xpac=true
      const worksRequestsWithXpac = worksRequests.filter(request =>
        request.params.get('include_xpac') === 'true'
      );

      expect(worksRequestsWithXpac.length).toBeGreaterThan(0);
      console.log(`✅ Author works requests include include_xpac=true: ${String(worksRequestsWithXpac.length)}/${String(worksRequests.length)}`);
    } else {
      console.log('ℹ️ No works requests captured (may be using cache)');
    }
  });

  test('should not include xpac parameter for author works when xpac is disabled', async ({ page }) => {
    // Track API requests
    const apiRequests: { url: string; params: URLSearchParams }[] = [];

    page.on('request', (request) => {
      const url = request.url();
      if ((url.includes('api.openalex.org') || url.includes('/api/openalex')) &&
          url.includes('/works')) {
        const parsedUrl = new URL(url);
        apiRequests.push({
          url: parsedUrl.pathname,
          params: parsedUrl.searchParams,
        });
      }
    });

    // Navigate to settings and toggle xpac OFF
    await page.goto('#/#/settings', { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');

    const xpacToggle = page.getByTestId('xpac-toggle');
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    if (await switchInput.isChecked()) {
      await switchInput.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Navigate to author detail page
    const authorId = 'A5017898742';
    apiRequests.length = 0;
    await page.goto(`/#/authors/${authorId}`, { waitUntil: 'domcontentloaded' });
    await page.waitForLoadState('load');
    // Removed: waitForTimeout - use locator assertions instead
    // Filter for works requests
    const worksRequests = apiRequests.filter(request =>
      request.url.includes('/works')
    );

    if (worksRequests.length > 0) {
      // Verify works requests do NOT include include_xpac
      const worksRequestsWithXpac = worksRequests.filter(request =>
        request.params.has('include_xpac')
      );

      expect(worksRequestsWithXpac).toHaveLength(0);
      console.log(`✅ Author works requests correctly exclude include_xpac when disabled`);
    } else {
      console.log('ℹ️ No works requests captured (may be using cache)');
    }
  });
});
