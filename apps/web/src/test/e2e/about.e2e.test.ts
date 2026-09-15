/**
 * E2E tests for About utility page
 *
 * Tests the About page functionality including content display,
 * technology stack information, and OpenAlex attribution.
 * @see CLAUDE.md - E2E Testing Patterns section
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { BaseSPAPageObject } from "@/test/page-objects/BaseSPAPageObject";

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = IS_CI ? "http://localhost:4173" : "http://localhost:5173";
const TEST_SUITE_TIMEOUT_MS = 30_000;

test.describe("@utility About Page", () => {
	test.setTimeout(TEST_SUITE_TIMEOUT_MS);

	test.beforeEach(async ({ page }) => {
		// Navigate to About page
		await page.goto(`${BASE_URL}/#/about`, {
			waitUntil: "domcontentloaded",
			timeout: 15_000,
		});
		await waitForAppReady(page);
	});

	test("should load About page with main heading", async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Verify no error state
		await pageObject.expectNoError();

		// Check for main heading
		const heading = page.getByRole("heading", {
			name: /About BibGraph/i,
		});
		await expect(heading).toBeVisible();

		// Verify page has loaded completely
		await pageObject.expectLoaded();
	});

	test("should display application name and research focus", async ({
		page,
	}) => {
		// Check application title
		const title = page.getByRole("heading", {
			name: /About BibGraph/i,
		});
		await expect(title).toBeVisible();

		// Check research focus description
		const researchDescription = page.getByText(
			/PhD research project focused on academic literature exploration/i
		);
		await expect(researchDescription).toBeVisible();

		// Verify research focus section heading
		const researchFocusHeading = page.getByRole("heading", {
			name: /Research Focus/i,
		});
		await expect(researchFocusHeading).toBeVisible();

		// Check for cultural heritage content
		const heritageContent = page.getByText(/cultural heritage data/i);
		await expect(heritageContent).toBeVisible();
	});

	test("should display technology stack with version information", async ({
		page,
	}) => {
		// Check for Technology Stack section
		const techStackHeading = page.getByRole("heading", {
			name: /Technology Stack/i,
		});
		await expect(techStackHeading).toBeVisible();

		// Verify key technologies are displayed with versions
		const technologies = [
			{ name: "React", version: "19" },
			{ name: "TypeScript", version: "5" },
			{ name: "TanStack Router", version: "1" },
			{ name: "Mantine", version: "8" },
			{ name: "Vite", version: "7" },
		];

		for (const tech of technologies) {
			// Look for badge containing technology name and version
			const techBadge = page.getByText(
				new RegExp(`${tech.name}.*v${tech.version}`, "i")
			);
			await expect(techBadge).toBeVisible();
		}
	});

	test("should display OpenAlex API integration information", async ({
		page,
	}) => {
		// Verify Key Features section mentions OpenAlex integration
		const keyFeaturesHeading = page.getByRole("heading", {
			name: /Key Features/i,
		});
		await expect(keyFeaturesHeading).toBeVisible();

		// Check for specific OpenAlex integration text in Key Features
		const academicIntegration = page.getByText(
			/Built for integration with OpenAlex API for academic literature analysis/i
		);
		await expect(academicIntegration).toBeVisible();

		// Verify the research description mentions OpenAlex
		const researchDescription = page.getByText(
			/PhD research project focused on academic literature exploration/i
		);
		await expect(researchDescription).toBeVisible();
	});

	test("should display development and deployment information", async ({
		page,
	}) => {
		// Check for Development & Deployment section
		const deploymentHeading = page.getByRole("heading", {
			name: /Development & Deployment/i,
		});
		await expect(deploymentHeading).toBeVisible();

		// Verify build system information
		const buildSystemText = page.getByText(/Build System/i);
		await expect(buildSystemText).toBeVisible();

		const viteDescription = page.getByText(
			/Vite with TypeScript, ESLint, and optimized production builds/i
		);
		await expect(viteDescription).toBeVisible();

		// Verify static hosting information (GitHub Pages)
		const staticHostingText = page.getByText(/Static Hosting/i);
		await expect(staticHostingText).toBeVisible();

		const githubPagesDescription = page.getByText(
			/GitHub Pages compatible with hash-based routing/i
		);
		await expect(githubPagesDescription).toBeVisible();

		// Verify package management information
		const packageManagementText = page.getByText(/Package Management/i);
		await expect(packageManagementText).toBeVisible();

		const pnpmDescription = page.getByText(
			/pnpm with workspace support and optimized dependency resolution/i
		);
		await expect(pnpmDescription).toBeVisible();
	});

	test("should navigate to About page using BaseSPAPageObject", async ({
		page,
	}) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to home first
		await page.goto(BASE_URL, {
			waitUntil: "domcontentloaded",
			timeout: 15_000,
		});
		await waitForAppReady(page);

		// Use page object to navigate to About
		await pageObject.navigateTo("/#/about");

		// Verify About page loaded
		const heading = page.getByRole("heading", {
			name: /About BibGraph/i,
		});
		await expect(heading).toBeVisible();

		// Verify no errors
		await pageObject.expectNoError();
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to About page
		await page.goto(`${BASE_URL}/#/about`, {
			waitUntil: "domcontentloaded",
			timeout: 15_000,
		});
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
