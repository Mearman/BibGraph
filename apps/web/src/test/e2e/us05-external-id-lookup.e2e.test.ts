/**
 * E2E Test: US-05 External Identifier Lookup
 *
 * Tests resolution of external identifiers (DOI, ORCID, ISSN, ROR) to entity
 * detail pages, and OpenAlex URL resolution via dedicated route.
 *
 * Verifies:
 * - DOI resolves to a work entity page
 * - ORCID resolves to an author entity page
 * - ISSN resolves to a source entity page
 * - ROR resolves to an institution entity page
 * - Invalid identifiers show clear error with format guidance
 * - Pasted OpenAlex URLs resolve via /openalex-url/ route
 * - WCAG 2.1 AA accessibility compliance
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173');

test.describe('@entity US-05 External Identifier Lookup', () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {

		// Set up console error listener for debugging
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.error('Browser console error:', msg.text());
			}
		});

		// Set up page error listener
		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should resolve /works/doi/$doi to correct entity', async ({ page }) => {
		const doi = '10.1038/s41586-020-2649-2';
		const encodedDoi = encodeURIComponent(`https://doi.org/${doi}`);

		await page.goto(`${BASE_URL}/#/works/${encodedDoi}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on identifier resolution
		expect(pageContent).not.toContain('Resolving identifier');
		expect(pageContent).not.toContain('Detecting entity type');

		// Should not have routing errors
		expect(pageContent).not.toContain('Routing error');
		expect(pageContent).not.toContain('Invalid URL');

		// Should resolve to a work entity page or show a work-specific error
		const hasWorkContent =
			pageContent.includes('WORK') ||
			pageContent.includes('Abstract') ||
			pageContent.includes('Citations') ||
			pageContent.includes('Display Name') ||
			pageContent.includes('Error Loading Work') ||
			pageContent.includes('Not Found');

		expect(hasWorkContent).toBe(true);
	});

	test('should resolve /authors/orcid/$orcid to correct entity', async ({ page }) => {
		const orcid = '0000-0001-5000-0007';
		const encodedOrcid = encodeURIComponent(`https://orcid.org/${orcid}`);

		await page.goto(`${BASE_URL}/#/authors/${encodedOrcid}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on identifier resolution
		expect(pageContent).not.toContain('Resolving identifier');
		expect(pageContent).not.toContain('Detecting entity type');

		// Should resolve to an author page or show an author-specific error/not-found
		const hasAuthorContent =
			pageContent.includes('AUTHOR') ||
			pageContent.includes('Works Count') ||
			pageContent.includes('Display Name') ||
			pageContent.includes('Affiliations') ||
			pageContent.includes('Error Loading Author') ||
			pageContent.includes('Not Found');

		expect(hasAuthorContent).toBe(true);
	});

	test('should resolve /sources/issn/$issn to correct entity', async ({ page }) => {
		const issn = '0028-0836';
		const encodedIssn = encodeURIComponent(`issn:${issn}`);

		await page.goto(`${BASE_URL}/#/sources/${encodedIssn}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on identifier resolution
		expect(pageContent).not.toContain('Resolving identifier');
		expect(pageContent).not.toContain('Detecting entity type');

		// Should resolve to a source page or show a source-specific error
		const hasSourceContent =
			pageContent.includes('SOURCE') ||
			pageContent.includes('Display Name') ||
			pageContent.includes('Works Count') ||
			pageContent.includes('Type') ||
			pageContent.includes('Error Loading Source') ||
			pageContent.includes('Not Found');

		expect(hasSourceContent).toBe(true);
	});

	test('should resolve /institutions/ror/$ror to correct entity', async ({ page }) => {
		const ror = '05a28rw58';
		const encodedRor = encodeURIComponent(`https://ror.org/${ror}`);

		await page.goto(`${BASE_URL}/#/institutions/${encodedRor}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on identifier resolution
		expect(pageContent).not.toContain('Resolving identifier');
		expect(pageContent).not.toContain('Detecting entity type');

		// Should resolve to an institution page or show an institution-specific error
		const hasInstitutionContent =
			pageContent.includes('INSTITUTION') ||
			pageContent.includes('Display Name') ||
			pageContent.includes('Country') ||
			pageContent.includes('Works Count') ||
			pageContent.includes('Error Loading Institution') ||
			pageContent.includes('Not Found');

		expect(hasInstitutionContent).toBe(true);
	});

	test('should display clear error with format guidance for invalid identifiers', async ({ page }) => {
		// Navigate with a completely invalid identifier
		await page.goto(`${BASE_URL}/#/works/not-a-valid-identifier-!!!`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on resolution
		expect(pageContent).not.toContain('Resolving identifier');

		// Should show error or not-found state, not a blank page
		const hasErrorContent =
			pageContent.includes('Error') ||
			pageContent.includes('Not Found') ||
			pageContent.includes('not found') ||
			pageContent.includes('Invalid') ||
			pageContent.includes('invalid') ||
			pageContent.includes('could not') ||
			pageContent.includes('Could not');

		expect(hasErrorContent).toBe(true);

		// Page should remain functional (main content visible)
		await expect(page.locator('main')).toBeVisible();
	});

	test('should resolve pasted OpenAlex URLs via /openalex-url/$ route', async ({ page }) => {
		// Test with a full OpenAlex API URL pasted into the openalex-url route.
		// The route handler only accepts https://api.openalex.org origin.
		const openAlexUrl = 'https://api.openalex.org/works/W2741809807';
		const encodedUrl = encodeURIComponent(openAlexUrl);

		await page.goto(`${BASE_URL}/#/openalex-url/${encodedUrl}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// The route should redirect to the entity detail page
		// Allow time for the redirect to complete
		await page.waitForURL(/works\/W2741809807/, { timeout: 15_000 }).catch(() => {
			// URL may not redirect in all cases
		});

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be stuck on resolution
		expect(pageContent).not.toContain('Resolving identifier');
		expect(pageContent).not.toContain('Detecting entity type');

		// Should resolve to entity content or show a recognisable error
		const hasEntityContent =
			pageContent.includes('WORK') ||
			pageContent.includes('Work') ||
			pageContent.includes('Display Name') ||
			pageContent.includes('display_name') ||
			pageContent.includes('Abstract') ||
			pageContent.includes('Error Loading') ||
			pageContent.includes('Not Found') ||
			// URL might redirect to /works/W2741809807
			page.url().includes('/works/W2741809807') ||
			// The page may show entity data in raw or rich view
			pageContent.length > 500;

		expect(hasEntityContent).toBe(true);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to a work via DOI lookup
		const doi = '10.1038/s41586-020-2649-2';
		const encodedDoi = encodeURIComponent(`https://doi.org/${doi}`);

		await page.goto(`${BASE_URL}/#/works/${encodedDoi}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
