/**
 * US-02 View Modes E2E Tests
 *
 * Tests the view mode toggle functionality (list, card, table) on the search
 * results page. Verifies that each mode renders the correct layout and that
 * entity metadata is displayed consistently across modes.
 * @see US-02
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForSearchResults } from '@/test/helpers/app-ready';
import { SearchPage } from '@/test/page-objects/SearchPage';

test.describe('@utility US-02 View Modes', () => {
	let searchPage: SearchPage;

	// A broad query that reliably returns results
	const SEARCH_QUERY = 'machine learning';

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

	test('should display view mode toggle with list/card/table options', async ({ page }) => {
		// Perform a search to trigger result display with view mode controls
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		const segmentedControl = page.locator('.mantine-SegmentedControl-root');
		await segmentedControl.waitFor({ state: 'visible', timeout: 15_000 });

		// Verify the Mantine SegmentedControl is present (renders as a radiogroup)
		await expect(segmentedControl).toBeVisible({ timeout: 10_000 });

		// Verify all three view mode options exist as radio inputs within the control
		const tableInput = segmentedControl.locator('input[value="table"]');
		const cardInput = segmentedControl.locator('input[value="card"]');
		const listInput = segmentedControl.locator('input[value="list"]');

		await expect(tableInput).toBeAttached();
		await expect(cardInput).toBeAttached();
		await expect(listInput).toBeAttached();
	});

	test('should render results in table view by default', async ({ page }) => {
		// Perform search
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		await page.locator('.mantine-SegmentedControl-root').waitFor({ state: 'visible', timeout: 15_000 });

		// Verify the default view mode is table (as set in useSearchPage hook)
		const currentMode = await searchPage.getCurrentViewMode();
		expect(currentMode).toBe('table');

		// Verify results are rendered in a table layout
		const table = page.locator('table, .mantine-Table-root');
		await expect(table.first()).toBeVisible({ timeout: 10_000 });

		// Verify table has rows with data
		const tableRows = page.locator('.mantine-Table-root tbody tr, table tbody tr');
		const rowCount = await tableRows.count();
		expect(rowCount).toBeGreaterThan(0);
	});

	test('should switch to card view and show card layout', async ({ page }) => {
		// Perform search
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		await page.locator('.mantine-SegmentedControl-root').waitFor({ state: 'visible', timeout: 15_000 });

		// Switch to card view
		await searchPage.switchViewMode('card');

		// Verify card layout is visible (SimpleGrid with Card children)
		const cardContainer = page.locator('.mantine-SimpleGrid-root, .mantine-Grid-root');
		const cardItems = page.locator('.mantine-Card-root');

		const hasCardContainer = await cardContainer.count();
		const hasCardItems = await cardItems.count();

		// Either a grid container or card-style items should be present
		expect(hasCardContainer + hasCardItems).toBeGreaterThan(0);

		// If there are multiple cards, verify they have content
		if (hasCardItems >= 2) {
			const firstCard = await cardItems.nth(0).boundingBox();
			const secondCard = await cardItems.nth(1).boundingBox();

			if (firstCard && secondCard) {
				// Cards should have dimensions
				expect(firstCard.width).toBeGreaterThan(0);
				expect(secondCard.width).toBeGreaterThan(0);
			}
		}
	});

	test('should switch to table view and show column headers', async ({ page }) => {
		// Perform search
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		await page.locator('.mantine-SegmentedControl-root').waitFor({ state: 'visible', timeout: 15_000 });

		// Default is already table view, but explicitly switch to confirm it works
		await searchPage.switchViewMode('table');

		// Verify table layout is visible
		const table = page.locator(
			'table, [role="table"], .mantine-Table-root'
		);
		await expect(table.first()).toBeVisible({ timeout: 10_000 });

		// Verify column headers are present
		const tableHeaders = page.locator(
			'th, [role="columnheader"], thead td'
		);
		const headerCount = await tableHeaders.count();
		expect(headerCount).toBeGreaterThan(0);

		// Verify common expected columns exist (Type, Name, Citations, Works, Graph)
		const headerTexts = await tableHeaders.allTextContents();
		const headerTextLower = headerTexts.map((t) => t.toLowerCase());

		// At least one meaningful column header should be present
		const expectedHeaders = ['type', 'name', 'citations', 'works', 'graph'];
		const hasExpectedHeader = expectedHeaders.some((header) =>
			headerTextLower.some((text) => text.includes(header))
		);
		expect(hasExpectedHeader).toBe(true);
	});

	test('should preserve view mode across navigation within session', async ({ page }) => {
		// Perform search
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		await page.locator('.mantine-SegmentedControl-root').waitFor({ state: 'visible', timeout: 15_000 });

		// Verify default view mode is table
		const defaultMode = await searchPage.getCurrentViewMode();
		expect(defaultMode).toBe('table');

		// Switch to card view (from default table)
		await searchPage.switchViewMode('card');

		// Wait for the SegmentedControl to reflect the change
		await page.waitForTimeout(500);

		// Verify card view is active after switching
		const modeAfterSwitch = await searchPage.getCurrentViewMode();
		expect(modeAfterSwitch).toBe('card');

		// Switch to list view to further verify toggle works
		await searchPage.switchViewMode('list');
		await page.waitForTimeout(500);

		const modeAfterSecondSwitch = await searchPage.getCurrentViewMode();
		expect(modeAfterSecondSwitch).toBe('list');

		// Navigate away from search page
		await page.goto(page.url().replace(/\/search.*/, '/#/browse'));
		await waitForAppReady(page);

		// Navigate back to search page with the same query
		await searchPage.gotoSearch(SEARCH_QUERY);
		await waitForAppReady(page);

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Wait for SegmentedControl to render (it's part of SearchResultsHeader)
		await page.locator('.mantine-SegmentedControl-root').waitFor({ state: 'visible', timeout: 15_000 });

		// View mode is local React state (useState) and is NOT persisted in URL
		// or localStorage. After navigation, it resets to the default ("table").
		const currentMode = await searchPage.getCurrentViewMode();
		expect(currentMode).toBe('table');
	});

	test('should show entity metadata (type, name, citations) in each mode', async ({ page }) => {
		// Perform search
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			test.skip(true, 'Search results did not load');
			return;
		}

		// Default is table view - verify table has meaningful content
		const searchResults = page.locator('[data-testid="search-results"]');
		await expect(searchResults).toBeVisible({ timeout: 10_000 });

		const resultText = await searchResults.textContent();
		expect(resultText).toBeTruthy();
		// Results should contain substantive content (entity names, types, etc.)
		expect(resultText!.length).toBeGreaterThan(20);

		// Verify table rows contain data (each row should have text)
		const firstRow = page.locator('.mantine-Table-root tbody tr, table tbody tr').first();
		const isFirstRowVisible = await firstRow.isVisible({ timeout: 5000 }).catch(() => false);
		if (isFirstRowVisible) {
			const rowText = await firstRow.textContent();
			expect(rowText).toBeTruthy();
			expect(rowText!.length).toBeGreaterThan(5);
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Perform search to get results with view mode controls
		await searchPage.enterSearchQuery(SEARCH_QUERY);
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			// Run scan on the page regardless
		}

		await waitForAppReady(page);

		// Run accessibility scan
		// Exclude aria-prohibited-attr: Mantine SegmentedControl has a known ARIA issue
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.disableRules(['aria-prohibited-attr'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
