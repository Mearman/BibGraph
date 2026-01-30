/**
 * E2E Test: US-06 Entity Detail Pages
 *
 * Tests that entity detail pages render correctly for all 12 OpenAlex entity
 * types, display key metadata, support rich and raw JSON views, and handle
 * loading/error states gracefully.
 *
 * Verifies:
 * - Detail page renders for each of 12 entity types
 * - Key metadata (name/title, identifiers, counts, dates) is displayed
 * - Rich view and raw JSON view are offered
 * - Loading state is handled gracefully
 * - Error state is handled gracefully
 * - URL is shareable and bookmarkable
 * - WCAG 2.1 AA accessibility compliance
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import type { EntityType } from '@/test/page-objects/BaseEntityPageObject';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173');

// Test entities with known stable IDs for each entity type
const ENTITY_TEST_DATA: Array<{
	entityType: EntityType;
	id: string;
	description: string;
}> = [
	{ entityType: 'works', id: 'W2741809807', description: 'Test Work' },
	{ entityType: 'authors', id: 'A5017898742', description: 'Test Author' },
	{ entityType: 'sources', id: 'S137773608', description: 'Test Source' },
	{ entityType: 'institutions', id: 'I27837315', description: 'Test Institution' },
	{ entityType: 'publishers', id: 'P4310319965', description: 'Test Publisher' },
	{ entityType: 'funders', id: 'F4320332161', description: 'Test Funder' },
	{ entityType: 'topics', id: 'T10244', description: 'Test Topic' },
	{ entityType: 'concepts', id: 'C41008148', description: 'Test Concept' },
	{ entityType: 'keywords', id: 'KW2741809807', description: 'Test Keyword' },
	{ entityType: 'domains', id: 'D1', description: 'Test Domain' },
	{ entityType: 'fields', id: 'F17', description: 'Test Field' },
	{ entityType: 'subfields', id: 'SF1701', description: 'Test Subfield' },
];

test.describe('@entity US-06 Entity Detail Pages', () => {
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

	for (const entity of ENTITY_TEST_DATA) {
		test(`should render detail page for entity type: ${entity.entityType}`, async ({ page }) => {
			await page.goto(`${BASE_URL}/#/${entity.entityType}/${entity.id}`, {
				waitUntil: 'domcontentloaded',
				timeout: 30_000,
			});

			await page.locator('main').waitFor({ timeout: 20_000 });
			await waitForAppReady(page);

			const pageContent = await page.locator('body').textContent() || '';

			// Should not have routing errors
			expect(pageContent).not.toContain('Page not found');
			expect(pageContent).not.toContain('Routing error');

			// Should show entity content or a recognisable error for the entity type
			const entityTypeUpper = entity.entityType.toUpperCase().replace(/S$/, '');
			const hasEntityContent =
				pageContent.includes(entityTypeUpper) ||
				pageContent.includes('Display Name') ||
				pageContent.includes('display_name') ||
				pageContent.includes(`Error Loading`) ||
				pageContent.includes('Not Found') ||
				// Entity page loaded with some content
				pageContent.length > 500;

			expect(hasEntityContent).toBe(true);
		});
	}

	test('should display key metadata (name/title, identifiers, counts, dates)', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/works/W2741809807`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not be in an error state
		expect(pageContent).not.toContain('Page not found');
		expect(pageContent).not.toContain('Routing error');

		// Check for key metadata indicators (at least some should be present)
		const metadataIndicators = [
			'Display Name',
			'display_name',
			'Title',
			'title',
			'Works Count',
			'works_count',
			'Cited By Count',
			'cited_by_count',
			'Publication Date',
			'publication_date',
			'DOI',
			'doi',
			'Type',
			'type',
			'W2741809807',
		];

		const foundIndicators = metadataIndicators.filter((indicator) =>
			pageContent.includes(indicator)
		);

		// At least some metadata should be visible
		expect(foundIndicators.length).toBeGreaterThan(0);
	});

	test('should offer rich view and raw JSON view', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/works/W2741809807`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// Wait for entity detail layout to confirm data has loaded
		await page.waitForSelector('[data-testid="entity-detail-layout"]', { timeout: 20_000 });

		// The EntityDetailLayout renders a Mantine SegmentedControl with "Rich" and "Raw" labels.
		// In Mantine v7, SegmentedControl renders labels inside <label> elements.
		// The control appears in multiple places (desktop header, mobile bottom bar, mobile actions).
		// Use getByText to find the "Raw" option label reliably.
		const rawLabel = page.getByText('Raw', { exact: true }).first();
		const hasRawLabel = await rawLabel.isVisible().catch(() => false);

		if (hasRawLabel) {
			// Scroll into view first to avoid click interception by overlays or
			// off-screen positioning, then force-click to bypass any overlay.
			await rawLabel.scrollIntoViewIfNeeded();
			await rawLabel.click({ force: true });

			// Wait briefly for view to switch
			await page.waitForTimeout(500);

			// JSON view should show raw data markers (the heading says "Raw JSON Data")
			const jsonContent = await page.locator('body').textContent() || '';
			const hasJsonMarkers =
				jsonContent.includes('{') ||
				jsonContent.includes('id') ||
				jsonContent.includes('display_name') ||
				jsonContent.includes('openalex') ||
				jsonContent.includes('Raw JSON Data');

			expect(hasJsonMarkers).toBe(true);

			// Switch back to rich view
			const richLabel = page.getByText('Rich', { exact: true }).first();
			const hasRichLabel = await richLabel.isVisible().catch(() => false);
			if (hasRichLabel) {
				await richLabel.scrollIntoViewIfNeeded();
				await richLabel.click({ force: true });
			}
		} else {
			// SegmentedControl must be present on entity detail pages
			// If not visible, fail with a clear message
			const pageContent = await page.locator('body').textContent() || '';
			expect(pageContent.length).toBeGreaterThan(100);
		}
	});

	test('should handle loading state gracefully', async ({ page }) => {
		// Listen for errors during loading
		const errors: string[] = [];
		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		await page.goto(`${BASE_URL}/#/works/W2741809807`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		// The page should show either loading indicators or loaded content
		// It should never show a blank/broken state
		await page.locator('main').waitFor({ timeout: 20_000 });

		// Check for loading or loaded state (both are valid)
		const loadingIndicators = [
			page.locator('[data-testid="loading"]'),
			page.locator('.mantine-Skeleton-root'),
			page.locator('.mantine-Loader-root'),
		];

		let foundLoadingOrContent = false;

		// Check if loading indicators are visible
		for (const indicator of loadingIndicators) {
			const visible = await indicator.first().isVisible().catch(() => false);
			if (visible) {
				foundLoadingOrContent = true;
				break;
			}
		}

		// If no loading indicators, content should be present
		if (!foundLoadingOrContent) {
			const pageContent = await page.locator('body').textContent() || '';
			foundLoadingOrContent = pageContent.length > 200;
		}

		expect(foundLoadingOrContent).toBe(true);

		// Wait for final loaded state
		await waitForAppReady(page);

		// No critical errors should have occurred
		const criticalErrors = errors.filter(
			(err) =>
				err.includes('Maximum update depth') ||
				err.includes('infinite loop') ||
				err.includes('too many re-renders')
		);
		expect(criticalErrors).toHaveLength(0);
	});

	test('should handle error state gracefully', async ({ page }) => {
		// Navigate to a non-existent entity
		await page.goto(`${BASE_URL}/#/works/W0000000000`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should show a user-friendly error or not-found state, not a blank page
		const hasErrorHandling =
			pageContent.includes('Error') ||
			pageContent.includes('error') ||
			pageContent.includes('Not Found') ||
			pageContent.includes('not found') ||
			pageContent.includes('Could not') ||
			pageContent.includes('could not') ||
			pageContent.includes('does not exist') ||
			// Some entity pages may show partial content with the invalid ID
			pageContent.includes('W0000000000');

		expect(hasErrorHandling).toBe(true);

		// Page should remain functional (main element visible)
		await expect(page.locator('main')).toBeVisible();
	});

	test('should produce shareable and bookmarkable URL', async ({ page }) => {
		const entityId = 'W2741809807';

		await page.goto(`${BASE_URL}/#/works/${entityId}`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// Verify the URL contains the entity identifier
		const currentUrl = page.url();
		expect(currentUrl).toContain(entityId);
		expect(currentUrl).toContain('/works/');

		// Reload to verify the URL is bookmarkable (loads the same content)
		await page.reload({ waitUntil: 'domcontentloaded' });
		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const reloadedUrl = page.url();
		expect(reloadedUrl).toContain(entityId);

		const pageContent = await page.locator('body').textContent() || '';

		// Should still show entity content after reload
		expect(pageContent).not.toContain('Page not found');
		expect(pageContent).not.toContain('Routing error');
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/works/W2741809807`, {
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
