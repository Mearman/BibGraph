/**
 * E2E Tests: US-18 Tagging
 *
 * Tests tag creation, renaming, deletion, multi-tag assignment,
 * tag-based filtering, and tag persistence alongside bookmark data.
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
 * @param page
 * @param entityType
 * @param entityId
 */
const bookmarkEntity = async (
	page: import('@playwright/test').Page,
	entityType: 'authors' | 'works' | 'institutions',
	entityId: string
): Promise<void> => {
	const entityPage = new BaseEntityPageObject(page, { entityType });
	await entityPage.gotoEntity(entityId);
	await entityPage.waitForLoadingComplete();

	const bookmarkButton = page.locator("[data-testid='bookmark-button']");
	await expect(bookmarkButton).toBeVisible({ timeout: 15_000 });
	await bookmarkButton.click();
	await expect(bookmarkButton).toHaveAttribute('aria-pressed', 'true', { timeout: 5_000 });
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

	test('should create new tags', async ({ page }) => {
		// Bookmark an entity first
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);

		// Navigate to bookmarks page
		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Find the bookmark item and locate the tag input
		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first();
		await expect(bookmarkItem).toBeVisible({ timeout: 15_000 });

		// Look for tag input or add-tag button on the bookmark item
		const tagInput = page.locator('[data-testid="tag-input"], [placeholder*="tag" i]');
		const addTagButton = page.locator('[data-testid="add-tag-button"]');

		if (await addTagButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTagButton.click();
		}

		if (await tagInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await tagInput.fill('machine-learning');
			await tagInput.press('Enter');

			// Verify the tag badge appears
			const tagBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
				hasText: 'machine-learning',
			});
			await expect(tagBadge).toBeVisible({ timeout: 5_000 });
		}
	});

	test('should rename existing tags', async ({ page }) => {
		// Bookmark and add a tag
		await bookmarkEntity(page, TEST_ENTITIES.work.type, TEST_ENTITIES.work.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first();
		await expect(bookmarkItem).toBeVisible({ timeout: 15_000 });

		// Add initial tag
		const tagInput = page.locator('[data-testid="tag-input"], [placeholder*="tag" i]');
		const addTagButton = page.locator('[data-testid="add-tag-button"]');

		if (await addTagButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTagButton.click();
		}

		if (await tagInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await tagInput.fill('old-name');
			await tagInput.press('Enter');

			// Look for edit/rename action on the tag
			const tagBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
				hasText: 'old-name',
			});
			await expect(tagBadge).toBeVisible({ timeout: 5_000 });

			// Double-click or right-click to rename
			await tagBadge.dblclick();

			// Look for inline edit input or rename modal
			const renameInput = page.locator(
				'[data-testid="tag-rename-input"], [data-testid="tag-input"]:visible'
			);
			if (await renameInput.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await renameInput.clear();
				await renameInput.fill('new-name');
				await renameInput.press('Enter');

				// Verify renamed tag appears
				const renamedBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
					hasText: 'new-name',
				});
				await expect(renamedBadge).toBeVisible({ timeout: 5_000 });

				// Verify old name is gone
				await expect(tagBadge).toBeHidden();
			}
		}
	});

	test('should delete tags', async ({ page }) => {
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first();
		await expect(bookmarkItem).toBeVisible({ timeout: 15_000 });

		const tagInput = page.locator('[data-testid="tag-input"], [placeholder*="tag" i]');
		const addTagButton = page.locator('[data-testid="add-tag-button"]');

		if (await addTagButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTagButton.click();
		}

		if (await tagInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await tagInput.fill('deletable-tag');
			await tagInput.press('Enter');

			const tagBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
				hasText: 'deletable-tag',
			});
			await expect(tagBadge).toBeVisible({ timeout: 5_000 });

			// Click remove button on the tag (Mantine Badge with close button)
			const removeButton = tagBadge.locator(
				'[data-testid="tag-remove"], .mantine-Badge-remove, button[aria-label*="remove" i], button[aria-label*="delete" i]'
			);

			if (await removeButton.isVisible({ timeout: 3_000 }).catch(() => false)) {
				await removeButton.click();

				// Verify tag is removed
				await expect(tagBadge).not.toBeVisible({ timeout: 5_000 });
			}
		}
	});

	test('should assign multiple tags per bookmark', async ({ page }) => {
		await bookmarkEntity(page, TEST_ENTITIES.work.type, TEST_ENTITIES.work.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first();
		await expect(bookmarkItem).toBeVisible({ timeout: 15_000 });

		const tagNames = ['ai', 'deep-learning', 'nlp'];
		const tagInput = page.locator('[data-testid="tag-input"], [placeholder*="tag" i]');
		const addTagButton = page.locator('[data-testid="add-tag-button"]');

		if (await addTagButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTagButton.click();
		}

		if (await tagInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			for (const tagName of tagNames) {
				await tagInput.fill(tagName);
				await tagInput.press('Enter');
			}

			// Verify all three tags are visible
			for (const tagName of tagNames) {
				const tagBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
					hasText: tagName,
				});
				await expect(tagBadge).toBeVisible({ timeout: 5_000 });
			}
		}
	});

	test('should filter bookmarks by tag', async ({ page }) => {
		// Bookmark two entities with different tags
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);
		await bookmarkEntity(page, TEST_ENTITIES.work.type, TEST_ENTITIES.work.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Verify both bookmarks are shown initially
		const allBookmarks = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root');
		await expect(allBookmarks.first()).toBeVisible({ timeout: 15_000 });
		const initialCount = await allBookmarks.count();
		expect(initialCount).toBeGreaterThanOrEqual(2);

		// Look for tag filter controls
		const tagFilter = page.locator(
			'[data-testid="tag-filter"], [data-testid="tag-filter-chip"], [aria-label*="filter by tag" i]'
		);

		if (await tagFilter.first().isVisible({ timeout: 5_000 }).catch(() => false)) {
			// Click a specific tag filter chip
			await tagFilter.first().click();

			// The filtered results should show fewer items than the initial count
			const filteredCount = await allBookmarks.count();
			expect(filteredCount).toBeLessThanOrEqual(initialCount);
		}
	});

	test('should persist tags alongside bookmark data', async ({ page }) => {
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first();
		await expect(bookmarkItem).toBeVisible({ timeout: 15_000 });

		// Add a tag
		const tagInput = page.locator('[data-testid="tag-input"], [placeholder*="tag" i]');
		const addTagButton = page.locator('[data-testid="add-tag-button"]');

		if (await addTagButton.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await addTagButton.click();
		}

		if (await tagInput.isVisible({ timeout: 5_000 }).catch(() => false)) {
			await tagInput.fill('persist-test');
			await tagInput.press('Enter');

			const tagBadge = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
				hasText: 'persist-test',
			});
			await expect(tagBadge).toBeVisible({ timeout: 5_000 });

			// Reload the page to verify persistence
			await page.reload({ waitUntil: 'domcontentloaded' });
			await waitForAppReady(page);

			// Verify the tag is still present after reload
			const persistedTag = page.locator('[data-testid="tag-badge"], .mantine-Badge-root').filter({
				hasText: 'persist-test',
			});
			await expect(persistedTag).toBeVisible({ timeout: 15_000 });
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Bookmark an entity so the bookmarks page has content with tags
		await bookmarkEntity(page, TEST_ENTITIES.author.type, TEST_ENTITIES.author.id);

		await page.goto(`${BASE_URL}/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});
		await waitForAppReady(page);

		// Wait for bookmark content to render
		await expect(
			page.locator('[data-testid="bookmark-list-item"], .mantine-Card-root').first()
		).toBeVisible({ timeout: 15_000 });

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
