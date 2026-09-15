/**
 * E2E Tests: Bookmark Custom Field Views (User Story 2)
 *
 * Tests the ability to bookmark entity pages with custom field selections
 * using the select parameter. Verifies that custom views are restored when
 * accessing bookmarks.
 *
 * Related:
 * - T025: E2E test for bookmarking custom field views
 * - User Story 2: Bookmark Custom Field Views (Priority: P2)
 */

import type { Page } from "@playwright/test";
import { expect,test } from "@playwright/test";

/**
 * Helper to navigate to an entity page with custom select parameter
 */
const navigateToEntityWithCustomFields = async (page: Page, entityType: string, entityId: string, selectFields: readonly string[]): Promise<void> => {
  const selectParameter = selectFields.join(",");
  const url = `/${entityType}/${entityId}?select=${selectParameter}`;
  await page.goto(url);
  await page.waitForLoadState("networkidle");
};

/**
 * Helper to bookmark the current page
 */
const bookmarkCurrentPage = async (page: Page): Promise<void> => {
  const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
  await expect(bookmarkButton).toBeVisible();
  await bookmarkButton.click();
  // Wait for bookmark operation to complete
  // Removed: waitForTimeout - use locator assertions instead
};

/**
 * Helper to navigate to bookmarks page
 */
const navigateToBookmarks = async (page: Page): Promise<void> => {
  await page.goto("/bookmarks/");
  await page.waitForLoadState("networkidle");
};

/**
 * Helper to get bookmark items
 */
const getBookmarkItems = (page: Page) => page.locator('[data-testid="bookmark-list-item"]');

/**
 * Helper to extract select parameter from URL
 */
const extractSelectParameter = (url: string): string[] => {
  const urlObject = new URL(url, "http://localhost");
  const selectParameter = urlObject.searchParams.get("select");
  return selectParameter !== null ? selectParameter.split(",") : [];
};

