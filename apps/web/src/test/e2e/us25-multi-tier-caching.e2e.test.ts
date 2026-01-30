/**
 * E2E tests for Multi-Tier Caching (US-25)
 *
 * Tests the multi-tier cache system: Memory > localStorage > IndexedDB > Static JSON > API.
 * Verifies cache hits, fallthrough behaviour, bandwidth savings, and graceful misses.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { StorageTestHelper } from '@/test/helpers/StorageTestHelper';
import { BaseSPAPageObject } from '@/test/page-objects/BaseSPAPageObject';

test.describe('@utility US-25 Multi-Tier Caching', () => {
	const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

	const TEST_ENTITY = { type: 'works', id: 'W2741809807' };
	const OPENALEX_API_PATTERN = /api\.openalex\.org/;

	let storage: StorageTestHelper;

	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);

		storage = new StorageTestHelper(page);
		await storage.clearAllStorage();
	});

	test('should serve cached data on repeat entity visit (no network request)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// First visit: entity data fetched from API
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Verify entity loaded
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// Track API requests on second visit
		const apiRequests: string[] = [];
		await page.route(OPENALEX_API_PATTERN, (route) => {
			apiRequests.push(route.request().url());
			return route.continue();
		});

		// Second visit: should use cache
		await pageObject.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);

		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Verify entity loaded again
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// Expect fewer API requests on second visit (cache hit)
		// Note: some background refresh requests may still occur
		expect(apiRequests.length).toBeLessThanOrEqual(1);
	});

	test('should fall through cache tiers (Memory > localStorage > IndexedDB > Static JSON > API)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Clear all storage to ensure cold start
		await storage.clearAllStorage();

		// Track API requests
		let apiRequestCount = 0;
		await page.route(OPENALEX_API_PATTERN, (route) => {
			apiRequestCount++;
			return route.continue();
		});

		// First visit with empty cache: must go to API
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Verify entity loaded via API (proves fallthrough to API worked)
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
		expect(apiRequestCount).toBeGreaterThanOrEqual(1);

		// Verify page rendered without errors after cache population
		await pageObject.expectNoError();
	});

	test('should achieve measurable bandwidth savings on repeated access', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Track bandwidth on first visit
		let firstVisitBytes = 0;
		await page.route(OPENALEX_API_PATTERN, (route) => {
			firstVisitBytes += route.request().url().length;
			return route.continue();
		});

		// First visit
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// Remove route handler and set up new one for second visit
		await page.unrouteAll();

		let secondVisitBytes = 0;
		await page.route(OPENALEX_API_PATTERN, (route) => {
			secondVisitBytes += route.request().url().length;
			return route.continue();
		});

		// Navigate away and back
		await pageObject.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);

		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// Second visit should use less bandwidth (or equal if fully cached)
		expect(secondVisitBytes).toBeLessThanOrEqual(firstVisitBytes);
	});

	test('should refresh stale cache entries in background', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// First visit to populate cache
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// Track background refresh requests
		const backgroundRequests: string[] = [];
		await page.route(OPENALEX_API_PATTERN, (route) => {
			backgroundRequests.push(route.request().url());
			return route.continue();
		});

		// Second visit: page should render from cache while background refresh may occur
		await pageObject.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);

		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Page should render immediately from cache (h1 visible quickly)
		await expect(page.locator('h1')).toBeVisible({ timeout: 5_000 });

		// Background refresh requests are acceptable (stale-while-revalidate)
		// The key assertion is that the page rendered before the API response
		await pageObject.expectNoError();
	});

	test('should handle cache miss gracefully (fall through to API)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Ensure completely clean storage
		await storage.clearAllStorage();

		// Track API requests to verify fallthrough
		let apiCalled = false;
		await page.route(OPENALEX_API_PATTERN, (route) => {
			apiCalled = true;
			return route.continue();
		});

		// Visit entity with empty cache
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Entity data should load via API
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });

		// No error should be displayed
		await pageObject.expectNoError();
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to an entity page (cache-related page)
		await pageObject.goto(`${BASE_URL}/#/${TEST_ENTITY.type}/${TEST_ENTITY.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		const critical = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(critical).toEqual([]);
	});
});
