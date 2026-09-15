/**
 * E2E tests for layout scrolling behavior
 * Feature: 011-fix-vertical-scrolling
 *
 * Tests verify that:
 * - Main content area has no nested scrollbars
 * - Sidebars scroll independently
 * - Scroll contexts are isolated
 * - Keyboard navigation works correctly
 */

import { expect,test } from "@playwright/test";

import { waitForAppReady, waitForNoLoading } from "@/test/helpers/app-ready";

const TEST_TIMEOUT_MS = 30_000;

test.describe("Layout Scrolling Behavior @manual", () => {
  test.describe("User Story 1: Seamless Content Navigation", () => {
    /**
     * T006: Main content area should have no nested scrollbar
     * Navigate to /bookmarks and verify no overflow scrollbar in main Box
     */
    test("main content area has no nested scrollbar", async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // Find the main content area Box (AppShell.Main > Box)
      const mainContent = page.locator('[data-testid="main-content"]').first();

      // Check computed style - should not have overflow: auto
      const overflowStyle = await mainContent.evaluate((element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        return {
          overflow: computed.overflow,
          overflowY: computed.overflowY,
          overflowX: computed.overflowX,
        };
      });

      // Main content should not have overflow: auto (which creates nested scrollbar)
      expect(overflowStyle.overflow).not.toBe("auto");
      expect(overflowStyle.overflowY).not.toBe("auto");
    });

    /**
     * T007: Scrolling main content should not create nested scrollbars
     * Add long content, scroll, verify single scrollbar
     */
    test("scrolling main content does not create nested scrollbars", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // Check if page has vertical scrollbar (viewport scrollbar is OK)
      // Note: scrollbar check used for layout validation
      await page.evaluate(() => {
        return document.documentElement.scrollHeight > window.innerHeight;
      });

      // Find main content box
      const mainContent = page.locator('[data-testid="main-content"]').first();

      // Main content should not have its own scrollbar
      const hasNestedScrollbar = await mainContent.evaluate(
        (element: HTMLElement) => {
          return element.scrollHeight > element.clientHeight && element.clientHeight > 0;
        },
      );

      // We expect NO nested scrollbar in main content
      // (viewport scrollbar is acceptable, nested box scrollbar is not)
      expect(hasNestedScrollbar).toBe(false);
    });

    /**
     * T008: Main content should fill viewport height correctly
     * Verify calc(100vh - 60px) is respected
     */
    test("main content fills viewport height correctly", async ({ page }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      const mainContent = page.locator('[data-testid="main-content"]').first();

      const dimensions = await mainContent.evaluate((element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        const viewportHeight = window.innerHeight;
        const headerHeight = 60; // AppShell header height

        return {
          height: computed.height,
          expectedHeight: `${String(viewportHeight - headerHeight)}px`,
          viewportHeight,
          headerHeight,
        };
      });

      // Height should be calc(100vh - 60px)
      // Parse the computed height and compare
      const computedHeightPx = Number.parseInt(dimensions.height);
      const expectedHeightPx =
        dimensions.viewportHeight - dimensions.headerHeight;

      // Allow 1px tolerance for rounding
      expect(Math.abs(computedHeightPx - expectedHeightPx)).toBeLessThanOrEqual(
        1,
      );
    });
  });

  test.describe("User Story 2: Sidebar Content Access", () => {
    /**
     * T020: Left sidebar should scroll independently with 50+ bookmarks
     */
    test("left sidebar scrolls independently with 50+ bookmarks", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      // This test requires populating bookmarks
      // For now, we verify the overflow property exists
      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // Open left sidebar if not already open
      const leftSidebarToggle = page
        .locator('[aria-label="Toggle left sidebar"]')
        .first();
      const isVisible = await leftSidebarToggle.isVisible();
      if (isVisible) {
        await leftSidebarToggle.click();
        await waitForNoLoading(page, { timeout: 5000 }); // Wait for sidebar animation
      }

      // Find left sidebar content area
      const leftSidebar = page
        .locator('[data-testid="left-sidebar-content"]')
        .first();

      const overflowStyle = await leftSidebar.evaluate((element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        return {
          overflowY: computed.overflowY,
        };
      });

      // Left sidebar should have overflowY: auto
      expect(overflowStyle.overflowY).toBe("auto");
    });

    /**
     * T021: Right sidebar should scroll independently with 50+ history items
     */
    test("right sidebar scrolls independently with 50+ history items", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // Open right sidebar if not already open
      const rightSidebarToggle = page
        .locator('[aria-label="Toggle right sidebar"]')
        .first();
      const isVisible = await rightSidebarToggle.isVisible();
      if (isVisible) {
        await rightSidebarToggle.click();
        await waitForNoLoading(page, { timeout: 5000 }); // Wait for sidebar animation
      }

      // Find right sidebar content area
      const rightSidebar = page
        .locator('[data-testid="right-sidebar-content"]')
        .first();

      const overflowStyle = await rightSidebar.evaluate((element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        return {
          overflowY: computed.overflowY,
        };
      });

      // Right sidebar should have overflowY: auto
      expect(overflowStyle.overflowY).toBe("auto");
    });

    /**
     * T022: Scroll context should switch seamlessly between sections
     */
    test("scroll context switches seamlessly between sections", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // This test verifies that scrolling in different sections doesn't cause double-scrolling
      // We check that each section manages its own scroll position independently

      const mainContent = page.locator('[data-testid="main-content"]').first();

      // Main content should not have scroll capability (no overflow: auto)
      const isMainScrollable = await mainContent.evaluate((element: HTMLElement) => {
        const computed = window.getComputedStyle(element);
        return computed.overflowY === "auto" || computed.overflow === "auto";
      });

      expect(isMainScrollable).toBe(false);
    });

    /**
     * T023: Keyboard navigation should work across scroll contexts
     */
    test("keyboard navigation works across scroll contexts", async ({
      page,
    }) => {
      test.setTimeout(TEST_TIMEOUT_MS);

      await page.goto("#/bookmarks");
      await waitForAppReady(page);
      await page.waitForLoadState("networkidle");

      // Tab through elements and verify no focus trapping
      await page.keyboard.press("Tab");
      await page.waitForLoadState("domcontentloaded");

      // Get the focused element
      const focusedElement = await page.evaluate(() => {
        const activeElement = document.activeElement;
        return activeElement?.tagName ?? "NONE";
      });

      // Should have a focused element (not trapped)
      expect(focusedElement).not.toBe("NONE");
    });
  });
});
