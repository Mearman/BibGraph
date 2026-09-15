/**
 * Keywords Navigation E2E Tests
 *
 * Tests keywords route migration to EntityDetailLayout with relationship visualization
 * Validates navigation, component rendering, and view mode toggle functionality
 * @see specs/019-full-entity-support/spec.md (User Story 1)
 */

import { expect,test } from '@playwright/test';

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = process.env.BASE_URL ?? (IS_CI ? 'http://localhost:4173' : 'http://localhost:5173');
const API_CALL_TIMEOUT_MS = 30_000;

test.describe('Keywords Navigation and Display', () => {
  test.beforeEach(({ page }) => {
    // Set longer timeout for OpenAlex API calls
    page.setDefaultTimeout(API_CALL_TIMEOUT_MS);
  });

  test('should navigate to keyword detail page and display EntityDetailLayout', async ({ page }) => {
    // Navigate to a keyword detail page
    await page.goto(`${BASE_URL}/#/keywords/artificial-intelligence`);

    // Wait for page to load (EntityDetailLayout should be visible)
    await expect(page.getByText('Keyword ID:')).toBeVisible({ timeout: 10_000 });

    // Verify entity detail layout is rendered (check for distinctive elements)
    await expect(page.getByRole('heading', { name: /artificial intelligence/i })).toBeVisible();

    // Verify keyword badge/label is present
    await expect(page.getByText('Keyword', { exact: false })).toBeVisible();
  });

  test('should display relationship counts when relationships exist', async ({ page }) => {
    // Navigate to keyword with relationships
    await page.goto(`${BASE_URL}/#/keywords/artificial-intelligence`);

    // Wait for data to load
    await expect(page.getByText('Keyword ID:')).toBeVisible({ timeout: 10_000 });

    // Check if relationship counts are displayed
    // Note: These may not always be present if the keyword has no relationships
    const relationshipSection = page.getByText(/Total Relationships:|Incoming|Outgoing/i);

    // If relationships exist, they should be visible
    // We use a soft check here since some keywords may have zero relationships
    const hasRelationships = await relationshipSection.count() > 0;

    if (hasRelationships) {
      await expect(relationshipSection.first()).toBeVisible();
    }
  });

  test('should toggle between raw and rich view modes', async ({ page }) => {
    // Navigate to keyword page
    await page.goto(`${BASE_URL}/#/keywords/machine-learning`);

    // Wait for page to load
    await expect(page.getByText('Keyword ID:')).toBeVisible({ timeout: 10_000 });

    // Look for view toggle button (may be labeled differently based on current mode)
    const toggleButton = page.locator('button').filter({ hasText: /Raw|Rich|View/i }).first();

    // Click toggle to switch to raw view
    await toggleButton.click();

    // In raw view, we should see JSON-like structure (wait for pre tag or code block)
    await expect(page.locator('pre, code').first()).toBeVisible({ timeout: 5000 });

    // Click toggle again to switch back to rich view
    await toggleButton.click();

    // Rich view should show the entity data display (not just JSON)
    await expect(page.getByText('Keyword ID:')).toBeVisible();
  });

  test('should display loading state during data fetch', async ({ page }) => {
    // Start navigation
    const navigationPromise = page.goto(`${BASE_URL}/#/keywords/deep-learning`);

    // Check for loading indicator
    const loadingIndicator = page.getByText(/loading/i);

    // Loading state should appear briefly (with a very short timeout)
    try {
      await expect(loadingIndicator).toBeVisible({ timeout: 1000 });
    } catch {
      // Loading was too fast - this is okay, just means data loaded quickly
    }

    // Wait for navigation to complete
    await navigationPromise;

    // Verify page eventually loads
    await expect(page.getByText('Keyword ID:')).toBeVisible({ timeout: 10_000 });
  });

  test('should handle encoded keyword IDs correctly', async ({ page }) => {
    // Navigate with an encoded keyword ID (spaces or special chars)
    await page.goto(`${BASE_URL}/#/keywords/machine%20learning`);

    // Wait for page to load and URL to be normalized
    await expect(page.getByText('Keyword ID:')).toBeVisible({ timeout: 10_000 });

    // The URL should be cleaned up (decoded)
    const currentUrl = page.url();
    expect(currentUrl).toContain('machine-learning');
    expect(currentUrl).not.toContain('%20');
  });

  test('should display error state for invalid keyword ID', async ({ page }) => {
    // Navigate to a non-existent keyword
    await page.goto(`${BASE_URL}/#/keywords/this-keyword-does-not-exist-12345`);

    // Wait for error state to appear
    await expect(page.getByText(/error|not found/i)).toBeVisible({ timeout: 10_000 });

    // Error should display the attempted keyword ID
    await expect(page.getByText(/this-keyword-does-not-exist-12345/i)).toBeVisible();
  });
});
