/**
 * E2E tests for homepage functionality
 * Automated version of manual homepage tests
 * Tests the main BibGraph homepage with search, navigation, and basic interactions
 */

import { expect, test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";

const MOBILE_VIEWPORT_WIDTH_PX = 320;
const TABLET_VIEWPORT_WIDTH_PX = 768;
const DESKTOP_VIEWPORT_WIDTH_PX = 1920;
const UHD_VIEWPORT_WIDTH_PX = 3840;
const MAX_CARD_WIDTH_PX = 1000;
const VIEWPORT_WIDTH_UTILIZATION_RATIO = 0.9;
const MIN_TOUCH_TARGET_PX = 44;
const MIN_SPACING_PX = 8;
const SPACING_TOLERANCE_PX = 5;

test.describe("Homepage E2E Tests @manual", () => {
  test("should load homepage without infinite loops", async ({ page }) => {
    // Set up error tracking before navigation
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    // Navigate to homepage
    await page.goto("#/", {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });

    // Wait for app to be ready
    await waitForAppReady(page, { timeout: 30_000 });

    // Check that page loaded successfully - h1 title should be visible
    // Homepage is a Card component, not MainLayout with header
    const title = page.locator('h1:has-text("BibGraph")');
    await expect(title).toBeVisible({ timeout: 15_000 });

    // Verify no errors occurred
    expect(errors).toHaveLength(0);
  });

  test("should display homepage content correctly", async ({ page }) => {
    await page.goto("#/", { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForAppReady(page);

    // Check main title in the homepage card
    const title = page.locator('h1:has-text("BibGraph")');
    await expect(title).toBeVisible();

    // Check description text
    const description = page.locator(
      "text=Explore academic literature through interactive knowledge graphs",
    );
    await expect(description).toBeVisible();

    // Check search input is present with correct aria-label
    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible();

    // Check search button
    const searchButton = page.locator('button:has-text("Search & Visualize")');
    await expect(searchButton).toBeVisible();
  });

  test("should have working example search links", async ({ page }) => {
    await page.goto("#/", {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForAppReady(page);

    // Check example search links exist
    const mlExample = page.locator('a:has-text("machine learning")');
    await expect(mlExample).toBeVisible({ timeout: 15_000 });

    const climateExample = page.locator('a:has-text("climate change")');
    await expect(climateExample).toBeVisible({ timeout: 15_000 });

    const orcidExample = page.locator('a:has-text("ORCID example")');
    await expect(orcidExample).toBeVisible({ timeout: 15_000 });

    // Note: We don't click these as they would trigger searches and navigation
    // The visibility check confirms the links are rendered correctly
  });

  test("should display technology stack correctly", async ({ page }) => {
    await page.goto("#/", {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForAppReady(page);

    // Verify the technology stack indicators are visible
    const reactIndicator = page.locator("text=React 19");
    await expect(reactIndicator).toBeVisible({ timeout: 15_000 });

    const openAlexIndicator = page.locator("text=OpenAlex API");
    await expect(openAlexIndicator).toBeVisible({ timeout: 15_000 });

    const xyFlowIndicator = page.locator("text=XYFlow");
    await expect(xyFlowIndicator).toBeVisible({ timeout: 15_000 });

    // Note: Homepage is a landing page without navigation/theme controls
    // These elements are only available in the full app layout
  });

  test("should display example searches", async ({ page }) => {
    await page.goto("#/", { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForAppReady(page);

    // Check for example search section
    const exampleSection = page.locator("text=Try these examples:");
    await expect(exampleSection).toBeVisible();

    // Check specific example links - they should be clickable anchors
    const mlExample = page.locator('a:has-text("machine learning")');
    await expect(mlExample).toBeVisible();

    const climateExample = page.locator('a:has-text("climate change")');
    await expect(climateExample).toBeVisible();

    const orcidExample = page.locator('a:has-text("ORCID example")');
    await expect(orcidExample).toBeVisible();
  });

  test("should allow typing in search input", async ({ page }) => {
    await page.goto("#/", { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForAppReady(page);

    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible();

    // Type in search input
    const testQuery = "machine learning";
    await searchInput.fill(testQuery);

    // Verify the input value
    await expect(searchInput).toHaveValue(testQuery);

    // Search button should be enabled when there's text
    const searchButton = page.locator('button:has-text("Search & Visualize")');
    await expect(searchButton).toBeEnabled();
  });

  test("should handle search button states correctly", async ({ page }) => {
    await page.goto("#/", { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForAppReady(page);

    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    const searchButton = page.locator('button:has-text("Search & Visualize")');

    // Button should be disabled when input is empty
    await searchInput.fill("");
    await expect(searchButton).toBeDisabled();

    // Button should be enabled when there's text
    await searchInput.fill("test");
    await expect(searchButton).toBeEnabled();

    // Clear input - button should be disabled again
    await searchInput.fill("");
    await expect(searchButton).toBeDisabled();
  });

  test("should display helpful usage instructions", async ({ page }) => {
    await page.goto("#/", { waitUntil: 'domcontentloaded', timeout: 30_000 });
    await waitForAppReady(page);

    // Check for usage instructions - the actual text from the component
    const instructions = page.locator(
      "text=Use the sidebar to search and filter • Click nodes to navigate • Double-click to expand relationships",
    );
    await expect(instructions).toBeVisible();
  });

  test("should have proper accessibility features", async ({ page }) => {
    await page.goto("#/", {
      waitUntil: 'domcontentloaded',
      timeout: 30_000,
    });
    await waitForAppReady(page);

    // Check search input has proper aria-label
    const searchInput = page.locator(
      'input[aria-label="Search academic literature"]',
    );
    await expect(searchInput).toBeVisible({ timeout: 15_000 });

    // Verify search input is focusable and has correct attributes
    await searchInput.focus();
    
    await expect(searchInput).toHaveAttribute("aria-label", "Search academic literature");

    // Note: Homepage is a landing page without full app layout
    // Theme toggle and sidebar controls are only in MainLayout (non-homepage routes)
  });

  // Responsive Layout Tests (User Story 1)
  test.describe("Responsive Layout", () => {
    test("should display properly on mobile viewport (320px) without horizontal scroll", async ({
      page,
    }) => {
      // Set mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Verify content is visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Check for horizontal scrollbar by comparing scrollWidth to clientWidth
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify card is within viewport using the Card component's role
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        expect(cardBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT_WIDTH_PX);
      }
    });

    test("should display properly on tablet viewport (768px) with card centered", async ({
      page,
    }) => {
      // Set tablet viewport
      await page.setViewportSize({ width: 768, height: 1024 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Verify content is visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Verify card stays within reasonable bounds (should be centered with maxWidth)
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should be less than viewport width (allowing for centering)
        expect(cardBox.width).toBeLessThanOrEqual(TABLET_VIEWPORT_WIDTH_PX);
        // Card should have some margin on sides (not full width on tablet)
        expect(cardBox.x).toBeGreaterThan(0);
      }
    });

    test("should display properly on desktop viewport (1920px) with maxWidth constraint", async ({
      page,
    }) => {
      // Set desktop viewport
      await page.setViewportSize({ width: 1920, height: 1080 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Verify content is visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Verify card respects maxWidth (should be constrained, not full width)
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should be significantly less than viewport width (respects maxWidth)
        expect(cardBox.width).toBeLessThan(MAX_CARD_WIDTH_PX);
        // Card should not be taking full viewport width
        expect(cardBox.width).toBeLessThan(DESKTOP_VIEWPORT_WIDTH_PX * VIEWPORT_WIDTH_UTILIZATION_RATIO);
      }
    });

    test("should display properly on 4K viewport (3840px) with content constrained", async ({
      page,
    }) => {
      // Set 4K viewport
      await page.setViewportSize({ width: 3840, height: 2160 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Verify content is visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Verify card remains width-constrained with maxWidth
      const card = page.locator('[class*="mantine-Card-root"]').first();
      const cardBox = await card.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should maintain maxWidth constraint
        expect(cardBox.width).toBeLessThan(MAX_CARD_WIDTH_PX);
        // Card should not be taking full viewport width
        expect(cardBox.width).toBeLessThan(UHD_VIEWPORT_WIDTH_PX * VIEWPORT_WIDTH_UTILIZATION_RATIO);
      }
    });
  });

  // Search Interaction Tests (User Story 2)
  test.describe("Search Interaction", () => {
    test("should have search input with minimum 44px touch target height", async ({
      page,
    }) => {
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      const searchInput = page.locator(
        'input[aria-label="Search academic literature"]',
      );
      await expect(searchInput).toBeVisible({ timeout: 15_000 });

      const inputBox = await searchInput.boundingBox();
      expect(inputBox).toBeTruthy();
      if (inputBox) {
        // Minimum touch target size is 44px
        expect(inputBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }
    });

    test("should have search button with minimum 44x44px touch target size", async ({
      page,
    }) => {
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      const searchButton = page.locator('button:has-text("Search & Visualize")');
      await expect(searchButton).toBeVisible({ timeout: 15_000 });

      const buttonBox = await searchButton.boundingBox();
      expect(buttonBox).toBeTruthy();
      if (buttonBox) {
        // Minimum touch target size is 44x44px
        expect(buttonBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
        expect(buttonBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
      }
    });

    test("should have proper spacing between search input and button", async ({
      page,
    }) => {
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      const searchInput = page.locator(
        'input[aria-label="Search academic literature"]',
      );
      const searchButton = page.locator('button:has-text("Search & Visualize")');

      await expect(searchInput).toBeVisible({ timeout: 15_000 });
      await expect(searchButton).toBeVisible({ timeout: 15_000 });

      const inputBox = await searchInput.boundingBox();
      const buttonBox = await searchButton.boundingBox();

      expect(inputBox).toBeTruthy();
      expect(buttonBox).toBeTruthy();

      if (inputBox && buttonBox) {
        // Vertical spacing between input and button should be at least 8px
        const spacing = buttonBox.y - (inputBox.y + inputBox.height);
        expect(spacing).toBeGreaterThanOrEqual(MIN_SPACING_PX);
      }
    });

    test("should have example links that wrap gracefully on narrow screens", async ({
      page,
    }) => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Check that example links are visible
      const mlExample = page.locator('a:has-text("machine learning")');
      await expect(mlExample).toBeVisible({ timeout: 15_000 });

      // Verify example links container doesn't overflow
      const examplesCard = page.locator('text=Try these examples:').locator("..");
      const cardBox = await examplesCard.boundingBox();
      expect(cardBox).toBeTruthy();
      if (cardBox) {
        // Card should fit within viewport
        expect(cardBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT_WIDTH_PX);
      }
    });
  });

  // Visual Hierarchy Tests (User Story 3)
  test.describe("Visual Hierarchy", () => {
    test("should have technology stack indicators with equal spacing", async ({
      page,
    }) => {
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Find all technology stack indicators
      const reactIndicator = page.locator("text=React 19");
      const openAlexIndicator = page.locator("text=OpenAlex API");
      const xyFlowIndicator = page.locator("text=XYFlow");

      await expect(reactIndicator).toBeVisible({ timeout: 15_000 });
      await expect(openAlexIndicator).toBeVisible({ timeout: 15_000 });
      await expect(xyFlowIndicator).toBeVisible({ timeout: 15_000 });

      // Get bounding boxes for spacing verification
      const reactBox = await reactIndicator.boundingBox();
      const openAlexBox = await openAlexIndicator.boundingBox();
      const xyFlowBox = await xyFlowIndicator.boundingBox();

      expect(reactBox).toBeTruthy();
      expect(openAlexBox).toBeTruthy();
      expect(xyFlowBox).toBeTruthy();

      if (reactBox && openAlexBox && xyFlowBox) {
        // Calculate spacing between indicators
        const spacing1 = openAlexBox.x - (reactBox.x + reactBox.width);
        const spacing2 = xyFlowBox.x - (openAlexBox.x + openAlexBox.width);

        // Spacing should be consistent (within 5px tolerance for rendering variations)
        expect(Math.abs(spacing1 - spacing2)).toBeLessThanOrEqual(SPACING_TOLERANCE_PX);

        // Minimum spacing should be at least 8px (Mantine "xs" gap)
        expect(spacing1).toBeGreaterThanOrEqual(MIN_SPACING_PX);
        expect(spacing2).toBeGreaterThanOrEqual(MIN_SPACING_PX);
      }
    });

    test("should have feature badges that wrap properly on narrow screens", async ({
      page,
    }) => {
      // Test on mobile viewport
      await page.setViewportSize({ width: 320, height: 568 });
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Verify all technology indicators are visible
      const reactIndicator = page.locator("text=React 19");
      const openAlexIndicator = page.locator("text=OpenAlex API");
      const xyFlowIndicator = page.locator("text=XYFlow");

      await expect(reactIndicator).toBeVisible({ timeout: 15_000 });
      await expect(openAlexIndicator).toBeVisible({ timeout: 15_000 });
      await expect(xyFlowIndicator).toBeVisible({ timeout: 15_000 });

      // Verify no horizontal overflow
      const hasHorizontalScroll = await page.evaluate(() => {
        return document.documentElement.scrollWidth > document.documentElement.clientWidth;
      });
      expect(hasHorizontalScroll).toBe(false);

      // Verify badges container is within viewport
      const reactBox = await reactIndicator.boundingBox();
      const xyFlowBox = await xyFlowIndicator.boundingBox();

      expect(reactBox).toBeTruthy();
      expect(xyFlowBox).toBeTruthy();

      if (reactBox && xyFlowBox) {
        // All badges should be within viewport width
        expect(reactBox.x).toBeGreaterThanOrEqual(0);
        expect(xyFlowBox.x + xyFlowBox.width).toBeLessThanOrEqual(MOBILE_VIEWPORT_WIDTH_PX);
      }
    });

    // Zoom tests - may have timing sensitivity and browser zoom API inconsistencies
    test("should maintain readability at 150% zoom level", async ({ page }) => {
      // Skipped: CSS zoom behavior is inconsistent across browsers and CI environments.
      // Browser zoom affects viewport dimensions and element sizes in ways that are
      // difficult to test deterministically. Visual regression testing would be more
      // appropriate for zoom level verification.
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Set 150% zoom using CSS zoom
      await page.evaluate(() => {
        document.body.style.zoom = "1.5";
      });

      // Verify main content is still visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Verify search input is still visible and functional
      const searchInput = page.locator(
        'input[aria-label="Search academic literature"]',
      );
      await expect(searchInput).toBeVisible({ timeout: 15_000 });

      // Verify usage instructions are still visible
      const instructions = page.locator(
        "text=Use the sidebar to search and filter • Click nodes to navigate • Double-click to expand relationships",
      );
      await expect(instructions).toBeVisible({ timeout: 15_000 });

      // Verify card is visible
      const card = page.locator('[class*="mantine-Card-root"]').first();
      await expect(card).toBeVisible({ timeout: 15_000 });
    });

    test("should maintain layout integrity at 200% zoom level", async ({
      page,
    }) => {
      // Note: CSS zoom behavior may be inconsistent across browsers and CI environments.
      // At 200% zoom, layout calculations may be unreliable due to browser rounding
      // and viewport adjustment behaviors.
      await page.goto("#/", {
        waitUntil: 'domcontentloaded',
        timeout: 30_000,
      });
      await waitForAppReady(page);

      // Set 200% zoom using CSS zoom
      await page.evaluate(() => {
        document.body.style.zoom = "2.0";
      });

      // Verify main content is still visible
      const title = page.locator('h1:has-text("BibGraph")');
      await expect(title).toBeVisible({ timeout: 15_000 });

      // Verify search button is still visible and clickable
      const searchButton = page.locator('button:has-text("Search & Visualize")');
      await expect(searchButton).toBeVisible({ timeout: 15_000 });

      // Verify technology stack indicators are visible
      const reactIndicator = page.locator("text=React 19");
      await expect(reactIndicator).toBeVisible({ timeout: 15_000 });

      // Verify card is visible
      const card = page.locator('[class*="mantine-Card-root"]').first();
      await expect(card).toBeVisible({ timeout: 15_000 });

      // Verify search input is still functional at 200% zoom
      const searchInput = page.locator(
        'input[aria-label="Search academic literature"]',
      );
      await expect(searchInput).toBeVisible({ timeout: 15_000 });
      await searchInput.fill("test query");
      await expect(searchInput).toHaveValue("test query");
    });
  });
});
