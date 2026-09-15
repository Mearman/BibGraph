/**
 * E2E tests for Browse Workflow
 * Tests the complete browse workflow: browse → select entity type → view index → select entity → view detail
 * @see BrowsePage page object
 * @see spec-020 Phase 2: Browse page E2E tests
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import { waitForAppReady, waitForEntityData } from '@/test/helpers/app-ready';
import { BrowsePage } from '@/test/page-objects/BrowsePage';

const SAMPLE_LINK_TEXT_CHECK_COUNT = 5;
const MIN_ENTITY_TYPES_DISPLAYED = 10; // BibGraph has 12 entity types
const MIN_VISIBLE_DESKTOP_CARDS = 10;
const MIN_DESKTOP_GRID_WIDTH_PX = 1200;
const MIN_CARD_WIDTH_PX = 150;
const MAX_CARD_WIDTH_PX = 500;
const MIN_CARD_HEIGHT_PX = 100;
const MIN_CARD_SPACING_PX = 10;
const MIN_VISIBLE_DESKTOP_WORK_LINKS = 5;
const MIN_DESKTOP_LIST_WIDTH_PX = 800;
const MAX_GRID_WIDTH_DRIFT_PX = 50;

test.describe('@workflow Browse Workflow', () => {
	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should complete full workflow: browse → works index → work detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Works" entity type card
		await browsePage.expectEntityTypeVisible('Works');
		await browsePage.clickEntityType('Works');

		// Step 3: Wait for works index page to load
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Verify page title
		const pageTitle = page.locator('h1');
		await expect(pageTitle).toContainText('Works');

		// Step 4: Click first work from the list
		const firstWorkLink = page.locator('a[href*="/works/W"]').first();
		await expect(firstWorkLink).toBeVisible();

		
		await expect(firstWorkLink).toHaveText(/.+/);

		await firstWorkLink.click();

		// Step 5: Verify navigation to work detail page
		await expect(page).toHaveURL(/\/works\/W\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify work title is displayed
		
		await expect(entityTitle).toHaveText(/.+/);
	});

	test('should complete full workflow: browse → authors index → author detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Authors" entity type card
		await browsePage.expectEntityTypeVisible('Authors');
		await browsePage.clickEntityType('Authors');

		// Step 3: Wait for authors index page to load
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Verify page title
		const pageTitle = page.locator('h1');
		await expect(pageTitle).toContainText('Authors');

		// Step 4: Click first author from the list
		const firstAuthorLink = page.locator('a[href*="/authors/A"]').first();
		await expect(firstAuthorLink).toBeVisible();

		
		await expect(firstAuthorLink).toHaveText(/.+/);

		await firstAuthorLink.click();

		// Step 5: Verify navigation to author detail page
		await expect(page).toHaveURL(/\/authors\/A\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify author name is displayed
		
		await expect(entityTitle).toHaveText(/.+/);
	});

	test('should complete full workflow: browse → institutions index → institution detail', async ({ page }) => {
		// Step 1: Navigate to browse page
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 2: Click "Institutions" entity type card
		await browsePage.expectEntityTypeVisible('Institutions');
		await browsePage.clickEntityType('Institutions');

		// Step 3: Wait for institutions index page to load
		await expect(page).toHaveURL(/\/institutions\/?/);
		await waitForAppReady(page);

		// Verify index page loaded with list
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Verify page title
		const pageTitle = page.locator('h1');
		await expect(pageTitle).toContainText('Institutions');

		// Step 4: Click first institution from the list
		const firstInstitutionLink = page.locator('a[href*="/institutions/I"]').first();
		await expect(firstInstitutionLink).toBeVisible();

		
		await expect(firstInstitutionLink).toHaveText(/.+/);

		await firstInstitutionLink.click();

		// Step 5: Verify navigation to institution detail page
		await expect(page).toHaveURL(/\/institutions\/I\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail page loaded
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Verify institution name is displayed
		
		await expect(entityTitle).toHaveText(/.+/);
	});

	test('should support browser back navigation from detail to index', async ({ page }) => {
		// Navigate through browse workflow to work detail
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		const firstWorkLink = page.locator('a[href*="/works/W"]').first();
		await firstWorkLink.click();

		await expect(page).toHaveURL(/\/works\/W\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Use browser back button to return to works index
		await page.goBack();

		// Verify we're back on works index page
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify entity list is still visible
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Verify page title
		const pageTitle = page.locator('h1');
		await expect(pageTitle).toContainText('Works');
	});

	test('should support browser back navigation from index to browse', async ({ page }) => {
		// Navigate from browse to works index
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Verify browse page components
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		await browsePage.clickEntityType('Authors');
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Use browser back button to return to browse page
		await page.goBack();

		// Verify we're back on browse page
		await expect(page).toHaveURL(/\/browse/);
		await waitForAppReady(page);

		// Verify browse grid is visible
		await browsePage.expectBrowseLoaded();
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		// Verify entity type cards are still visible
		await browsePage.expectEntityTypeVisible('Works');
		await browsePage.expectEntityTypeVisible('Authors');
		await browsePage.expectEntityTypeVisible('Institutions');
	});

	test('should handle multiple entity types in same session', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Test 1: Works
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		const worksListTitle = page.locator('h1');
		await expect(worksListTitle).toContainText('Works');

		// Return to browse
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Test 2: Authors
		await browsePage.clickEntityType('Authors');
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		const authorsListTitle = page.locator('h1');
		await expect(authorsListTitle).toContainText('Authors');

		// Return to browse
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Test 3: Institutions
		await browsePage.clickEntityType('Institutions');
		await expect(page).toHaveURL(/\/institutions\/?/);
		await waitForAppReady(page);

		const institutionsListTitle = page.locator('h1');
		await expect(institutionsListTitle).toContainText('Institutions');

		// Verify app remained stable throughout
		const root = page.locator('#root');
		await expect(root).toBeVisible();
	});

	test('should display entity list with multiple items on index pages', async ({ page }) => {
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Navigate to works index
		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify multiple work items are displayed
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		const workLinks = page.locator('a[href*="/works/W"]');
		const workCount = await workLinks.count();

		// Should have at least a few works displayed (paginated results)
		expect(workCount).toBeGreaterThan(0);

		// Verify each link has text content
		for (let index = 0; index < Math.min(SAMPLE_LINK_TEXT_CHECK_COUNT, workCount); index++) {
			const linkLocator = workLinks.nth(index);
			await expect(linkLocator).toHaveText(/.+/);
		}
	});

	test('should handle browse page load without errors', async ({ page }) => {
		const browsePage = new BrowsePage(page);

		// Monitor console errors
		const errors: string[] = [];
		page.on('pageerror', (error) => {
			errors.push(error.message);
		});

		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Verify no errors occurred
		expect(errors).toHaveLength(0);

		// Verify page structure is intact
		const root = page.locator('#root');
		await expect(root).toBeVisible();

		// Verify browse grid is present
		await expect(page.locator('[data-testid="browse-grid"]')).toBeVisible();

		// Verify minimum number of entity types are displayed
		await browsePage.expectMinimumEntityTypes(MIN_ENTITY_TYPES_DISPLAYED);
	});
});

test.describe('@workflow @desktop Browse Workflow - Desktop Viewport', () => {
	test.use({ viewport: { width: 1920, height: 1080 } });

	test('should display browse grid with optimal layout on desktop', async ({ page }) => {
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Verify browse grid is visible
		const browseGrid = page.locator('[data-testid="browse-grid"]');
		await expect(browseGrid).toBeVisible();

		// Verify multiple entity type cards are visible simultaneously on wide screen
		const entityCards = page.locator('[data-testid^="entity-type-card-"]');
		const visibleCards = await entityCards.evaluateAll((cards) =>
			cards.filter((card) => {
				const rect = card.getBoundingClientRect();
				return rect.width > 0 && rect.height > 0 && rect.top >= 0;
			}),
		);

		// On 1920x1080, should see multiple cards per row (at least 3-4)
		expect(visibleCards.length).toBeGreaterThanOrEqual(MIN_VISIBLE_DESKTOP_CARDS);

		// Verify grid layout uses appropriate spacing for desktop
		const gridBox = await browseGrid.boundingBox();
		expect(gridBox).not.toBeNull();
		if (gridBox) {
			// Grid should utilize significant horizontal space on desktop
			expect(gridBox.width).toBeGreaterThan(MIN_DESKTOP_GRID_WIDTH_PX);
		}
	});

	test('should display entity type cards with proper spacing on desktop', async ({ page }) => {
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Get positions of multiple entity type cards
		const worksCard = page.locator('[data-testid="entity-type-card-works"]');
		const authorsCard = page.locator('[data-testid="entity-type-card-authors"]');
		const institutionsCard = page.locator('[data-testid="entity-type-card-institutions"]');

		await expect(worksCard).toBeVisible();
		await expect(authorsCard).toBeVisible();
		await expect(institutionsCard).toBeVisible();

		// Verify cards have appropriate size on desktop
		const worksBox = await worksCard.boundingBox();
		expect(worksBox).not.toBeNull();
		if (worksBox) {
			// Cards should be substantial but not too wide on desktop
			expect(worksBox.width).toBeGreaterThan(MIN_CARD_WIDTH_PX);
			expect(worksBox.width).toBeLessThan(MAX_CARD_WIDTH_PX);
			expect(worksBox.height).toBeGreaterThan(MIN_CARD_HEIGHT_PX);
		}

		// Verify cards have adequate spacing between them
		const worksPosition = await worksCard.boundingBox();
		const authorsPosition = await authorsCard.boundingBox();

		if (worksPosition && authorsPosition) {
			// Calculate spacing between cards (horizontal or vertical)
			const horizontalGap = Math.abs(authorsPosition.x - (worksPosition.x + worksPosition.width));
			const verticalGap = Math.abs(authorsPosition.y - (worksPosition.y + worksPosition.height));

			// Should have at least some spacing (either horizontal or vertical)
			const hasProperSpacing = horizontalGap > MIN_CARD_SPACING_PX || verticalGap > MIN_CARD_SPACING_PX;
			expect(hasProperSpacing).toBe(true);
		}
	});

	test('should display entity index page with full content on desktop', async ({ page }) => {
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Navigate to works index
		await browsePage.clickEntityType('Works');
		await expect(page).toHaveURL(/\/works\/?/);
		await waitForAppReady(page);

		// Verify entity list displays with desktop layout
		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// On desktop, should see multiple work items without scrolling
		const workLinks = page.locator('a[href*="/works/W"]');
		const visibleWorkLinks = await workLinks.evaluateAll((links) =>
			links.filter((link) => {
				const rect = link.getBoundingClientRect();
				return (
					rect.width > 0 &&
					rect.height > 0 &&
					rect.top >= 0 &&
					rect.top < window.innerHeight
				);
			}),
		);

		// Desktop should show more items in viewport than mobile
		expect(visibleWorkLinks.length).toBeGreaterThanOrEqual(MIN_VISIBLE_DESKTOP_WORK_LINKS);

		// Verify page uses horizontal space effectively
		const listBox = await entityList.boundingBox();
		expect(listBox).not.toBeNull();
		if (listBox) {
			// List should utilize desktop width
			expect(listBox.width).toBeGreaterThan(MIN_DESKTOP_LIST_WIDTH_PX);
		}
	});

	test('should complete full navigation workflow on desktop viewport', async ({ page }) => {
		// Test complete browse → index → detail → back flow on desktop
		const browsePage = new BrowsePage(page);
		await browsePage.gotoBrowse();
		await waitForAppReady(page);
		await browsePage.expectBrowseLoaded();

		// Step 1: Browse page with desktop layout
		const browseGrid = page.locator('[data-testid="browse-grid"]');
		await expect(browseGrid).toBeVisible();

		const browseGridBox = await browseGrid.boundingBox();
		expect(browseGridBox).not.toBeNull();
		if (browseGridBox) {
			// Verify desktop-sized grid
			expect(browseGridBox.width).toBeGreaterThan(MIN_DESKTOP_GRID_WIDTH_PX);
		}

		// Step 2: Navigate to authors index
		await browsePage.clickEntityType('Authors');
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);

		const entityList = page.locator('[data-testid="entity-list"]');
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Step 3: Navigate to author detail
		const firstAuthorLink = page.locator('a[href*="/authors/A"]').first();
		await expect(firstAuthorLink).toBeVisible();
		await firstAuthorLink.click();

		await expect(page).toHaveURL(/\/authors\/A\d+/);
		await waitForAppReady(page);
		await waitForEntityData(page);

		// Verify entity detail displays on desktop
		const entityTitle = page.locator('[data-testid="entity-title"]');
		await expect(entityTitle).toBeVisible();

		// Step 4: Navigate back to index
		await page.goBack();
		await expect(page).toHaveURL(/\/authors\/?/);
		await waitForAppReady(page);
		await expect(entityList).toBeVisible({ timeout: 30_000 });

		// Step 5: Navigate back to browse
		await page.goBack();
		await expect(page).toHaveURL(/\/browse/);
		await waitForAppReady(page);
		await expect(browseGrid).toBeVisible();

		// Verify layout remains consistent throughout navigation
		const finalBrowseGridBox = await browseGrid.boundingBox();
		expect(finalBrowseGridBox).not.toBeNull();
		if (finalBrowseGridBox && browseGridBox) {
			// Grid dimensions should be consistent
			expect(Math.abs(finalBrowseGridBox.width - browseGridBox.width)).toBeLessThan(MAX_GRID_WIDTH_DRIFT_PX);
		}
	});
});
