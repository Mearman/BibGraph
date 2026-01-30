/**
 * Graph Comparison Page Object
 *
 * Page object for the Graph Comparison feature (US-16).
 * Handles dual-panel graph comparison, snapshot selection, and diff metrics.
 *
 * Hierarchy: BasePageObject -> BaseSPAPageObject -> GraphComparisonPage
 * @see US-16
 */

import type { Page } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class GraphComparisonPage extends BaseSPAPageObject {
	private readonly comparisonSelectors = {
		comparisonContainer: "[data-testid='graph-comparison']",
		leftPanel: "[data-testid='comparison-left']",
		rightPanel: "[data-testid='comparison-right']",
		leftSnapshot: "[data-testid='snapshot-select-left']",
		rightSnapshot: "[data-testid='snapshot-select-right']",
		diffMetrics: "[data-testid='diff-metrics']",
		diffMetricItem: "[data-testid='diff-metric-item']",
		swapButton: "[data-testid='swap-graphs']",
		sharedEntity: "[data-testid='shared-entity'], .node--shared",
		syncToggle: "[data-testid='sync-pan-zoom']",
	};

	constructor(page: Page) {
		super(page);
	}

	async gotoComparison(): Promise<void> {
		await this.goto("/graph-comparison");
		await this.waitForLoadingComplete();
	}

	async selectLeftSnapshot(index: number): Promise<void> {
		const select = this.page.locator(this.comparisonSelectors.leftSnapshot);
		await select.selectOption({ index });
		await this.waitForLoadingComplete();
	}

	async selectRightSnapshot(index: number): Promise<void> {
		const select = this.page.locator(this.comparisonSelectors.rightSnapshot);
		await select.selectOption({ index });
		await this.waitForLoadingComplete();
	}

	async getDiffMetrics(): Promise<string[]> {
		return this.getAllTexts(this.comparisonSelectors.diffMetricItem);
	}

	async swapGraphs(): Promise<void> {
		await this.click(this.comparisonSelectors.swapButton);
		await this.page.waitForTimeout(300);
	}

	async isLeftPanelVisible(): Promise<boolean> {
		return this.isVisible(this.comparisonSelectors.leftPanel);
	}

	async isRightPanelVisible(): Promise<boolean> {
		return this.isVisible(this.comparisonSelectors.rightPanel);
	}

	async getSharedEntityCount(): Promise<number> {
		return this.count(this.comparisonSelectors.sharedEntity);
	}

	async toggleSyncPanZoom(): Promise<void> {
		await this.click(this.comparisonSelectors.syncToggle);
	}
}

export { GraphComparisonPage as GraphComparisonPageObject };
