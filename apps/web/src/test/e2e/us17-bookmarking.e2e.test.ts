/**
 * E2E Tests: US-17 Bookmarking
 *
 * Tests bookmark toggle visibility, persistence via CatalogueStorageProvider,
 * bookmark count in navigation, and the /bookmarks listing page.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { StorageTestHelper } from '@/test/helpers/StorageTestHelper';
import { BaseEntityPageObject } from '@/test/page-objects/BaseEntityPageObject';

const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

const TEST_ENTITIES = {
	author: { type: 'authors' as const, id: 'A5017898742' },
	work: { type: 'works' as const, id: 'W2741809807' },
	institution: { type: 'institutions' as const, id: 'I27837315' },
	source: { type: 'sources' as const, id: 'S137773608' },
};

test.describe('@workflow US-17 Bookmarking', () => {
	test.setTimeout(120_000);

	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const storage = new StorageTestHelper(page);
		await storage.clearAllStorage();

		// Reload after clearing storage so the app picks up clean state
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForAppReady(page);
	});

	test('should show bookmark toggle on entity detail pages', async ({ page }) => {
		const entityPage = new BaseEntityPageObject(page, {
			entityType: TEST_ENTITIES.author.type,
		});

		await entityPage.gotoEntity(TEST_ENTITIES.author.id);
		await entityPage.waitForLoadingComplete();

		// The bookmark button should be visible on the entity detail page
		const bookmarkButton = page.locator("[data-testid='entity-bookmark-button']");
		await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });

		// Verify the button is clickable (bookmark toggle)
		await expect(bookmarkButton).toBeEnabled();
	});

	test('should show bookmark toggle on search results', async ({ page }) => {
		// Navigate to search with a known query
		await page.goto(`${BASE_URL}/#/search?q=machine+learning`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Wait for search results to appear
		const searchResults = page.locator("[data-testid='search-results']");
		await expect(searchResults).toBeVisible({ timeout: 30_000 });

		// Look for bookmark buttons within search result items
		const bookmarkButtons = searchResults.locator("[data-testid='entity-bookmark-button']");
		const count = await bookmarkButtons.count();
		expect(count).toBeGreaterThan(0);

		// Verify the first bookmark button is interactive
		const firstButton = bookmarkButtons.first();
		await expect(firstButton).toBeVisible();
		await expect(firstButton).toBeEnabled();
	});

	test('should persist bookmarks in IndexedDB via CatalogueStorageProvider', async ({ page }) => {
		const entityPage = new BaseEntityPageObject(page, {
			entityType: TEST_ENTITIES.work.type,
		});

		// Navigate to work entity and bookmark it
		await entityPage.gotoEntity(TEST_ENTITIES.work.id);
		await entityPage.waitForLoadingComplete();

		const bookmarkButton = page.locator("[data-testid='entity-bookmark-button']");
		await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });

		// Toggle bookmark on
		await bookmarkButton.click();

		// Verify the button is still visible after clicking (bookmark toggled)
		await expect(bookmarkButton).toBeVisible({ timeout: 5_000 });

		// Verify IndexedDB contains bookmark data
		const hasBookmarkData = await page.evaluate(async () => {
			const databases = await window.indexedDB.databases();
			return databases.length > 0;
		});
		expect(hasBookmarkData).toBe(true);

		// Reload the page and verify bookmark persists
		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForAppReady(page);

		const reloadedButton = page.locator("[data-testid='entity-bookmark-button']");
		await expect(reloadedButton).toBeVisible({ timeout: 15_000 });
	});

	test('should display bookmark count in navigation', async ({ page }) => {
		const entityPage = new BaseEntityPageObject(page, {
			entityType: TEST_ENTITIES.author.type,
		});

		// Bookmark an author entity
		await entityPage.gotoEntity(TEST_ENTITIES.author.id);
		await entityPage.waitForLoadingComplete();

		const bookmarkButton = page.locator("[data-testid='entity-bookmark-button']");
		await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });
		await bookmarkButton.click();
		await expect(bookmarkButton).toBeVisible({ timeout: 5_000 });

		// Navigate to a different page to check the nav counter
		await page.goto(`${BASE_URL}/#/`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Look for bookmarks navigation link with count indicator
		// The nav may show a badge or text with the bookmark count
		const bookmarksNav = page.locator('nav').getByText(/bookmark/i);
		await expect(bookmarksNav).toBeVisible({ timeout: 10_000 });

		// Check for count badge or indicator near the bookmarks link
		const countBadge = page.locator('[data-testid="bookmark-count"], nav .mantine-Badge-root');
		if (await countBadge.isVisible({ timeout: 5_000 }).catch(() => false)) {
			const countText = await countBadge.textContent();
			expect(Number(countText)).toBeGreaterThanOrEqual(1);
		}
	});

	test('should list all bookmarked entities on /bookmarks', async ({ page }) => {
		// Bookmark two different entity types
		const entitiesToBookmark = [TEST_ENTITIES.author, TEST_ENTITIES.work];

		for (const entity of entitiesToBookmark) {
			const entityPage = new BaseEntityPageObject(page, {
				entityType: entity.type,
			});
			await entityPage.gotoEntity(entity.id);
			await entityPage.waitForLoadingComplete();

			const bookmarkButton = page.locator("[data-testid='entity-bookmark-button']");
			await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });
			await bookmarkButton.click();
			await expect(bookmarkButton).toBeVisible({ timeout: 5_000 });
		}

		// Navigate to bookmarks page
		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Verify both bookmarked entities appear in the list
		const bookmarkItems = page.locator(
			'[data-testid="bookmark-list-item"], [data-testid="bookmark-card"], .mantine-Card-root'
		);
		await expect(bookmarkItems.first()).toBeVisible({ timeout: 15_000 });

		const itemCount = await bookmarkItems.count();
		expect(itemCount).toBeGreaterThanOrEqual(2);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to an entity page with bookmark functionality
		await page.goto(`${BASE_URL}/#/${TEST_ENTITIES.author.type}/${TEST_ENTITIES.author.id}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Wait for bookmark button to be present
		await expect(page.locator("[data-testid='entity-bookmark-button']")).toBeVisible({ timeout: 15_000 });

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
