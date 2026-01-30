/**
 * History Page Object
 *
 * Page object for the Visit History page (US-22).
 * Handles history entries, search, clearing, and navigation.
 *
 * Hierarchy: BasePageObject -> BaseSPAPageObject -> HistoryPage
 * @see US-22
 */

import type { Page } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class HistoryPage extends BaseSPAPageObject {
	private readonly historySelectors = {
		historyContainer: "[data-testid='history-container']",
		historyEntry: "[data-testid='history-entry']",
		historyEntryTitle: "[data-testid='history-entry-title']",
		historyEntryTimestamp: "[data-testid='history-entry-timestamp']",
		clearAllButton: "[data-testid='clear-all-history']",
		searchInput: "[data-testid='history-search'], input[placeholder*='history' i]",
		emptyState: "[data-testid='history-empty']",
	};

	constructor(page: Page) {
		super(page);
	}

	async gotoHistory(): Promise<void> {
		await this.goto("#/history");
		await this.waitForLoadingComplete();
	}

	async getEntryCount(): Promise<number> {
		return this.count(this.historySelectors.historyEntry);
	}

	async getEntries(): Promise<string[]> {
		return this.getAllTexts(this.historySelectors.historyEntryTitle);
	}

	async clearAll(): Promise<void> {
		await this.click(this.historySelectors.clearAllButton);
		await this.waitForLoadingComplete();
	}

	async searchHistory(query: string): Promise<void> {
		await this.fill(this.historySelectors.searchInput, query);
		await this.waitForLoadingComplete();
	}

	async clickEntry(index: number): Promise<void> {
		const entries = this.page.locator(this.historySelectors.historyEntry);
		await entries.nth(index).click();
		await this.waitForLoadingComplete();
	}

	async hasEmptyState(): Promise<boolean> {
		return this.isVisible(this.historySelectors.emptyState);
	}
}

export { HistoryPage as HistoryPageObject };
