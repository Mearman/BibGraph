/**
 * E2E tests for algorithms page crash detection
 *
 * Specifically tests that the /algorithms page loads without crashing
 * due to undefined data being passed to Mantine Select components.
 *
 * Bug: "Cannot read properties of undefined (reading 'map')" error
 * occurs in GraphAlgorithmsPanel when Select component receives undefined data.
 */

import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";

const isCi = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL =
  process.env.BASE_URL ??
  process.env.E2E_BASE_URL ??
  (isCi ? "http://localhost:4173" : "http://localhost:5173");

const SUITE_TIMEOUT_MS = 60_000;

test.describe("@utility @error Algorithms Page Crash Detection", () => {
  test.setTimeout(SUITE_TIMEOUT_MS);

  test("should load algorithms page without crashing", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`, { waitUntil: 'domcontentloaded' });

    // Wait for the page to stabilize
    // Removed: waitForTimeout - use locator assertions instead
    // Check for ErrorBoundary indicators (React catches errors before they become pageerrors)
    const navigationError = page.locator("text=Navigation Error");
    

    // Fail if either uncaught errors or ErrorBoundary is shown
    expect(errors, "JavaScript errors detected on algorithms page").toHaveLength(0);
    await expect(navigationError, "ErrorBoundary Navigation Error detected - page crashed").toBeHidden();
  });

  test("should not show error boundary crash message", async ({ page }) => {
    await page.goto(`${BASE_URL}/#/algorithms`);
    await page.waitForLoadState("domcontentloaded");

    // Give the page time to render (and potentially crash)
    // Removed: waitForTimeout - use locator assertions instead
    // Check for error boundary indicators
    const navigationError = page.locator("text=Navigation Error");
    const cannotReadError = page.locator("text=Cannot read properties");
    const errorBoundary = page.locator("text=There was an error");

    await expect(
      navigationError,
      "Navigation Error should not be visible"
    ).toBeHidden();
    await expect(
      cannotReadError,
      "Cannot read properties error should not be visible"
    ).toBeHidden();
    await expect(
      errorBoundary,
      "Error boundary message should not be visible"
    ).toBeHidden();
  });

  test("should render algorithms panel successfully", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`);
    await waitForAppReady(page, { timeout: 30_000 });

    // First check no errors occurred
    expect(errors, "JavaScript errors detected").toHaveLength(0);

    // Verify main content renders - use heading role to be more specific
    await expect(page.getByRole("heading", { name: "Graph Algorithms" })).toBeVisible({
      timeout: 10_000,
    });
    await expect(page.getByRole("heading", { name: "Graph Statistics" })).toBeVisible();

    // Verify accordion items exist - use button role for accordion controls
    await expect(page.getByRole("button", { name: /Community Detection/ })).toBeVisible();
    await expect(page.getByRole("button", { name: "Shortest Path" })).toBeVisible();
  });

  test("should not crash when accordion sections are expanded", async ({
    page,
  }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`);
    await waitForAppReady(page, { timeout: 30_000 });

    // First check that page didn't crash on load
    const navigationError = page.locator("text=Navigation Error");
    
    await expect(navigationError, "Page crashed on load - cannot test accordion interaction").toBeHidden();

    // Check no initial errors
    expect(errors, "Initial JavaScript errors detected").toHaveLength(0);

    // Try to expand the Motif Detection accordion (contains the problematic Select)
    const motifAccordion = page.getByRole("button", { name: /Motif Detection/ });
    if (await motifAccordion.isVisible()) {
      await motifAccordion.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Try to expand Connected Components accordion (use exact match to avoid matching "Strongly Connected")
    const componentsAccordion = page.getByRole("button", { name: /^Connected Components/ });
    if (await componentsAccordion.isVisible()) {
      await componentsAccordion.click();
      // Removed: waitForTimeout - use locator assertions instead
    }

    // Should still have no errors after interactions
    expect(errors, "JavaScript errors after accordion interaction").toHaveLength(0);
  });

  test("should have functional graph visualization", async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (error) => {
      errors.push(error.message);
    });

    await page.goto(`${BASE_URL}/#/algorithms`);
    await waitForAppReady(page, { timeout: 30_000 });

    // Check for graph visualization heading
    await expect(page.getByRole("heading", { name: "Graph Visualization" })).toBeVisible({
      timeout: 10_000,
    });

    // Check for regenerate button (indicates page rendered successfully)
    const regenerateButton = page.getByRole("button", { name: "Regenerate Sample Data" });
    await expect(regenerateButton).toBeVisible();

    // Should have no errors
    expect(errors, "JavaScript errors on algorithms page").toHaveLength(0);
  });
});