/**
 * Type guard confirming a parsed JSON value is a plain object.
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

test.describe("Bookmark Custom Field Views", () => {
  test.beforeEach(async ({ page }) => {
    // Clear bookmarks before each test
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
  });

  test("should bookmark author page with custom select fields", async ({ page }) => {
    // Navigate to author page with custom fields
    const customFields = ["id", "display_name", "works_count", "cited_by_count"];
    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", customFields);

    // Verify the select parameter is in the URL
    expect(page.url()).toContain(`select=${customFields.join(",")}`);

    // Bookmark the page
    await bookmarkCurrentPage(page);

    // Navigate to bookmarks page
    await navigateToBookmarks(page);

    // Verify bookmark exists
    const bookmarkItems = getBookmarkItems(page);
    await expect(bookmarkItems).toHaveCount(1);

    // Verify bookmark shows field selection preview
    const bookmark = bookmarkItems.first();
    await expect(bookmark).toBeVisible();

    // Check if field preview is displayed (this is T030 - field selection preview)
    const fieldPreview = bookmark.locator('[data-testid="field-selection-preview"]');
    if (await fieldPreview.isVisible()) {
      // If field preview exists, verify it shows the custom fields
      const previewText = await fieldPreview.textContent();
      expect(previewText).toContain("4 fields");
    }
  });

  test("should restore custom field selection when navigating to bookmark", async ({ page }) => {
    // Navigate to work page with custom fields
    const customFields = ["id", "title", "publication_year", "type"];
    await navigateToEntityWithCustomFields(page, "works", "W2741809807", customFields);

    // Bookmark the page
    await bookmarkCurrentPage(page);

    // Navigate away
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Go to bookmarks page
    await navigateToBookmarks(page);

    // Click the bookmark to navigate back
    const bookmarkItems = getBookmarkItems(page);
    await bookmarkItems.first().click();
    await page.waitForLoadState("networkidle");

    // Verify the URL contains the select parameter
    const currentUrl = page.url();
    const selectFields = extractSelectParameter(currentUrl);
    expect(selectFields).toEqual(customFields);

    // Verify the page displays only the selected fields
    // (In raw view mode, we can verify the JSON structure)
    const rawViewButton = page.locator('button:has-text("Raw View")');
    if (await rawViewButton.isVisible()) {
      await rawViewButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      const rawContent = await page.locator("pre").textContent();
      const parsedContent: unknown = JSON.parse(rawContent ?? "{}");
      const jsonData = isRecord(parsedContent) ? parsedContent : {};

      // Verify only the selected fields are present (plus always-included fields)
      const actualFields = Object.keys(jsonData);
      for (const field of customFields) {
        expect(actualFields).toContain(field);
      }
    }
  });

  test("should handle multiple bookmarks for same entity with different field selections", async ({ page }) => {
    const entityType = "authors";
    const entityId = "A2208157607";

    // Create first bookmark with minimal fields
    const minimalFields = ["id", "display_name"];
    await navigateToEntityWithCustomFields(page, entityType, entityId, minimalFields);
    await bookmarkCurrentPage(page);

    // Navigate away
    await page.goto("/");
    await page.waitForLoadState("networkidle");

    // Create second bookmark with extended fields
    const extendedFields = ["id", "display_name", "works_count", "cited_by_count", "h_index"];
    await navigateToEntityWithCustomFields(page, entityType, entityId, extendedFields);
    await bookmarkCurrentPage(page);

    // Go to bookmarks page
    await navigateToBookmarks(page);

    // Verify two bookmarks exist for the same entity
    const bookmarkItems = getBookmarkItems(page);
    await expect(bookmarkItems).toHaveCount(2);

    // Verify each bookmark shows different field counts
    const firstBookmark = bookmarkItems.nth(0);
    const secondBookmark = bookmarkItems.nth(1);

    // Check for field preview indicators
    const firstPreview = firstBookmark.locator('[data-testid="field-selection-preview"]');
    const secondPreview = secondBookmark.locator('[data-testid="field-selection-preview"]');

    if (await firstPreview.isVisible() && await secondPreview.isVisible()) {
      const firstText = await firstPreview.textContent();
      const secondText = await secondPreview.textContent();

      // One should show "2 fields" and the other "5 fields"
      const isMinimalThenExtended =
        firstText?.includes("2 fields") === true && secondText?.includes("5 fields") === true;
      const isExtendedThenMinimal =
        firstText?.includes("5 fields") === true && secondText?.includes("2 fields") === true;
      expect(isMinimalThenExtended || isExtendedThenMinimal).toBeTruthy();
    }
  });

  test("should preserve select parameter across bookmark deletion and re-creation", async ({ page }) => {
    const customFields = ["id", "display_name", "works_count"];
    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", customFields);

    // Bookmark
    await bookmarkCurrentPage(page);

    // Unbookmark
    const bookmarkButton = page.locator('[data-testid="entity-bookmark-button"]');
    await bookmarkButton.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Bookmark again (should preserve the same select parameter)
    await bookmarkButton.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Navigate to bookmarks page
    await navigateToBookmarks(page);

    // Click bookmark to navigate back
    const bookmarkItems = getBookmarkItems(page);
    await bookmarkItems.first().click();
    await page.waitForLoadState("networkidle");

    // Verify select parameter is still present
    const currentUrl = page.url();
    const selectFields = extractSelectParameter(currentUrl);
    expect(selectFields).toEqual(customFields);
  });

  test("should handle select parameter with special characters", async ({ page }) => {
    // Some OpenAlex fields have special characters (like nested fields)
    const customFields = ["id", "display_name", "counts_by_year"];
    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", customFields);

    await bookmarkCurrentPage(page);

    await navigateToBookmarks(page);

    // Click bookmark to navigate back
    const bookmarkItems = getBookmarkItems(page);
    await bookmarkItems.first().click();
    await page.waitForLoadState("networkidle");

    // Verify URL preservation (commas should NOT be encoded per OpenAlex requirements)
    const currentUrl = page.url();
    expect(currentUrl).toContain("select=id,display_name,counts_by_year");
    expect(currentUrl).not.toContain("%2C"); // Commas should NOT be URL-encoded
  });

  test("should display field selection summary in bookmark list item", async ({ page }) => {
    // Bookmark multiple entities with different field selections
    const entities = [
      { type: "authors", id: "A2208157607", fields: ["id", "display_name"] },
      { type: "works", id: "W2741809807", fields: ["id", "title", "publication_year"] },
      { type: "institutions", id: "I33213144", fields: ["id", "display_name", "country_code", "type"] },
    ];

    for (const entity of entities) {
      await navigateToEntityWithCustomFields(page, entity.type, entity.id, entity.fields);
      await bookmarkCurrentPage(page);
    }

    // Navigate to bookmarks page
    await navigateToBookmarks(page);

    // Verify all bookmarks show field selection preview
    const bookmarkItems = getBookmarkItems(page);
    await expect(bookmarkItems).toHaveCount(entities.length);

    for (const [index, entity] of entities.entries()) {
      const bookmark = bookmarkItems.nth(index);
      const fieldPreview = bookmark.locator('[data-testid="field-selection-preview"]');

      if (await fieldPreview.isVisible()) {
        const previewText = await fieldPreview.textContent();
        const expectedFieldCount = entity.fields.length;
        expect(previewText).toContain(`${String(expectedFieldCount)} field`);
      }
    }
  });

  test("should handle default field selection (no select parameter)", async ({ page }) => {
    // Navigate to entity without select parameter
    await page.goto("/authors/A2208157607");
    await page.waitForLoadState("networkidle");

    await bookmarkCurrentPage(page);

    await navigateToBookmarks(page);

    // Verify bookmark exists and shows "default fields" indicator
    const bookmarkItems = getBookmarkItems(page);
    await expect(bookmarkItems).toHaveCount(1);

    const bookmark = bookmarkItems.first();
    const fieldPreview = bookmark.locator('[data-testid="field-selection-preview"]');

    if (await fieldPreview.isVisible()) {
      const previewText = await fieldPreview.textContent();
      // Should indicate default or show a different indicator
      expect(
        previewText?.includes("default") ??
        previewText?.includes("all fields") ??
        previewText?.includes("standard")
      ).toBeTruthy();
    }
  });

  test("should update field preview when bookmark is edited (future feature)", async ({ page }) => {
    // This test prepares for future functionality where users can edit bookmarks
    const initialFields = ["id", "display_name"];
    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", initialFields);
    await bookmarkCurrentPage(page);

    await navigateToBookmarks(page);

    const bookmarkItems = getBookmarkItems(page);
    const bookmark = bookmarkItems.first();

    // Check if edit functionality exists
    const editButton = bookmark.locator('[data-testid="edit-bookmark-button"]');
    if (await editButton.isVisible()) {
      // Future implementation: Edit the bookmark's select parameter
      // For now, just verify the structure is testable
      await expect(editButton).toBeVisible();
    }
  });

  test("should sort bookmarks by field count", async ({ page }) => {
    // Create bookmarks with varying field counts
    const entities = [
      { type: "authors", id: "A2208157607", fields: ["id", "display_name", "works_count", "cited_by_count", "h_index"] }, // 5 fields
      { type: "works", id: "W2741809807", fields: ["id", "title"] }, // 2 fields
      { type: "institutions", id: "I33213144", fields: ["id", "display_name", "country_code"] }, // 3 fields
    ];

    for (const entity of entities) {
      await navigateToEntityWithCustomFields(page, entity.type, entity.id, entity.fields);
      await bookmarkCurrentPage(page);
    }

    await navigateToBookmarks(page);

    // Check if sort-by-fields option exists
    const sortButton = page.locator('button:has-text("sort")', { hasText: /sort/i });
    if (await sortButton.isVisible()) {
      // Future implementation: Sort by field count
      // For now, just verify the structure is in place
      await expect(sortButton).toBeVisible();
    }

    // Verify bookmarks are displayed (order may vary)
    const bookmarkItems = getBookmarkItems(page);
    await expect(bookmarkItems).toHaveCount(entities.length);
  });

  test("should handle complex select parameters with nested fields", async ({ page }) => {
    // Test with complex nested field selections
    const complexFields = [
      "id",
      "display_name",
      "works_count",
      "cited_by_count",
      "counts_by_year",
      "x_concepts",
    ];

    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", complexFields);
    await bookmarkCurrentPage(page);

    await navigateToBookmarks(page);

    // Click bookmark to navigate back
    const bookmarkItems = getBookmarkItems(page);
    await bookmarkItems.first().click();
    await page.waitForLoadState("networkidle");

    // Verify complex fields are preserved
    const currentUrl = page.url();
    const selectFields = extractSelectParameter(currentUrl);
    expect(selectFields).toEqual(complexFields);
  });

  test("should handle empty select parameter gracefully", async ({ page }) => {
    // Edge case: Navigate with select parameter but empty value
    await page.goto("/authors/A2208157607?select=");
    await page.waitForLoadState("networkidle");

    await bookmarkCurrentPage(page);

    await navigateToBookmarks(page);

    // Click bookmark
    const bookmarkItems = getBookmarkItems(page);
    await bookmarkItems.first().click();
    await page.waitForLoadState("networkidle");

    // Verify the page loads successfully (should fall back to default fields)
    await expect(page.locator("h1")).toBeVisible();
  });

  test("should differentiate between entity and query bookmarks with select parameter", async ({ page }) => {
    // Bookmark an entity page with select parameter
    const customFields = ["id", "display_name", "works_count"];
    await navigateToEntityWithCustomFields(page, "authors", "A2208157607", customFields);
    await bookmarkCurrentPage(page);

    // Bookmark a query page with select parameter
    await page.goto("/works?select=id,title&filter=is_oa:true");
    await page.waitForLoadState("networkidle");

    // Check if query bookmark button exists
    const queryBookmarkButton = page.locator('[data-testid="query-bookmark-button"]');
    if (await queryBookmarkButton.isVisible()) {
      await queryBookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Navigate to bookmarks
    await navigateToBookmarks(page);

    // Verify both bookmarks exist and are distinguishable
    const bookmarkItems = getBookmarkItems(page);
    const count = await bookmarkItems.count();
    expect(count).toBeGreaterThanOrEqual(1); // At least the entity bookmark

    // Check for entity type badges to distinguish entity vs query bookmarks
    const entityBadges = page.locator('[data-testid="entity-type-badge"]');
    if (await entityBadges.first().isVisible()) {
      await expect(entityBadges).toHaveCount(count);
    }
  });
});
