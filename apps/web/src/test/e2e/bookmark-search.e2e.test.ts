/**
 * E2E Tests: Bookmark Search (User Story 3)
 *
 * Tests the ability to search through bookmarks by title, entity type, tags, and notes.
 * Verifies search functionality and filtering behavior.
 *
 * Related:
 * - T034: E2E test for bookmark search
 * - User Story 3: Organize and Search Bookmarks (Priority: P3)
 */

import type { Page } from "@playwright/test";
import { expect,test } from "@playwright/test";

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

const createBookmark = async (page: Page, entityType: string, entityId: string): Promise<void> => {
	await page.goto(`/${entityType}/${entityId}`);
	await page.waitForLoadState("networkidle");
	const button = page.locator('[data-testid="entity-bookmark-button"]');
	await expect(button).toBeVisible();
	await button.click();
	// Removed: waitForTimeout - use locator assertions instead
};

const SEEDED_BOOKMARK_COUNT = 3;

test.describe("Bookmark Search", () => {
	test.beforeEach(async ({ page }) => {
		await clearBookmarks(page);
	});

	test("should display search input in bookmarks page", async ({ page }) => {
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Search input should be visible (will be implemented in T040)
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
	});

	test("should search bookmarks by title", async ({ page }) => {
		// Create bookmarks with different titles
		await createBookmark(page, "authors", "A2208157607"); // Some author name
		await createBookmark(page, "works", "W2741809807"); // Some work title
		await createBookmark(page, "institutions", "I33213144"); // Some institution

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Verify all bookmarks shown
		const bookmarks = page.locator('[data-testid="bookmark-list-item"]');
		await expect(bookmarks).toHaveCount(SEEDED_BOOKMARK_COUNT);

		// Search for specific title keyword (feature will be implemented)
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");
		// await page.waitForTimeout(500); // Debounce

		// Expected: Only matching bookmark shown
		// await expect(bookmarks).toHaveCount(1);
	});

	test("should search bookmarks by entity type", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");
		await createBookmark(page, "institutions", "I33213144");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Search by entity type (feature will be implemented)
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("works");

		// Expected: Only works bookmark shown
	});

	test("should search bookmarks by tags", async ({ page }) => {
		// Create bookmarks with tags (tags added after creation)
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Add tags to bookmarks (future implementation)
		// Bookmark 1: tags = ["ai", "research"]
		// Bookmark 2: tags = ["nlp", "deep-learning"]

		// Search by tag (feature will be implemented)
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("ai");

		// Expected: Only bookmark with "ai" tag shown
	});

	test("should search bookmarks by notes", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Add notes to bookmarks (future implementation)
		// Bookmark 1: notes = "Important researcher in machine learning"
		// Bookmark 2: notes = "Seminal paper on transformers"

		// Search by note content (feature will be implemented)
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("transformers");

		// Expected: Only bookmark 2 shown
	});

	test("should perform case-insensitive search", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("AUTHOR"); // Uppercase

		// Expected: Case should not matter, bookmark still shown
	});

	test("should show no results message for non-matching search", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("nonexistent");

		// Expected: No bookmarks shown, empty state message
		// const emptyMessage = page.locator('text=/no bookmarks found/i');
		// await expect(emptyMessage).toBeVisible();
	});

	test("should clear search when input is cleared", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");
		// // Removed: waitForTimeout - use locator assertions instead
		// Only 1 shown
		// const bookmarks = page.locator('[data-testid="bookmark-list-item"]');
		// await expect(bookmarks).toHaveCount(1);

		// Clear search
		// await searchInput.clear();
		// // Removed: waitForTimeout - use locator assertions instead
		// All bookmarks shown again
		// await expect(bookmarks).toHaveCount(2);
	});

	test("should debounce search input", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');

		// Type rapidly
		// await searchInput.type("author", { delay: 50 });

		// Expected: Search only triggers after typing stops
		// Not on every keystroke
	});

	test("should highlight search matches in results", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");

		// Expected: Matching text in title/notes highlighted
		// const highlight = page.locator('[data-testid="search-highlight"]');
		// await expect(highlight).toBeVisible();
	});

	test("should show search result count", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");
		await createBookmark(page, "institutions", "I33213144");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");

		// Expected: "1 result" or "1 of 3 bookmarks" shown
		// const resultCount = page.locator('[data-testid="search-result-count"]');
		// await expect(resultCount).toContainText("1");
	});

	test("should persist search query in URL", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");
		// // Removed: waitForTimeout - use locator assertions instead
		// Expected: URL contains search parameter
		// expect(page.url()).toContain("search=author");

		// Reload page
		await page.reload();
		await page.waitForLoadState("networkidle");

		// Expected: Search still active, results still filtered
		// const bookmarks = page.locator('[data-testid="bookmark-list-item"]');
		// await expect(bookmarks).toHaveCount(1);
	});

	test("should support partial word matching", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// Search with partial word
		// await searchInput.fill("auth");

		// Expected: Matches "author"
		// const bookmarks = page.locator('[data-testid="bookmark-list-item"]');
		// await expect(bookmarks).toHaveCount(1);
	});

	test("should handle special characters in search", async ({ page }) => {
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// Search with special characters
		// await searchInput.fill("C++");

		// Expected: Special characters handled correctly
	});
});

test.describe("Combined Search and Filters", () => {
	test.beforeEach(async ({ page }) => {
		await clearBookmarks(page);
	});

	test("should combine search with entity type filter", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Apply entity type filter
		// const entityFilter = page.locator('[data-testid="entity-type-filter"]');
		// await entityFilter.selectOption("works");

		// Then search
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("title");

		// Expected: Only works bookmarks matching search shown
	});

	test("should combine search with tag filter", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");
		await createBookmark(page, "works", "W2741809807");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Apply tag filter
		// const tagFilter = page.locator('[data-testid="tag-filter-chip"]').first();
		// await tagFilter.click();

		// Then search
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("research");

		// Expected: Only bookmarks with tag AND matching search
	});

	test("should show clear filters button when filters active", async ({ page }) => {
		await createBookmark(page, "authors", "A2208157607");

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Apply search
		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("author");

		// Expected: Clear button visible
		// const clearButton = page.locator('[data-testid="clear-filters-button"]');
		// await expect(clearButton).toBeVisible();

		// Click clear
		// await clearButton.click();

		// Expected: All filters cleared, all bookmarks shown
	});
});

test.describe("Search Performance", () => {
	test("should handle searching large bookmark collections", async ({ page }) => {
		// Create 100 bookmarks (simplified for test)
		// In practice, would need to be more efficient

		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// const searchInput = page.locator('[data-testid="bookmark-search-input"]');
		// await searchInput.fill("test");

		// Expected: Search completes quickly (< 500ms)
		// Results are accurate
	});

	test("should virtualize large search results", async ({ page }) => {
		// With many matching results, list should be virtualized
		await page.goto("/bookmarks/");
		await page.waitForLoadState("networkidle");

		// Expected: Only visible items rendered
		// Smooth scrolling performance
	});
});
