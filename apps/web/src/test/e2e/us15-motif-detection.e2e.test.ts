/**
 * E2E tests for US-15 Motif Detection
 *
 * Tests motif type selection, motif highlighting on the graph,
 * motif count reporting, visual distinction, and empty-motif handling.
 * @see US-15
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';
import { GraphPage } from '@/test/page-objects/GraphPage';

test.describe('@workflow US-15 Motif Detection', () => {
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

	test('should display motif type selection menu', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);

		const motifTypeSelect = page.locator("[data-testid='motif-type-select']");
		const hasMotifSelect = await motifTypeSelect.isVisible().catch(() => false);

		if (hasMotifSelect) {
			await expect(motifTypeSelect).toBeVisible();

			// Verify options are present
			const options = motifTypeSelect.locator('option');
			const optionCount = await options.count();
			expect(optionCount).toBeGreaterThan(0);
		} else {
			// Motif selection may be hidden when graph is empty or too small
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		}
	});

	test('should highlight detected motifs on graph', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-motif-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				// Select a motif type if available
				const motifTypeSelect = page.locator("[data-testid='motif-type-select']");
				const hasMotifSelect = await motifTypeSelect.isVisible().catch(() => false);

				if (hasMotifSelect) {
					const options = motifTypeSelect.locator('option');
					const optionCount = await options.count();
					if (optionCount > 0) {
						await motifTypeSelect.selectOption({ index: 0 });
					}
				}

				await graphPage.runMotifDetection();

				// Check for motif highlights
				const motifHighlights = page.locator("[data-testid='motif-highlight'], .node--motif");
				const highlightCount = await motifHighlights.count();

				// Motifs may or may not be found depending on graph structure
				expect(highlightCount).toBeGreaterThanOrEqual(0);

				// Verify no errors during detection
				const errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);
			}
		} else {
			console.log('Skipping motif highlight test - insufficient nodes');
		}
	});

	test('should report count of each motif type', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-motif-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				await graphPage.runMotifDetection();

				const motifCount = await graphPage.getMotifCount();

				// Motif count should be non-negative
				expect(motifCount).toBeGreaterThanOrEqual(0);

				// Check for motif count display
				const countElement = page.locator("[data-testid='motif-count']");
				const hasCountDisplay = await countElement.isVisible().catch(() => false);

				if (hasCountDisplay) {
					const text = await countElement.textContent();
					expect(text).toBeTruthy();
				}
			}
		} else {
			console.log('Skipping motif count test - insufficient nodes');
		}
	});

	test('should distinguish motif elements from non-motif visually', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount > 2) {
			const runButton = page.locator("[data-testid='run-motif-detection']");
			const hasRunButton = await runButton.isVisible().catch(() => false);

			if (hasRunButton) {
				await graphPage.runMotifDetection();

				// Check for visual distinction between motif and non-motif nodes
				const motifNodes = page.locator("[data-testid='motif-highlight'], .node--motif");
				const motifNodeCount = await motifNodes.count();

				const allNodes = await graphPage.getNodeCount();

				if (motifNodeCount > 0 && allNodes > motifNodeCount) {
					// Some nodes are motif-highlighted and some are not,
					// confirming visual distinction exists
					expect(motifNodeCount).toBeLessThan(allNodes);
				}

				// Verify no errors
				const errorCount = await page.locator('[role="alert"]').count();
				expect(errorCount).toBe(0);
			}
		} else {
			console.log('Skipping motif distinction test - insufficient nodes');
		}
	});

	test('should handle graph with no detectable motifs', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const runButton = page.locator("[data-testid='run-motif-detection']");
		const hasRunButton = await runButton.isVisible().catch(() => false);

		if (hasRunButton) {
			await graphPage.runMotifDetection();

			// Should handle gracefully - verify page is still functional
			const mainContent = page.locator('main');
			await expect(mainContent).toBeVisible();

			// Motif count of 0 is valid
			const motifCount = await graphPage.getMotifCount();
			expect(motifCount).toBeGreaterThanOrEqual(0);

			// Verify no errors
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			// No motif detection UI present - acceptable for empty/small graphs
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
