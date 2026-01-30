/**
 * Evaluation Page Object
 *
 * Page object for the Evaluation features (US-27, US-28).
 * Handles dataset upload, results dashboard, and metric exports.
 *
 * Hierarchy: BasePageObject -> BaseSPAPageObject -> EvaluationPage
 * @see US-27, US-28
 */

import type { Page } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class EvaluationPage extends BaseSPAPageObject {
	private readonly evaluationSelectors = {
		// Navigation
		dashboardLink: "[data-testid='eval-dashboard']",
		datasetsLink: "[data-testid='eval-datasets']",
		resultsLink: "[data-testid='eval-results']",

		// Dataset upload
		uploadArea: "[data-testid='dataset-upload'], input[type='file']",
		uploadProgress: "[data-testid='upload-progress']",
		datasetList: "[data-testid='dataset-list']",
		datasetItem: "[data-testid='dataset-item']",
		datasetSummary: "[data-testid='dataset-summary']",
		uploadError: "[data-testid='upload-error']",

		// Results
		metricCard: "[data-testid='metric-card']",
		metricValue: "[data-testid='metric-value']",
		exportButton: "[data-testid='export-results']",
		exportFormatSelect: "[data-testid='export-format']",
		emptyResults: "[data-testid='empty-results']",

		// STAR metrics
		starMetrics: "[data-testid='star-metrics']",
	};

	constructor(page: Page) {
		super(page);
	}

	async gotoDashboard(): Promise<void> {
		await this.goto("/evaluation");
		await this.waitForLoadingComplete();
	}

	async gotoDatasets(): Promise<void> {
		await this.goto("/evaluation/datasets");
		await this.waitForLoadingComplete();
	}

	async gotoResults(): Promise<void> {
		await this.goto("/evaluation/results");
		await this.waitForLoadingComplete();
	}

	async uploadDataset(filePath: string): Promise<void> {
		const fileInput = this.page.locator("input[type='file']");
		await fileInput.setInputFiles(filePath);
		await this.waitForLoadingComplete();
	}

	async getDatasetList(): Promise<string[]> {
		return this.getAllTexts(this.evaluationSelectors.datasetItem);
	}

	async getMetricCards(): Promise<number> {
		return this.count(this.evaluationSelectors.metricCard);
	}

	async exportResults(format: string): Promise<void> {
		const formatSelect = this.page.locator(this.evaluationSelectors.exportFormatSelect);
		const hasSelect = await formatSelect.isVisible().catch(() => false);

		if (hasSelect) {
			await formatSelect.selectOption(format);
		}

		await this.click(this.evaluationSelectors.exportButton);
	}

	async hasEmptyResults(): Promise<boolean> {
		return this.isVisible(this.evaluationSelectors.emptyResults);
	}

	async hasStarMetrics(): Promise<boolean> {
		return this.isVisible(this.evaluationSelectors.starMetrics);
	}
}

export { EvaluationPage as EvaluationPageObject };
