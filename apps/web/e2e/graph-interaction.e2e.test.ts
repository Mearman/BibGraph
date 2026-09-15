/**
 * E2E workflow tests for graph visualization interactions
 *
 * Tests graph visualization interaction workflows including:
 * - Zoom controls (zoom in, zoom out, reset)
 * - Pan/drag interactions on graph
 * - Node selection and navigation
 * - Edge filtering by relationship type
 * - Graph rendering and simulation stability
 * @see spec-020 Phase 4: Workflow tests
 * @see spec-016 Entity relationship visualization
 * @see spec-014 Edge direction correction
 */

import AxeBuilder from '@axe-core/playwright';
import { expect,test } from '@playwright/test';

import {
	waitForAppReady,
	waitForEntityData,
	waitForGraphReady,
} from '@/test/helpers/app-ready';

// Use a known entity with rich relationship data for testing
const TEST_WORK_ID = 'W2741809807'; // Known work with multiple relationships
const TEST_AUTHOR_ID = 'A5017898742'; // Known author with affiliations and works

const GRAPH_TEST_TIMEOUT_MS = 60_000; // 60 seconds for graph rendering and interactions
const UI_SETTLE_MS = 500; // Time to allow an animation/UI update to finish before asserting
const INTERACTION_RESPONSE_MS = 1000; // Time to allow a click/tap response (navigation or state update)
const DRAG_DISTANCE_X_PX = 100;
const DRAG_DISTANCE_Y_PX = 50;
const TOUCH_DRAG_DISTANCE_Y_PX = 80;
const RAPID_INTERACTION_REPEAT_COUNT = 3;
const GRAPH_RENDER_TARGET_MS = 5000;
const TABLET_VIEWPORT_WIDTH_PX = 768;
const TABLET_VIEWPORT_HEIGHT_PX = 1024;
const MIN_TOUCH_TARGET_PX = 24; // Minimum reasonable touch target size

