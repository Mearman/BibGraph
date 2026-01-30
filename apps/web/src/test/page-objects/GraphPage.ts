/**
 * Graph Page Object
 *
 * Extends ExplorePage with advanced graph interaction capabilities including
 * 2D/3D toggling, node expansion, pathfinding, community detection, and motif detection.
 *
 * Hierarchy: BasePageObject -> BaseSPAPageObject -> ExplorePage -> GraphPage
 * @see US-10 through US-16
 */

import type { Page } from "@playwright/test";

import { ExplorePage } from "./ExplorePage";

export class GraphPage extends ExplorePage {
	protected readonly graphSelectors = {
		// 2D/3D toggle
		dimensionToggle: "[data-testid='dimension-toggle']",
		dimension2D: "[data-testid='dimension-2d']",
		dimension3D: "[data-testid='dimension-3d']",
		canvas2D: "[data-testid='graph-canvas-2d'], canvas.force-graph-2d",
		canvas3D: "[data-testid='graph-canvas-3d'], canvas.force-graph-3d",

		// Node expansion
		expandButton: "[data-testid='expand-node']",
		expandedNode: "[data-testid='expanded-node'], .node--expanded",
		expansionDepth: "[data-testid='expansion-depth']",
		contextMenu: "[data-testid='node-context-menu']",

		// Pathfinding
		sourceNodeSelect: "[data-testid='source-node-select']",
		targetNodeSelect: "[data-testid='target-node-select']",
		findPathButton: "[data-testid='find-path']",
		highlightedPath: "[data-testid='highlighted-path'], .edge--highlighted",
		pathLength: "[data-testid='path-length']",
		pathIntermediateNodes: "[data-testid='path-intermediate-nodes']",
		algorithmSelect: "[data-testid='pathfinding-algorithm']",
		noPathMessage: "[data-testid='no-path-found']",

		// Community detection
		communityAlgorithm: "[data-testid='community-algorithm']",
		runCommunityButton: "[data-testid='run-community-detection']",
		communityCount: "[data-testid='community-count']",
		communityNode: "[data-testid='community-node']",

		// Motif detection
		motifTypeSelect: "[data-testid='motif-type-select']",
		runMotifButton: "[data-testid='run-motif-detection']",
		motifCount: "[data-testid='motif-count']",
		motifHighlight: "[data-testid='motif-highlight'], .node--motif",

		// Data source toggles
		dataSourceToggle: "[data-testid='data-source-toggle']",
		bookmarksToggle: "[data-testid='toggle-bookmarks']",
		historyToggle: "[data-testid='toggle-history']",
		cacheToggle: "[data-testid='toggle-cache']",

		// Web Worker status
		workerStatus: "[data-testid='worker-status']",
	};

	constructor(page: Page) {
		super(page);
	}

	// --- 2D/3D Toggling ---

	async toggle2D3D(): Promise<void> {
		await this.click(this.graphSelectors.dimensionToggle);
		await this.page.waitForTimeout(500);
	}

	async getCurrentDimension(): Promise<"2d" | "3d"> {
		const toggle = this.page.locator(this.graphSelectors.dimensionToggle);
		const value = await toggle.getAttribute("data-dimension");
		if (value === "3d") return "3d";

		// Fallback: check which canvas is visible
		const canvas3D = this.page.locator(this.graphSelectors.canvas3D);
		const is3D = await canvas3D.isVisible().catch(() => false);
		return is3D ? "3d" : "2d";
	}

	// --- Node Expansion ---

	async expandNode(nodeIndex: number): Promise<void> {
		await this.clickNode(nodeIndex);
		// Try expand button first, then context menu
		const expandButton = this.page.locator(this.graphSelectors.expandButton);
		const hasExpand = await expandButton.isVisible().catch(() => false);

		if (hasExpand) {
			await expandButton.click();
		} else {
			// Try right-click context menu
			const nodes = this.page.locator(this.exploreSelectors.graphNode);
			const nodeCount = await nodes.count();

			if (nodeCount > 0) {
				await nodes.nth(nodeIndex).click({ button: "right" });
				const contextMenu = this.page.locator(this.graphSelectors.contextMenu);
				await contextMenu.waitFor({ state: "visible", timeout: 5000 }).catch(() => {});
				const expandOption = contextMenu.getByText(/expand/i);
				if (await expandOption.isVisible().catch(() => false)) {
					await expandOption.click();
				}
			}
		}

		await this.page.waitForTimeout(1000);
	}

	async getExpandedNeighborCount(): Promise<number> {
		const expanded = this.page.locator(this.graphSelectors.expandedNode);
		return expanded.count();
	}

	// --- Pathfinding ---

	async selectSourceNode(index: number): Promise<void> {
		const select = this.page.locator(this.graphSelectors.sourceNodeSelect);
		const options = await select.locator("option").allTextContents();
		if (options.length > index + 1) {
			await select.selectOption({ index: index + 1 });
		}
	}

	async selectTargetNode(index: number): Promise<void> {
		const select = this.page.locator(this.graphSelectors.targetNodeSelect);
		const options = await select.locator("option").allTextContents();
		if (options.length > index + 1) {
			await select.selectOption({ index: index + 1 });
		}
	}

	async findPath(): Promise<void> {
		await this.click(this.graphSelectors.findPathButton);
		await this.waitForLoadingComplete();
	}

	async getHighlightedPathLength(): Promise<number> {
		const pathLengthEl = this.page.locator(this.graphSelectors.pathLength);
		const text = await pathLengthEl.textContent();
		return text ? Number.parseInt(text, 10) : 0;
	}

	// --- Community Detection ---

	async runCommunityDetection(): Promise<void> {
		await this.click(this.graphSelectors.runCommunityButton);
		await this.waitForLoadingComplete();
	}

	async getCommunityCount(): Promise<number> {
		const countEl = this.page.locator(this.graphSelectors.communityCount);
		const text = await countEl.textContent();
		return text ? Number.parseInt(text, 10) : 0;
	}

	// --- Motif Detection ---

	async runMotifDetection(): Promise<void> {
		await this.click(this.graphSelectors.runMotifButton);
		await this.waitForLoadingComplete();
	}

	async getMotifCount(): Promise<number> {
		const countEl = this.page.locator(this.graphSelectors.motifCount);
		const text = await countEl.textContent();
		return text ? Number.parseInt(text, 10) : 0;
	}
}

export { GraphPage as GraphPageObject };
