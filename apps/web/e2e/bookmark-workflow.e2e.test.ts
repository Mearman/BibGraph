/**
 * E2E Workflow Tests for Bookmark Functionality
 *
 * Tests the complete bookmark workflow:
 * 1. Navigate to entity detail page
 * 2. Bookmark entity
 * 3. Verify bookmark state persistence
 * 4. Navigate to bookmarks page
 * 5. Verify entity appears in bookmarks list
 * 6. Remove bookmark
 * 7. Verify entity removed from bookmarks
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '../src/test/helpers/app-ready';

/**
 * Test entity IDs for different entity types
 */
const TEST_ENTITIES = {
	work: {
		id: 'W2741809807',
		expectedTitle: 'W2741809807', // Will be replaced by actual title in tests
	},
	author: {
		id: 'A5023888391',
		expectedTitle: 'A5023888391',
	},
	institution: {
		id: 'I33213144',
		expectedTitle: 'I33213144',
	},
};

test.describe('@workflow Bookmark Workflow', () => {
	test.beforeEach(async ({ page, context }) => {
		// Clear storage before each test for isolation
		await context.clearCookies();
		await page.goto('#/');
		await waitForAppReady(page);

		// Clear IndexedDB and localStorage
		await page.evaluate(() => {
			localStorage.clear();
			// Clear all IndexedDB databases
			void window.indexedDB.databases().then((dbs) => {
				for (const database of dbs) {
					if (database.name !== undefined) {
						window.indexedDB.deleteDatabase(database.name);
					}
				}
			}).catch(() => {
				// Ignore errors during cleanup
			});
		});
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should bookmark a work entity and verify persistence', async ({ page }) => {
		// 1. Navigate to work detail page
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Get the actual entity title for verification
		const entityTitle = page.locator('h1').first();
		
		await expect(entityTitle).toHaveText(/.+/);

		// 2. Verify bookmark button is not bookmarked initially
		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await expect(bookmarkButton).toBeVisible();

		// Check initial state - button should not be in "filled" variant
		
		await expect(bookmarkButton).not.toHaveAttribute('data-variant', 'filled');

		// 3. Click bookmark button to bookmark entity
		await bookmarkButton.click();

		// Wait for bookmark operation to complete
		// Removed: waitForTimeout - use locator assertions instead
		// 4. Verify bookmark button state changes to bookmarked
		await expect(bookmarkButton).toHaveAttribute('data-variant', 'filled');

		// 5. Reload page to verify persistence
		await page.reload();
		await waitForAppReady(page);
		await waitForEntityData(page);

		// 6. Verify bookmark persists after reload
		const bookmarkButtonAfterReload = page.locator('[data-testid="entity-bookmark-button"]');
		await expect(bookmarkButtonAfterReload).toHaveAttribute('data-variant', 'filled');

		// 7. Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// 8. Verify entity appears in bookmarks list
		const bookmarksPage = page.locator('[data-testid="bookmarks-page"]');
		await expect(bookmarksPage).toBeVisible();

		const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(1);

		// Verify the bookmarked entity title appears
		const bookmarkTitle = page.locator('[data-testid="bookmark-title-link"]').first();
		await expect(bookmarkTitle).toBeVisible();
		const bookmarkTitleText = await bookmarkTitle.textContent();
		expect(bookmarkTitleText ?? '').toContain(TEST_ENTITIES.work.id);

		// 9. Navigate back to entity and unbookmark
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// 10. Click bookmark button to remove bookmark
		const unbookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await unbookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// 11. Verify bookmark button state changes to not bookmarked
		await expect(unbookmarkButton).not.toHaveAttribute('data-variant', 'filled');

		// 12. Navigate back to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// 13. Verify entity is removed from bookmarks list
		const emptyBookmarksMessage = page.getByText(/no bookmarks yet/i);
		await expect(emptyBookmarksMessage).toBeVisible();
	});

	test('should bookmark author entity from detail page', async ({ page }) => {
		// Navigate to author detail page
		await page.goto(`/authors/${TEST_ENTITIES.author.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Get entity title
		const entityTitle = page.locator('h1').first();
		
		await expect(entityTitle).toHaveText(/.+/);

		// Click bookmark button
		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await expect(bookmarkButton).toBeVisible();
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify bookmarked state
		await expect(bookmarkButton).toHaveAttribute('data-variant', 'filled');

		// Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// Verify author appears in bookmarks
		const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(1);

		const bookmarkTitle = page.locator('[data-testid="bookmark-title-link"]').first();
		const bookmarkTitleText = await bookmarkTitle.textContent();
		expect(bookmarkTitleText ?? '').toContain(TEST_ENTITIES.author.id);
	});

	test('should handle multiple bookmarks', async ({ page }) => {
		// Bookmark first entity (work)
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		let bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Bookmark second entity (author)
		await page.goto(`/authors/${TEST_ENTITIES.author.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// Verify both entities appear
		const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(2);

		// Verify both entity IDs are present
		const bookmarkTitles = await page.locator('[data-testid="bookmark-title-link"]').allTextContents();
		expect(bookmarkTitles.some(title => title.includes(TEST_ENTITIES.work.id))).toBe(true);
		expect(bookmarkTitles.some(title => title.includes(TEST_ENTITIES.author.id))).toBe(true);
	});

	test('should remove bookmark from bookmarks page', async ({ page }) => {
		// Bookmark an entity
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// Verify bookmark exists
		const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(1);

		// Click the entity link to navigate back
		const bookmarkTitleLink = page.locator('[data-testid="bookmark-title-link"]').first();
		await bookmarkTitleLink.click();

		// Wait for navigation
		await page.waitForURL(/\/works\//);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Unbookmark the entity
		const unbookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await unbookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Go back to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// Verify bookmark is removed
		const emptyMessage = page.getByText(/no bookmarks yet/i);
		await expect(emptyMessage).toBeVisible();
	});

	test('should persist bookmarks across page navigation', async ({ page }) => {
		// Bookmark an entity
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate away to another page
		await page.goto('#/explore');
		await waitForAppReady(page);

		// Navigate to settings
		await page.goto('#/settings');
		await waitForAppReady(page);

		// Navigate back to entity
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify bookmark still exists
		const persistedBookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await expect(persistedBookmarkButton).toHaveAttribute('data-variant', 'filled');

		// Verify in bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(1);
	});

	test('should search bookmarks by title', async ({ page }) => {
		// Bookmark multiple entities
		await page.goto(`/works/${TEST_ENTITIES.work.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		let bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto(`/authors/${TEST_ENTITIES.author.id}`);
		await waitForAppReady(page);
		await waitForEntityData(page);

		bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to bookmarks page
		await page.goto('#/bookmarks');
		await waitForAppReady(page);

		// Verify both bookmarks exist
		let bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(2);

		// Search for work entity
		const searchInput = page.getByPlaceholder(/search bookmarks/i);
		await expect(searchInput).toBeVisible();
		await searchInput.fill(TEST_ENTITIES.work.id);
		// Removed: waitForTimeout - use locator assertions instead
		// Verify only work entity is shown
		bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(1);

		const visibleTitle = await page.locator('[data-testid="bookmark-title-link"]').first().textContent();
		expect(visibleTitle ?? '').toContain(TEST_ENTITIES.work.id);

		// Clear search
		await searchInput.clear();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify all bookmarks are shown again
		bookmarkCards = page.locator('[data-testid="bookmark-card"]');
		await expect(bookmarkCards).toHaveCount(2);
	});
});
