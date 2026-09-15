/**
 * Quick verification of deployed site
 */
import { expect,test } from '@playwright/test';

const BASE_URL = 'https://mearman.github.io/BibGraph';
const SUITE_TIMEOUT_MS = 30_000;
const MIN_CONTENT_LENGTH = 50;

test.describe('Deployed Site - Critical URLs', () => {
  test.setTimeout(SUITE_TIMEOUT_MS);

  test('concepts list page should NOT show "Unsupported entity type"', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/concepts`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.locator('main').waitFor({ timeout: 10_000 });
    
    const mainText = await page.locator('main').textContent();
    
    // Main check: Should NOT show unsupported entity type error
    const hasError = mainText?.toLowerCase().includes('unsupported entity type');
    expect(hasError).toBe(false);
    
    // Should have substantial content
    expect(mainText!.length).toBeGreaterThan(MIN_CONTENT_LENGTH);
    
    console.log('✅ Concepts list page: No "Unsupported entity type" error');
  });

  test('concepts detail page C71924100 should load', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/concepts/C71924100`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.locator('main').waitFor({ timeout: 10_000 });

    await expect(page.locator('main')).not.toHaveText('');
    await expect(page.locator('main')).not.toHaveText(/^.{0,100}$/);

    console.log('✅ Concepts detail page loads');
  });

  test('author A5017898742 page should load (user requested)', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/authors/A5017898742`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.locator('main').waitFor({ timeout: 10_000 });

    await expect(page.locator('main')).not.toHaveText('');
    await expect(page.locator('main')).not.toHaveText(/^.{0,100}$/);

    console.log('✅ Author A5017898742 page loads');
  });

  test('topics list page should load', async ({ page }) => {
    await page.goto(`${BASE_URL}/#/topics`, { waitUntil: 'domcontentloaded', timeout: 20_000 });
    await page.locator('main').waitFor({ timeout: 10_000 });
    
    const mainText = await page.locator('main').textContent();
    const hasError = mainText?.toLowerCase().includes('unsupported entity type');
    expect(hasError).toBe(false);
    
    console.log('✅ Topics list page: No "Unsupported entity type" error');
  });
});
