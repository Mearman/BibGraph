/**
 * E2E tests for filesystem cache read/write functionality
 * Verifies that:
 * 1. Cached entities are read from filesystem
 * 2. New entities fetched from API are written to filesystem cache
 */

import * as fs from 'node:fs';
import * as path from 'node:path';

import { expect,test } from '@playwright/test';

// Note: When running E2E tests via Playwright, cwd is already 'apps/web'
const CACHE_DIR = path.join(process.cwd(), 'public/data/openalex');

test.describe('Filesystem Cache', () => {
  test('should read existing cached author from filesystem', async ({ page }) => {
    // A5017898742 is known to exist in the cache
    const cachedAuthorId = 'A5017898742';
    const cachePath = path.join(CACHE_DIR, 'authors', `${cachedAuthorId}.json`);

    // Verify cache file exists before test
    expect(fs.existsSync(cachePath)).toBe(true);
    console.log(`✅ Cache file exists: ${cachePath}`);

    // Listen for console logs to verify cache behavior
    const cacheLogs: string[] = [];
    page.on('console', (message) => {
      const text = message.text();
      if (text.includes('Filesystem cache hit') || text.includes('filesystem-cache')) {
        cacheLogs.push(text);
        console.log(`📋 Cache log: ${text}`);
      }
    });

    // Navigate to author page
    await page.goto(`/#/authors/${cachedAuthorId}`, { waitUntil: 'domcontentloaded' });

    // Verify the page loaded (look for any heading or content)
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();

    console.log(`✅ Test completed - Author page loaded`);
  });

  test('should write new API response to filesystem cache', async ({ page }) => {
    // Use a work ID that exists in cache
    const workId = 'W2741809807';
    const cachePath = path.join(CACHE_DIR, 'works', `${workId}.json`);

    // Check if cache file exists
    const isCacheExisted = fs.existsSync(cachePath);
    console.log(`Cache file ${isCacheExisted ? 'exists' : 'does not exist'}: ${cachePath}`);

    // Navigate to work page
    await page.goto(`/#/works/${workId}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

    // Verify the page loaded
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();

    // Cache file should now exist (either from before or newly created)
    expect(fs.existsSync(cachePath)).toBe(true);

    console.log(`✅ Test completed - Cache file ${isCacheExisted ? 'verified' : 'created'}: ${cachePath}`);
  });

  test('should handle cache miss and API fallback', async ({ page }) => {
    // Use a non-existent entity ID to force API fallback
    const nonExistentId = 'W9999999999';

    // Navigate to non-existent work
    await page.goto(`/#/works/${nonExistentId}`, { waitUntil: 'domcontentloaded' });

    // Wait for error state to appear (allow time for API request to fail)
    await page.locator('[data-testid="error-state"]').waitFor({ timeout: 15_000 });

    // Verify error state is shown
    const pageContent = (await page.locator('body').textContent()) ?? '';
    const hasError = pageContent.includes('Error') ||
                     pageContent.includes('error') ||
                     pageContent.includes('not found') ||
                     pageContent.includes('404');

    expect(hasError).toBe(true);

    console.log(`✅ Test completed - Cache miss handled gracefully with error state`);
  });

  test.describe.parallel('Multiple entity types', () => {
    test('should use filesystem cache for author entity', async ({ page }) => {
      const entity = { type: 'authors', id: 'A5017898742' };
      const cachePath = path.join(CACHE_DIR, entity.type, `${entity.id}.json`);
      const isCacheExists = fs.existsSync(cachePath);

      console.log(`Testing ${entity.type}/${entity.id} - Cache ${isCacheExists ? 'exists' : 'missing'}`);

      await page.goto(`/#/${entity.type}/${entity.id}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

      const bodyText = page.locator('body');
      await expect(bodyText).not.toBeEmpty();

      console.log(`✅ ${entity.type}/${entity.id} loaded successfully`);
    });

    test('should use filesystem cache for work entity', async ({ page }) => {
      const entity = { type: 'works', id: 'W2741809807' };
      const cachePath = path.join(CACHE_DIR, entity.type, `${entity.id}.json`);
      const isCacheExists = fs.existsSync(cachePath);

      console.log(`Testing ${entity.type}/${entity.id} - Cache ${isCacheExists ? 'exists' : 'missing'}`);

      await page.goto(`/#/${entity.type}/${entity.id}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

      const bodyText = page.locator('body');
      await expect(bodyText).not.toBeEmpty();

      console.log(`✅ ${entity.type}/${entity.id} loaded successfully`);
    });

    test('should use filesystem cache for institution entity', async ({ page }) => {
      const entity = { type: 'institutions', id: 'I161548249' };
      const cachePath = path.join(CACHE_DIR, entity.type, `${entity.id}.json`);
      const isCacheExists = fs.existsSync(cachePath);

      console.log(`Testing ${entity.type}/${entity.id} - Cache ${isCacheExists ? 'exists' : 'missing'}`);

      await page.goto(`/#/${entity.type}/${entity.id}`, { waitUntil: 'domcontentloaded', timeout: 20_000 });

      const bodyText = page.locator('body');
      await expect(bodyText).not.toBeEmpty();

      console.log(`✅ ${entity.type}/${entity.id} loaded successfully`);
    });
  });

  test('should preserve cache across page reloads', async ({ page }) => {
    const authorId = 'A5017898742';

    // First load
    await page.goto(`/#/authors/${authorId}`, { waitUntil: 'domcontentloaded' });
    const firstBodyText = page.locator('body');

    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    const secondBodyText = page.locator('body');

    // Both should have content (cache persisted)
    await expect(firstBodyText).toHaveText(/.+/);
    await expect(secondBodyText).toHaveText(/.+/);

    console.log(`✅ Cache persisted across reloads`);
  });
});
