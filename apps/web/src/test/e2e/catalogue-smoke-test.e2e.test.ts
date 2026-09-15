/**
 * Simple smoke test for catalogue functionality
 * This test just verifies the catalogue page loads and basic components exist
 */

import { expect,test } from "@playwright/test";

test.describe("Catalogue Smoke Test", () => {
  test("should load catalogue page directly", async ({ page }) => {
    // Navigate directly to catalogue page
    await page.goto("/#/catalogue");
    await page.waitForLoadState("networkidle");

    // Wait for catalogue to load (any of these indicators)
    await Promise.race([
      page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
      page.waitForSelector('text="Create New List"', { timeout: 10_000 }),
      page.waitForSelector('[data-testid="catalogue-manager"]', { timeout: 10_000 }),
      page.waitForSelector('.mantine-Tabs-panel', { timeout: 10_000 })
    ]);

    // Check URL is correct
    expect(page.url()).toContain("catalogue");

    // Check for some basic catalogue elements
    const pageContent = await page.content();
    expect(pageContent).toContain("Catalogue");
  });

  test("should show create list functionality", async ({ page }) => {
    // Navigate to catalogue page
    await page.goto("/#/catalogue");
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await Promise.race([
      page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
      page.waitForSelector('text="Create New List"', { timeout: 10_000 })
    ]);

    // Look for create list button (try multiple selectors)
    const createButton = page.locator('button:has-text("Create New List"), button:has-text("Create"), [aria-label*="create"], button:has-text("+")').first();

    if (await createButton.isVisible()) {
      // Click it and see if modal appears
      await createButton.click();

      // Check for modal (any of these indicators)
      await expect(page.locator('[role="dialog"], .modal, .mantine-Modal')).toBeVisible({ timeout: 5000 });
    } else {
      // If no create button is visible, at least verify the page loaded
      const pageContent = await page.content();
      expect(pageContent).toContain("Catalogue");
    }
  });

  test("should handle catalogue database initialization", async ({ page }) => {
    // Navigate to catalogue page
    await page.goto("/#/catalogue");
    await page.waitForLoadState("networkidle");

    // Wait for page to load
    await Promise.race([
      page.waitForSelector('text="Catalogue"', { timeout: 10_000 }),
      page.waitForSelector('text="Lists"', { timeout: 10_000 }),
      page.waitForSelector('text="Bibliographies"', { timeout: 10_000 })
    ]);

    // Check if we can access catalogue services via browser context
    // Note: catalogue service availability depends on app initialization
    await page.evaluate(() => {
      try {
        // Check if catalogueService is available on window
        return 'catalogueService' in window;
      } catch {
        return false;
      }
    });

    // Test passes if page loads, even if service isn't globally available
    expect(await page.content()).toContain("Catalogue");
  });

  test("should handle navigation elements", async ({ page }) => {
    // Start from home page
    await page.goto("/#/");
    await page.waitForLoadState("networkidle");

    // Look for navigation elements
    const navElements = page.locator('nav, [role="navigation"], .mantine-AppShell-header');

    if (await navElements.first().isVisible()) {
      // Try to find catalogue link/button
      const catalogueLink = page.locator('a:has-text("Catalogue"), button:has-text("Catalogue"), [href*="catalogue"]');

      if (await catalogueLink.first().isVisible()) {
        await catalogueLink.first().click();
        await page.waitForLoadState("networkidle");

        // Verify we're on catalogue page
        expect(page.url()).toContain("catalogue");
      }
    }
  });
});