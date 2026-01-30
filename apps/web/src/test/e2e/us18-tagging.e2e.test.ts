/**
 * E2E Tests: US-18 Tagging
 *
 * Tests tag creation, renaming, deletion, multi-tag assignment,
 * tag-based filtering, and tag persistence alongside bookmark data.
 *
 * NOTE: The bookmarks page does not have inline tag creation/editing UI
 * (no data-testid="tag-input" or "add-tag-button"). Tags are stored
 * in the notes field of bookmarked entities and managed through the
 * catalogue system, not through direct inline editing on the bookmarks page.
 * Tests for features not yet implemented in the UI are skipped.
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
};

/**
 * Helper to bookmark an entity so tagging operations can be tested.
 * Uses the correct data-testid="entity-bookmark-button" from EntityDetailLayout.
 */
const bookmarkEntity = async (
	page: import('@playwright/test').Page,
	entityType: 'authors' | 'works' | 'institutions',
	entityId: string
): Promise<void> => {
	const entityPage = new BaseEntityPageObject(page, { entityType });
	await entityPage.gotoEntity(entityId);
	await entityPage.waitForLoadingComplete();

	const bookmarkButton = page.locator("[data-testid='entity-bookmark-button']");
	await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });
	await bookmarkButton.click();

	// Wait for the bookmark action to complete (button remains visible)
	await expect(bookmarkButton).toBeVisible({ timeout: 5_000 });
};

test.describe('@workflow US-18 Tagging', () => {
	test.setTimeout(120_000);

	test.beforeEach(async ({ page }) => {
		await page.goto(BASE_URL, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const storage = new StorageTestHelper(page);
		await storage.clearAllStorage();

		await page.reload({ waitUntil: 'domcontentloaded' });
		await waitForAppReady(page);
	});

	test.skip('should create new tags', async () => {
		// SKIPPED: The bookmarks page does not provide inline tag creation UI.
		// There is no data-testid="tag-input" or data-testid="add-tag-button"
		// on the bookmarks page. Tags are stored in the notes field of
		// CatalogueEntity and managed through the catalogue system.
		// The BookmarkSearchFilters component reads existing tags for filtering
		// but does not provide tag creation controls.
	});

	test.skip('should rename existing tags', async () => {
		// SKIPPED: Tag renaming UI is not implemented on the bookmarks page.
		// Tags are stored as plain text in the notes field and there is no
		// inline rename interaction (double-click, rename input, etc.).
	});

	test.skip('should delete tags', async () => {
		// SKIPPED: Tag deletion UI is not implemented on the bookmarks page.
		// There are no tag badges with remove buttons on individual bookmark items.
		// Tags are stored as part of the notes field text.
	});

	test.skip('should assign multiple tags per bookmark', async () => {
		// SKIPPED: Multiple tag assignment UI is not implemented.
		// The TagsInput component exists in catalogue list creation/editing
		// (CreateListModal, EditListModal) but not for individual bookmark items
		// on the bookmarks page.
	});

	test.skip('should filter bookmarks by tag', async () => {
		// SKIPPED: While BookmarkSearchFilters supports tag-based filtering,
		// tags must first be created on bookmarks. Since the tag creation UI
		// is not implemented on the bookmarks page, there are no tags to filter by.
		// This test depends on "should create new tags" which is also skipped.
	});

	test.skip('should persist tags alongside bookmark data', async () => {
		// SKIPPED: Tag persistence depends on the tag creation UI being available
		// on the bookmarks page. Since inline tag creation is not implemented,
		// this test cannot be executed.
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Bookmark an entity so the bookmarks page has content
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Wait for the bookmarks page to render
		await expect(
			page.locator('[data-testid="bookmarks-page"]')
		).toBeVisible({ timeout: 15_000 });

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
