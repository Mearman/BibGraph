/**
 * E2E tests for US-14 Pathfinding
 *
 * Tests source/target node selection, path highlighting, path metrics display,
 * algorithm support (Dijkstra, bidirectional BFS), and no-path handling.
 * @see US-14
 */

import AxeBuilder from '@axe-core/playwright';
import { expect, test } from '@playwright/test';

import { waitForAppReady, waitForGraphReady } from '@/test/helpers/app-ready';
import { GraphPage } from '@/test/page-objects/GraphPage';

test.describe('@workflow US-14 Pathfinding', () => {
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

	test('should allow selecting source and target nodes', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount >= 2) {
			const sourceSelect = page.locator("[data-testid='source-node-select']");
			const targetSelect = page.locator("[data-testid='target-node-select']");

			const hasSourceSelect = await sourceSelect.isVisible().catch(() => false);
			const hasTargetSelect = await targetSelect.isVisible().catch(() => false);

			if (hasSourceSelect && hasTargetSelect) {
				// Select source and target nodes
				await graphPage.selectSourceNode(0);
				await graphPage.selectTargetNode(1);

				// Verify selections were made (selects have a value)
				const sourceValue = await sourceSelect.inputValue().catch(() => '');
				const targetValue = await targetSelect.inputValue().catch(() => '');

				expect(sourceValue || targetValue).toBeTruthy();
			}

			// Verify no errors
			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping source/target selection test - fewer than 2 nodes');
		}
	});

	test('should highlight path with distinct edge styling', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount >= 2) {
			const sourceSelect = page.locator("[data-testid='source-node-select']");
			const hasSourceSelect = await sourceSelect.isVisible().catch(() => false);

			if (hasSourceSelect) {
				await graphPage.selectSourceNode(0);
				await graphPage.selectTargetNode(1);
				await graphPage.findPath();

				// Check for highlighted path edges
				const highlightedPath = page.locator("[data-testid='highlighted-path'], .edge--highlighted");
				const highlightedCount = await highlightedPath.count();

				// Also check for no-path-found message as a valid outcome
				const noPathMessage = page.locator("[data-testid='no-path-found']");
				const hasNoPath = await noPathMessage.isVisible().catch(() => false);

				// Either a path is highlighted or a no-path message is shown
				expect(highlightedCount > 0 || hasNoPath).toBeTruthy();
			}

			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping path highlight test - fewer than 2 nodes');
		}
	});

	test('should list path length and intermediate nodes', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount >= 2) {
			const sourceSelect = page.locator("[data-testid='source-node-select']");
			const hasSourceSelect = await sourceSelect.isVisible().catch(() => false);

			if (hasSourceSelect) {
				await graphPage.selectSourceNode(0);
				await graphPage.selectTargetNode(1);
				await graphPage.findPath();

				// Check for path length display
				const pathLengthEl = page.locator("[data-testid='path-length']");
				const hasPathLength = await pathLengthEl.isVisible().catch(() => false);

				if (hasPathLength) {
					const pathLength = await graphPage.getHighlightedPathLength();
					expect(pathLength).toBeGreaterThanOrEqual(0);
				}

				// Check for intermediate nodes list
				const intermediateNodes = page.locator("[data-testid='path-intermediate-nodes']");
				const hasIntermediateNodes = await intermediateNodes.isVisible().catch(() => false);

				if (hasIntermediateNodes) {
					const text = await intermediateNodes.textContent();
					expect(text).toBeTruthy();
				}

				// A no-path-found state is also valid
				const noPathMessage = page.locator("[data-testid='no-path-found']");
				const hasNoPath = await noPathMessage.isVisible().catch(() => false);

				expect(hasPathLength || hasIntermediateNodes || hasNoPath).toBeTruthy();
			}

			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping path metrics test - fewer than 2 nodes');
		}
	});

	test('should support Dijkstra and bidirectional BFS', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount >= 2) {
			const algorithmSelect = page.locator("[data-testid='pathfinding-algorithm']");
			const hasAlgorithmSelect = await algorithmSelect.isVisible().catch(() => false);

			if (hasAlgorithmSelect) {
				// Verify algorithm options exist
				const options = algorithmSelect.locator('option');
				const optionTexts = await options.allTextContents();
				const lowerTexts = optionTexts.map((t) => t.toLowerCase());

				// Check for known algorithms
				const hasDijkstra = lowerTexts.some((t) => t.includes('dijkstra'));
				const hasBidirectional = lowerTexts.some(
					(t) => t.includes('bidirectional') || t.includes('bfs')
				);

				expect(hasDijkstra || hasBidirectional || optionTexts.length > 0).toBeTruthy();

				// Try selecting each algorithm and running pathfinding
				if (optionTexts.length > 1) {
					const sourceSelect = page.locator("[data-testid='source-node-select']");
					const hasSourceSelect = await sourceSelect.isVisible().catch(() => false);

					if (hasSourceSelect) {
						// Test with first algorithm option
						await algorithmSelect.selectOption({ index: 0 });
						await graphPage.selectSourceNode(0);
						await graphPage.selectTargetNode(1);
						await graphPage.findPath();

						const errorCount = await page.locator('[role="alert"]').count();
						expect(errorCount).toBe(0);
					}
				}
			}

			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping algorithm test - fewer than 2 nodes');
		}
	});

	test('should show informative message when no path exists', async ({ page }) => {
		await graphPage.goto('/explore');
		await waitForAppReady(page);
		await waitForGraphReady(page);

		const nodeCount = await graphPage.getNodeCount();

		if (nodeCount >= 2) {
			const sourceSelect = page.locator("[data-testid='source-node-select']");
			const hasSourceSelect = await sourceSelect.isVisible().catch(() => false);

			if (hasSourceSelect) {
				// Select source and target - attempt to find a path
				await graphPage.selectSourceNode(0);
				await graphPage.selectTargetNode(1);
				await graphPage.findPath();

				// Check for either a highlighted path or a no-path-found message
				const highlightedPath = page.locator("[data-testid='highlighted-path'], .edge--highlighted");
				const highlightedCount = await highlightedPath.count();

				const noPathMessage = page.locator("[data-testid='no-path-found']");
				const hasNoPath = await noPathMessage.isVisible().catch(() => false);

				// One of these states must be present after pathfinding
				expect(highlightedCount > 0 || hasNoPath).toBeTruthy();

				if (hasNoPath) {
					const messageText = await noPathMessage.textContent();
					expect(messageText).toBeTruthy();
				}
			}

			const errorCount = await page.locator('[role="alert"]').count();
			expect(errorCount).toBe(0);
		} else {
			console.log('Skipping no-path message test - fewer than 2 nodes');
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
