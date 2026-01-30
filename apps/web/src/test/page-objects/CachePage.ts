/**
 * Cache Page Object
 *
 * Page object for the Cache Management feature (US-25, US-26).
 * Handles cache display, storage stats, and cache clearing operations.
 *
 * Hierarchy: BasePageObject -> BaseSPAPageObject -> CachePage
 * @see US-25, US-26
 */

import type { Page } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class CachePage extends BaseSPAPageObject {
	private readonly cacheSelectors = {
		cacheContainer: "[data-testid='cache-container']",
		storageStats: "[data-testid='storage-stats']",
		storageSize: "[data-testid='storage-size']",
		entryCount: "[data-testid='cache-entry-count']",
		lastModified: "[data-testid='cache-last-modified']",
		clearAllButton: "[data-testid='clear-all-cache']",
		clearByTypeButton: "[data-testid='clear-cache-by-type']",
		entityTypeFilter: "[data-testid='cache-entity-type-filter']",
		entityTypeCount: "[data-testid='entity-type-count']",
		cachedEntityPreview: "[data-testid='cached-entity-preview']",
		rebuildButton: "[data-testid='rebuild-cache']",
	};

	constructor(page: Page) {
		super(page);
	}

	async gotoCache(): Promise<void> {
		await this.goto("#/cache");
		await this.waitForLoadingComplete();
	}

	async getStorageStats(): Promise<{
		size: string | null;
		entryCount: string | null;
		lastModified: string | null;
	}> {
		const size = await this.getText(this.cacheSelectors.storageSize);
		const entryCount = await this.getText(this.cacheSelectors.entryCount);
		const lastModified = await this.getText(this.cacheSelectors.lastModified);
		return { size, entryCount, lastModified };
	}

	async clearCache(): Promise<void> {
		await this.click(this.cacheSelectors.clearAllButton);
		await this.waitForLoadingComplete();
	}

	async clearCacheByType(entityType: string): Promise<void> {
		const filter = this.page.locator(this.cacheSelectors.entityTypeFilter);
		await filter.selectOption(entityType);
		await this.click(this.cacheSelectors.clearByTypeButton);
		await this.waitForLoadingComplete();
	}

	async getEntityTypeCounts(): Promise<string[]> {
		return this.getAllTexts(this.cacheSelectors.entityTypeCount);
	}

	async getCachedEntityPreviewCount(): Promise<number> {
		return this.count(this.cacheSelectors.cachedEntityPreview);
	}

	async rebuildCache(): Promise<void> {
		await this.click(this.cacheSelectors.rebuildButton);
		await this.waitForLoadingComplete();
	}
}

export { CachePage as CachePageObject };
