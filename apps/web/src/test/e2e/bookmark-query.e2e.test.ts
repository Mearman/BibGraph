/**
 * E2E tests for bookmarking query pages (T011)
 * Tests bookmark functionality for search results pages with query parameters
 *
 * IMPORTANT: This test is designed to FAIL initially as the feature is not yet implemented.
 * These tests verify that:
 * 1. Query pages can be bookmarked with parameters preserved
 * 2. Bookmarked queries appear in the bookmarks list
 * 3. Clicking bookmarked queries restores original query parameters
 * 4. Query parameters are correctly serialized and deserialized
 *
 * Test Categories:
 * - Basic query bookmarking (filter, search, sort parameters)
 * - Complex query bookmarking (multiple parameters, pagination)
 * - Bookmark persistence and restoration
 * - Query parameter preservation across navigation
 */

import type { Page } from "@playwright/test";
import { expect, test } from "@playwright/test";

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = IS_CI ? "http://localhost:4173" : "http://localhost:5173";
const APP_INIT_WAIT_MS = 1000;
const QUERY_RESULTS_WAIT_MS = 2000;
const SEARCH_QUERY_WAIT_MS = 3000;
const RAPID_CLICK_COUNT = 5;

/**
 * Test query scenarios covering different OpenAlex query patterns
 */
const TEST_QUERIES = {
  // Simple filter query
  publicationYear: {
    path: "/works",
    params: { filter: "publication_year:2023" },
    description: "Works published in 2023",
  },

  // Search query with sorting
  bioplastics: {
    path: "/works",
    params: {
      filter: "display_name.search:bioplastics",
      sort: "publication_year:desc,relevance_score:desc",
    },
    description: "Bioplastics research sorted by year and relevance",
  },

  // Multiple filters
  openAccessFrance: {
    path: "/works",
    params: {
      filter: "is_oa:true,institutions.country_code:fr",
      sort: "cited_by_count:desc",
    },
    description: "Open access works from French institutions",
  },

  // Search with pagination
  machineLearningPaginated: {
    path: "/works",
    params: {
      search: "machine learning",
      page: "2",
      per_page: "50",
    },
    description: "Machine learning works page 2",
  },

  // Complex query with grouping
  authorsByCountry: {
    path: "/authors",
    params: {
      filter: "has_orcid:true",
      group_by: "last_known_institutions.country_code",
    },
    description: "Authors with ORCID grouped by country",
  },

  // Source search
  journalSearch: {
    path: "/sources",
    params: {
      filter: "is_oa:true",
      sort: "cited_by_count:desc",
      per_page: "25",
    },
    description: "Top open access journals",
  },
};

/**
 * Helper function to build URL with query parameters
 */
const buildQueryUrl = (path: string, params: Readonly<Record<string, string>>): string => {
  const searchParameters = new URLSearchParams(params);
  return `${path}?${searchParameters.toString()}`;
};

/**
 * Helper function to extract query parameters from current URL
 */
const extractQueryParameters = async (page: Page): Promise<Record<string, string>> => await page.evaluate(() => {
    const hash = window.location.hash;
    const queryStringMatch = /\?(.+)$/.exec(hash);
    if (!queryStringMatch) return {};

    const parameters: Record<string, string> = {};
    const searchParameters = new URLSearchParams(queryStringMatch[1]);
    searchParameters.forEach((value, key) => {
      parameters[key] = value;
    });
    return parameters;
  });

