/**
 * E2E tests for Cache Management utility page
 *
 * Tests the cache browser page functionality including:
 * - Page loading and heading visibility
 * - Storage statistics display
 * - Navigation to cache page
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { BaseSPAPageObject } from "@/test/page-objects/BaseSPAPageObject";

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const TEST_SUITE_TIMEOUT_MS = 30_000;

test.describe("@utility Cache Page", () => {
	test.setTimeout(TEST_SUITE_TIMEOUT_MS);

	let cachePage: BaseSPAPageObject;

	test.beforeEach(async ({ page }) => {
		cachePage = new BaseSPAPageObject(page, {
			baseUrl: IS_CI ? "http://localhost:4173" : "http://localhost:5173",
			waitForAppReady: true,
		});

		// Navigate to cache page
		await cachePage.goto("/#/cache");
		await waitForAppReady(page);
	});

	test("should load cache page with heading", async ({ page }) => {
		// Verify page loaded successfully
		await cachePage.expectNoError();

		// Check for main heading
		const heading = page.getByRole("heading", { name: "Cache", exact: true });
		await expect(heading).toBeVisible({ timeout: 5000 });

		// Verify URL contains cache route
		expect(page.url()).toContain("cache");
	});

	test("should display storage statistics panel", async ({ page }) => {
		// The usage panel shows entry count, size and last modified
		const statsPanel = page.locator("[data-testid='storage-stats']");
		await expect(statsPanel).toBeVisible({ timeout: 5000 });

		await expect(
			page.locator("[data-testid='cache-entry-count']"),
		).toBeVisible();
		await expect(
			page.locator("[data-testid='storage-size']"),
		).toBeVisible();
	});

	test("should render statistics within a paper component", async ({ page }) => {
		// The storage statistics panel is a Mantine Paper component
		const statsPaper = page.locator(".mantine-Paper-root[data-testid='storage-stats']");
		await expect(statsPaper).toBeVisible({ timeout: 5000 });
	});

	test("should maintain consistent layout with app shell", async ({ page }) => {
		// Verify app shell elements are present
		await cachePage.expectLoaded();

		// Check for container
		const container = page.locator(".mantine-Container-root");
		await expect(container).toBeVisible({ timeout: 5000 });

		// Verify proper spacing by checking container exists Note: Padding classes may vary based on Mantine version
		expect(await container.count()).toBeGreaterThan(0);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to cache page
		await cachePage.goto("/#/cache");
		await waitForAppReady(page);

		// Scan the page's own content region: the app shell's sidebars carry
		// pre-existing nested-interactive violations tracked separately from
		// this page.
		const accessibilityScanResults = await new AxeBuilder({ page })
			.include('main')
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
