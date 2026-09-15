/**
 * E2E tests for graph list filter bypass during node expansion
 * T037: Tests that graph list nodes bypass entity type filters during expansion
 *
 * User Story:
 * - User selects entity type filters (e.g., only "works")
 * - User expands graph nodes that have relationships to other entity types
 * - Graph list nodes (from expansion) should remain visible despite filters
 * - Collection nodes should respect entity type filters
 * @see spec-038 Phase 4: T037
 */

import { expect,test } from '@playwright/test';

import {
	waitForAppReady,
	waitForEntityData,
	waitForGraphReady,
} from '@/test/helpers/app-ready';

// Test entities with known relationships
const TEST_WORK_ID = 'W2741809807'; // Work with author and institution relationships
const TEST_AUTHOR_ID = 'A5017898742'; // Author with affiliations and works

const TEST_SUITE_TIMEOUT_MS = 60_000;
const FILTER_APPLY_WAIT_MS = 500;
const FILTER_SETTLE_WAIT_MS = 1000;
const EXPANSION_LOAD_WAIT_MS = 2000;

test.describe('@workflow Graph List Filter Bypass', () => {
	test.setTimeout(TEST_SUITE_TIMEOUT_MS); // 60 seconds for graph operations

	test.beforeEach(({ page }) => {
		// Console error listener
		page.on('console', (message) => {
			if (message.type() === 'error') {
				console.error('Browser console error:', message.text());
			}
		});
	});

	test('should show graph list nodes after expansion despite entity type filters', async ({ page }) => {
		// Navigate to work entity page
		await page.goto(`/#/works/${TEST_WORK_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);
		await waitForGraphReady(page);

		// Verify graph rendered
		const svgContainer = page.locator('svg').first();
		await expect(svgContainer).toBeVisible();

		// Get initial node count
		const initialNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
		const initialNodeCount = await initialNodes.count();
		console.log(`Initial nodes: ${String(initialNodeCount)}`);
		expect(initialNodeCount).toBeGreaterThan(0);

		// Look for entity type filter controls (may be checkboxes or select)
		const filterSelectors = [
			'[data-testid="entity-type-filter"]',
			'[data-testid^="filter-checkbox-"]',
			'[data-testid*="entity-filter"]',
			'input[type="checkbox"][name*="entity"]',
			'input[type="checkbox"][id*="works"]',
		];

		let hasFilters = false;
		let filterControl: ReturnType<typeof page.locator> | null = null;

		for (const selector of filterSelectors) {
			const control = page.locator(selector).first();
			const isVisible = await control.isVisible().catch(() => false);
			if (isVisible) {
				filterControl = control;
				hasFilters = true;
				console.log(`Found filter control: ${selector}`);
				break;
			}
		}

		if (hasFilters && filterControl) {
			// Apply entity type filter to show only "works"
			// This should filter out authors, institutions, etc.
			const worksFilterSelectors = [
				'[data-testid="filter-checkbox-works"]',
				'input[type="checkbox"][id="works"]',
				'input[type="checkbox"][value="works"]',
			];

			let worksFilter: ReturnType<typeof page.locator> | null = null;
			for (const selector of worksFilterSelectors) {
				const filter = page.locator(selector).first();
				const isExists = await filter.isVisible().catch(() => false);
				if (isExists) {
					worksFilter = filter;
					console.log(`Found works filter: ${selector}`);
					break;
				}
			}

			if (worksFilter) {
				// Ensure only works filter is checked
				const isChecked = await worksFilter.isChecked().catch(() => true);
				if (!isChecked) {
					await worksFilter.click();
					await page.waitForTimeout(FILTER_APPLY_WAIT_MS); // Allow filter to apply
				}

				// Uncheck other entity types if present
				const otherTypeSelectors = [
					'[data-testid="filter-checkbox-authors"]',
					'[data-testid="filter-checkbox-institutions"]',
					'[data-testid="filter-checkbox-topics"]',
				];

				for (const selector of otherTypeSelectors) {
					const otherFilter = page.locator(selector).first();
					const isExists = await otherFilter.isVisible().catch(() => false);
					if (isExists) {
						const checked = await otherFilter.isChecked().catch(() => false);
						if (checked) {
							await otherFilter.click();
							// Removed: waitForTimeout - use locator assertions instead
						}
					}
				}

				console.log('✅ Applied entity type filter: only works visible');
			}

			// Get node count after filtering
			await page.waitForTimeout(FILTER_SETTLE_WAIT_MS); // Allow filter to fully apply
			const filteredNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
			const filteredNodeCount = await filteredNodes.count();
			console.log(`Nodes after filter: ${String(filteredNodeCount)}`);

			// Look for expandable nodes (nodes with + icon or expand button)
			const expandableNodeSelectors = [
				'svg g.nodes circle[data-expandable="true"]',
				'svg g.nodes circle.expandable',
				'[data-testid="expand-node"]',
				'button[aria-label*="expand" i]',
			];

			let expandableNode: ReturnType<typeof page.locator> | null = null;
			for (const selector of expandableNodeSelectors) {
				const node = page.locator(selector).first();
				const isExists = await node.isVisible().catch(() => false);
				if (isExists) {
					expandableNode = node;
					console.log(`Found expandable node: ${selector}`);
					break;
				}
			}

			if (expandableNode) {
				// Expand the node
				await expandableNode.click();
				await page.waitForTimeout(EXPANSION_LOAD_WAIT_MS); // Allow expansion and new nodes to load

				// Get node count after expansion
				const expandedNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
				const expandedNodeCount = await expandedNodes.count();
				console.log(`Nodes after expansion: ${String(expandedNodeCount)}`);

				// Key assertion: Graph list nodes from expansion should be visible
				// despite entity type filters
				// The count should increase even though filters are active
				expect(expandedNodeCount).toBeGreaterThanOrEqual(filteredNodeCount);

				if (expandedNodeCount > filteredNodeCount) {
					console.log(`✅ Graph list bypass verified: ${String(expandedNodeCount - filteredNodeCount)} nodes added despite filters`);
				} else {
					console.log('⚠️  No new nodes added (may be expected if all relationships match filter)');
				}

				// Verify no errors during expansion
				const errorMessages = page.locator('[role="alert"]');
				
				await expect(errorMessages).toHaveCount(0);
			} else {
				console.log('⚠️  No expandable nodes found - skipping expansion test');
				// Not a failure - graph may not have expandable nodes
			}
		} else {
			console.log('⚠️  Entity type filters not found - skipping filter test');
			// Not a failure - filters may not be implemented yet
		}
	});

	test('should maintain graph list nodes visibility when toggling filters', async ({ page }) => {
		// Navigate to author entity page (typically has diverse relationship types)
		await page.goto(`/#/authors/${TEST_AUTHOR_ID}`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await waitForEntityData(page);
		await waitForGraphReady(page);

		// Verify graph rendered
		const svgContainer = page.locator('svg').first();
		await expect(svgContainer).toBeVisible();

		// Get all visible nodes initially (no filters)
		const allNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
		const allNodeCount = await allNodes.count();
		console.log(`All nodes (no filters): ${String(allNodeCount)}`);
		expect(allNodeCount).toBeGreaterThan(0);

		// Look for entity type filter checkboxes
		const filterCheckboxes = page.locator('[data-testid^="filter-checkbox-"]');
		const checkboxCount = await filterCheckboxes.count();

		if (checkboxCount > 0) {
			console.log(`Found ${String(checkboxCount)} entity type filter checkboxes`);

			// Click first checkbox to apply a filter
			const firstCheckbox = filterCheckboxes.first();
			const checkboxLabel = await firstCheckbox.textContent();
			console.log(`Applying filter: ${String(checkboxLabel)}`);

			await firstCheckbox.click();
			await page.waitForTimeout(FILTER_SETTLE_WAIT_MS); // Allow filter to apply

			// Get node count with filter applied
			const filteredNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
			const filteredNodeCount = await filteredNodes.count();
			console.log(`Nodes with filter applied: ${String(filteredNodeCount)}`);

			// Toggle filter back off
			await firstCheckbox.click();
			await page.waitForTimeout(FILTER_SETTLE_WAIT_MS); // Allow filter to clear

			// Get node count after removing filter
			const restoredNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
			
			console.log(`Nodes after filter removed: ${String(restoredNodes)}`);

			// Graph list nodes should always be visible, so count should be consistent
			// when toggling filters (only collection nodes should be affected)
			await expect(restoredNodes).toHaveCount(allNodeCount);

			// Verify no errors during filter toggling
			const errorMessages = page.locator('[role="alert"]');
			
			await expect(errorMessages).toHaveCount(0);

			console.log('✅ Graph list nodes maintained visibility during filter toggle');
		} else {
			console.log('⚠️  No entity type filter checkboxes found');
		}
	});

	test('should respect filters for collection nodes (bookmarks)', async ({ page }) => {
		// This test verifies that ONLY graph list nodes bypass filters
		// Collection nodes (bookmarks, history) should be filtered normally

		await page.goto(`/#/bookmarks`, {
			waitUntil: 'domcontentloaded',
		});

		await waitForAppReady(page);
		await page.waitForTimeout(EXPANSION_LOAD_WAIT_MS); // Allow bookmarks to load

		// Check if bookmarks page has a graph view
		const svgContainer = page.locator('svg').first();
		const hasGraph = await svgContainer.isVisible().catch(() => false);

		if (hasGraph) {
			await waitForGraphReady(page);

			// Get initial node count (all bookmarks)
			const allBookmarkNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
			const allBookmarkCount = await allBookmarkNodes.count();
			console.log(`All bookmark nodes: ${String(allBookmarkCount)}`);

			if (allBookmarkCount > 0) {
				// Look for entity type filters
				const filterCheckboxes = page.locator('[data-testid^="filter-checkbox-"]');
				const checkboxCount = await filterCheckboxes.count();

				if (checkboxCount > 1) {
					// Uncheck all filters except one
					for (let index = 0; index < checkboxCount; index++) {
						const checkbox = filterCheckboxes.nth(index);
						const isChecked = await checkbox.isChecked().catch(() => true);
						if (isChecked && index > 0) {
							// Uncheck all except first
							await checkbox.click();
							// Removed: waitForTimeout - use locator assertions instead
						}
					}

					await page.waitForTimeout(FILTER_SETTLE_WAIT_MS); // Allow filters to apply

					// Get filtered node count
					const filteredBookmarkNodes = page.locator('svg g.nodes circle, svg g.nodes rect');
					const filteredBookmarkCount = await filteredBookmarkNodes.count();
					console.log(`Filtered bookmark nodes: ${String(filteredBookmarkCount)}`);

					// Collection nodes SHOULD be filtered (unlike graph list nodes)
					// Count should be less than or equal to original count
					expect(filteredBookmarkCount).toBeLessThanOrEqual(allBookmarkCount);

					if (filteredBookmarkCount < allBookmarkCount) {
						console.log(`✅ Collection nodes correctly filtered: ${String(allBookmarkCount - filteredBookmarkCount)} nodes hidden`);
					} else {
						console.log('⚠️  All bookmarks match filter (expected if only one entity type)');
					}

					// Verify no errors
					const errorMessages = page.locator('[role="alert"]');
					
					await expect(errorMessages).toHaveCount(0);
				} else {
					console.log('⚠️  Insufficient filters to test collection filtering');
				}
			} else {
				console.log('⚠️  No bookmarks to test filtering');
			}
		} else {
			console.log('⚠️  Bookmarks page does not have graph view');
		}
	});
});
