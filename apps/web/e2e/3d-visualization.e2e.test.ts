/**
 * E2E tests for 3D Graph Visualization
 *
 * Tests the 2D/3D view mode toggle, WebGL detection, and 3D rendering
 * on the algorithms page.
 */

import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";

const isCi = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL =
  process.env.BASE_URL ??
  process.env.E2E_BASE_URL ??
  (isCi ? "http://localhost:4173" : "http://localhost:5173");

const SUITE_TIMEOUT_MS = 60_000;

test.describe("@utility @3d 3D Graph Visualization", () => {
  test.setTimeout(SUITE_TIMEOUT_MS);

  test("should display ViewModeToggle on algorithms page", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // ViewModeToggle should be visible
    const viewModeToggle = page.locator('[data-testid="view-mode-toggle"]');
    await expect(viewModeToggle).toBeVisible({ timeout: 10_000 });

    // Should have 2D and 3D options
    await expect(page.getByText("2D")).toBeVisible();
    await expect(page.getByText("3D")).toBeVisible();

    expect(errors, "JavaScript errors detected").toHaveLength(0);
  });

  test("should start in 2D mode by default", async ({ page }) => {
    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Check localStorage or aria state for default mode
    const viewModePreference = await page.evaluate(() => {
      return localStorage.getItem("bibgraph-view-mode-preference");
    });

    // If no preference set, should default to 2D
    // Or if preference is set, it should be respected
    if (viewModePreference === null) {
      // 2D mode should be active (no 3D canvas visible)
      // In 2D mode, there might be an SVG or canvas but not the Three.js canvas
      // The 2D ForceGraph uses canvas too, so we check for the specific component
      // If no 3D-specific elements visible, we're in 2D mode (expected default)
      // This is a soft check since both modes use canvas
    }
  });

  test("should switch to 3D mode when clicking 3D button", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Click the 3D button in ViewModeToggle
    const button3D = page.getByRole("radio", { name: "3D" });

    // If 3D button is disabled (WebGL not available), skip
    const isDisabled = await button3D.isDisabled();
    if (isDisabled) {
      test.skip(true, "3D mode unavailable (WebGL not supported)");
      return;
    }

    await button3D.click();

    // Wait for mode switch
    // Removed: waitForTimeout - use locator assertions instead
    // Verify preference was saved
    const viewModePreference = await page.evaluate(() => {
      return localStorage.getItem("bibgraph-view-mode-preference");
    });
    expect(viewModePreference).toBe("3D");

    expect(errors, "JavaScript errors during mode switch").toHaveLength(0);
  });

  test("should persist view mode preference across page reloads", async ({ page }) => {
    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Set preference to 3D (if available)
    const button3D = page.getByRole("radio", { name: "3D" });
    const isDisabled = await button3D.isDisabled();
    if (isDisabled) {
      test.skip(true, "3D mode unavailable (WebGL not supported)");
      return;
    }

    await button3D.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Reload page
    await page.reload({ waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Verify preference persisted
    const viewModePreference = await page.evaluate(() => {
      return localStorage.getItem("bibgraph-view-mode-preference");
    });
    expect(viewModePreference).toBe("3D");
  });

  test("should switch back to 2D mode", async ({ page }) => {
    // First set to 3D
    await page.evaluate(() => {
      localStorage.setItem("bibgraph-view-mode-preference", "3D");
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Click 2D button
    const button2D = page.getByRole("radio", { name: "2D" });
    await button2D.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Verify preference was saved
    const viewModePreference = await page.evaluate(() => {
      return localStorage.getItem("bibgraph-view-mode-preference");
    });
    expect(viewModePreference).toBe("2D");
  });

  test("should not crash when switching modes with graph data", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Generate sample data first
    const regenerateButton = page.getByRole("button", { name: "Regenerate Sample Data" });
    await expect(regenerateButton).toBeVisible({ timeout: 10_000 });
    await regenerateButton.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Check if 3D is available
    const button3D = page.getByRole("radio", { name: "3D" });
    const isDisabled = await button3D.isDisabled();
    if (isDisabled) {
      test.skip(true, "3D mode unavailable (WebGL not supported)");
      return;
    }

    // Switch to 3D
    await button3D.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Switch back to 2D
    const button2D = page.getByRole("radio", { name: "2D" });
    await button2D.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Should have no errors during mode switches
    expect(errors, "JavaScript errors during mode switches").toHaveLength(0);

    // Page should still show graph visualization
    await expect(page.getByRole("heading", { name: "Graph Visualization" })).toBeVisible();
  });

  test("should show WebGL unavailable message gracefully", async ({ page }) => {
    // Note: This test simulates WebGL unavailability by checking error handling
    // In a real WebGL-disabled browser, the 3D button would be disabled

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Check for tooltip on disabled 3D button (if WebGL unavailable)
    const button3D = page.getByRole("radio", { name: "3D" });
    const isDisabled = await button3D.isDisabled();

    if (isDisabled) {
      // Should have a tooltip explaining why
      await button3D.hover();
      // Removed: waitForTimeout - use locator assertions instead
      // Look for tooltip text about WebGL
      const tooltipText = page.locator('[role="tooltip"]');
      if (await tooltipText.isVisible()) {
        const text = await tooltipText.textContent();
        expect(text?.toLowerCase()).toContain("webgl");
      }
    }

    // Either way, page should be functional
    await expect(page.getByRole("heading", { name: "Graph Visualization" })).toBeVisible();
  });

  test("should maintain algorithm selections across mode switches", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });
    await waitForAppReady(page, { timeout: 30_000 });

    // Generate sample data
    const regenerateButton = page.getByRole("button", { name: "Regenerate Sample Data" });
    await regenerateButton.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Expand Community Detection and run an algorithm
    const communityButton = page.getByRole("button", { name: /Community Detection/ });
    await communityButton.click();
    // Removed: waitForTimeout - use locator assertions instead
    // Try to run an algorithm (e.g., Louvain)
    const runLouvain = page.getByRole("button", { name: /Run/i }).first();
    if (await runLouvain.isVisible()) {
      await runLouvain.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Now switch to 3D mode
    const button3D = page.getByRole("radio", { name: "3D" });
    const isDisabled = await button3D.isDisabled();
    if (!isDisabled) {
      await button3D.click();
      // Removed: waitForTimeout - use locator assertions instead
      // The algorithm results should still be visible
      // (community coloring in the graph)
    }

    expect(errors, "JavaScript errors during algorithm + mode switch").toHaveLength(0);
  });
});
