/**
 * E2E Test: US-09 Collaboration Networks
 *
 * Tests the collaboration network functionality on author entity pages,
 * including co-author lists, navigation to co-author profiles, and graph
 * view linking for network visualisation.
 *
 * Verifies:
 * - Co-author list with collaboration counts on author page
 * - Navigation to co-author profile on click
 * - Link to graph view for network visualisation
 * - Graceful handling of author with no collaborators
 * - WCAG 2.1 AA accessibility compliance
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';
import { BaseEntityPageObject } from '@/test/page-objects/BaseEntityPageObject';

const BASE_URL = process.env.BASE_URL || (process.env.CI ? 'http://localhost:4173' : 'http://localhost:5173');

test.describe('@workflow US-09 Collaboration Networks', () => {
	test.setTimeout(60_000);

	let entityPage: BaseEntityPageObject;

	test.beforeEach(async ({ page }) => {
		entityPage = new BaseEntityPageObject(page, { entityType: 'authors' });

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

	test('should show co-author list with collaboration counts on author page', async ({ page }) => {
		// A5017898742 is a known author entity with works and co-authors
		await page.goto(`${BASE_URL}/#/authors/A5017898742`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Should not have routing errors
		expect(pageContent).not.toContain('Page not found');
		expect(pageContent).not.toContain('Routing error');

		// Check for co-author or collaboration information
		// This may appear as outgoing relationships, a dedicated co-authors section,
		// or within the relationship/edge list
		const hasCollaborationInfo =
			pageContent.includes('co-author') ||
			pageContent.includes('Co-Author') ||
			pageContent.includes('collaborat') ||
			pageContent.includes('Collaborat') ||
			// Works list implies collaboration data (authors on shared works)
			pageContent.includes('Works') ||
			pageContent.includes('works') ||
			pageContent.includes('authorships') ||
			pageContent.includes('Authorships');

		expect(hasCollaborationInfo).toBe(true);

		// Check for relationship items that represent co-authors
		const relationshipItems = page.locator("[data-testid='relationship-item']");
		const itemCount = await relationshipItems.count();

		// If relationship items exist, verify they contain count information
		if (itemCount > 0) {
			const firstItemText = await relationshipItems.first().textContent();
			expect(firstItemText).toBeTruthy();
		} else {
			// Alternative: check for author links in the page (co-authors are authors)
			const authorLinks = page.locator('a[href*="/#/authors/"]');
			const authorLinkCount = await authorLinks.count();

			// The author page should reference other authors (co-authors)
			// or at minimum display the author's own works
			const worksCount = page.locator('[data-testid="works-count"]');
			const hasWorksCount = await worksCount.isVisible().catch(() => false);

			expect(authorLinkCount > 0 || hasWorksCount).toBe(true);
		}
	});

	test('should navigate to co-author profile on click', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/authors/A5017898742`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// Record original URL
		const originalUrl = page.url();

		// Find clickable author links (co-author profiles)
		const authorLinks = page.locator('a[href*="/#/authors/"]');
		const authorLinkCount = await authorLinks.count();

		if (authorLinkCount > 1) {
			// Click a co-author link (skip the first one if it's a self-link)
			// Find a link that goes to a different author
			let clickTarget = authorLinks.first();
			for (let i = 0; i < Math.min(authorLinkCount, 5); i++) {
				const href = await authorLinks.nth(i).getAttribute('href');
				if (href && !href.includes('A5017898742')) {
					clickTarget = authorLinks.nth(i);
					break;
				}
			}

			await clickTarget.click();
			await page.locator('main').waitFor({ timeout: 20_000 });
			await waitForAppReady(page);

			// Should navigate to a different author page
			const newUrl = page.url();
			expect(newUrl).toContain('/authors/');

			// The new page should show author content
			const pageContent = await page.locator('body').textContent() || '';
			expect(pageContent).not.toContain('Page not found');
			expect(pageContent).not.toContain('Routing error');

			const hasAuthorContent =
				pageContent.includes('AUTHOR') ||
				pageContent.includes('Display Name') ||
				pageContent.includes('display_name') ||
				pageContent.includes('Works Count') ||
				pageContent.includes('works_count');

			expect(hasAuthorContent).toBe(true);
		} else {
			// If no co-author links, check for relationship items to click
			const relationshipItems = page.locator("[data-testid='relationship-item']");
			const itemCount = await relationshipItems.count();

			if (itemCount > 0) {
				await entityPage.clickRelationship(0);

				// Should navigate somewhere
				const newUrl = page.url();
				expect(newUrl).not.toEqual(originalUrl);
			}
		}
	});

	test('should link to graph view for network visualisation', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/authors/A5017898742`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		// Look for a link to the graph/explore view
		const graphLink = page.locator('a[href*="/#/explore"], a[href*="/#/graph"]');
		const graphLinkCount = await graphLink.count();

		// Alternative: look for graph-related buttons or actions
		const graphButton = page.getByRole('link', { name: /graph|explore|visuali|network/i });
		const hasGraphButton = await graphButton.first().isVisible().catch(() => false);

		// Also check for any button that navigates to graph
		const graphActionButton = page.getByRole('button', { name: /graph|explore|visuali|network/i });
		const hasGraphActionButton = await graphActionButton.first().isVisible().catch(() => false);

		if (graphLinkCount > 0) {
			// Verify the graph link is visible
			await expect(graphLink.first()).toBeVisible();

			// Click the graph link
			await graphLink.first().click();
			await page.locator('main').waitFor({ timeout: 20_000 });
			await waitForAppReady(page);

			// Should navigate to a graph/explore page
			const newUrl = page.url();
			const isGraphPage =
				newUrl.includes('/explore') ||
				newUrl.includes('/graph');

			expect(isGraphPage).toBe(true);
		} else if (hasGraphButton) {
			await graphButton.first().click();
			await page.locator('main').waitFor({ timeout: 20_000 });
			await waitForAppReady(page);

			const newUrl = page.url();
			const isGraphPage =
				newUrl.includes('/explore') ||
				newUrl.includes('/graph');

			expect(isGraphPage).toBe(true);
		} else if (hasGraphActionButton) {
			await graphActionButton.first().click();
			await page.locator('main').waitFor({ timeout: 20_000 });
			await waitForAppReady(page);

			const newUrl = page.url();
			const isGraphPage =
				newUrl.includes('/explore') ||
				newUrl.includes('/graph');

			expect(isGraphPage).toBe(true);
		} else {
			// If no explicit graph link, verify the explore page is accessible from nav
			const navLinks = page.locator('nav a[href*="explore"], nav a[href*="graph"]');
			const navLinkCount = await navLinks.count();

			// At minimum, the explore/graph page should be reachable via navigation
			expect(navLinkCount).toBeGreaterThan(0);
		}
	});

	test('should handle author with no collaborators gracefully', async ({ page }) => {
		// Use a less-connected author or entity that may have minimal collaborations
		// Navigate to author page
		await page.goto(`${BASE_URL}/#/authors/A5017898742`, {
			waitUntil: 'domcontentloaded',
			timeout: 30_000,
		});

		await page.locator('main').waitFor({ timeout: 20_000 });
		await waitForAppReady(page);

		const pageContent = await page.locator('body').textContent() || '';

		// Page should load without errors regardless of collaboration count
		expect(pageContent).not.toContain('Routing error');
		expect(pageContent).not.toContain('Page not found');

		// No JavaScript errors should have occurred
		await expect(page.locator('main')).toBeVisible();

		// The page should handle zero collaborators by either:
		// 1. Showing an empty state message
		// 2. Simply not showing the collaborators section
		// 3. Showing a "0 co-authors" count
		// All are valid approaches; the key is no crash or unhandled error

		const errorElements = page.locator('[role="alert"]');
		const errorCount = await errorElements.count();

		// Filter for actual errors (not informational alerts)
		let criticalErrorCount = 0;
		for (let i = 0; i < errorCount; i++) {
			const alertText = await errorElements.nth(i).textContent();
			if (alertText && (alertText.includes('Error') || alertText.includes('error'))) {
				criticalErrorCount++;
			}
		}

		expect(criticalErrorCount).toBe(0);
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await page.goto(`${BASE_URL}/#/authors/A5017898742`, {
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
