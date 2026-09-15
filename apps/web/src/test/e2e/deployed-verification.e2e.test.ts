import { expect,test } from '@playwright/test';

const DEPLOYED_URL = 'https://mearman.github.io/BibGraph';

/**
 * Deployed Site Verification
 *
 * Tests critical functionality on the live GitHub Pages deployment:
 * 1. Author A5017898742 (user-specified test URL)
 * 2. ROR external IDs (newly fixed)
 * 3. Bioplastics search (data completeness)
 * 4. All 8 entity types
 */

const TEST_SUITE_TIMEOUT_MS = 60_000;

test.describe('Deployed Site - Critical Verification', () => {
  test.setTimeout(TEST_SUITE_TIMEOUT_MS);

  test('should load author A5017898742 correctly', async ({ page }) => {
    await page.goto(`${DEPLOYED_URL}/#/authors/A5017898742`, {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    await page.locator('main').waitFor({ timeout: 15_000 });

    const mainText = page.locator('main');
    await expect(mainText).not.toBeEmpty();

    // Should show author content, not error
    await expect(mainText).not.toContainText('Not Found');
    await expect(mainText).not.toContainText('Error loading');

    // Should show some author data
    const text = await mainText.textContent();
    const hasAuthorData =
      text!.includes('works') ||
      text!.includes('citations') ||
      text!.includes('h-index');
    expect(hasAuthorData).toBeTruthy();
  });

  test('should handle ROR external ID - ror:02y3ad647', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/openalex-url/institutions/ror:02y3ad647`;

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.locator('main').waitFor({ timeout: 15_000 });

    const mainText = page.locator('main');
    await expect(mainText).not.toBeEmpty();

    // Should not show error
    await expect(mainText).not.toContainText('Not Found');
    await expect(mainText).not.toContainText('Error');
    await expect(mainText).not.toContainText('Invalid');
  });

  test('should handle ROR external ID - ror:00cvxb145', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/openalex-url/institutions/ror:00cvxb145`;

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.locator('main').waitFor({ timeout: 15_000 });

    const mainText = page.locator('main');
    await expect(mainText).not.toBeEmpty();

    // Should not show error
    await expect(mainText).not.toContainText('Not Found');
    await expect(mainText).not.toContainText('Error');
  });

  test('should display bioplastics search results with all data', async ({
    page,
  }) => {
    const testUrl = `${DEPLOYED_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`;

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    await page.locator('main').waitFor({ timeout: 15_000 });

    const mainText = page.locator('main');
    await expect(mainText).not.toBeEmpty();

    // Should show bioplastics-related content
    const text = await mainText.textContent();
    expect(text!.toLowerCase()).toContain('bioplastic');

    // Should show pagination or results info
    const hasResults =
      text!.includes('results') ||
      text!.includes('entries') ||
      text!.includes('works');
    expect(hasResults).toBeTruthy();

    // Should not be empty or error
    await expect(mainText).not.toContainText('No results');
    await expect(mainText).not.toContainText('Error');
  });

  test.describe('All Entity Types', () => {
    const entityTypes = [
      { type: 'works', id: 'W2741809807' },
      { type: 'authors', id: 'A5017898742' },
      { type: 'sources', id: 'S137773608' },
      { type: 'institutions', id: 'I27837315' },
      { type: 'concepts', id: 'C71924100' },
      { type: 'publishers', id: 'P4310320006' },
      { type: 'funders', id: 'F4320332161' },
      { type: 'topics', id: 'T10002' },
    ];

    for (const { type, id } of entityTypes) {
      test(`should load ${type} entity - ${id}`, async ({ page }) => {
        await page.goto(`${DEPLOYED_URL}/#/${type}/${id}`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        await page.locator('main').waitFor({ timeout: 15_000 });

        const mainText = page.locator('main');
        await expect(mainText).not.toBeEmpty();

        // Should not show error
        await expect(mainText).not.toContainText('Not Found');
        await expect(mainText).not.toContainText('Error loading');
      });
    }
  });

  test('should handle full API URL format', async ({ page }) => {
    const testUrl = `${DEPLOYED_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics`;

    await page.goto(testUrl, { waitUntil: 'domcontentloaded', timeout: 30_000 });

    // Wait for content to load - could be works results or loading state
    await page.locator('main').waitFor({ timeout: 15_000 });

    // Give additional time for async content loading
    // Removed: waitForTimeout - use locator assertions instead
    const mainText = page.locator('main');

    // Check that we have content (either results or loading state)
    await expect(mainText).not.toBeEmpty();

    // Should not show error states
    await expect(mainText).not.toContainText('Error loading');
    await expect(mainText).not.toContainText('Failed to load');
    await expect(mainText).not.toContainText('An error occurred');

    // Get text for remaining checks
    const text = await mainText.textContent();

    // If we have loaded content, check for bioplastic or loading indicators
    const lowerMainText = text!.toLowerCase();
    const hasResults = lowerMainText.includes('bioplastic') ||
                     lowerMainText.includes('work') ||
                     lowerMainText.includes('result') ||
                     lowerMainText.includes('loading') ||
                     lowerMainText.includes('filter');

    expect(hasResults).toBeTruthy();
  });
});
