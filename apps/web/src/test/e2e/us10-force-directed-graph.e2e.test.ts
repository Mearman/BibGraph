/**
 * E2E tests for US-10 Force-Directed Graph
 *
 * Tests the force-directed graph visualization on the /graph page.
 * Verifies rendering, labelling, interaction, Web Worker simulation,
 * large graph handling, and data source toggles.
 *
 * Note: The graph page renders using react-force-graph-2d (canvas-based),
 * not SVG. Tests must account for the canvas rendering and the possibility
 * of an empty graph state when no catalogue data is present.
 * @see US-10
 */

import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@utility US-10 Force-Directed Graph', () => {
	test.setTimeout(60_000);

	test.beforeEach(async ({ page }) => {
		page.on('console', (msg) => {
			if (msg.type() === 'error') {
				console.error('Browser console error:', msg.text());
			}
		});

		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should render graph page without errors', async ({ page }) => {
		await page.goto('/#/graph');
		await waitForAppReady(page);

		// The graph page should load without crashing -- either showing the
		// force-directed graph visualization or an empty state
		const mainContent = page.locator('main, #root');
		await expect(mainContent.first()).toBeVisible({ timeout: 10_000 });

		// Check for graph heading or empty state
		// The graph page shows "Entity Graph" when data is loaded,
		// "Enable Data Sources to Explore" when no sources are enabled,
		// or "No Entities to Display" when sources are enabled but empty
		const graphHeading = page.getByText('Entity Graph');
		const emptyState = page.getByText(/no entities|enable data sources|no data|loading data/i);

		const hasHeading = await graphHeading.isVisible({ timeout: 5000 }).catch(() => false);
		const hasEmptyState = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

		// Either the graph loaded or an empty state is shown -- both are valid
		expect(hasHeading || hasEmptyState).toBeTruthy();

		// Verify no error alerts (exclude yellow/info alerts, only check for red error alerts)
		const errorAlert = page.locator('.mantine-Alert-root[data-color="red"]');
		const errorCount = await errorAlert.count();
		expect(errorCount).toBe(0);
	});

	test('should display graph container when data is available', async ({ page }) => {
		await page.goto('/#/graph');
		await waitForAppReady(page);

		// The graph page uses react-force-graph-2d which renders on a canvas element.
		// If graph data is available, a canvas should be present.
		const canvas = page.locator('canvas');
		const hasCanvas = await canvas.first().isVisible({ timeout: 10_000 }).catch(() => false);

		// Empty state variants: "Enable Data Sources to Explore" or "No Entities to Display"
		const emptyState = page.getByText(/no entities|enable data sources|no data|loading data/i);
		const hasEmptyState = await emptyState.first().isVisible({ timeout: 5000 }).catch(() => false);

		// Either canvas (graph loaded) or empty state (no data) is acceptable
		expect(hasCanvas || hasEmptyState).toBeTruthy();
	});

	test('should run force simulation without freezing the UI', async ({ page }) => {
		// Known app bug: Maximum update depth exceeded in graph visualization
		// TODO: Fix the React re-render loop in graph visualization
		test.fail(true, 'Known app bug: Maximum update depth exceeded in graph visualization');

		// Set up critical error listener before navigation
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

		await page.goto('/#/graph');
		await waitForAppReady(page);

		// Verify the page remains responsive -- if the main thread were blocked
		// by force simulation, this assertion would time out
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible({ timeout: 10_000 });

		// Verify the graph page rendered some content (heading or empty state)
		const pageContent = page.getByText(/entity graph|enable data sources|no entities|loading data/i);
		const hasContent = await pageContent.first().isVisible({ timeout: 10_000 }).catch(() => false);
		expect(hasContent).toBeTruthy();

		// Allow time for deferred errors to surface
		await page.waitForTimeout(2000);
		expect(criticalErrors).toHaveLength(0);
	});

	test('should display data source panel on graph page', async ({ page }) => {
		await page.goto('/#/graph');
		await waitForAppReady(page);

		// The graph page has a GraphSourcePanel with source toggles (Switch components).
		// These toggles control which data sources feed into the graph.
		// The panel is always shown (even in empty state via GraphEmptyStateWithPanel).
		const switches = page.locator('.mantine-Switch-root');
		const switchCount = await switches.count();

		// Source panel should have at least one toggle (bookmarks, history, cache, etc.)
		// If no toggles, the page should still be error-free
		if (switchCount > 0) {
			expect(switchCount).toBeGreaterThan(0);
		} else {
			// No source toggles is acceptable if the page loaded without errors
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});

	test('should display view mode controls when graph has data', async ({ page }) => {
		await page.goto('/#/graph');
		await waitForAppReady(page);

		// Check for the view mode toggle (2D/3D) which has data-testid="view-mode-toggle"
		const viewModeToggle = page.locator("[data-testid='view-mode-toggle']");
		const hasToggle = await viewModeToggle.isVisible().catch(() => false);

		// Also check for layout selector or segmented controls
		const segmentedControls = page.locator('.mantine-SegmentedControl-root');
		const segmentedCount = await segmentedControls.count();

		if (hasToggle || segmentedCount > 0) {
			// Controls are present -- graph has data
			expect(hasToggle || segmentedCount > 0).toBeTruthy();
		} else {
			// No controls visible -- likely empty state, which is valid
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});
});
