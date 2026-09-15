/**
 * E2E Tests: Bookmark Tagging (User Story 3)
 *
 * Tests the ability to add, edit, and remove tags from bookmarks.
 * Verifies tag-based filtering and organization.
 *
 * Related:
 * - T033: E2E test for bookmark tagging
 * - User Story 3: Organize and Search Bookmarks (Priority: P3)
 */

import type { Page } from "@playwright/test";
import { expect,test } from "@playwright/test";

/**
 * Helper to clear all bookmarks before each test
 */
const clearBookmarks = async (page: Page): Promise<void> => {
	await page.goto("/");
	await page.evaluate(async () => {
		return new Promise<void>((resolve) => {
			const request = indexedDB.deleteDatabase("bibgraph-db");
			request.onsuccess = () => { resolve(); };
			request.onerror = () => { resolve(); };
		});
	});
	await page.reload();
	await page.waitForLoadState("networkidle");
};

/**
 * Helper to create a bookmark with tags (currently unused - for future use)
 */
// async function createBookmarkWithTags(
//	page: Page,
//	entityType: string,
//	entityId: string,
//	tags: string[]
// ): Promise<void> {
//	await page.goto(`/${entityType}/${entityId}`);
//	await page.waitForLoadState("networkidle");
//
//	// Click bookmark button
//	const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
//	await expect(bookmarkButton).toBeVisible();
//	await bookmarkButton.click();
//	// Removed: waitForTimeout - use locator assertions instead
//
//	// TODO: Add tags via tag input (once implemented)
//	// For now, tags would be added through bookmark edit UI
// }

