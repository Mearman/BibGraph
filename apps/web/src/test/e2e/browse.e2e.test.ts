/**
 * Browse Page E2E Tests
 *
 * Tests the Browse utility page which serves as an entry point displaying
 * all 12 OpenAlex entity types as clickable cards. This page allows users
 * to navigate to different entity index pages.
 * @see spec-020 Phase 2: Utility page E2E tests
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { BrowsePage } from '@/test/page-objects/BrowsePage';

const IS_CI = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = process.env.BASE_URL ?? (IS_CI ? 'http://localhost:4173' : 'http://localhost:5173');

// All 12 OpenAlex entity types that should be displayed
const EXPECTED_ENTITY_TYPES = [
	'Works',
	'Authors',
	'Sources',
	'Institutions',
	'Publishers',
	'Funders',
	'Topics',
	'Concepts',
	'Keywords',
	'Domains',
	'Fields',
	'Subfields',
] as const;

const TEST_SUITE_TIMEOUT_MS = 60_000;
const ENTITY_TYPE_COUNT = 12;
const MOBILE_VIEWPORT_WIDTH = 375;

test.describe('@utility Browse Page', () => {
	test.setTimeout(TEST_SUITE_TIMEOUT_MS); // 1 minute timeout

	test.beforeEach(({ page }) => {
		// Set up console error listener for debugging
		page.on('console', (message) => {
			if (message.type() === 'error') {
				console.error('Browser console error:', message.text());
			}
		});

		// Set up page error listener
		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should load browse page successfully', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();

		// Wait for app to be fully ready
		await waitForAppReady(page);

		// Assert browse page loaded correctly
		await browsePage.expectBrowseLoaded();

		// Verify URL is correct
		expect(page.url()).toContain('/browse');

		// Verify no error messages are displayed
		await browsePage.expectNoError();
	});

	test('should display all 12 entity type cards', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Get count of entity type cards
		const cardCount = await browsePage.getEntityTypeCount();

		// Should have exactly 12 entity type cards
		expect(cardCount).toBe(ENTITY_TYPE_COUNT);

		// Verify minimum number of cards (using page object method)
		await browsePage.expectMinimumEntityTypes(ENTITY_TYPE_COUNT);
	});

	test('should display correct entity type names', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Get list of displayed entity types
		const displayedEntityTypes = await browsePage.getEntityTypeCards();

		// Verify all expected entity types are present
		for (const expectedType of EXPECTED_ENTITY_TYPES) {
			expect(displayedEntityTypes).toContain(expectedType);
		}

		// Verify we have exactly 12 entity types (no duplicates or extras)
		expect(displayedEntityTypes).toHaveLength(ENTITY_TYPE_COUNT);
	});

	test('should display entity type icons', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Check for SVG icons within entity type cards
		const icons = page.locator('[data-testid="entity-type-card"] svg');
		const iconCount = await icons.count();

		// Each entity type card should have an icon
		expect(iconCount).toBeGreaterThanOrEqual(ENTITY_TYPE_COUNT);

		// Verify at least one icon is visible
		await expect(icons.first()).toBeVisible();
	});

	test('should have proper page heading', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Get page title using page object method
		const pageTitle = await browsePage.getPageTitle();

		// Should have a meaningful title (e.g., "Browse", "Entity Types", etc.)
		expect(pageTitle).toBeTruthy();
		expect(pageTitle).not.toBe('');

		// Verify title contains expected text (case-insensitive)
		const titleLower = pageTitle?.toLowerCase() ?? '';
		const hasValidTitle =
			titleLower.includes('browse') ||
			titleLower.includes('entity') ||
			titleLower.includes('explore');

		expect(hasValidTitle).toBeTruthy();
	});

	test('should navigate to entity index when clicking card', async ({
		page,
	}) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Test navigation for Works entity type
		const entityType = 'Works';

		// Verify entity type card is visible before clicking
		await browsePage.expectEntityTypeVisible(entityType);

		// Click the entity type card
		await browsePage.clickEntityType(entityType);

		// Wait for navigation to complete
		await waitForAppReady(page);

		// Verify URL changed to the entity index page
		const currentUrl = page.url();
		expect(currentUrl).toContain('/works');

		// Verify no errors occurred during navigation
		await browsePage.expectNoError();
	});

	test('should navigate to multiple entity types sequentially', async ({
		page,
	}) => {
		const browsePage = new BrowsePage(page);

		// Test navigation for multiple entity types
		const entityTypesToTest = [
			{ name: 'Authors', urlPath: '/authors' },
			{ name: 'Sources', urlPath: '/sources' },
			{ name: 'Institutions', urlPath: '/institutions' },
		];

		for (const entityType of entityTypesToTest) {
			// Navigate back to browse page
			await browsePage.gotoBrowse();
			await waitForAppReady(page);

			// Verify entity type card is visible
			const isVisible = await browsePage.isEntityTypeVisible(entityType.name);
			expect(isVisible).toBe(true);

			// Click the entity type card
			await browsePage.clickEntityType(entityType.name);

			// Wait for navigation
			await waitForAppReady(page);

			// Verify correct navigation occurred
			const currentUrl = page.url();
			expect(currentUrl).toContain(entityType.urlPath);
		}
	});

	test('should handle keyboard navigation', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Focus on the first entity type card
		const firstCard = page
			.locator('[data-testid="entity-type-card"]')
			.first();
		await firstCard.focus();

		// Verify card is focused
		await expect(firstCard).toBeFocused();

		// Press Tab to navigate to next card
		await page.keyboard.press('Tab');

		// Verify focus moved to second card
		const secondCard = page.locator('[data-testid="entity-type-card"]').nth(1);
		await expect(secondCard).toBeFocused();

		// Press Enter to activate the focused card
		await page.keyboard.press('Enter');

		// Wait for navigation
		await waitForAppReady(page);

		// Verify navigation occurred
		const currentUrl = page.url();
		expect(currentUrl).not.toContain('/browse');
	});

	test('should maintain responsive layout on mobile viewport', async ({
		page,
	}) => {
		// Set mobile viewport
		await page.setViewportSize({ width: 375, height: 667 });

		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Verify page loaded successfully
		await browsePage.expectBrowseLoaded();

		// Verify all cards are still visible in mobile layout
		const cardCount = await browsePage.getEntityTypeCount();
		expect(cardCount).toBe(ENTITY_TYPE_COUNT);

		// Verify cards are stacked (not overflowing)
		const browseGrid = page.locator('[data-testid="browse-grid"]');
		const gridBox = await browseGrid.boundingBox();

		expect(gridBox).toBeTruthy();
		expect(gridBox?.width).toBeLessThanOrEqual(MOBILE_VIEWPORT_WIDTH);
	});

	test('should display cards in consistent order', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// First visit - get entity type order
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		const firstVisitOrder = await browsePage.getEntityTypeCards();

		// Reload page
		await page.reload();
		await waitForAppReady(page);

		// Second visit - verify same order
		const secondVisitOrder = await browsePage.getEntityTypeCards();

		// Order should be consistent across page loads
		expect(secondVisitOrder).toEqual(firstVisitOrder);

		// Navigate to another page and back
		await page.goto(`${BASE_URL}/#/`);
		await waitForAppReady(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Third visit - verify order still consistent
		const thirdVisitOrder = await browsePage.getEntityTypeCards();
		expect(thirdVisitOrder).toEqual(firstVisitOrder);
	});

	test('should handle rapid card clicks gracefully', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Get first entity type card
		const firstCard = page
			.locator('[data-testid="entity-type-card"]')
			.first();

		// Click rapidly multiple times
		await firstCard.click({ clickCount: 3 });

		// Wait for navigation
		await waitForAppReady(page);

		// Should navigate successfully without errors
		await browsePage.expectNoError();

		// Should be on an entity index page (not browse page)
		const currentUrl = page.url();
		expect(currentUrl).not.toContain('/browse');
	});

	test('should display card hover states', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Get first entity type card
		const firstCard = page
			.locator('[data-testid="entity-type-card"]')
			.first();

		// Get initial background color
		const initialBgColor = await firstCard.evaluate((element) =>
			window.getComputedStyle(element).backgroundColor,
		);

		// Hover over the card
		await firstCard.hover();

		// Wait for CSS transition
		// Removed: waitForTimeout - use locator assertions instead
		// Get hover background color
		const hoverBgColor = await firstCard.evaluate((element) =>
			window.getComputedStyle(element).backgroundColor,
		);

		// Background color should change on hover (indicating interactive state)
		// Note: This may not always work if CSS transitions are complex,
		// but it's a good smoke test for hover states
		const isColorsAreDifferent = initialBgColor !== hoverBgColor;

		// If colors didn't change, verify card is still interactive via other means
		if (!isColorsAreDifferent) {
			// Verify card has cursor pointer or is clickable
			const cursor = await firstCard.evaluate((element) =>
				window.getComputedStyle(element).cursor,
			);
			expect(cursor).toBe('pointer');
		}
	});

	test('should support browser back button after navigation', async ({
		page,
	}) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Click an entity type card
		await browsePage.clickEntityType('Works');
		await waitForAppReady(page);

		// Verify navigation occurred
		expect(page.url()).toContain('/works');

		// Use browser back button
		await page.goBack();
		await waitForAppReady(page);

		// Should be back on browse page
		expect(page.url()).toContain('/browse');

		// Browse page should still be functional
		await browsePage.expectBrowseLoaded();

		// Should still have all cards
		const cardCount = await browsePage.getEntityTypeCount();
		expect(cardCount).toBe(ENTITY_TYPE_COUNT);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Navigate to browse page
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		// Run accessibility scan
		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
