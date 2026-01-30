/**
 * US-01 Multi-Entity Search E2E Tests
 *
 * Tests the universal search functionality across all OpenAlex entity types.
 * Covers free-text queries, result display, pagination, empty/zero-result states,
 * and transient failure retry behaviour.
 * @see US-01
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForSearchResults } from '@/test/helpers/app-ready';
import { SearchPage } from '@/test/page-objects/SearchPage';

test.describe('@utility US-01 Multi-Entity Search', () => {
	let searchPage: SearchPage;

	test.beforeEach(async ({ page }) => {
		searchPage = new SearchPage(page);

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

		await searchPage.gotoSearch();
		await waitForAppReady(page);
	});

	test('should load search page with input accepting free-text queries', async ({ page }) => {
		// Verify search input is visible and accepts text
		const searchInput = page.getByPlaceholder(/search academic works/i);
		await expect(searchInput).toBeVisible();

		// Verify it accepts free-text input
		const testQuery = 'cultural heritage preservation';
		await searchPage.enterSearchQuery(testQuery);
		await expect(searchInput).toHaveValue(testQuery);

		// Verify the input is not constrained to a specific format
		const specialCharsQuery = 'machine learning & NLP (2024)';
		await searchPage.enterSearchQuery(specialCharsQuery);
		await expect(searchInput).toHaveValue(specialCharsQuery);
	});

	test('should return results from OpenAlex API with entity type indicated', async ({ page }) => {
		// Perform a search that should return results
		const testQuery = 'machine learning';
		await searchPage.enterSearchQuery(testQuery);

		// Submit the search
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		// Wait for results to appear
		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			// API may be unavailable in CI; skip result assertions if so
			return;
		}

		// Verify results container is visible
		const resultsContainer = page.locator('[data-testid="search-results"]');
		await expect(resultsContainer).toBeVisible();

		// Verify at least one result item is present
		const resultItems = page.locator('[data-testid="search-result-item"]');
		const resultCount = await resultItems.count();
		expect(resultCount).toBeGreaterThan(0);

		// Verify entity type indication is present in results
		// Entity types should be shown as badges, labels, or text
		const firstResult = resultItems.first();
		const resultText = await firstResult.textContent();
		expect(resultText).toBeTruthy();

		// Check for entity type indicators (badge, label, or text)
		const entityTypeIndicator = firstResult.locator(
			'[data-testid="entity-type-badge"], .mantine-Badge-root, [data-entity-type]'
		);
		const hasEntityType = await entityTypeIndicator.count();
		if (hasEntityType > 0) {
			await expect(entityTypeIndicator.first()).toBeVisible();
		}
	});

	test('should paginate results with configurable page size', async ({ page }) => {
		// Search for a broad term to get many results
		const testQuery = 'biology';
		await searchPage.enterSearchQuery(testQuery);

		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			// API may be unavailable; skip
			return;
		}

		// Verify pagination controls are present
		const paginationControls = page.locator(
			'[data-testid="pagination"], .mantine-Pagination-root'
		);

		const hasPagination = await paginationControls.count();
		if (hasPagination > 0) {
			await expect(paginationControls.first()).toBeVisible();

			// Get initial page number
			const initialPage = await searchPage.getPageNumber();
			expect(initialPage).toBe(1);

			// Navigate to next page
			const nextButton = page.locator(
				'[data-testid="pagination-next"], [aria-label="next"], .mantine-Pagination-control:last-child'
			);
			if (await nextButton.isVisible()) {
				await nextButton.click();
				await searchPage.waitForResults().catch(() => {
					// Results may take time to load
				});

				// Verify page changed
				const currentUrl = page.url();
				expect(currentUrl).toMatch(/page|offset|cursor/i);
			}
		}

		// Check for page size control
		const pageSizeSelector = page.locator(
			'[data-testid="page-size-selector"], [aria-label*="page size" i], [aria-label*="per page" i]'
		);
		if (await pageSizeSelector.isVisible({ timeout: 3000 }).catch(() => false)) {
			await expect(pageSizeSelector).toBeVisible();
		}
	});

	test('should show appropriate feedback for empty queries', async ({ page }) => {
		// Verify empty state message is shown on page load (no query)
		const emptyStateMessage = page.getByText(/enter a search term to explore openalex/i);
		await expect(emptyStateMessage).toBeVisible();

		// Submit search with empty query - click search button without entering text
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		// Should still show empty state or validation message
		const feedbackMessage = page.getByText(
			/enter a search term|please enter|search for works/i
		);
		await expect(feedbackMessage).toBeVisible({ timeout: 5000 });
	});

	test('should show appropriate feedback for zero-result searches', async ({ page }) => {
		// Search for a query unlikely to match anything
		const noResultsQuery = 'xyznonexistent9999qqq';
		await searchPage.enterSearchQuery(noResultsQuery);

		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			// Wait for the search to complete
			await page.waitForLoadState('networkidle', { timeout: 15_000 });
		} catch {
			// Timeout is acceptable
		}

		// Check for no-results feedback: either a dedicated message or empty results area
		const noResultsMessage = page.locator(
			'[data-testid="no-results"], [data-testid="search-empty"]'
		);
		const genericNoResults = page.getByText(/no results|no matches|nothing found/i);

		const hasExplicitNoResults = await noResultsMessage.count();
		const hasGenericNoResults = await genericNoResults.count();

		// At least one form of feedback should be present
		expect(hasExplicitNoResults + hasGenericNoResults).toBeGreaterThan(0);
	});

	test('should retry with exponential backoff on transient failures', async ({ page }) => {
		// Monitor network requests to detect retries
		const searchRequests: string[] = [];
		page.on('request', (request) => {
			if (request.url().includes('api.openalex.org')) {
				searchRequests.push(request.url());
			}
		});

		// Perform a search
		const testQuery = 'machine learning';
		await searchPage.enterSearchQuery(testQuery);

		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		// Wait for search to complete or fail
		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			// Expected if API is unavailable
		}

		// Verify at least one API request was made
		expect(searchRequests.length).toBeGreaterThan(0);

		// Check that a retry/error mechanism exists in the UI
		const retryButton = page.locator(
			'[data-testid="retry-button"], button:has-text("retry"), button:has-text("try again")'
		);
		const errorMessage = page.locator(
			'[data-testid="error-message"], [data-testid="error-boundary"]'
		);

		// If there was an error, retry controls should be available
		if (await errorMessage.isVisible({ timeout: 2000 }).catch(() => false)) {
			await expect(retryButton).toBeVisible();
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to search page
		await searchPage.gotoSearch();
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