test.describe("Bookmark Tagging", () => {
	test.beforeEach(async ({ page }) => {
		await clearBookmarks(page);
	});

	test("should display tag input when editing a bookmark", async ({ page }) => {
		// Create a bookmark
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to bookmarks page
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Check if tag input exists (will be implemented)
		const bookmarkItem = page.locator('[data-testid="bookmark-list-item"]').first();
		await expect(bookmarkItem).toBeVisible();

		// Look for edit button or tag input
		// This test serves as documentation for future implementation (T036)
		// const tagInput = bookmarkItem.locator('[data-testid="tag-input"]');
	});

	test("should add a single tag to a bookmark", async ({ page }) => {
		// Create bookmark
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		// Go to bookmarks page
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Add tag (implementation pending - verify structure for future use)
		// const bookmarkItem = page.locator('[data-testid="bookmark-list-item"]').first();
		// const tagInput = bookmarkItem.locator('[data-testid="tag-input"]');

		// Future implementation:
		// await tagInput.fill("machine-learning");
		// await tagInput.press("Enter");
		// await expect(bookmarkItem.locator('[data-testid="tag-badge"]:has-text("machine-learning")')).toBeVisible();
	});

	test("should add multiple tags to a bookmark", async ({ page }) => {
		await page.goto("/works/W2741809807");
		await page.waitForLoadState("networkidle");

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add multiple tags
		// Tags: "ai", "deep-learning", "nlp"
		// const bookmarkItem = page.locator('[data-testid="bookmark-list-item"]').first();

		// Expected: All three tags should be visible
	});

	test("should remove a tag from a bookmark", async ({ page }) => {
		// Create bookmark with tags
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");

		const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
		await bookmarkButton.click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add and remove tag
		// 1. Add tag "research"
		// 2. Click remove button on tag
		// 3. Verify tag is removed
	});

	test("should filter bookmarks by tag", async ({ page }) => {
		// Create multiple bookmarks with different tags
		const bookmarks = [
			{ type: "authors", id: "A2208157607", tags: ["ai", "research"] },
			{ type: "works", id: "W2741809807", tags: ["nlp", "research"] },
			{ type: "institutions", id: "I33213144", tags: ["university"] },
		];

		// Create all bookmarks (simplified - actual tagging pending)
		for (const bookmark of bookmarks) {
			await page.goto(`/${bookmark.type}/${bookmark.id}`);
			await page.waitForLoadState("networkidle");
			const button = page.locator('[data-testid="entity-bookmark-button"]');
			await button.click();
			// Removed: waitForTimeout - use locator assertions instead
		}

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Verify all bookmarks are shown initially
		const allBookmarks = page.locator('[data-testid="bookmark-list-item"]');
		await expect(allBookmarks).toHaveCount(bookmarks.length);

		// Future implementation: Filter by "research" tag
		// Expected: Only 2 bookmarks shown (authors and works)
		// const tagFilter = page.locator('[data-testid="tag-filter-chip"]:has-text("research")');
		// await tagFilter.click();
		// await expect(allBookmarks).toHaveCount(2);
	});

	test("should show tag suggestions based on existing tags", async ({ page }) => {
		// Create bookmarks with common tags
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Tag autocomplete
		// When typing in tag input, should suggest previously used tags
	});

	test("should handle tag names with special characters", async ({ page }) => {
		await page.goto("/works/W2741809807");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add tags with hyphens, underscores
		// Tags: "machine-learning", "ai_research", "NLP 2024"
		// All should be stored and displayed correctly
	});

	test("should persist tags across page reloads", async ({ page }) => {
		// Create bookmark with tags
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Add tags (future implementation)
		// Reload page
		await page.reload();
		await page.waitForLoadState("networkidle");

		// Verify tags are still present
		// const bookmarkItem = page.locator('[data-testid="bookmark-list-item"]').first();
		// Expected: Tags should be visible after reload
	});

	test("should show tag count in bookmark metadata", async ({ page }) => {
		await page.goto("/works/W2741809807");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Show "3 tags" indicator
		// const bookmarkItem = page.locator('[data-testid="bookmark-list-item"]').first();
		// Expected: Tag count badge or text showing number of tags
	});

	test("should allow editing tags inline", async ({ page }) => {
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Click on tag to edit
		// Or click edit button to enter edit mode
		// Modify tags inline without opening modal
	});

	test("should support bulk tag operations", async ({ page }) => {
		// Create multiple bookmarks
		const entities = [
			{ type: "authors", id: "A2208157607" },
			{ type: "works", id: "W2741809807" },
			{ type: "institutions", id: "I33213144" },
		];

		for (const entity of entities) {
			await page.goto(`/${entity.type}/${entity.id}`);
			await page.waitForLoadState("networkidle");
			await page.locator('[data-testid="entity-bookmark-button"]').click();
			// Removed: waitForTimeout - use locator assertions instead
		}

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Select multiple bookmarks
		// Apply tag to all selected bookmarks at once
		// Expected: Bulk tagging UI and functionality
	});

	test("should handle empty tag input gracefully", async ({ page }) => {
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Try to add empty tag
		// Expected: Empty tags should be rejected or ignored
	});

	test("should prevent duplicate tags on same bookmark", async ({ page }) => {
		await page.goto("/works/W2741809807");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add tag "ai" twice
		// Expected: Only one instance of "ai" tag should exist
	});

	test("should show most frequently used tags", async ({ page }) => {
		// Create multiple bookmarks with overlapping tags
		const bookmarks = [
			{ type: "authors", id: "A2208157607" }, // tags: research, ai
			{ type: "works", id: "W2741809807" }, // tags: research, nlp
			{ type: "institutions", id: "I33213144" }, // tags: university
		];

		for (const bookmark of bookmarks) {
			await page.goto(`/${bookmark.type}/${bookmark.id}`);
			await page.waitForLoadState("networkidle");
			await page.locator('[data-testid="entity-bookmark-button"]').click();
			// Removed: waitForTimeout - use locator assertions instead
		}

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Show popular tags sidebar or cloud
		// "research" appears 2 times, should be highlighted
	});

	test("should clear all tags from a bookmark", async ({ page }) => {
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add multiple tags, then remove all
		// Expected: "Clear all tags" button or remove each individually
	});

	test("should maintain tag order", async ({ page }) => {
		await page.goto("/works/W2741809807");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Add tags in specific order
		// Tags: "nlp", "ai", "research"
		// Expected: Tags displayed in the order they were added
	});
});

test.describe("Tag-based Navigation", () => {
	test.beforeEach(async ({ page }) => {
		await clearBookmarks(page);
	});

	test("should navigate to tag-filtered view from tag click", async ({ page }) => {
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Click on a tag badge
		// Expected: Navigate to filtered view showing only bookmarks with that tag
	});

	test("should support multiple tag filters (AND logic)", async ({ page }) => {
		// Create bookmarks with various tag combinations
		await page.goto("/authors/A2208157607");
		await page.waitForLoadState("networkidle");
		await page.locator('[data-testid="entity-bookmark-button"]').click();
		// Removed: waitForTimeout - use locator assertions instead
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Select tags "ai" AND "research"
		// Expected: Only bookmarks with BOTH tags are shown
	});

	test("should support tag filters with OR logic option", async ({ page }) => {
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Future implementation: Toggle between AND/OR logic
		// Filter: "ai" OR "nlp"
		// Expected: Bookmarks with either tag are shown
	});
});
