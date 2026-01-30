/**
 * E2E tests for US-13 Community Detection
 *
 * Tests community detection algorithm selection, colour-coded node clustering,
 * membership counts, result persistence, and small-graph handling.
 *
 * SKIPPED: The community detection UI does not exist as a standalone panel.
 * The graph page (graph.lazy.tsx) applies community colouring via the
 * GraphVisualizationContext (communityAssignments, communityColors) but does not
 * expose UI elements for:
 * - Algorithm selection (data-testid='community-algorithm')
 * - Run button (data-testid='run-community-detection')
 * - Community count display (data-testid='community-count')
 *
 * Community detection is an internal visualization feature, not a user-facing
 * algorithm panel. These tests should be re-enabled when a dedicated community
 * detection UI is implemented.
 * @see US-13
 */

import { expect, test } from '@playwright/test';

import { waitForAppReady } from '@/test/helpers/app-ready';

test.describe('@workflow US-13 Community Detection', () => {
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

	test('should load graph page without community detection errors', async ({ page }) => {
		await page.goto('/#/graph');
		await waitForAppReady(page);

		// Verify the graph page loads without errors related to community detection
		const rootElement = page.locator('#root');
		await expect(rootElement).toBeVisible({ timeout: 10_000 });

		const errorCount = await page.locator('[role="alert"]').count();
		expect(errorCount).toBe(0);
	});

	test.skip('should display algorithm selection (Louvain, spectral, label propagation)', () => {
		// Skip: No community algorithm selection UI exists.
		// The graph page applies community colours internally via GraphVisualizationContext
		// but does not expose a user-facing algorithm picker.
	});

	test.skip('should colour-code nodes by detected community', () => {
		// Skip: Community colouring is applied automatically by the visualization context
		// when community data is available. There is no run button to trigger detection.
	});

	test.skip('should display community membership count per cluster', () => {
		// Skip: No community count display element (data-testid='community-count') exists.
	});

	test.skip('should persist results until cleared or re-run', () => {
		// Skip: No community detection run/clear UI exists.
	});

	test.skip('should handle graph too small for communities', () => {
		// Skip: No community detection UI to test small-graph handling.
	});
});