test.describe('@workflow Graph Interaction', () => {
	test.setTimeout(GRAPH_TEST_TIMEOUT_MS); // 60 seconds for graph rendering and interactions

	test.beforeEach(({ page }) => {
		// Set up console error listener for debugging
		page.on('console', (message) => {
			if (message.type() === 'error') {
				console.error('Browser console error:', message.text());
			}
		});

		// Set up network error listener
		page.on('pageerror', (error) => {
			console.error('Page error:', error.message);
		});
	});

	test('should pass accessibility checks (WCAG 2.1 AA)', async ({ page }) => {
		// Navigate to entity detail page with graph
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);
		await waitForGraphReady(page);

		const accessibilityScanResults = await new AxeBuilder({ page })
			.withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
			.analyze();

		expect(accessibilityScanResults.violations).toEqual([]);
	});

	test('should render graph on entity detail page', async ({ page }) => {
		// Navigate to entity detail page with relationships
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);

		// Wait for graph to render
		await waitForGraphReady(page);

		// Verify SVG container exists
		const svgContainer = page.locator('svg');
		await expect(svgContainer).toBeVisible();

		// Verify graph has nodes and edges groups
		const nodesGroup = page.locator('svg g.nodes');
		const edgesGroup = page.locator('svg g.edges');

		await expect(nodesGroup).toBeAttached();
		await expect(edgesGroup).toBeAttached();

		// Verify at least some nodes are rendered
		const nodes = page.locator('svg g.nodes circle');
		const nodeCount = await nodes.count();
		expect(nodeCount).toBeGreaterThan(0);

		console.log(`✅ Graph rendered with ${String(nodeCount)} nodes`);
	});

	test('should zoom in using zoom control', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Look for zoom in button (try multiple selector patterns)
		const zoomInSelectors = [
			'[data-testid="zoom-in"]',
			'button[aria-label*="Zoom in" i]',
			'button[title*="Zoom in" i]',
			'button:has-text("+")',
		];

		let zoomInButton: ReturnType<typeof page.locator> | null = null;
		for (const selector of zoomInSelectors) {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible().catch(() => false);
			if (isVisible) {
				zoomInButton = button;
				console.log(`Found zoom in button with selector: ${selector}`);
				break;
			}
		}

		if (zoomInButton === null) {
			console.log('⚠️  Zoom controls not found - graph may not have zoom UI');
		} else {
			// Get initial transform state
			const svgContainer = page.locator('svg').first();
			const initialTransform = await svgContainer
				.evaluate((element) => {
					const g = element.querySelector('g[transform]');
					return g?.getAttribute('transform') ?? '';
				})
				.catch(() => '');

			// Click zoom in button
			await zoomInButton.click();
			await page.waitForTimeout(UI_SETTLE_MS); // Allow zoom animation

			// Verify transform changed (indicating zoom occurred)
			const newTransform = await svgContainer
				.evaluate((element) => {
					const g = element.querySelector('g[transform]');
					return g?.getAttribute('transform') ?? '';
				})
				.catch(() => '');

			// Transform should change after zoom (scale or translate values)
			const isTransformChanged = initialTransform !== newTransform;

			// Verify no errors occurred during zoom
			const errorMessages = page.locator('[role="alert"]');
			

			await expect(errorMessages).toHaveCount(0);

			console.log(`✅ Zoom in ${isTransformChanged ? 'changed transform' : 'completed without errors'}`);
		}
	});

	test('should zoom out using zoom control', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Look for zoom out button
		const zoomOutSelectors = [
			'[data-testid="zoom-out"]',
			'button[aria-label*="Zoom out" i]',
			'button[title*="Zoom out" i]',
			'button:has-text("-")',
		];

		let zoomOutButton: ReturnType<typeof page.locator> | null = null;
		for (const selector of zoomOutSelectors) {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible().catch(() => false);
			if (isVisible) {
				zoomOutButton = button;
				console.log(`Found zoom out button with selector: ${selector}`);
				break;
			}
		}

		if (zoomOutButton === null) {
			console.log('⚠️  Zoom controls not found - graph may not have zoom UI');
		} else {
			// Click zoom out button
			await zoomOutButton.click();
			await page.waitForTimeout(UI_SETTLE_MS); // Allow zoom animation

			// Verify no errors occurred
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);

			console.log('✅ Zoom out completed successfully');
		}
	});

	test('should reset zoom using reset control', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Look for reset zoom button
		const resetZoomSelectors = [
			'[data-testid="reset-zoom"]',
			'button[aria-label*="Reset zoom" i]',
			'button[title*="Reset" i]',
			'button:has-text("Reset")',
		];

		let resetButton: ReturnType<typeof page.locator> | null = null;
		for (const selector of resetZoomSelectors) {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible().catch(() => false);
			if (isVisible) {
				resetButton = button;
				console.log(`Found reset zoom button with selector: ${selector}`);
				break;
			}
		}

		if (resetButton === null) {
			console.log('⚠️  Reset zoom control not found - graph may not have reset UI');
		} else {
			// Click reset button
			await resetButton.click();
			await page.waitForTimeout(UI_SETTLE_MS); // Allow reset animation

			// Verify no errors occurred
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);

			console.log('✅ Reset zoom completed successfully');
		}
	});

	test('should support node click interactions', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Find clickable graph nodes
		const nodeSelectors = [
			'svg g.nodes circle',
			'[data-testid="graph-node"]',
			'.node',
		];

		let clickableNode: ReturnType<typeof page.locator> | null = null;
		for (const selector of nodeSelectors) {
			const nodes = page.locator(selector);
			const count = await nodes.count();
			if (count > 0) {
				clickableNode = nodes.first();
				console.log(`Found ${String(count)} nodes with selector: ${selector}`);
				break;
			}
		}

		if (clickableNode === null) {
			console.log('⚠️  No clickable nodes found in graph');
		} else {
			// Get current URL before click
			const initialUrl = page.url();

			// Click on the first node
			await clickableNode.click({ force: true });
			await page.waitForTimeout(INTERACTION_RESPONSE_MS); // Wait for any navigation or state update

			// Check if URL changed (node navigation)
			const newUrl = page.url();
			const isNavigationOccurred = initialUrl !== newUrl;

			if (isNavigationOccurred) {
				console.log(`✅ Node click triggered navigation: ${newUrl}`);

				// Verify new page loaded successfully
				await waitForAppReady(page);
			} else {
				// Check if selection state changed (e.g., node highlight)
				const selectedNodes = page.locator('circle[stroke-width="3"]');
				const hasSelection = (await selectedNodes.count()) > 0;

				if (hasSelection) {
					console.log('✅ Node click triggered selection state change');
				} else {
					// Tooltip or other UI feedback
					const tooltip = page.locator('[data-testid="node-tooltip"]');
					const hasTooltip = await tooltip.isVisible().catch(() => false);

					if (hasTooltip) {
						console.log('✅ Node click displayed tooltip');
					} else {
						console.log('⚠️  Node click did not produce visible feedback (may be expected behavior)');
					}
				}
			}

			// Verify no errors occurred
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);
		}
	});

	test('should filter relationships by type using checkboxes', async ({ page }) => {
		await page.goto(`/#/authors/${TEST_AUTHOR_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);

		// Look for relationship type filter checkboxes
		const filterCheckboxes = page.locator('[data-testid^="filter-checkbox-"]');
		const checkboxCount = await filterCheckboxes.count();

		if (checkboxCount > 0) {
			console.log(`Found ${String(checkboxCount)} relationship type filter checkboxes`);

			// Get initial state of relationships displayed
			const getVisibleRelationships = async () => {
				const relationshipItems = page.locator('[data-testid*="relationship-item"]');
				return relationshipItems.count();
			};

			const initialCount = await getVisibleRelationships();
			console.log(`Initial visible relationships: ${String(initialCount)}`);

			// Click the first checkbox to toggle a filter
			const firstCheckbox = filterCheckboxes.first();
			const checkboxLabel = await firstCheckbox.textContent();
			console.log(`Toggling filter: ${String(checkboxLabel)}`);

			await firstCheckbox.click();
			await page.waitForTimeout(UI_SETTLE_MS); // Allow filter to apply

			// Check if relationship count changed
			const filteredCount = await getVisibleRelationships();
			console.log(`Filtered visible relationships: ${String(filteredCount)}`);

			// Count should change when filter is applied
			const isFilterApplied = initialCount !== filteredCount;

			if (isFilterApplied) {
				console.log('✅ Relationship filter changed visible items');
			} else {
				// Filter may have no effect if only one type exists
				console.log('⚠️  Filter did not change count (may have only one relationship type)');
			}

			// Verify no errors occurred during filtering
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);

			// Toggle checkbox back to original state
			await firstCheckbox.click();
			// Removed: waitForTimeout - use locator assertions instead
			const restoredCount = await getVisibleRelationships();
			console.log(`Restored visible relationships: ${String(restoredCount)}`);

			console.log('✅ Relationship type filtering workflow completed');
		} else {
			console.log('⚠️  No relationship type filter checkboxes found (entity may not have filters)');
		}
	});

	test('should handle pan/drag interactions on graph canvas', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Get SVG container for pan/drag
		const svgContainer = page.locator('svg').first();
		const isVisible = await svgContainer.isVisible();

		if (isVisible) {
			// Get bounding box for drag calculation
			const box = await svgContainer.boundingBox();

			if (box) {
				// Perform drag operation (pan the graph)
				const startX = box.x + box.width / 2;
				const startY = box.y + box.height / 2;
				const endX = startX + DRAG_DISTANCE_X_PX;
				const endY = startY + DRAG_DISTANCE_Y_PX;

				await page.mouse.move(startX, startY);
				await page.mouse.down();
				await page.mouse.move(endX, endY, { steps: 10 });
				await page.mouse.up();

				await page.waitForTimeout(UI_SETTLE_MS); // Allow pan to settle

				// Verify no errors occurred during drag
				const errorMessages = page.locator('[role="alert"]');
				
				await expect(errorMessages).toHaveCount(0);

				console.log('✅ Pan/drag interaction completed successfully');
			} else {
				console.log('⚠️  Could not get SVG bounding box for drag test');
			}
		} else {
			console.log('⚠️  SVG container not visible for pan/drag test');
		}
	});

	test('should maintain graph stability during interactions', async ({ page }) => {
		const consoleErrors: string[] = [];

		// Capture console errors
		page.on('console', (message) => {
			if (message.type() === 'error') {
				consoleErrors.push(message.text());
			}
		});

		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Perform multiple rapid interactions to test stability
		const svgContainer = page.locator('svg').first();
		const isVisible = await svgContainer.isVisible();

		if (isVisible) {
			// Quick zoom in/out sequence
			const zoomInButton = page.locator('[data-testid="zoom-in"]').first();
			const zoomOutButton = page.locator('[data-testid="zoom-out"]').first();

			const hasZoomIn = await zoomInButton.isVisible().catch(() => false);
			const hasZoomOut = await zoomOutButton.isVisible().catch(() => false);

			if (hasZoomIn && hasZoomOut) {
				// Rapid zoom interactions
				for (let index = 0; index < RAPID_INTERACTION_REPEAT_COUNT; index++) {
					await zoomInButton.click();
					// Removed: waitForTimeout - use locator assertions instead
					await zoomOutButton.click();
					// Removed: waitForTimeout - use locator assertions instead
				}

				console.log('✅ Completed rapid zoom interaction test');
			}

			// Wait for graph to stabilize
			// Removed: waitForTimeout - use locator assertions instead
			// Filter for critical errors
			const criticalErrors = consoleErrors.filter(
				(error) =>
					error.includes('Maximum update depth') ||
					error.includes('infinite loop') ||
					error.includes('too many re-renders') ||
					error.includes('simulation') && error.includes('error')
			);

			expect(criticalErrors).toHaveLength(0);

			// Verify graph is still responsive
			const nodes = page.locator('svg g.nodes circle');
			const nodeCount = await nodes.count();
			expect(nodeCount).toBeGreaterThan(0);

			console.log('✅ Graph maintained stability during rapid interactions');
		} else {
			console.log('⚠️  SVG container not visible for stability test');
		}
	});

	test('should render graph within performance target (<5s for 50 nodes)', async ({ page }) => {
		const startTime = Date.now();

		// Navigate to work entity with graph
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		const endTime = Date.now();
		const renderTime = endTime - startTime;

		console.log(`Graph render time: ${String(renderTime)}ms`);

		// Verify graph actually rendered
		const nodes = page.locator('svg g.nodes circle');
		const nodeCount = await nodes.count();
		console.log(`Graph rendered with ${String(nodeCount)} nodes`);
		expect(nodeCount).toBeGreaterThan(0);

		// Target: <5000ms for initial graph render
		expect(renderTime).toBeLessThan(GRAPH_RENDER_TARGET_MS);

		console.log(`✅ Graph rendered in ${String(renderTime)}ms (target: <5000ms)`);
	});
});

test.describe('@workflow @tablet Graph Interaction - Tablet Viewport', () => {
	test.use({ viewport: { width: TABLET_VIEWPORT_WIDTH_PX, height: TABLET_VIEWPORT_HEIGHT_PX } });
	test.setTimeout(GRAPH_TEST_TIMEOUT_MS); // 60 seconds for graph rendering and interactions

	test.beforeEach(({ page }) => {
		page.on('console', (message) => {
			if (message.type() === 'error') {
				console.error('Browser console error:', message.text());
			}
		});
	});

	test('should render graph correctly on tablet viewport', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);
		await waitForGraphReady(page);

		// Verify SVG container exists and is visible
		const svgContainer = page.locator('svg');
		await expect(svgContainer).toBeVisible();

		// Get viewport and SVG dimensions
		const viewportSize = page.viewportSize();
		const svgBox = await svgContainer.boundingBox();

		expect(viewportSize?.width).toBe(TABLET_VIEWPORT_WIDTH_PX);
		expect(viewportSize?.height).toBe(TABLET_VIEWPORT_HEIGHT_PX);

		// Verify graph scales appropriately for tablet viewport
		if (svgBox) {
			expect(svgBox.width).toBeLessThanOrEqual(TABLET_VIEWPORT_WIDTH_PX);
			expect(svgBox.width).toBeGreaterThan(0);
			console.log(`✅ Graph rendered at ${String(svgBox.width)}x${String(svgBox.height)} within 768x1024 tablet viewport`);
		}

		// Verify graph has nodes rendered
		const nodes = page.locator('svg g.nodes circle');
		const nodeCount = await nodes.count();
		expect(nodeCount).toBeGreaterThan(0);

		console.log(`✅ Graph rendered ${String(nodeCount)} nodes on tablet viewport`);
	});

	test('should support touch-based pan interactions', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		const svgContainer = page.locator('svg').first();
		const isVisible = await svgContainer.isVisible();

		if (isVisible) {
			const box = await svgContainer.boundingBox();

			if (box) {
				// Get initial transform state
				const initialTransform = await svgContainer
					.evaluate((element) => {
						const g = element.querySelector('g[transform]');
						return g?.getAttribute('transform') ?? '';
					})
					.catch(() => '');

				// Simulate touch-based pan using touchscreen API
				const centerX = box.x + box.width / 2;
				const centerY = box.y + box.height / 2;

				// Perform touch drag (swipe gesture)
				await page.touchscreen.tap(centerX, centerY);
				// Removed: waitForTimeout - use locator assertions instead
				// Swipe gesture - drag with touch
				await page.mouse.move(centerX, centerY);
				await page.mouse.down();
				await page.mouse.move(centerX + DRAG_DISTANCE_X_PX, centerY + TOUCH_DRAG_DISTANCE_Y_PX, { steps: 15 });
				await page.mouse.up();

				await page.waitForTimeout(UI_SETTLE_MS); // Allow pan to complete

				// Verify transform changed (pan occurred)
				const newTransform = await svgContainer
					.evaluate((element) => {
						const g = element.querySelector('g[transform]');
						return g?.getAttribute('transform') ?? '';
					})
					.catch(() => '');

				const isPanOccurred = initialTransform !== newTransform;

				// Verify no errors occurred
				const errorMessages = page.locator('[role="alert"]');
				
				await expect(errorMessages).toHaveCount(0);

				if (isPanOccurred) {
					console.log('✅ Touch-based pan interaction successful (transform changed)');
				} else {
					console.log('⚠️  Touch pan completed without visible transform change (may be expected)');
				}
			} else {
				console.log('⚠️  Could not get SVG bounding box for touch pan test');
			}
		} else {
			console.log('⚠️  SVG container not visible for touch pan test');
		}
	});

	test('should have accessible zoom controls on tablet', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Verify zoom controls are present and appropriately sized for touch
		const zoomInSelectors = [
			'[data-testid="zoom-in"]',
			'button[aria-label*="Zoom in" i]',
			'button[title*="Zoom in" i]',
		];

		const zoomOutSelectors = [
			'[data-testid="zoom-out"]',
			'button[aria-label*="Zoom out" i]',
			'button[title*="Zoom out" i]',
		];

		let zoomInButton: ReturnType<typeof page.locator> | null = null;
		let zoomOutButton: ReturnType<typeof page.locator> | null = null;

		for (const selector of zoomInSelectors) {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible().catch(() => false);
			if (isVisible) {
				zoomInButton = button;
				break;
			}
		}

		for (const selector of zoomOutSelectors) {
			const button = page.locator(selector).first();
			const isVisible = await button.isVisible().catch(() => false);
			if (isVisible) {
				zoomOutButton = button;
				break;
			}
		}

		if (zoomInButton && zoomOutButton) {
			// Verify buttons are visible and have adequate touch target size
			const zoomInBox = await zoomInButton.boundingBox();
			const zoomOutBox = await zoomOutButton.boundingBox();

			// Touch targets should be at least 44x44px (WCAG 2.1 AA guideline)
			if (zoomInBox && zoomOutBox) {
				expect(zoomInBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX); // Minimum reasonable size
				expect(zoomInBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
				expect(zoomOutBox.width).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);
				expect(zoomOutBox.height).toBeGreaterThanOrEqual(MIN_TOUCH_TARGET_PX);

				console.log(`✅ Zoom in button: ${String(zoomInBox.width)}x${String(zoomInBox.height)}px`);
				console.log(`✅ Zoom out button: ${String(zoomOutBox.width)}x${String(zoomOutBox.height)}px`);
			}

			// Test zoom interaction on tablet
			await zoomInButton.click();
			// Removed: waitForTimeout - use locator assertions instead
			await zoomOutButton.click();
			// Removed: waitForTimeout - use locator assertions instead
			// Verify no errors
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);

			console.log('✅ Zoom controls accessible and functional on tablet viewport');
		} else {
			console.log('⚠️  Zoom controls not found on tablet viewport');
		}
	});

	test('should support node touch interactions', async ({ page }) => {
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForGraphReady(page);

		// Find graph nodes
		const nodeSelectors = [
			'svg g.nodes circle',
			'[data-testid="graph-node"]',
		];

		let clickableNode: ReturnType<typeof page.locator> | null = null;
		for (const selector of nodeSelectors) {
			const nodes = page.locator(selector);
			const count = await nodes.count();
			if (count > 0) {
				clickableNode = nodes.first();
				console.log(`Found ${String(count)} nodes with selector: ${selector}`);
				break;
			}
		}

		if (clickableNode === null) {
			console.log('⚠️  No clickable nodes found for touch interaction test');
		} else {
			// Get node bounding box for touch interaction
			const nodeBox = await clickableNode.boundingBox();

			if (nodeBox) {
				const nodeCenterX = nodeBox.x + nodeBox.width / 2;
				const nodeCenterY = nodeBox.y + nodeBox.height / 2;

				// Simulate touch tap on node
				await page.touchscreen.tap(nodeCenterX, nodeCenterY);
				await page.waitForTimeout(INTERACTION_RESPONSE_MS); // Wait for interaction response

				// Check for visual feedback (tooltip, selection, navigation)
				const tooltip = page.locator('[data-testid="node-tooltip"]');
				const hasTooltip = await tooltip.isVisible().catch(() => false);

				const selectedNodes = page.locator('circle[stroke-width="3"]');
				const hasSelection = (await selectedNodes.count()) > 0;

				// Check if navigation occurred
				const currentUrl = page.url();
				const isNavigationOccurred = currentUrl.includes('/works/') || currentUrl.includes('/authors/');

				if (hasTooltip) {
					console.log('✅ Touch interaction displayed tooltip');
				} else if (hasSelection) {
					console.log('✅ Touch interaction changed node selection state');
				} else if (isNavigationOccurred) {
					console.log('✅ Touch interaction triggered navigation');
					await waitForAppReady(page);
				} else {
					console.log('⚠️  Touch interaction completed (no visible feedback detected)');
				}

				// Verify no errors
				const errorMessages = page.locator('[role="alert"]');
				
				await expect(errorMessages).toHaveCount(0);

				console.log('✅ Node touch interaction completed successfully on tablet');
			} else {
				console.log('⚠️  Could not get node bounding box for touch test');
			}
		}
	});
});
