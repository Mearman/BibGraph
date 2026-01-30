/**
 * Explore Page Object
 *
 * Represents the Explore page with graph visualization in BibGraph.
 * Handles D3 force simulation graph interactions, zoom controls, and node interactions.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → ExplorePage
 * @see spec-020 Phase 1: Utility pages
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForGraphReady } from "../helpers/app-ready";
import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class ExplorePage extends BaseSPAPageObject {
	// Explore-specific selectors
	protected readonly exploreSelectors = {
		graphContainer: "[data-testid='graph-container']",
		graphContainerFallback: "svg",
		graphNode: "[data-testid='graph-node']",
		graphNodeFallback: ".node",
		graphEdge: "[data-testid='graph-edge']",
		graphEdgeFallback: ".edge",
		zoomControls: "[data-testid='zoom-controls']",
		zoomIn: "[data-testid='zoom-in']",
		zoomOut: "[data-testid='zoom-out']",
		resetZoom: "[data-testid='reset-zoom']",
		nodeTooltip: "[data-testid='node-tooltip']",
	};

	constructor(page: Page) {
		super(page);
	}

	/**
	 * Navigate to the Explore page
	 */
	async gotoExplore(): Promise<void> {
		await this.goto("#/explore");
		await this.waitForGraphReady();
	}

	/**
	 * Get the number of visible graph nodes
	 */
	async getNodeCount(): Promise<number> {
		// Try primary selector first, fall back to class-based selector
		const primaryNodes = this.page.locator(this.exploreSelectors.graphNode);
		const primaryCount = await primaryNodes.count();

		if (primaryCount > 0) {
			return primaryCount;
		}

		const fallbackNodes = this.page.locator(this.exploreSelectors.graphNodeFallback);
		return fallbackNodes.count();
	}

	/**
	 * Get the number of visible graph edges
	 */
	async getEdgeCount(): Promise<number> {
		// Try primary selector first, fall back to class-based selector
		const primaryEdges = this.page.locator(this.exploreSelectors.graphEdge);
		const primaryCount = await primaryEdges.count();

		if (primaryCount > 0) {
			return primaryCount;
		}

		const fallbackEdges = this.page.locator(this.exploreSelectors.graphEdgeFallback);
		return fallbackEdges.count();
	}

	/**
	 * Click a graph node by index
	 * @param index
	 */
	async clickNode(index: number): Promise<void> {
		// Try primary selector first
		const primaryNodes = this.page.locator(this.exploreSelectors.graphNode);
		const primaryCount = await primaryNodes.count();

		if (primaryCount > 0) {
			await primaryNodes.nth(index).click();
		} else {
			// Fall back to class-based selector
			const fallbackNodes = this.page.locator(this.exploreSelectors.graphNodeFallback);
			await fallbackNodes.nth(index).click();
		}

		// Wait for any tooltip or state update
		await this.page.waitForTimeout(500);
	}

	/**
	 * Click the zoom in control
	 */
	async zoomIn(): Promise<void> {
		await this.click(this.exploreSelectors.zoomIn);
		await this.page.waitForTimeout(300); // Allow zoom animation
	}

	/**
	 * Click the zoom out control
	 */
	async zoomOut(): Promise<void> {
		await this.click(this.exploreSelectors.zoomOut);
		await this.page.waitForTimeout(300); // Allow zoom animation
	}

	/**
	 * Reset zoom to default level
	 */
	async resetZoom(): Promise<void> {
		await this.click(this.exploreSelectors.resetZoom);
		await this.page.waitForTimeout(300); // Allow zoom animation
	}

	/**
	 * Wait for the graph simulation to stabilize and be ready
	 */
	async waitForGraphReady(): Promise<void> {
		await waitForGraphReady(this.page);
	}

	/**
	 * Assert that the graph is loaded and rendered
	 */
	async expectGraphLoaded(): Promise<void> {
		// Check for graph container
		const containerPrimary = this.page.locator(this.exploreSelectors.graphContainer);
		const containerFallback = this.page.locator(this.exploreSelectors.graphContainerFallback);

		const primaryVisible = await containerPrimary.isVisible().catch(() => false);
		const fallbackVisible = await containerFallback.isVisible().catch(() => false);

		expect(primaryVisible || fallbackVisible).toBe(true);

		// Verify at least some nodes are rendered
		const nodeCount = await this.getNodeCount();
		expect(nodeCount).toBeGreaterThan(0);
	}

	/**
	 * Check if node tooltip is visible
	 */
	async isNodeTooltipVisible(): Promise<boolean> {
		return this.isVisible(this.exploreSelectors.nodeTooltip);
	}

	/**
	 * Get tooltip text content
	 */
	async getTooltipText(): Promise<string | null> {
		if (await this.isNodeTooltipVisible()) {
			return this.getText(this.exploreSelectors.nodeTooltip);
		}
		return null;
	}

	/**
	 * Check if zoom controls are visible
	 */
	async areZoomControlsVisible(): Promise<boolean> {
		return this.isVisible(this.exploreSelectors.zoomControls);
	}

	/**
	 * Wait for graph to have at least a minimum number of nodes
	 * @param minCount
	 * @param timeout
	 */
	async waitForMinimumNodes(minCount: number, timeout = 10_000): Promise<void> {
		const startTime = Date.now();

		while (Date.now() - startTime < timeout) {
			const nodeCount = await this.getNodeCount();
			if (nodeCount >= minCount) {
				return;
			}
			await this.page.waitForTimeout(100);
		}

		throw new Error(`Graph did not reach minimum ${minCount} nodes within ${timeout}ms`);
	}
}

