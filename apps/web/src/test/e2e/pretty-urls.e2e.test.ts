import { expect,test } from '@playwright/test';

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = process.env.BASE_URL ?? (IS_CI ? 'http://localhost:4173' : 'http://localhost:5173');

/**
 * Pretty URL Display Tests
 *
 * Tests that encoded entity ID URLs automatically update to display
 * human-readable (decoded) versions in the browser address bar.
 *
 * Example:
 * - Navigates to: /#/works/https%3A%2F%2Fdoi.org%2F10.7717%2Fpeerj.4375
 * - URL updates to: /#/works/https://doi.org/10.7717/peerj.4375
 */

const TEST_SUITE_TIMEOUT_MS = 90_000;

test.describe('Pretty URL Display', () => {
  test.setTimeout(TEST_SUITE_TIMEOUT_MS);

  test('should display pretty (decoded) DOI URL in address bar', async ({ page }) => {
    const encodedDoi = 'https%3A%2F%2Fdoi.org%2F10.7717%2Fpeerj.4375';
    const decodedDoi = 'https://doi.org/10.7717/peerj.4375';
    const testUrl = `${BASE_URL}/#/works/${encodedDoi}`;

    console.log(`Navigating to encoded URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('main').waitFor({ timeout: 40_000 });

    // Wait for URL to update (2s timeout + buffer)
    // Removed: waitForTimeout - use locator assertions instead
    // Get the current URL
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);
    console.log(`Expected to contain: /works/${decodedDoi}`);

    // Verify URL has been updated to decoded version
    expect(currentHash).toContain(decodedDoi);

    // Verify it does NOT contain the encoded version
    expect(currentHash).not.toContain(encodedDoi);

    console.log('✓ DOI URL successfully updated to pretty version');
  });

  test('should display pretty (decoded) ORCID URL in address bar', async ({ page }) => {
    const encodedOrcid = 'https%3A%2F%2Forcid.org%2F0000-0003-1419-2405';
    const decodedOrcid = 'https://orcid.org/0000-0003-1419-2405';
    const testUrl = `${BASE_URL}/#/authors/${encodedOrcid}`;

    console.log(`Navigating to encoded URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('main').waitFor({ timeout: 40_000 });

    // Wait for URL to update (2s timeout + buffer)
    // Removed: waitForTimeout - use locator assertions instead
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);

    // Verify URL has been updated to decoded version
    expect(currentHash).toContain(decodedOrcid);
    expect(currentHash).not.toContain(encodedOrcid);

    console.log('✓ ORCID URL successfully updated to pretty version');
  });

  test('should display pretty (decoded) ROR URL in address bar', async ({ page }) => {
    const encodedRor = 'https%3A%2F%2Fror.org%2F02y3ad647';
    const decodedRor = 'https://ror.org/02y3ad647';
    const testUrl = `${BASE_URL}/#/institutions/${encodedRor}`;

    console.log(`Navigating to encoded URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('main').waitFor({ timeout: 40_000 });

    // Wait for URL to update (2s timeout + buffer)
    // Removed: waitForTimeout - use locator assertions instead
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);

    // Verify URL has been updated to decoded version
    expect(currentHash).toContain(decodedRor);
    expect(currentHash).not.toContain(encodedRor);

    console.log('✓ ROR URL successfully updated to pretty version');
  });

  test('should preserve query parameters when updating to pretty URL', async ({ page }) => {
    const encodedDoi = 'https%3A%2F%2Fdoi.org%2F10.7717%2Fpeerj.4375';
    const decodedDoi = 'https://doi.org/10.7717/peerj.4375';
    const testUrl = `${BASE_URL}/#/works/${encodedDoi}?select=id,display_name`;

    console.log(`Navigating to encoded URL with query params: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('main').waitFor({ timeout: 40_000 });

    // Wait for URL to update (2s timeout + buffer)
    // Removed: waitForTimeout - use locator assertions instead
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);

    // Verify URL has decoded ID
    expect(currentHash).toContain(decodedDoi);

    // Verify query parameters are preserved
    expect(currentHash).toContain('select=id,display_name');
    // Query parameters should not be duplicated (fixed: strip query params before extracting entity ID)
    expect(currentHash).not.toContain('?select=id,display_name?select=');

    console.log('✓ Query parameters preserved in pretty URL');
  });

  test('should not modify already-decoded URLs', async ({ page }) => {
    const decodedDoi = 'https://doi.org/10.7717/peerj.4375';
    const testUrl = `${BASE_URL}/#/works/${decodedDoi}`;

    console.log(`Navigating to already-decoded URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 60_000 });
    await page.locator('main').waitFor({ timeout: 40_000 });

    // Wait for URL processing to complete (may be encoded then decoded by hook)
    // Removed: waitForTimeout - use locator assertions instead
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);

    // URL should be in decoded form (either stayed decoded or was encoded then decoded by hook)
    expect(currentHash).toContain(decodedDoi);

    console.log('✓ Already-decoded URL is in pretty (decoded) form');
  });

  test('should handle OpenAlex IDs without modification', async ({ page }) => {
    const openalexId = 'W2741809807';
    const testUrl = `${BASE_URL}/#/works/${openalexId}`;

    console.log(`Navigating to OpenAlex ID URL: ${testUrl}`);

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await page.locator('main').waitFor({ timeout: 20_000 });
    // Removed: waitForTimeout - use locator assertions instead
    const currentUrl = page.url();
    const currentHash = currentUrl.split('#', 2)[1] || '';

    console.log(`Current hash: ${currentHash}`);

    // OpenAlex IDs should not be modified
    expect(currentHash).toContain(`/works/${openalexId}`);

    console.log('✓ OpenAlex ID URL remains unchanged');
  });
});
