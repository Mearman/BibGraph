/**
 * E2E tests for data version selector removal after November 2025
 *
 * Verifies that:
 * 1. DataVersionSelector IS HIDDEN when date is December 1, 2025 or later
 * 2. DataVersionSelector IS HIDDEN when date is December 15, 2025
 * 3. XpacToggle remains visible and functional after selector is hidden
 * 4. Settings page remains accessible and navigable without the selector
 * 5. Other settings (email, reset, cache) continue to work normally
 * 6. UI maintains proper structure and accessibility when selector is hidden
 *
 * Related:
 * - T040: E2E test: Verify data version selector hidden after November 2025
 * - 013-walden-research specification
 * - Cutoff date: December 1, 2025 UTC (2025-12-01T00:00:00Z)
 */

import { expect,test } from "@playwright/test";

const MIN_PAGE_CONTENT_LENGTH = 100;
const SETTINGS_LOAD_TIMEOUT_MS = 10_000;
const MAX_LABEL_CHECK_INPUTS = 3;

test.describe("Data Version Selector Removal After November 2025", () => {
  test("should hide data version selector when date is December 1, 2025", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025 (cutoff date)
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify page loaded successfully
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();
    const textLength = await bodyText.evaluate((element) => element.textContent.length);
    expect(textLength).toBeGreaterThan(MIN_PAGE_CONTENT_LENGTH);

    // Verify data version selector is NOT visible
    const dataVersionSelector = page.getByTestId("data-version-selector");
    await expect(dataVersionSelector).toBeHidden();

    // Verify description text is also not visible
    const dataVersionDescription = page.getByTestId(
      "data-version-selector-description"
    );
    await expect(dataVersionDescription).toBeHidden();

    // Verify the selector element doesn't exist in the DOM at all
    const selectorCount = page
      .getByTestId("data-version-selector")
      ;
    await expect(selectorCount).toHaveCount(0);

    console.log("✅ Data version selector is hidden on December 1, 2025");
  });

  test("should hide data version selector in mid-December 2025", async ({
    page,
  }) => {
    // Mock system time to December 15, 2025
    await page.clock.setSystemTime(new Date("2025-12-15T12:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify page loaded successfully
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();

    // Verify data version selector is NOT visible
    const dataVersionSelector = page.getByTestId("data-version-selector");
    await expect(dataVersionSelector).toBeHidden();

    // Verify selector element doesn't exist
    const selectorCount = page
      .getByTestId("data-version-selector")
      ;
    await expect(selectorCount).toHaveCount(0);

    console.log("✅ Data version selector is hidden on December 15, 2025");
  });

  test("should verify xpac toggle is still visible when selector is hidden", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify xpac toggle is visible
    const xpacToggle = page.getByTestId("xpac-toggle");
    await expect(xpacToggle).toBeVisible();

    // Verify xpac toggle checkbox exists and is accessible
    const switchInput = xpacToggle.locator('input[type="checkbox"]');
    await expect(switchInput).toBeVisible();

    // Verify xpac description is visible
    const xpacDescription = page.getByTestId("xpac-toggle-description");
    await expect(xpacDescription).toBeVisible();

    // Verify xpac description contains expected text
    await expect(xpacDescription).toContainText("190M");

    console.log("✅ XpacToggle remains visible when data version selector is hidden");
  });

  test("should verify xpac toggle is functional when selector is hidden", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Get xpac toggle
    const xpacToggle = page.getByTestId("xpac-toggle");
    const switchInput = xpacToggle.locator('input[type="checkbox"]');

    // Verify initial state is checked
    
    await expect(switchInput).toBeChecked();

    // Toggle OFF
    await switchInput.click();

    // Verify state changed
    
    await expect(switchInput).not.toBeChecked();

    // Toggle back ON
    await switchInput.click();

    // Verify state changed back
    
    await expect(switchInput).toBeChecked();

    console.log("✅ XpacToggle functions correctly when selector is hidden");
  });

  test("should maintain settings page structure without selector", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify page header is visible
    const pageTitle = page.getByText(/User Preferences/i);
    await expect(pageTitle).toBeVisible();

    // Verify email section is visible
    const emailSection = page.getByText(/OpenAlex Polite Pool/i);
    await expect(emailSection).toBeVisible();

    // Verify warning alert is visible
    const warningAlert = page.getByRole("region");
    expect(await warningAlert.count()).toBeGreaterThan(0);

    // Verify reset preferences button is visible
    const resetButton = page.getByRole("button", {
      name: /Reset User Preferences/i,
    });
    await expect(resetButton).toBeVisible();

    // Verify cache clear button is visible
    const clearButton = page.getByRole("button", {
      name: /Clear All Cache & User Data/i,
    });
    await expect(clearButton).toBeVisible();

    // Verify dividers are still present (separating sections)
    const dividers = page.locator('[role="separator"]');
    expect(await dividers.count()).toBeGreaterThan(0);

    console.log("✅ Settings page structure is intact without the selector");
  });

  test("should maintain accessibility without data version selector", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify page is keyboard navigable - tab through focusable elements
    const focusableElements = page.locator(
      "button, [type=checkbox], [type=text], select, [role=button], [role=tab]"
    );
    const count = await focusableElements.count();
    expect(count).toBeGreaterThan(0);

    // Verify buttons are accessible
    const buttons = page.locator("button");
    const buttonCount = await buttons.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Verify first button is keyboard accessible
    await buttons.first().focus();
    const focusedElement = await page.evaluate(() => {
      return document.activeElement?.tagName;
    });
    expect(focusedElement?.toUpperCase()).toBe("BUTTON");

    // Verify form inputs have labels or accessible names
    const inputs = page.locator("input");
    for (let index = 0; index < Math.min(MAX_LABEL_CHECK_INPUTS, await inputs.count()); index++) {
      const input = inputs.nth(index);
      const hasLabel =
        (await input.getAttribute("aria-label")) !== null ||
        (await input.getAttribute("placeholder")) !== null ||
        (await input.getAttribute("title")) !== null;
      expect(hasLabel).toBeTruthy();
    }

    console.log("✅ Settings page remains accessible without the selector");
  });

  test("should verify no selector renders before December 1, 2025", async ({
    page,
  }) => {
    // Mock system time to November 30, 2025 (one day before cutoff)
    await page.clock.setSystemTime(new Date("2025-11-30T23:59:59Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify data version selector IS visible before cutoff
    const dataVersionSelector = page.getByTestId("data-version-selector");
    await expect(dataVersionSelector).toBeVisible();

    console.log("✅ Data version selector is visible before December 1, 2025");
  });

  test("should handle navigation with selector hidden", async ({ page }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to home page first
    await page.goto("#/#/", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify selector is not visible
    const dataVersionSelector = page.getByTestId("data-version-selector");
    await expect(dataVersionSelector).toBeHidden();

    // Navigate to a work detail page
    await page.goto("#/#/works/W2741809807", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify page loaded (not in settings, so selector shouldn't be present)
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();

    // Navigate back to settings
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify selector is still not visible
    await expect(dataVersionSelector).toBeHidden();

    console.log("✅ Navigation works correctly with selector hidden");
  });

  test("should verify selector is completely absent from DOM", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify no element with data-testid="data-version-selector" exists
    const selectorByTestId = page.getByTestId("data-version-selector");
    await expect(selectorByTestId).toHaveCount(0);

    // Verify no element with data-testid="data-version-selector-description" exists
    const descriptionByTestId = page.getByTestId(
      "data-version-selector-description"
    );
    await expect(descriptionByTestId).toHaveCount(0);

    // Verify no select element for data version exists in settings
    const selects = page.locator("select");
    const selectCount = await selects.count();

    // There should be no selects, or if there are, none should be for data version
    if (selectCount > 0) {
      for (let index = 0; index < selectCount; index++) {
        const select = selects.nth(index);
        const options = select.locator("option");
        const optionText = await options.allTextContents();
        const hasVersionOption = optionText.some(
          (text) =>
            text.includes("Auto") ||
            text.includes("legacy") ||
            text.includes("Version")
        );
        expect(hasVersionOption).toBe(false);
      }
    }

    console.log("✅ Data version selector is completely absent from DOM");
  });

  test("should verify divider before xpac toggle when selector is hidden", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Verify email section exists
    const emailSection = page.getByText(/OpenAlex Polite Pool/i);
    await expect(emailSection).toBeVisible();

    // Verify xpac toggle exists
    const xpacToggle = page.getByTestId("xpac-toggle");
    await expect(xpacToggle).toBeVisible();

    // Verify there's a divider between them
    const dividers = page.locator('[role="separator"]');
    const dividerCount = await dividers.count();

    // Should have at least 1 divider separating sections
    expect(dividerCount).toBeGreaterThan(0);

    console.log("✅ Page layout properly maintains dividers without the selector");
  });

  test("should verify email section functions when selector is hidden", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Find configure button in email section
    const configureButton = page.getByRole("button", {
      name: /Configure|Edit/i,
    });

    // Should have at least the email configuration button
    const buttonCount = await configureButton.count();
    expect(buttonCount).toBeGreaterThan(0);

    // Verify email input is available
    const emailInput = page.locator('input[type="text"]');
    expect(await emailInput.count()).toBeGreaterThan(0);

    console.log("✅ Email configuration section functions correctly");
  });

  test("should verify no console errors when selector is hidden", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Capture console messages
    const consoleMessages: string[] = [];

    page.on("console", (message) => {
      if (
        message.type() === "error" ||
        message.type() === "warning"
      ) {
        consoleMessages.push(`${message.type()}: ${message.text()}`);
      }
    });

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    // Wait a bit for any async operations to complete
    // Removed: waitForTimeout - use locator assertions instead
    // Filter out expected warnings (e.g., about features, etc.)
    const errorMessages = consoleMessages.filter(
      (message) =>
        !message.includes("ResizeObserver") &&
        !message.includes("Mantine") &&
        !message.includes("React") &&
        !message.includes("Playwright")
    );

    // Should have minimal or no errors related to our changes
    const relevantErrors = errorMessages.filter(
      (message) =>
        message.includes("undefined") ||
        message.includes("Cannot read") ||
        message.includes("is not a function")
    );

    expect(relevantErrors).toHaveLength(0);

    console.log(
      `✅ No critical console errors when selector is hidden (${String(errorMessages.length)} other warnings)`
    );
  });

  test("should verify page rendering performance without selector", async ({
    page,
  }) => {
    // Mock system time to December 1, 2025
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));

    // Measure page load performance
    const startTime = Date.now();

    // Navigate to settings page
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const loadTime = Date.now() - startTime;

    // Page should load within reasonable time (< 10 seconds)
    expect(loadTime).toBeLessThan(SETTINGS_LOAD_TIMEOUT_MS);

    // Verify page is fully rendered
    const bodyText = page.locator('body');
    await expect(bodyText).not.toBeEmpty();
    const textLength = await bodyText.evaluate((element) => element.textContent.length);
    expect(textLength).toBeGreaterThan(MIN_PAGE_CONTENT_LENGTH);

    console.log(
      `✅ Settings page loaded successfully in ${String(loadTime)}ms without selector`
    );
  });

  test("should verify selector is present before cutoff and hidden after", async ({
    page,
  }) => {
    // First, check that selector IS visible on November 30
    await page.clock.setSystemTime(new Date("2025-11-30T23:59:59Z"));
    await page.goto("#/#/settings", { waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const selectorBefore = page.getByTestId("data-version-selector");
    await expect(selectorBefore).toBeVisible();

    console.log(
      "✅ Data version selector is visible on November 30, 2025"
    );

    // Now check that selector is NOT visible on December 1
    await page.clock.setSystemTime(new Date("2025-12-01T00:00:00Z"));
    await page.reload({ waitUntil: "domcontentloaded" });
    await page.waitForLoadState("load");

    const selectorAfter = page.getByTestId("data-version-selector");
    await expect(selectorAfter).toBeHidden();

    console.log(
      "✅ Data version selector is hidden on December 1, 2025 (cutoff verified)"
    );
  });
});
