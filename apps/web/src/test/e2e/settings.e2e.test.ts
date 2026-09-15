/**
 * E2E Test: Settings Utility Page
 *
 * Tests the Settings page functionality including:
 * - Page load and navigation
 * - Xpac works toggle functionality
 * - Theme switching
 * - Settings persistence across page reloads
 * - Reset preferences functionality
 * - Clear cache functionality
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { SettingsPage } from "@/test/page-objects/SettingsPage";

test.describe("@utility Settings Page", () => {
	const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
	const BASE_URL = IS_CI ? "http://localhost:4173" : "http://localhost:5173";

	test.beforeEach(async ({ page, context }) => {
		// Clear storage to ensure clean state
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);
	});

	test("should load settings page with heading and sections", async ({
		page,
	}) => {

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`, { waitUntil: 'domcontentloaded' });
		await waitForAppReady(page);

		// Verify we're on the settings page
		await page.waitForURL("**/settings", { timeout: 5000 });

		// Wait for Settings heading to be visible
		const heading = page.locator("h1", { hasText: "Settings" });
		await expect(heading).toBeVisible({ timeout: 10_000 });

		// Verify User Preferences section
		await expect(page.getByText("User Preferences")).toBeVisible();

		// Verify OpenAlex Polite Pool section
		await expect(page.getByText("OpenAlex Polite Pool")).toBeVisible();

		// Verify OpenAlex API Key section
		await expect(page.getByText("OpenAlex API Key")).toBeVisible();

		// Verify warning alert is present
		await expect(
			page.locator("[role='alert']", { hasText: "Warning" }),
		).toBeVisible();
	});

	test("should display xpac toggle and allow toggling", async ({ page }) => {
		const settingsPage = new SettingsPage(page);

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Verify xpac toggle is present
		const xpacToggle = page.locator(
			"[data-testid='xpac-toggle'], [data-testid='include-xpac']",
		);
		await expect(xpacToggle).toBeVisible();

		// Get initial state
		const isInitialState = await settingsPage.isXpacEnabled();

		// Toggle xpac
		await settingsPage.toggleXpac();

		// Wait for notification
		await page.locator(".mantine-Notification-root").waitFor({ timeout: 5000 });

		// Verify state changed
		const isNewState = await settingsPage.isXpacEnabled();
		expect(isNewState).toBe(!isInitialState);

		// Verify notification message
		const notification = page.locator(".mantine-Notification-root");
		if (isNewState) {
			await expect(notification).toContainText(
				"Extended research outputs (xpac) enabled",
			);
		} else {
			await expect(notification).toContainText(
				"Extended research outputs (xpac) disabled",
			);
		}
	});

	test("should display theme controls and allow theme switching", async ({
		page,
	}) => {
		const settingsPage = new SettingsPage(page);

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Get initial theme
		const initialTheme = await settingsPage.getCurrentTheme();
		expect(["light", "dark"]).toContain(initialTheme);

		// Toggle theme
		await settingsPage.toggleTheme();

		// Wait for theme transition
		// Removed: waitForTimeout - use locator assertions instead
		// Verify theme changed
		const newTheme = await settingsPage.getCurrentTheme();
		expect(newTheme).not.toBe(initialTheme);

		// Verify the data-mantine-color-scheme attribute changed
		const colorScheme = await page.evaluate(() => {
			return document.documentElement.dataset.mantineColorScheme;
		});
		expect(colorScheme).toBe(newTheme);
	});

	test("should display storage and cache management sections", async ({
		page,
	}) => {

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Verify Reset User Preferences button
		const resetButton = page.locator("button", {
			hasText: "Reset User Preferences",
		});
		await expect(resetButton).toBeVisible();
		await expect(resetButton).toBeEnabled();

		// Verify Clear All Cache & User Data button
		const clearButton = page.locator("button", {
			hasText: "Clear All Cache & User Data",
		});
		await expect(clearButton).toBeVisible();
		await expect(clearButton).toBeEnabled();

		// Verify descriptive text for reset action
		await expect(
			page.getByText(
				/Reset layout, expansion settings, and other user preferences/i,
			),
		).toBeVisible();

		// Verify descriptive text for clear action
		await expect(
			page.getByText(
				/Clear all cached API data, user preferences, and application state/i,
			),
		).toBeVisible();
	});

	test("should persist xpac setting after page reload", async ({ page }) => {
		const settingsPage = new SettingsPage(page);

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Get initial xpac state
		const isInitialState = await settingsPage.isXpacEnabled();

		// Toggle xpac to change state
		await settingsPage.toggleXpac();

		// Wait for notification to confirm save
		await page.locator(".mantine-Notification-root").waitFor({ timeout: 5000 });

		// Verify state changed
		const isChangedState = await settingsPage.isXpacEnabled();
		expect(isChangedState).toBe(!isInitialState);

		// Reload the page
		await page.reload();
		await waitForAppReady(page);

		// Navigate back to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Verify the setting persisted
		const isPersistedState = await settingsPage.isXpacEnabled();
		expect(isPersistedState).toBe(isChangedState);
		expect(isPersistedState).not.toBe(isInitialState);
	});

	test("should persist theme setting after page reload", async ({ page }) => {
		const settingsPage = new SettingsPage(page);

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Get initial theme
		const initialTheme = await settingsPage.getCurrentTheme();

		// Toggle theme
		await settingsPage.toggleTheme();
		// Removed: waitForTimeout - use locator assertions instead
		// Verify theme changed
		const changedTheme = await settingsPage.getCurrentTheme();
		expect(changedTheme).not.toBe(initialTheme);

		// Reload the page
		await page.reload();
		await waitForAppReady(page);

		// Verify theme persisted (check immediately, no need to navigate back to settings)
		const persistedTheme = await settingsPage.getCurrentTheme();
		expect(persistedTheme).toBe(changedTheme);
		expect(persistedTheme).not.toBe(initialTheme);
	});

	test("should display reset preferences button with loading state", async ({
		page,
	}) => {

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		const resetButton = page.locator("button", {
			hasText: "Reset User Preferences",
		});

		// Click reset button
		await resetButton.click();

		// Verify loading state appears (button should show loading spinner)
		await expect(resetButton).toHaveAttribute("data-loading", "true", {
			timeout: 1000,
		});

		// Wait for notification indicating completion
		await page.locator(".mantine-Notification-root").waitFor({ timeout: 10_000 });

		// Verify success notification
		const notification = page.locator(".mantine-Notification-root");
		await expect(notification).toContainText("Preferences Reset");
		await expect(notification).toContainText(
			/reset to defaults.*reload the page/i,
		);

		// Verify loading state is removed
		await expect(resetButton).not.toHaveAttribute("data-loading", "true");
	});

	test("should have accessible form elements with proper ARIA attributes", async ({
		page,
	}) => {

		// Navigate to settings
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Verify xpac toggle has aria-checked attribute
		const xpacToggle = page.locator(
			"[data-testid='xpac-toggle'], [data-testid='include-xpac']",
		);
		const ariaChecked = await xpacToggle.getAttribute("aria-checked");
		expect(["true", "false"]).toContain(ariaChecked ?? "");

		// Verify buttons have proper roles
		const resetButton = page.locator("button", {
			hasText: "Reset User Preferences",
		});
		await expect(resetButton).toHaveAttribute("type", "button");

		const clearButton = page.locator("button", {
			hasText: "Clear All Cache & User Data",
		});
		await expect(clearButton).toHaveAttribute("type", "button");

		// Verify warning alert has proper role
		const alert = page.locator("[role='alert']").first();
		await expect(alert).toBeVisible();
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {

		// Navigate to settings page
		await page.goto(`${BASE_URL}/settings`);
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
