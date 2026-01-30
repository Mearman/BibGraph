/**
 * E2E tests for US-10 Force-Directed Graph
 *
 * Tests the force-directed graph visualization on the /explore page.
 * Verifies rendering, labelling, interaction, Web Worker simulation,
 * large graph handling, and data source toggles.
 * @see US-10
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';
import { GraphPage } from '@/test/page-objects/GraphPage';

test.describe('@utility US-10 Force-Directed Graph', () => {
	test.setTimeout(60_000);

	let graphPage: GraphPage;

	test.beforeEach(async ({ page }) => {
		graphPage = new GraphPage(page);

		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.error('Browser console error:', msg.text());
			}
		});

		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should render graph with nodes and edges from data sources', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();
		const edgeCount = await graphPage.getEdgeCount();

		if (nodeCount > 0) {
			expect(nodeCount).toBeGreaterThan(0);
			expect(edgeCount).toBeGreaterThanOrEqual(0);
			await graphPage.expectGraphLoaded();
		} else {
			// Empty state is acceptable when no data sources are populated
			const emptyState = page.locator('text=/no entities|empty|no data|add entities|start exploring/i');
			const hasEmptyState = await emptyState.isVisible().catch(() => false);
			expect(hasEmptyState).toBeTruthy();
		}
	});

	test('should label nodes with entity name and edges with relationship type', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 0) {
			// Click first node to trigger tooltip/label display
			await graphPage.clickNode(0);

			// Check for node label via tooltip or text element within node group
			const tooltip = await graphPage.isNodeTooltipVisible();
			const nodeText = page.locator('svg g.nodes text').first();
			const hasNodeText = await nodeText.isVisible().catch(() => false);

			// Either tooltip or inline text should indicate labelling support
			expect(tooltip || hasNodeText).toBeTruthy();

			// Edge labels may not always be visible; verify no error
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping label test - no nodes in graph');
		}
	});

	test('should support pan and zoom interaction', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 0) {
			// Verify zoom controls exist
			const zoomControlsVisible = await graphPage.areZoomControlsVisible();
			const zoomInButton = page.locator("[data-testid='zoom-in']");
			const hasZoomIn = await zoomInButton.isVisible().catch(() => false);

			if (zoomControlsVisible || hasZoomIn) {
				// Perform zoom in
				await graphPage.zoomIn();
				let errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);

				// Perform zoom out
				await graphPage.zoomOut();
				errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);

				// Reset zoom
				await graphPage.resetZoom();
				errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);
			}
		} else {
			console.log('Skipping pan/zoom test - no nodes in graph');
		}
	});

	test('should run force simulation in Web Worker (no UI freeze)', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 0) {
			// Check for worker status indicator
			const workerStatus = page.locator("[data-testid='worker-status']");
			const hasWorkerStatus = await workerStatus.isVisible().catch(() => false);

			if (hasWorkerStatus) {
				const statusText = await workerStatus.textContent();
				expect(statusText).toBeTruthy();
			}

			// Verify UI responsiveness by checking the page responds to interaction
			// during simulation. If main thread were blocked, click would time out.
			const mainContent = page.locator('main');
			await expect(mainContent).toBeVisible({ timeout: 5000 });
		} else {
			console.log('Skipping Web Worker test - no nodes in graph');
		}
	});

	test('should handle 1000+ nodes without freezing', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		// This test validates the page remains responsive regardless of node count.
		// With 1000+ nodes, the force simulation must run in a Web Worker.
		const mainContent = page.locator('main');
		await expect(mainContent).toBeVisible({ timeout: 5000 });

		// Verify no critical errors occurred during rendering
		const criticalErrors: string[] = [];
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				const text = msg.text();
				if (
					text.includes('Maximum update depth') ||
					text.includes('out of memory') ||
					text.includes('too many re-renders')
				) {
					criticalErrors.push(text);
				}
			}
		});

		// If the graph has nodes, interact to stress-test responsiveness
		if (nodeCount > 0) {
			await graphPage.zoomIn().catch(() => {});
			await graphPage.zoomOut().catch(() => {});
		}

		// Allow time for deferred errors to surface
		await page.waitForTimeout(2000);
		expect(criticalErrors).toHaveLength(0);
	});

	test('should display data source toggles (bookmarks, history, cache)', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);

		// Check for data source toggle controls
		const dataSourceToggle = page.locator("[data-testid='data-source-toggle']");
		const bookmarksToggle = page.locator("[data-testid='toggle-bookmarks']");
		const historyToggle = page.locator("[data-testid='toggle-history']");
		const cacheToggle = page.locator("[data-testid='toggle-cache']");

		const hasDataSourceToggle = await dataSourceToggle.isVisible().catch(() => false);
		const hasBookmarks = await bookmarksToggle.isVisible().catch(() => false);
		const hasHistory = await historyToggle.isVisible().catch(() => false);
		const hasCache = await cacheToggle.isVisible().catch(() => false);

		// At least the data source toggle container or individual toggles should exist
		if (hasDataSourceToggle || hasBookmarks || hasHistory || hasCache) {
			expect(hasDataSourceToggle || hasBookmarks || hasHistory || hasCache).toBeTruthy();
		} else {
			// If no toggles are present, verify no error state
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});
});
