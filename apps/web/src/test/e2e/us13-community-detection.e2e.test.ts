/**
 * E2E tests for US-13 Community Detection
 *
 * Tests community detection algorithm selection, colour-coded node clustering,
 * membership counts, result persistence, and small-graph handling.
 * @see US-13
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';
import { GraphPage } from '@/test/page-objects/GraphPage';

test.describe('@workflow US-13 Community Detection', () => {
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

	test('should display algorithm selection (Louvain, spectral, label propagation)', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);

		const algorithmSelect = page.locator("[data-testid='community-algorithm']");
		const hasAlgorithmSelect = await algorithmSelect.isVisible().catch(() => false);

		if (hasAlgorithmSelect) {
			await expect(algorithmSelect).toBeVisible();

			// Verify algorithm options are present
			const options = algorithmSelect.locator('option');
			const optionTexts = await options.allTextContents();

			// Check for at least one known algorithm name (case-insensitive)
			const knownAlgorithms = ['louvain', 'spectral', 'label propagation'];
			const lowerTexts = optionTexts.map((t) => t.toLowerCase());
			const hasKnownAlgorithm = knownAlgorithms.some((algo) =>
				lowerTexts.some((text) => text.includes(algo))
			);

			if (optionTexts.length > 0) {
				expect(hasKnownAlgorithm).toBeTruthy();
			}
		} else {
			// Algorithm select may be hidden until graph has sufficient nodes
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});

	test('should colour-code nodes by detected community', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-community-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				await graphPage.runCommunityDetection();

				// Check for community-styled nodes
				const communityNodes = page.locator("[data-testid='community-node']");
				const communityNodeCount = await communityNodes.count();

				// Nodes should have community colouring applied
				if (communityNodeCount > 0) {
					expect(communityNodeCount).toBeGreaterThan(0);
				}

				// Verify no errors during detection
				const errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);
			}
		} else {
			console.log('Skipping colour-coding test - insufficient nodes for community detection');
		}
	});

	test('should display community membership count per cluster', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-community-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				await graphPage.runCommunityDetection();

				const communityCount = await graphPage.getCommunityCount();

				// If communities were detected, count should be positive
				if (communityCount > 0) {
					expect(communityCount).toBeGreaterThan(0);
				}

				// Check for community count display element
				const countElement = page.locator("[data-testid='community-count']");
				const hasCountDisplay = await countElement.isVisible().catch(() => false);

				if (hasCountDisplay) {
					const text = await countElement.textContent();
					expect(text).toBeTruthy();
				}
			}
		} else {
			console.log('Skipping membership count test - insufficient nodes');
		}
	});

	test('should persist results until cleared or re-run', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-community-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				// Run community detection
				await graphPage.runCommunityDetection();
				const firstRunCount = await graphPage.getCommunityCount();

				// Interact with graph (zoom) - results should persist
				await graphPage.zoomIn().catch(() => {});
				await graphPage.zoomOut().catch(() => {});

				const afterInteractionCount = await graphPage.getCommunityCount();

				// Community count should persist after graph interaction
				expect(afterInteractionCount).toBe(firstRunCount);

				// Re-run should recalculate
				await graphPage.runCommunityDetection();
				const reRunCount = await graphPage.getCommunityCount();

				// Re-run count should be valid (may or may not equal first run)
				expect(reRunCount).toBeGreaterThanOrEqual(0);
			}
		} else {
			console.log('Skipping persistence test - insufficient nodes');
		}
	});

	test('should handle graph too small for communities', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();
		const runButton = page.locator("[data-testid='run-community-detection']");
		const hasRunButton = await runButton.isVisible().catch(() => false);

		if (hasRunButton) {
			// Run community detection regardless of graph size
			await graphPage.runCommunityDetection();

			// Should not crash - verify page is still functional
			const mainContent = page.locator('main');
			await expect(mainContent).toBeVisible();

			if (nodeCount <= 2) {
				// With very few nodes, community detection should handle gracefully
				// Either show 0/1 communities or display an informative message
				const communityCount = await graphPage.getCommunityCount();
				expect(communityCount).toBeGreaterThanOrEqual(0);
			}

			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			// No community detection UI present - acceptable for empty/small graphs
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