test.describe("Query Page Bookmarking E2E Tests (T011)", () => {
  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test to ensure clean state
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
    await page.waitForTimeout(APP_INIT_WAIT_MS); // Allow app to initialize
  });

  test.describe("Basic Query Bookmarking", () => {
    test("should show bookmark button on query pages", async ({ page }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      console.log(`Testing bookmark button on query page: ${queryUrl}`);

      // Navigate to query page
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      await page.waitForTimeout(QUERY_RESULTS_WAIT_MS); // Allow query results to load

      // Check for bookmark button (using data-testid or common patterns)
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"], [aria-label*="bookmark" i], button:has-text("Bookmark")'
      ).first();

      // This should FAIL initially - bookmark button for queries not implemented yet
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
    });

    test("should bookmark a simple filter query", async ({ page }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      console.log(`Testing bookmark for: ${query.description}`);

      // Navigate to query page
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Find and click bookmark button
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      ).first();

      // This should FAIL - bookmark button doesn't exist yet
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();

      // Wait for bookmark to be saved
      // Removed: waitForTimeout - use locator assertions instead
      // Verify success notification or visual feedback
      const successIndicator = page.locator(
        '[data-testid="bookmark-success"], .mantine-Notification-root:has-text("Bookmarked")'
      );

      // This should FAIL - no success feedback implemented yet
      await expect(successIndicator).toBeVisible({ timeout: 5000 });
    });

    test("should bookmark search query with multiple parameters", async ({
      page,
    }) => {
      const query = TEST_QUERIES.bioplastics;
      const queryUrl = buildQueryUrl(query.path, query.params);

      console.log(`Testing complex query bookmark: ${query.description}`);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      await page.waitForTimeout(SEARCH_QUERY_WAIT_MS); // Search queries may take longer

      // Attempt to bookmark
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL - feature not implemented
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
    });
  });

  test.describe("Bookmarked Query Display", () => {
    test("should show bookmarked query in bookmarks list", async ({ page }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      // First, bookmark the query
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL - bookmark button doesn't exist
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate to bookmarks page
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Look for the bookmarked query
      const bookmarkedQuery = page.locator(
        `[data-testid="bookmark-card"]:has-text("${query.description}")`
      ).first();

      // This should FAIL - bookmarked query won't appear in list
      await expect(bookmarkedQuery).toBeVisible({ timeout: 5000 });

      // Verify query parameters are displayed
      const queryParametersDisplay = page.locator(
        '[data-testid="bookmark-query-params"]'
      );

      // This should FAIL - query params display not implemented
      await expect(queryParametersDisplay).toBeVisible();
    });

    test("should distinguish query bookmarks from entity bookmarks", async ({
      page,
    }) => {
      // Navigate to bookmarks page
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Look for query bookmark indicator/badge
      const queryBookmarkBadge = page.locator(
        '[data-testid="bookmark-type-badge"]:has-text("Query")'
      );

      // This should FAIL - query bookmark type indicator not implemented
      await expect(queryBookmarkBadge).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Query Parameter Restoration", () => {
    test("should restore original query parameters when clicking bookmarked query", async ({
      page,
    }) => {
      const query = TEST_QUERIES.openAccessFrance;
      const queryUrl = buildQueryUrl(query.path, query.params);

      // Bookmark the query
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate away
      await page.goto(`${BASE_URL}/#/works`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Go to bookmarks
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Click on bookmarked query
      const bookmarkedQuery = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL - bookmark won't exist
      await expect(bookmarkedQuery).toBeVisible({ timeout: 5000 });
      await bookmarkedQuery.click();

      // Removed: waitForTimeout - use locator assertions instead
      // Verify we're on the query page with correct parameters
      const currentParameters = await extractQueryParameters(page);

      // This should FAIL - parameters won't be restored
      expect(currentParameters.filter).toBe(query.params.filter);
      expect(currentParameters.sort).toBe(query.params.sort);
    });

    test("should preserve pagination parameters", async ({ page }) => {
      const query = TEST_QUERIES.machineLearningPaginated;
      const queryUrl = buildQueryUrl(query.path, query.params);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Bookmark the paginated query
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate to bookmarks and click the bookmark
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkedQuery = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL
      await expect(bookmarkedQuery).toBeVisible({ timeout: 5000 });
      await bookmarkedQuery.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify pagination parameters are preserved
      const currentParameters = await extractQueryParameters(page);

      // These assertions should FAIL
      expect(currentParameters.page).toBe(query.params.page);
      expect(currentParameters.per_page).toBe(query.params.per_page);
      expect(currentParameters.search).toBe(query.params.search);
    });
  });

  test.describe("Complex Query Scenarios", () => {
    test("should handle query with grouping parameters", async ({ page }) => {
      const query = TEST_QUERIES.authorsByCountry;
      const queryUrl = buildQueryUrl(query.path, query.params);

      console.log(`Testing complex grouping query: ${query.description}`);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Attempt to bookmark
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify in bookmarks
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Should show grouping parameter in bookmark card
      const bookmarkCard = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL
      await expect(bookmarkCard).toBeVisible({ timeout: 5000 });
      await expect(bookmarkCard).toContainText("group_by");
    });

    test("should bookmark source queries with filters", async ({ page }) => {
      const query = TEST_QUERIES.journalSearch;
      const queryUrl = buildQueryUrl(query.path, query.params);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
    });
  });

  test.describe("Bookmark Persistence", () => {
    test("should persist query bookmarks across page reloads", async ({
      page,
    }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      // Bookmark a query
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Reload the page
      await page.reload({ waitUntil: 'domcontentloaded' });
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate to bookmarks
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark still exists
      const bookmarkCard = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL - bookmark won't persist
      await expect(bookmarkCard).toBeVisible({ timeout: 5000 });
    });

    test("should allow unbookmarking a query", async ({ page }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      // Bookmark a query
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Unbookmark the query
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Navigate to bookmarks
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify bookmark was removed
      const bookmarkCards = page.locator('[data-testid="bookmark-card"]');
      

      // This should FAIL - feature not implemented
      await expect(bookmarkCards).toHaveCount(0);
    });
  });

  test.describe("Edge Cases and Error Handling", () => {
    test("should handle empty query parameters gracefully", async ({
      page,
    }) => {
      const queryUrl = "/works?filter=";

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Should still show bookmark button (or gracefully handle)
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
    });

    test("should handle special characters in query parameters", async ({
      page,
    }) => {
      const queryUrl = buildQueryUrl("/works", {
        search: "machine learning & AI",
        filter: "publication_year:2020-2023",
      });

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify special characters are preserved
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkCard = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL
      await expect(bookmarkCard).toBeVisible({ timeout: 5000 });
      await bookmarkCard.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Verify URL encoding is correct
      const currentParameters = await extractQueryParameters(page);
      expect(currentParameters.search).toBe("machine learning & AI");
    });

    test("should handle rapid bookmark/unbookmark clicks", async ({ page }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });

      // Rapid clicks
      for (let index = 0; index < RAPID_CLICK_COUNT; index++) {
        await bookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
      }

      // Should end in a consistent state (no errors)
      // Removed: waitForTimeout - use locator assertions instead
      // Check for errors
      const errorNotification = page.locator(
        '.mantine-Notification-root:has-text("Error")'
      );

      // Should not show errors (but might fail due to race conditions)
      await expect(errorNotification).not.toBeVisible({ timeout: 2000 });
    });
  });

  test.describe("Visual Feedback and UX", () => {
    test("should show bookmark state indicator on query page", async ({
      page,
    }) => {
      const query = TEST_QUERIES.publicationYear;
      const queryUrl = buildQueryUrl(query.path, query.params);

      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });

      // Click to bookmark
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Button should show bookmarked state (filled icon, different color, etc.)
      const bookmarkedStateIndicator = page.locator(
        '[data-testid="bookmark-query-button"][aria-pressed="true"], [data-testid="bookmark-query-button"].bookmarked'
      );

      // This should FAIL - visual state change not implemented
      await expect(bookmarkedStateIndicator).toBeVisible({ timeout: 5000 });
    });

    test("should display query summary in bookmark card", async ({ page }) => {
      const query = TEST_QUERIES.bioplastics;
      const queryUrl = buildQueryUrl(query.path, query.params);

      // Bookmark the query
      await page.goto(`${BASE_URL}/#${queryUrl}`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkButton = page.locator(
        '[data-testid="bookmark-query-button"]'
      );

      // This should FAIL
      await expect(bookmarkButton).toBeVisible({ timeout: 5000 });
      await bookmarkButton.click();
      // Removed: waitForTimeout - use locator assertions instead
      // Check bookmark card display
      await page.goto(`${BASE_URL}/#/bookmarks`, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      const bookmarkCard = page.locator(
        '[data-testid="bookmark-card"]'
      ).first();

      // This should FAIL
      await expect(bookmarkCard).toBeVisible({ timeout: 5000 });

      // Should show human-readable query summary
      const querySummary = page.locator(
        '[data-testid="bookmark-query-summary"]'
      );

      // This should FAIL - query summary not implemented
      await expect(querySummary).toBeVisible();
      await expect(querySummary).toContainText("bioplastics");
    });
  });
});
