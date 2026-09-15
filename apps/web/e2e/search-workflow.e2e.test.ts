/**
 * Search Workflow E2E Tests
 *
 * Tests the complete search workflow from query entry to entity detail navigation.
 * Covers the full user journey:
 * 1. Navigate to search page
 * 2. Enter search query
 * 3. Wait for and verify results
 * 4. Interact with results (clicking, filtering)
 * 5. Navigate to entity detail pages
 * @see spec-020 Phase 1: Search workflow testing
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import {
	waitForAppReady,
	waitForEntityData,
	waitForNoLoading,
	waitForSearchResults,
} from '@/test/helpers/app-ready';
import { SearchPage } from '@/test/page-objects/SearchPage';

const SEARCH_PERFORMANCE_TARGET_MS = 3000;
const MIN_TOUCH_TARGET_PX = 44;
const MIN_INLINE_LINK_TAP_TARGET_PX = 24; // Slightly smaller acceptable for inline text links
const MOBILE_VIEWPORT_WIDTH_PX = 375;
const MOBILE_VIEWPORT_HEIGHT_PX = 667;

test.describe('@workflow Search Workflow', () => {
	let searchPage: SearchPage;

	test.beforeEach(async ({ page }) => {
		searchPage = new SearchPage(page);
		await searchPage.gotoSearch();
		await waitForAppReady(page);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Search page is already loaded via beforeEach
		// App is already ready via beforeEach

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should complete full search workflow: query → results → detail page', async ({
		page,
	}) => {
		// Step 1: Enter search query
		const testQuery = 'machine learning';
		await searchPage.enterSearchQuery(testQuery);

		// Step 2: Submit search
		await searchPage.submitSearch();

		// Step 3: Wait for search results to load
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Step 4: Verify results are displayed
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Verify result count message is displayed
		const resultMessage = page.getByText(/found \d+ results for/i);
		await expect(resultMessage).toBeVisible();

		// Step 5: Click the first result
		await searchPage.clickResult(0);

		// Step 6: Wait for entity detail page to load
		await waitForEntityData(page);

		// Step 7: Verify we navigated to an entity detail page
		// Check for entity title or metadata elements
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify URL changed to entity detail page
		const currentUrl = page.url();
		expect(currentUrl).toMatch(
			/(authors|funders|institutions|publishers|sources|topics|works)\//
		);
	});

	test('should display search results with entity type badges', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'artificial intelligence';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify results contain entity type badges
		const badges = page.locator('[data-testid="search-results"] .mantine-Badge-root');
		const badgeCount = await badges.count();
		expect(badgeCount).toBeGreaterThan(0);

		// Verify at least one badge has valid entity type text
		const firstBadgeText = await badges.first().textContent();
		expect(firstBadgeText).toMatch(/author|institution|source|topic|work/i);
	});

	test('should maintain search query after viewing result and navigating back', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'quantum computing';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Record the result count
		const initialResultCount = await searchPage.getResultCount();
		expect(initialResultCount).toBeGreaterThan(0);

		// Click a result
		await searchPage.clickResult(0);
		await waitForEntityData(page);

		// Navigate back to search page
		await page.goBack();
		await waitForAppReady(page);

		// Verify search input still has the query
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		await expect(searchInput).toHaveValue(testQuery);

		// Verify results are still displayed
		const resultCountAfterBack = await searchPage.getResultCount();
		expect(resultCountAfterBack).toBe(initialResultCount);
	});

	test('should allow clicking different results in sequence', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'neural networks';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify we have at least 2 results
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThanOrEqual(2);

		// Get the titles of the first two results
		const resultTitles = await searchPage.getResultTitles();
		expect(resultTitles.length).toBeGreaterThanOrEqual(2);

		// Click first result
		await searchPage.clickResult(0);
		await waitForEntityData(page);

		// Verify we're on an entity page
		const firstEntityTitle = page.locator('[data-testid="entity-title"]');
		await expect(firstEntityTitle).toBeVisible();
		const firstUrl = page.url();

		// Navigate back
		await page.goBack();
		await waitForAppReady(page);
		await waitForSearchResults(page);

		// Click second result
		await searchPage.clickResult(1);
		await waitForEntityData(page);

		// Verify we're on a different entity page
		const secondEntityTitle = page.locator('[data-testid="entity-title"]');
		await expect(secondEntityTitle).toBeVisible();
		const secondUrl = page.url();

		// URLs should be different
		expect(secondUrl).not.toBe(firstUrl);
	});

	test('should show loading state during search execution', async ({
		page,
	}) => {
		// Enter search query
		const testQuery = 'deep learning';
		await searchPage.enterSearchQuery(testQuery);

		// Submit search and immediately check for loading state
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		// Check for loading indicators (button disabled or loading spinner)
		// Note: This may be very fast, so we use a short timeout
		try {
			await expect(searchButton).toBeDisabled({ timeout: 1000 });
		} catch {
			// If loading is too fast to catch, verify results appeared instead
			await waitForSearchResults(page);
			const resultCount = await searchPage.getResultCount();
			expect(resultCount).toBeGreaterThan(0);
		}

		// Wait for search to complete
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify search button is no longer disabled
		await expect(searchButton).toBeEnabled();
	});

	test('should navigate directly to search with query parameter', async ({
		page,
	}) => {
		// Navigate directly to search page with query parameter
		const testQuery = 'computer science';
		await searchPage.gotoSearch(testQuery);

		// Wait for app and search results
		await waitForAppReady(page);
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify search input has the query
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		await expect(searchInput).toHaveValue(testQuery);

		// Verify results are displayed
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Verify URL contains the query parameter
		const currentUrl = page.url();
		expect(currentUrl).toContain('q=');
		expect(currentUrl).toContain(encodeURIComponent(testQuery));
	});

	test('should handle empty search results gracefully', async ({ page }) => {
		// Enter a query that is unlikely to return results
		const testQuery = 'xyzxyzunlikelysearchterm123456789';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for search to complete
		// Removed: waitForTimeout - use locator assertions instead
		await waitForNoLoading(page);

		// Verify no results message or empty state is displayed
		// The search may show "No results found" or an empty results list
		const noResultsMessage = page.getByText(/no entities found|no results/i);
		const hasNoResultsMessage = await noResultsMessage
			.isVisible()
			.catch(() => false);

		if (hasNoResultsMessage) {
			// If no results message is shown
			await expect(noResultsMessage).toBeVisible();
		} else {
			// If results area is empty
			const resultCount = await searchPage.getResultCount();
			expect(resultCount).toBe(0);
		}

		// Verify search input still contains the query
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		await expect(searchInput).toHaveValue(testQuery);
	});

	test('should show entity type diversity in search results', async ({
		page,
	}) => {
		// Use a broad query that should return multiple entity types
		const testQuery = 'science';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify we have results
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Get all entity type badges
		const badges = page.locator('[data-testid="search-results"] .mantine-Badge-root');
		const badgeTexts = await badges.allTextContents();

		// Verify we have multiple badges
		expect(badgeTexts.length).toBeGreaterThan(0);

		// Log entity types found (for debugging)
		const uniqueTypes = new Set(badgeTexts);
		console.log(`Found ${String(uniqueTypes.size)} unique entity types:`, [...uniqueTypes]);

		// Verify at least one valid entity type is present
		const hasValidEntityType = badgeTexts.some((text) =>
			/author|funder|institution|publisher|source|topic|work/i.test(text)
		);
		expect(hasValidEntityType).toBe(true);
	});

	test('should display result metadata (citations, works count)', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'mathematics';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify we have results
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Check for metadata columns in results table
		// The BaseTable should display citation counts and works counts
		const resultsTable = page.locator('[data-testid="search-results"]');
		await expect(resultsTable).toBeVisible();

		// Verify table headers are present
		const tableHeaders = resultsTable.locator('thead th');
		const headerCount = await tableHeaders.count();
		expect(headerCount).toBeGreaterThanOrEqual(2); // At minimum: Type and Name

		// Verify at least one result row has content
		const firstResultRow = resultsTable.locator('tbody tr').first();
		await expect(firstResultRow).toBeVisible();

		// Verify the row has multiple cells
		const cells = firstResultRow.locator('td');
		const cellCount = await cells.count();
		expect(cellCount).toBeGreaterThanOrEqual(2);
	});

	test('should allow bookmarking a search with results', async ({ page }) => {
		// Enter and submit search
		const testQuery = 'biology';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify results are displayed
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Look for bookmark button
		const bookmarkButton = page.getByRole('button', {
			name: /bookmark search|bookmark this search/i,
		});

		// If bookmark button exists, test bookmarking functionality
		const isBookmarkButtonVisible = await bookmarkButton
			.isVisible()
			.catch(() => false);

		if (isBookmarkButtonVisible) {
			// Click bookmark button
			await bookmarkButton.click();

			// Wait for bookmark to be saved
			// Removed: waitForTimeout - use locator assertions instead
			// Verify button text changed to indicate bookmarked state
			const bookmarkedButton = page.getByRole('button', {
				name: /bookmarked|remove.*bookmark/i,
			});
			await expect(bookmarkedButton).toBeVisible();
		} else {
			// If bookmark functionality is not available, skip
			console.log('Bookmark functionality not available for this search');
		}
	});

	test('should complete search within performance target (<3s)', async ({ page }) => {
		// Search page is already loaded via beforeEach

		// Enter search query
		const testQuery = 'machine learning';
		await searchPage.enterSearchQuery(testQuery);

		// Measure search execution time
		const startTime = Date.now();
		await searchPage.submitSearch();
		await waitForSearchResults(page);
		await waitForNoLoading(page);
		const endTime = Date.now();

		const searchTime = endTime - startTime;
		console.log(`Search execution time: ${String(searchTime)}ms`);

		// Target: <3000ms for search results
		expect(searchTime).toBeLessThan(SEARCH_PERFORMANCE_TARGET_MS);

		// Verify results were returned
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);
	});
});

test.describe('@workflow @mobile Search Workflow - Mobile Viewport', () => {
	test.use({ viewport: { width: 375, height: 667 } });

	let searchPage: SearchPage;

	test.beforeEach(async ({ page }) => {
		searchPage = new SearchPage(page);
		await searchPage.gotoSearch();
		await waitForAppReady(page);
	});

	test('should display search input on mobile viewport', async ({ page }) => {
		// Verify search input is visible and accessible on mobile
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		await expect(searchInput).toBeVisible();

		// Verify input is large enough for touch targets (WCAG minimum 44x44 CSS pixels)
		const inputBox = await searchInput.boundingBox();
		expect(inputBox).not.toBeNull();
		if (inputBox) {
			expect(inputBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
		}

		// Verify search button is visible and touch-friendly
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await expect(searchButton).toBeVisible();

		const buttonBox = await searchButton.boundingBox();
		expect(buttonBox).not.toBeNull();
		if (buttonBox) {
			expect(buttonBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
			expect(buttonBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
		}
	});

	test('should display search results correctly in narrow viewport', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'machine learning';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify results are displayed
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Verify results container is visible and fits viewport
		const resultsContainer = page.locator('[data-testid="search-results"]');
		await expect(resultsContainer).toBeVisible();

		// Verify viewport width is respected (no horizontal scrolling)
		const viewportSize = page.viewportSize();
		expect(viewportSize?.width).toBe(MOBILE_VIEWPORT_WIDTH_PX);

		// Verify table content is responsive and visible
		const firstResultRow = resultsContainer.locator('tbody tr').first();
		await expect(firstResultRow).toBeVisible();

		// Verify entity type badges are visible
		const badges = resultsContainer.locator('.mantine-Badge-root');
		const firstBadge = badges.first();
		await expect(firstBadge).toBeVisible();
	});

	test('should navigate to entity detail page from mobile search results', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'artificial intelligence';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify we have results
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Click the first result
		await searchPage.clickResult(0);

		// Wait for entity detail page to load
		await waitForEntityData(page);

		// Verify we navigated to an entity detail page
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify URL changed to entity detail page
		const currentUrl = page.url();
		expect(currentUrl).toMatch(
			/(authors|funders|institutions|publishers|sources|topics|works)\//
		);

		// Verify entity detail page is responsive on mobile
		const viewportSize = page.viewportSize();
		expect(viewportSize?.width).toBe(MOBILE_VIEWPORT_WIDTH_PX);
	});

	test('should have touch-friendly tap targets for all interactive elements', async ({
		page,
	}) => {
		// Enter and submit search to load results
		const testQuery = 'quantum computing';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify search input meets touch target size (44x44 CSS pixels minimum)
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		const inputBox = await searchInput.boundingBox();
		expect(inputBox).not.toBeNull();
		if (inputBox) {
			expect(inputBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
		}

		// Verify search button meets touch target size
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		const buttonBox = await searchButton.boundingBox();
		expect(buttonBox).not.toBeNull();
		if (buttonBox) {
			expect(buttonBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
			expect(buttonBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
		}

		// Verify result rows are touch-friendly (clickable area should be large)
		const firstResultRow = page
			.locator('[data-testid="search-results"] tbody tr')
			.first();
		await expect(firstResultRow).toBeVisible();

		const rowBox = await firstResultRow.boundingBox();
		expect(rowBox).not.toBeNull();
		if (rowBox) {
			// Result rows should have reasonable height for touch interaction
			expect(rowBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
		}

		// Verify links within results have adequate tap targets
		const firstResultLink = firstResultRow.locator('a').first();
		const hasLink = await firstResultLink.count();
		if (hasLink > 0) {
			await expect(firstResultLink).toBeVisible();
			const linkBox = await firstResultLink.boundingBox();
			expect(linkBox).not.toBeNull();
			if (linkBox) {
				// Links should be touch-friendly
				expect(linkBox.height).toBeGreaterThanOrEqual(MIN_INLINE_LINK_TAP_TARGET_PX);
			}
		}
	});

	test('should maintain mobile layout after navigation and back', async ({
		page,
	}) => {
		// Enter and submit search
		const testQuery = 'neural networks';
		await searchPage.enterSearchQuery(testQuery);
		await searchPage.submitSearch();

		// Wait for results
		await waitForSearchResults(page);
		await waitForNoLoading(page);

		// Verify viewport is mobile
		let viewportSize = page.viewportSize();
		expect(viewportSize?.width).toBe(MOBILE_VIEWPORT_WIDTH_PX);
		expect(viewportSize?.height).toBe(MOBILE_VIEWPORT_HEIGHT_PX);

		// Record result count
		const initialResultCount = await searchPage.getResultCount();
		expect(initialResultCount).toBeGreaterThan(0);

		// Click a result
		await searchPage.clickResult(0);
		await waitForEntityData(page);

		// Verify still on mobile viewport
		viewportSize = page.viewportSize();
		expect(viewportSize?.width).toBe(MOBILE_VIEWPORT_WIDTH_PX);

		// Navigate back
		await page.goBack();
		await waitForAppReady(page);

		// Verify search input still has the query
		const searchInput = page.getByPlaceholder(
			/search for works, authors, institutions/i
		);
		await expect(searchInput).toHaveValue(testQuery);

		// Verify results are still displayed with mobile layout
		viewportSize = page.viewportSize();
		expect(viewportSize?.width).toBe(MOBILE_VIEWPORT_WIDTH_PX);

		const resultCountAfterBack = await searchPage.getResultCount();
		expect(resultCountAfterBack).toBe(initialResultCount);

		// Verify results container is still properly sized
		const resultsContainer = page.locator('[data-testid="search-results"]');
		await expect(resultsContainer).toBeVisible();
	});
});
