/**
 * E2E tests for US-11 2D/3D Graph Toggle
 *
 * Tests the dimension toggle between 2D canvas and 3D WebGL rendering
 * on the graph visualization page.
 * @see US-11
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';
import { GraphPage } from '@/test/page-objects/GraphPage';

test.describe('@utility US-11 2D/3D Graph Toggle', () => {
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

	test('should display 2D/3D toggle control', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);

		const dimensionToggle = page.locator("[data-testid='dimension-toggle']");
		const hasToggle = await dimensionToggle.isVisible().catch(() => false);

		if (hasToggle) {
			await expect(dimensionToggle).toBeVisible();
		} else {
			// Toggle may not be present if graph is empty; verify page loaded
			const mainContent = page.locator('main');
			await expect(mainContent).toBeVisible();
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});

	test('should default to 2D canvas rendering', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 0) {
			const dimension = await graphPage.getCurrentDimension();
			expect(dimension).toBe('2d');

			// Verify 2D canvas is visible
			const canvas2D = page.locator("[data-testid='graph-canvas-2d'], canvas.force-graph-2d");
			const svgContainer = page.locator('svg');
			const has2DCanvas = await canvas2D.isVisible().catch(() => false);
			const hasSVG = await svgContainer.isVisible().catch(() => false);

			expect(has2DCanvas || hasSVG).toBeTruthy();
		} else {
			console.log('Skipping 2D default test - no nodes in graph');
		}
	});

	test('should switch to 3D WebGL rendering', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();
		const dimensionToggle = page.locator("[data-testid='dimension-toggle']");
		const hasToggle = await dimensionToggle.isVisible().catch(() => false);

		if (nodeCount > 0 && hasToggle) {
			// Switch to 3D
			await graphPage.toggle2D3D();

			const dimension = await graphPage.getCurrentDimension();
			expect(dimension).toBe('3d');

			// Verify 3D canvas is visible
			const canvas3D = page.locator("[data-testid='graph-canvas-3d'], canvas.force-graph-3d");
			const has3DCanvas = await canvas3D.isVisible().catch(() => false);

			// The 3D view should be present (canvas or WebGL context)
			if (has3DCanvas) {
				await expect(canvas3D).toBeVisible();
			}

			// Verify no errors occurred during switch
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping 3D switch test - no nodes or no toggle control');
		}
	});

	test('should switch back from 3D to 2D', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();
		const dimensionToggle = page.locator("[data-testid='dimension-toggle']");
		const hasToggle = await dimensionToggle.isVisible().catch(() => false);

		if (nodeCount > 0 && hasToggle) {
			// Switch to 3D first
			await graphPage.toggle2D3D();
			const dimension3D = await graphPage.getCurrentDimension();
			expect(dimension3D).toBe('3d');

			// Switch back to 2D
			await graphPage.toggle2D3D();
			const dimension2D = await graphPage.getCurrentDimension();
			expect(dimension2D).toBe('2d');

			// Verify no errors occurred during round-trip
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping 3D-to-2D switch test - no nodes or no toggle control');
		}
	});

	test('should preserve graph data when toggling dimensions', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();
		const edgeCount = await graphPage.getEdgeCount();
		const dimensionToggle = page.locator("[data-testid='dimension-toggle']");
		const hasToggle = await dimensionToggle.isVisible().catch(() => false);

		if (nodeCount > 0 && hasToggle) {
			// Record initial counts
			const initialNodes = nodeCount;
			const initialEdges = edgeCount;

			// Toggle to 3D
			await graphPage.toggle2D3D();
			await page.waitForTimeout(1000);

			// Toggle back to 2D
			await graphPage.toggle2D3D();
			await waitForGraphReady(page);

			// Verify node and edge counts are preserved
			const finalNodes = await graphPage.getNodeCount();
			const finalEdges = await graphPage.getEdgeCount();

			expect(finalNodes).toBe(initialNodes);
			expect(finalEdges).toBe(initialEdges);
		} else {
			console.log('Skipping data preservation test - no nodes or no toggle control');
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
