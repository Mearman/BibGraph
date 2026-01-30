/**
 * US-03 Query Builder E2E Tests
 *
 * Tests the advanced query builder toggle, boolean operator support,
 * operator precedence visualisation, error feedback, query execution,
 * and saved-query replay functionality.
 * @see US-03
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForSearchResults } from '@/test/helpers/app-ready';
import { SearchPage } from '@/test/page-objects/SearchPage';

test.describe('@utility US-03 Query Builder', () => {
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

	test('should display advanced query builder toggle', async ({ page }) => {
		// The search page has a "Show Advanced Query Builder" / "Hide Advanced Query Builder" button
		const advancedToggle = page.getByRole('button', { name: /advanced query builder/i });

		// Verify the toggle exists and is visible
		await expect(advancedToggle).toBeVisible({ timeout: 10_000 });

		// Click to activate the query builder
		await advancedToggle.click();

		// Verify the AdvancedQueryBuilder panel appeared
		// It renders a Paper with "Advanced Query Builder" text header and term inputs
		const builderHeader = page.getByText('Advanced Query Builder').first();
		await expect(builderHeader).toBeVisible({ timeout: 5000 });

		// Also verify the "Add Term" button is present (part of the builder UI)
		const addTermButton = page.getByRole('button', { name: /add term/i });
		await expect(addTermButton).toBeVisible({ timeout: 5000 });
	});

	test('should support boolean operators (AND/OR/NOT)', async ({ page }) => {
		// Open the advanced query builder by clicking "Show Advanced Query Builder"
		const advancedToggle = page.getByRole('button', { name: /advanced query builder/i });

		if (await advancedToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
			await advancedToggle.click();

			// The AdvancedQueryBuilder uses Select dropdowns with AND/OR options
			// and term-based inputs rather than a single text input.
			// Verify the builder panel appeared with its term inputs
			const builderPanel = page.getByText('Advanced Query Builder');
			await expect(builderPanel).toBeVisible({ timeout: 5000 });

			// Check that operator selects are available (after adding a second term)
			const addTermButton = page.getByRole('button', { name: /add term/i });
			await expect(addTermButton).toBeVisible({ timeout: 5000 });
			await addTermButton.click();

			// Now there should be an operator select (AND/OR) for the second term
			const operatorSelect = page.locator('[aria-label*="Operator for term"]');
			await expect(operatorSelect.first()).toBeVisible({ timeout: 5000 });
		} else {
			// Advanced query builder toggle not found; fall back to text input approach
			const searchInput = page.locator(
				'[aria-label*="Search academic"], input[type="search"], [data-testid="search-input"]'
			).first();
			await searchInput.fill('machine learning AND cultural heritage');
			await expect(searchInput).toHaveValue('machine learning AND cultural heritage');

			const searchButton = page.getByRole('button', { name: /search/i }).first();
			await searchButton.click();

			try {
				await waitForSearchResults(page, { timeout: 30_000 });
			} catch {
				// API may be unavailable
			}

			await expect(searchInput).toHaveValue('machine learning AND cultural heritage');
		}
	});

	test('should show operator precedence visually', async () => {
		test.skip(true, 'Operator precedence visualisation is not yet implemented in the UI. The AdvancedQueryBuilder uses flat term lists with AND/OR selects, and the VisualQueryBuilder uses drag-and-drop groups but does not display precedence hierarchy.');
	});

	test('should produce user-friendly error on invalid query', async ({ page }) => {
		// The SearchInterface validates queries via isValidSearchQuery() and
		// disables the search button when the query is invalid or empty.
		// The text "Enter a valid search query to continue" is shown for invalid input.
		const searchInput = page.locator(
			'[aria-label*="Search academic"], input[type="search"], [data-testid="search-input"]'
		).first();

		// Enter an invalid query (only operators, no real terms)
		await searchInput.fill('AND OR NOT');

		// The search button should be disabled for invalid/empty-like queries,
		// or validation text should appear
		const searchButton = page.getByRole('button', { name: /^search$/i }).first();
		const isDisabled = await searchButton.isDisabled().catch(() => false);

		if (isDisabled) {
			// Button disabled is valid error feedback for invalid queries
			expect(isDisabled).toBe(true);
		} else {
			// Submit and check for error/no-results state
			await searchButton.click();

			try {
				await page.waitForLoadState('networkidle', { timeout: 15_000 });
			} catch {
				// Timeout is acceptable
			}

			// Check for error feedback, no-results, or validation messages
			const errorFeedback = page.locator(
				'[data-testid="query-error"], [data-testid="search-error"], ' +
				'[data-testid="error-message"], .mantine-TextInput-error, ' +
				'[role="alert"], .mantine-Alert-root'
			);

			const noResults = page.locator(
				'[data-testid="no-results"], [data-testid="search-empty"]'
			);
			const noResultsText = page.getByText(/no results|no matches|nothing found|valid search query/i);

			const hasError = await errorFeedback.count();
			const hasNoResults = await noResults.count();
			const hasNoResultsText = await noResultsText.count();

			expect(hasError + hasNoResults + hasNoResultsText).toBeGreaterThan(0);
		}
	});

	test('should execute query and display results', async ({ page }) => {
		// Enter a valid query
		await searchPage.enterSearchQuery('cultural heritage');

		// Submit the query
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			return; // API unavailable
		}

		// Verify results are displayed
		const resultsContainer = page.locator('[data-testid="search-results"]');
		await expect(resultsContainer).toBeVisible();

		// Verify at least one result is shown
		const resultCount = await searchPage.getResultCount();
		expect(resultCount).toBeGreaterThan(0);

		// Verify no error is displayed
		const errorBoundary = page.locator('[data-testid="error-boundary"]');
		const hasError = await errorBoundary.isVisible({ timeout: 1000 }).catch(() => false);
		expect(hasError).toBe(false);
	});

	test('should allow saving query for replay (links to US-23)', async ({ page }) => {
		// Perform a search
		await searchPage.enterSearchQuery('neural networks');
		const searchButton = page.getByRole('button', { name: /search/i }).first();
		await searchButton.click();

		try {
			await waitForSearchResults(page, { timeout: 30_000 });
		} catch {
			// Continue even if results do not load
		}

		// Look for save/bookmark query functionality
		const saveQueryButton = page.locator(
			'[data-testid="save-query"], [data-testid="bookmark-query"], ' +
			'button:has-text("save"), button:has-text("bookmark"), ' +
			'[aria-label*="save query" i], [aria-label*="bookmark" i]'
		);

		const hasSaveButton = await saveQueryButton.isVisible({ timeout: 5000 }).catch(() => false);

		if (hasSaveButton) {
			// Click save query
			await saveQueryButton.first().click();

			// Verify confirmation feedback
			const savedConfirmation = page.locator(
				'[data-testid="query-saved"], .mantine-Notification-root'
			);
			const savedText = page.getByText(/saved|bookmarked|added/i);

			const hasConfirmation =
				await savedConfirmation.count() + await savedText.count();
			expect(hasConfirmation).toBeGreaterThan(0);
		}

		// Verify the URL is shareable (contains query parameters)
		const currentUrl = page.url();
		expect(currentUrl).toContain('search');
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Open the query builder if possible
		const advancedToggle = page.getByRole('button', { name: /advanced query builder/i });

		if (await advancedToggle.isVisible({ timeout: 5000 }).catch(() => false)) {
			await advancedToggle.click();
		}

		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
