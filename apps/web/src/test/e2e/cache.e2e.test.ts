/**
 * E2E tests for Cache Management utility page
 *
 * Tests the cache browser page functionality including:
 * - Page loading and heading visibility
 * - Placeholder content display (current state)
 * - Navigation to cache page
 * - CLI tools suggestion visibility
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
		const heading = page.getByRole("heading", { name: /cache browser/i });
		await expect(heading).toBeVisible({ timeout: 5000 });

		// Verify URL contains cache route
		expect(page.url()).toContain("cache");
	});

	test("should display placeholder message", async ({ page }) => {
		// Check for placeholder text indicating component removal
		const placeholderText = page.getByText(
			/The Cache Browser component has been temporarily removed/i,
		);
		await expect(placeholderText).toBeVisible({ timeout: 5000 });

		// Check for future restoration message
		const futureMessage = page.getByText(
			/This functionality may be restored in a future version/i,
		);
		await expect(futureMessage).toBeVisible({ timeout: 5000 });
	});

	test("should show CLI tools suggestion", async ({ page }) => {
		// Verify CLI tools recommendation is displayed
		const cliSuggestion = page.getByText(
			/For cache management, please use the CLI tools/i,
		);
		await expect(cliSuggestion).toBeVisible({ timeout: 5000 });

		// Check for pnpm cli cache command mention
		const cliCommand = page.getByText(/pnpm cli cache:/i);
		await expect(cliCommand).toBeVisible({ timeout: 5000 });
	});

	test("should render within paper component with border", async ({ page }) => {
		// Verify the content is within a Mantine Paper component
		const paperComponent = page.locator(".mantine-Paper-root");
		await expect(paperComponent).toBeVisible({ timeout: 5000 });

		// Check that heading is inside the paper
		const headingInPaper = paperComponent.getByRole("heading", {
			name: /cache browser/i,
		});
		await expect(headingInPaper).toBeVisible({ timeout: 5000 });
	});

	test("should maintain consistent layout with app shell", async ({ page }) => {
		// Verify app shell elements are present
		await cachePage.expectLoaded();

		// Check for container
		const container = page.locator(".mantine-Container-root");
		await expect(container).toBeVisible({ timeout: 5000 });

		// Verify proper spacing by checking container exists
		// Note: Padding classes may vary based on Mantine version
		expect(await container.count()).toBeGreaterThan(0);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to cache page
		await cachePage.goto("/#/cache");
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
