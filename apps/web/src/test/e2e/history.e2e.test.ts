/**
 * E2E tests for History/Catalogue utility page
 * Tests history page functionality including empty state and populated state
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { BaseSPAPageObject } from '@/test/page-objects/BaseSPAPageObject';

test.describe('@utility History Page', () => {
	const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
	const BASE_URL = IS_CI ? 'http://localhost:4173' : 'http://localhost:5173';
	const FILTER_APPLY_WAIT_MS = 500;

	// Test entities to visit for populating history
	const TEST_ENTITIES = [
		{ type: 'authors', id: 'A5017898742', name: 'Test Author' },
		{ type: 'works', id: 'W2741809807', name: 'Test Work' },
		{ type: 'institutions', id: 'I27837315', name: 'Test Institution' },
	];

	test.beforeEach(async ({ page, context }) => {
		// Clear storage before each test to ensure clean state
		await context.clearCookies();
		await page.goto(BASE_URL);
		await page.waitForLoadState('networkidle');
	});

	test('should load history page with heading', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);

		// Wait for history page to be fully loaded
		await page.waitForLoadState('networkidle');

		// Check for the main heading
		const heading = page.getByRole('heading', { name: /navigation history/i });
		await expect(heading).toBeVisible({ timeout: 10_000 });

		// Verify URL contains history
		expect(page.url()).toContain('history');

		// Check for no errors
		await pageObject.expectNoError();
	});

	test('should show empty state message when no history', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate directly to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);

		// Wait for page to load
		await page.waitForLoadState('networkidle');

		// Should show empty state message
		const emptyStateText = page.getByText(/no navigation history yet/i);
		await expect(emptyStateText).toBeVisible({ timeout: 10_000 });

		// Should show descriptive message
		const descriptiveMessage = page.getByText(
			/your navigation history will appear here as you browse/i
		);
		await expect(descriptiveMessage).toBeVisible();

		// Clear History button should be disabled when empty
		const clearButton = page.getByRole('button', { name: /clear history/i });
		await expect(clearButton).toBeDisabled();
	});

	test('should display history list after visiting entities', async ({
		page,
	}) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit multiple entities to populate history
		for (const entity of TEST_ENTITIES) {
			await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
			await waitForAppReady(page);
			await page.waitForLoadState('networkidle');
			// Give time for history to be recorded
			// Removed: waitForTimeout - use locator assertions instead
		}

		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Should no longer show empty state
		const emptyState = page.getByText(/no navigation history yet/i);
		await expect(emptyState).toBeHidden();

		// Should show history cards
		const historyCards = page.locator('.mantine-Card-root');
		await expect(historyCards.first()).toBeVisible({ timeout: 10_000 });

		// Should have multiple history entries (at least as many as entities visited)
		const cardCount = await historyCards.count();
		expect(cardCount).toBeGreaterThanOrEqual(TEST_ENTITIES.length);

		// Clear History button should be enabled
		const clearButton = page.getByRole('button', { name: /clear history/i });
		await expect(clearButton).toBeEnabled();
	});

	test('should show entity type information in history items', async ({
		page,
	}) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit an author entity
		const entity = TEST_ENTITIES[0];
		await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Find the history card for the visited entity
		const historyCard = page
			.locator('.mantine-Card-root')
			.filter({ hasText: entity.id })
			.or(page.locator('.mantine-Card-root').filter({ hasText: entity.type }));

		await expect(historyCard.first()).toBeVisible({ timeout: 10_000 });

		// Verify entity type is mentioned
		const cardContent = historyCard.first();
		const cardText = await cardContent.textContent();
		// Should contain either the entity ID or type information
		expect(
			cardText?.includes(entity.id) ?? cardText?.includes(entity.type)
		).toBe(true);
	});

	test('should navigate to entity when clicking history item', async ({
		page,
	}) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit an entity
		const entity = TEST_ENTITIES[0];
		await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Find and click the navigation button for the first history entry
		const navigateButton = page
			.locator('[aria-label*="Navigate to"]')
			.first();
		await expect(navigateButton).toBeVisible({ timeout: 10_000 });

		// Click the navigate button
		await navigateButton.click();

		// Wait for navigation to complete
		await page.waitForLoadState('networkidle');
		await waitForAppReady(page);

		// Verify we navigated to an entity page
		const currentUrl = page.url();
		expect(currentUrl).toMatch(/\/(authors|institutions|works)\//);

		// Verify no errors occurred
		await pageObject.expectNoError();
	});

	test('should filter history with search functionality', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit multiple entities to populate history
		for (const entity of TEST_ENTITIES) {
			await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
			await waitForAppReady(page);
			await page.waitForLoadState('networkidle');
			// Removed: waitForTimeout - use locator assertions instead
		}

		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Find the search input
		const searchInput = page.getByPlaceholder(/search history/i);
		await expect(searchInput).toBeVisible({ timeout: 10_000 });

		// Get initial number of history cards
		const initialCards = page.locator('.mantine-Card-root');
		const initialCount = await initialCards.count();
		expect(initialCount).toBeGreaterThan(0);

		// Search for a specific entity type
		const searchTerm = TEST_ENTITIES[0].type;
		await searchInput.fill(searchTerm);
		await page.waitForTimeout(FILTER_APPLY_WAIT_MS); // Allow time for filter to apply

		// Verify search filtered the results
		const filteredCards = page.locator('.mantine-Card-root');
		const filteredCount = await filteredCards.count();

		// Should have results (at least one)
		expect(filteredCount).toBeGreaterThan(0);

		// Filtered results should be less than or equal to initial count
		expect(filteredCount).toBeLessThanOrEqual(initialCount);

		// Clear search
		const clearButton = page.getByRole('button', { name: /clear/i });
		if (await clearButton.isVisible()) {
			await clearButton.click();
			// Removed: waitForTimeout - use locator assertions instead
			// Should show all entries again
			const clearedCards = page.locator('.mantine-Card-root');
			
			await expect(clearedCards).toHaveCount(initialCount);
		}
	});

	test('should show no results message when search has no matches', async ({
		page,
	}) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit an entity to populate history
		const entity = TEST_ENTITIES[0];
		await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Search for something that doesn't exist
		const searchInput = page.getByPlaceholder(/search history/i);
		await searchInput.fill('xyznonexistentquery123');
		// Removed: waitForTimeout - use locator assertions instead
		// Should show "no history found" message
		const noResultsText = page.getByText(/no history found/i);
		await expect(noResultsText).toBeVisible({ timeout: 10_000 });

		// Should show suggestion text
		const suggestionText = page.getByText(/try adjusting your search terms/i);
		await expect(suggestionText).toBeVisible();
	});

	test('should delete individual history entries', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Visit an entity
		const entity = TEST_ENTITIES[0];
		await pageObject.goto(`${BASE_URL}/#/${entity.type}/${entity.id}`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');
		// Removed: waitForTimeout - use locator assertions instead
		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);
		await page.waitForLoadState('networkidle');

		// Get initial count
		const initialCards = page.locator('.mantine-Card-root');
		const initialCount = await initialCards.count();
		expect(initialCount).toBeGreaterThan(0);

		// Find and click delete button for first entry
		const deleteButton = page.locator('[aria-label*="Delete"]').first();
		await expect(deleteButton).toBeVisible({ timeout: 10_000 });
		await deleteButton.click();

		// Confirm deletion in modal
		const confirmButton = page.getByRole('button', { name: /delete/i });
		await expect(confirmButton).toBeVisible({ timeout: 5000 });
		await confirmButton.click();

		// Wait for deletion to complete
		// Removed: waitForTimeout - use locator assertions instead
		// Verify entry was deleted
		const remainingCards = page.locator('.mantine-Card-root');
		const remainingCount = await remainingCards.count();

		// Should have one less card, or show empty state if it was the last one
		if (initialCount === 1) {
			const emptyState = page.getByText(/no navigation history yet/i);
			await expect(emptyState).toBeVisible({ timeout: 10_000 });
		} else {
			expect(remainingCount).toBe(initialCount - 1);
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const pageObject = new BaseSPAPageObject(page);

		// Navigate to history page
		await pageObject.goto(`${BASE_URL}/#/history`);
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
