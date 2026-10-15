/**
 * Cache Page Object
 *
 * Page object for the Cache Management feature (US-25, US-26). Handles cache display, storage stats, and cache clearing operations.
 *
 * Hierarchy: BasePageObject -\> BaseSPAPageObject -\> CachePage
 * @see US-25, US-26
 */

import { BaseSPAPageObject } from "./BaseSPAPageObject";

/**
 * Mantine confirm-modal labels used by the clear actions
 */
const CLEAR_ALL_CONFIRM_LABEL = "Clear All";
const CLEAR_TYPE_CONFIRM_LABEL = "Clear";

export class CachePage extends BaseSPAPageObject {
	private readonly cacheSelectors = {
		cacheContainer: "[data-testid='cache-container']",
		storageStats: "[data-testid='storage-stats']",
		storageSize: "[data-testid='storage-size']",
		entryCount: "[data-testid='cache-entry-count']",
		lastModified: "[data-testid='cache-last-modified']",
		clearAllButton: "[data-testid='clear-all-cache']",
		clearByTypeButton: "[data-testid='clear-cache-by-type']",
		typeRow: "[data-testid='cache-type-row']",
		entityTypeCount: "[data-testid='entity-type-count']",
		cachedEntityPreview: "[data-testid='cached-entity-preview']",
	};

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
		await this.confirmModal(CLEAR_ALL_CONFIRM_LABEL);
		await this.waitForLoadingComplete();
	}

	async clearCacheByType(entityType: string): Promise<void> {
		const row = this.page
			.locator(this.cacheSelectors.typeRow)
			.filter({ hasText: entityType });
		await row.locator(this.cacheSelectors.clearByTypeButton).click();
		await this.confirmModal(CLEAR_TYPE_CONFIRM_LABEL);
		await this.waitForLoadingComplete();
	}

	async getEntityTypeCounts(): Promise<string[]> {
		return this.getAllTexts(this.cacheSelectors.entityTypeCount);
	}

	async getCachedEntityPreviewCount(): Promise<number> {
		return this.count(this.cacheSelectors.cachedEntityPreview);
	}

	private async confirmModal(confirmLabel: string): Promise<void> {
		const dialog = this.page.getByRole("dialog");
		await dialog.waitFor({ state: "visible" });
		await dialog.getByRole("button", { name: confirmLabel }).click();
	}
}

export { CachePage as CachePageObject };
