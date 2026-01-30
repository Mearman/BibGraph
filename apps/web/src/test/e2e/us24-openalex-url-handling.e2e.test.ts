/**
 * E2E tests for OpenAlex URL Handling (US-24)
 *
 * Tests that various OpenAlex URL formats are correctly resolved
 * to the appropriate entity pages within BibGraph.
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { BaseSPAPageObject } from '@/test/page-objects/BaseSPAPageObject';

test.describe('@utility US-24 OpenAlex URL Handling', () => {
	const BASE_URL = process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173';

	test.beforeEach(async ({ page, context }) => {
		await context.clearCookies();
		await page.goto(BASE_URL);
		await waitForAppReady(page);
	});

	test('should resolve /openalex-url/$ to correct entity', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate using openalex-url route with a work ID
		await pageObject.goto(`${BASE_URL}/#/openalex-url/W2741809807`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should redirect to the works entity page
		await page.waitForURL(/\/#\/works\/W2741809807/, { timeout: 15_000 });
		const currentUrl = page.url();
		expect(currentUrl).toContain('/works/W2741809807');

		// Verify entity page loaded
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
		await pageObject.expectNoError();
	});

	test('should resolve /api-openalex-org/$ to correct entity', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate using api-openalex-org route with an author ID
		await pageObject.goto(`${BASE_URL}/#/api-openalex-org/authors/A5017898742`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should redirect to the authors entity page
		await page.waitForURL(/\/#\/authors\/A5017898742/, { timeout: 15_000 });
		const currentUrl = page.url();
		expect(currentUrl).toContain('/authors/A5017898742');

		// Verify entity page loaded with author data
		await expect(page.locator('h1')).toBeVisible({ timeout: 15_000 });
		await pageObject.expectNoError();
	});

	test('should resolve /https/$ to correct entity', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate using https route (full OpenAlex API URL without protocol prefix)
		const encodedUrl = 'api.openalex.org/works/W2741809807';
		await pageObject.goto(`${BASE_URL}/#/https/${encodedUrl}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should redirect to the works entity page
		await page.waitForURL(/works\/W2741809807/, { timeout: 15_000 });
		const currentUrl = page.url();
		expect(currentUrl).toContain('W2741809807');

		await pageObject.expectNoError();
	});

	test('should resolve /openalex.org/$ to correct entity', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate using openalex.org route with an institution ID
		await pageObject.goto(`${BASE_URL}/#/openalex.org/I27837315`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should redirect to the institutions entity page
		await page.waitForURL(/institutions\/I27837315/, { timeout: 15_000 });
		const currentUrl = page.url();
		expect(currentUrl).toContain('I27837315');

		await pageObject.expectNoError();
	});

	test('should display helpful error with link format examples for invalid URLs', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to an invalid OpenAlex URL format
		await pageObject.goto(`${BASE_URL}/#/openalex-url/invalid-not-a-real-id`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should display an error or guidance message
		const errorOrHelp = page.getByText(/invalid|not found|error|example|format/i);
		await expect(errorOrHelp.first()).toBeVisible({ timeout: 15_000 });
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate using a valid OpenAlex URL route
		await pageObject.goto(`${BASE_URL}/#/openalex-url/W2741809807`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		const critical = accessibilityScanResults.violations.filter(
			(v) => v.impact === 'critical' || v.impact === 'serious'
		);
		expect(critical).toEqual([]);
	});
});
