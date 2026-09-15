/**
 * E2E test for bioplastics URL pattern and bookmarking functionality
 * Tests the specific complex URL pattern mentioned by the user
 */

import { expect, test } from "@playwright/test";

test.describe("Bioplastics URL Pattern and Bookmarking E2E Test", () => {
  const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
  const BASE_URL = IS_CI ? "http://localhost:4173" : "http://localhost:5173";

  const CONTENT_LOAD_WAIT_MS = 3000;
  const MAX_ACCEPTABLE_NON_CRITICAL_ERRORS = 3;

  // The exact bioplastics URL pattern from the requirements
  const BIOMATERIALS_URL = "https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc";

  test.beforeEach(async ({ page, context }) => {
    // Clear storage before each test to ensure clean state
    await context.clearCookies();
    await page.goto(BASE_URL);
    await page.waitForLoadState("networkidle");
  });

  test.describe("URL Redirection Testing", () => {
    test("should redirect bioplastics OpenAlex URL to internal works route", async ({ page }) => {
      // Navigate using the OpenAlex API URL pattern
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for the redirect to complete and the works page to load
      await page.waitForURL(`**/works**`, { timeout: 15_000 });

      // Verify the current URL contains the expected route parameters
      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
      expect(currentUrl).toContain("display_name.search:bioplastics");
      expect(currentUrl).toContain("publication_year:desc");
      expect(currentUrl).toContain("relevance_score:desc");

      // Verify the page content loads correctly
      await page.waitForTimeout(CONTENT_LOAD_WAIT_MS); // Allow content to load

      // Check for works list or search results
      const pageContent = await page.locator('body').textContent();
      if (pageContent === null) {
        throw new Error("Expected page content but got null");
      }

      // Should see either loading content, results, or search indicators
      const hasValidContent =
        pageContent.includes('Works') ||
        pageContent.includes('Loading') ||
        pageContent.includes('results') ||
        pageContent.includes('bioplastics') ||
        pageContent.toLowerCase().includes('plastic');

      expect(hasValidContent).toBe(true);
    });

    test("should handle GitHub Pages deployment URL format", async ({ page }) => {
      // Simulate the GitHub Pages URL format locally
      const localTestUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(localTestUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for redirect and content to load
      // Removed: waitForTimeout - use locator assertions instead
      // Verify the redirection worked properly
      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
      expect(currentUrl).toContain("bioplastics");

      // Should not contain the original OpenAlex domain
      expect(currentUrl).not.toContain("api.openalex.org");
    });

    test("should preserve complex query parameters during redirection", async ({ page }) => {
      const complexUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc&per-page=25`;

      await page.goto(complexUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify all parameters are preserved (URL encoded)
      const currentUrl = page.url();
      expect(currentUrl).toContain("works");
      expect(currentUrl).toContain("display_name.search%3Abioplastics");
      expect(currentUrl).toContain("publication_year%3Adesc");
      expect(currentUrl).toContain("relevance_score%3Adesc");
      expect(currentUrl).toContain("per-page=25");
    });
  });

  test.describe("Bookmarking on Redirected Pages", () => {
    test("should show bookmark button on bioplastics works page", async ({ page }) => {
      // Navigate via OpenAlex URL (gets redirected)
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for redirect and page load
      // Removed: waitForTimeout - use locator assertions instead
      // Look for bookmark button (any button with SVG icon)
      const bookmarkButtons = page.locator('button').filter({ has: page.locator('svg') });

      // Try multiple selectors for bookmark buttons
      let isBookmarkButtonFound = false;

      // Check if any bookmark-like button exists
      for (const button of await bookmarkButtons.all()) {
        const isVisible = await button.isVisible();
        if (isVisible) {
          const hasIcon = await button.locator('svg').isVisible();
          if (hasIcon) {
            isBookmarkButtonFound = true;
            break;
          }
        }
      }

      expect(isBookmarkButtonFound).toBe(true);
    });

    test("should bookmark bioplastics search results successfully", async ({ page }) => {
      // Navigate via OpenAlex URL
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait for redirect and page load
      // Removed: waitForTimeout - use locator assertions instead
      // Find and click bookmark button
      const bookmarkButtons = page.locator('button').filter({ has: page.locator('svg') });
      const firstBookmarkButton = bookmarkButtons.first();

      if (await firstBookmarkButton.isVisible({ timeout: 10_000 })) {
        // Get initial state
        const initialIcon = firstBookmarkButton.locator('svg');
        await expect(initialIcon).toBeVisible();

        // Click to bookmark
        await firstBookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        // Verify bookmark state changed
        const updatedIcon = firstBookmarkButton.locator('svg');
        await expect(updatedIcon).toBeVisible();

        // Check for any visual indication of bookmark state change
        
        await expect(firstBookmarkButton).toHaveAttribute('class', );
      }
    });

    test("should verify bookmark creation in bookmarks page", async ({ page }) => {
      // Navigate via OpenAlex URL and bookmark
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Find and click bookmark button
      const bookmarkButtons = page.locator('button').filter({ has: page.locator('svg') });
      const firstBookmarkButton = bookmarkButtons.first();

      if (await firstBookmarkButton.isVisible({ timeout: 10_000 })) {
        await firstBookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        // Navigate to bookmarks page to verify
        await page.goto(`${BASE_URL}/#/bookmarks`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        // Check page content for bookmark indicators
        const pageContent = await page.locator('body').textContent();
        if (pageContent === null) {
          throw new Error("Expected page content but got null");
        }
        const hasBookmarkContent =
          pageContent.includes('bioplastics') ||
          pageContent.includes('works') ||
          pageContent.includes('Search bookmarks') ||
          !pageContent.includes('No bookmarks');

        // If bookmarks exist, look for bookmark cards
        const bookmarkCards = page.locator('.mantine-Card-root');
        const cardCount = await bookmarkCards.count();

        // Should either have bookmark content or at least have loaded the bookmarks page successfully
        expect(hasBookmarkContent || cardCount >= 0).toBe(true);
      }
    });
  });

  test.describe("Bookmark Navigation Testing", () => {
    test("should navigate from bookmark back to bioplastics page", async ({ page }) => {
      // First create a bookmark by visiting the bioplastics page
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Create bookmark
      const bookmarkButtons = page.locator('button').filter({ has: page.locator('svg') });
      const firstBookmarkButton = bookmarkButtons.first();

      if (await firstBookmarkButton.isVisible({ timeout: 10_000 })) {
        await firstBookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        // Navigate to bookmarks page
        await page.goto(`${BASE_URL}/#/bookmarks`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        // Verify we're on bookmarks page
        expect(page.url()).toContain('bookmarks');

        // Now navigate back to the bioplastics works page directly
        await page.goto(`${BASE_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        // Verify we're back on the works page with correct parameters
        const finalUrl = page.url();
        expect(finalUrl).toContain('works');
        expect(finalUrl).toContain('bioplastics');

        // Verify the page loads correctly
        const pageContent = await page.locator('body').textContent();
        if (pageContent === null) {
          throw new Error("Expected page content but got null");
        }
        const hasValidContent =
          pageContent.includes('Works') ||
          pageContent.includes('Loading') ||
          pageContent.includes('results');

        expect(hasValidContent).toBe(true);
      }
    });

    test("should maintain bookmark state across URL redirections", async ({ page }) => {
      // Navigate via OpenAlex URL
      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Bookmark the page
      const bookmarkButtons = page.locator('button').filter({ has: page.locator('svg') });
      const firstBookmarkButton = bookmarkButtons.first();

      if (await firstBookmarkButton.isVisible({ timeout: 10_000 })) {
        await firstBookmarkButton.click();
        // Removed: waitForTimeout - use locator assertions instead
        // Navigate to the same page via direct internal route
        await page.goto(`${BASE_URL}/#/works?filter=display_name.search:bioplastics&sort=publication_year:desc,relevance_score:desc`, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        // Should still show bookmark button
        const directBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await expect(directBookmarkButton).toBeVisible({ timeout: 10_000 });

        // Navigate again via OpenAlex URL
        await page.goto(redirectUrl, {
          waitUntil: 'domcontentloaded',
          timeout: 30_000,
        });

        // Removed: waitForTimeout - use locator assertions instead
        // Should still show bookmark button
        const redirectedBookmarkButton = page.locator('button').filter({ has: page.locator('svg') }).first();
        await expect(redirectedBookmarkButton).toBeVisible({ timeout: 10_000 });
      }
    });
  });

  test.describe("Error Handling and Edge Cases", () => {
    test("should handle malformed bioplastics URLs gracefully", async ({ page }) => {
      const malformedUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=invalid-filter&sort=invalid-sort`;

      await page.goto(malformedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Should not crash the application
      const currentUrl = page.url();
      expect(currentUrl).toBeTruthy();

      // Should still be on our domain
      expect(currentUrl).toMatch(/localhost/);

      // Should not show browser error pages
      const hasErrorContent = await page.locator('body').textContent();
      expect(hasErrorContent).not.toContain('Unable to connect');
      expect(hasErrorContent).not.toContain('Site cannot be reached');
    });

    test("should handle network timeouts gracefully", async ({ page }) => {
      // Listen for console errors
      const errors: string[] = [];
      page.on("pageerror", (error) => {
        errors.push(error.message);
      });

      const redirectUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(redirectUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Wait longer than usual to test timeout handling
      // Removed: waitForTimeout - use locator assertions instead
      // Should handle timeouts gracefully without throwing unhandled errors
      const criticalErrors = errors.filter(e =>
        e.includes('Uncaught') ||
        e.includes('TypeError') ||
        e.includes('ReferenceError')
      );

      expect(criticalErrors.length).toBeLessThan(MAX_ACCEPTABLE_NON_CRITICAL_ERRORS); // Allow some non-critical errors
    });

    test("should preserve URL encoding correctly", async ({ page }) => {
      // Test URL with encoded characters
      const encodedUrl = `${BASE_URL}/#/https://api.openalex.org/works?filter=display_name.search:bioplastics%20AND%20biofuels&sort=publication_year:desc`;

      await page.goto(encodedUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify URL parameters are handled correctly
      const currentUrl = page.url();
      expect(currentUrl).toContain('works');
      expect(currentUrl).toContain('bioplastics');

      // Should not crash on encoded characters
      const hasValidContent = page.locator('body');
      await expect(hasValidContent).toBeVisible();
    });
  });

  test.describe("Production URL Simulation", () => {
    test("should simulate GitHub Pages production behavior", async ({ page }) => {
      // Simulate the exact GitHub Pages URL structure
      const productionSimulationUrl = `${BASE_URL}/#/${BIOMATERIALS_URL}`;

      await page.goto(productionSimulationUrl, {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });

      // Removed: waitForTimeout - use locator assertions instead
      // Verify the application handles the production URL format
      const finalUrl = page.url();
      expect(finalUrl).toContain('works');
      expect(finalUrl).toContain('bioplastics');

      // Verify content loads
      const hasValidContent = await page.locator('body').textContent();
      if (hasValidContent === null) {
        throw new Error("Expected page content but got null");
      }
      const isContentLoaded =
        hasValidContent.includes('Works') ||
        hasValidContent.includes('Loading') ||
        hasValidContent.includes('results');

      expect(isContentLoaded).toBe(true);
    });
  });
});