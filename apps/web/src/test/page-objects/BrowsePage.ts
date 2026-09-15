/**
 * Browse Page Object
 *
 * Represents the Browse page in BibGraph (entity type selection grid).
 * This is a utility page, not an entity detail page.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BrowsePage
 * @see spec-020 Phase 2: Browse page E2E tests
 */

import { expect } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class BrowsePage extends BaseSPAPageObject {
	// Browse-specific selectors
	private readonly browseSelectors = {
		browseGrid: "[data-testid='browse-grid']",
		entityTypeCard: "[data-testid='entity-type-card']",
		entityTypeLink: "[data-testid='entity-type-link']",
		pageTitle: "[data-testid='page-title']",
	};

	/**
	 * Navigate to /browse page
	 */
	async gotoBrowse(): Promise<void> {
		await this.goto("#/browse");
	}

	/**
	 * Get list of entity type names displayed on the browse grid
	 */
	async getEntityTypeCards(): Promise<string[]> {
		await this.waitForVisible(this.browseSelectors.browseGrid);
		const cards = this.page.locator(this.browseSelectors.entityTypeCard);
		const count = await cards.count();

		const entityTypes: string[] = [];
		for (let index = 0; index < count; index++) {
			const text = await cards.nth(index).textContent();
			if (text !== null) {
				entityTypes.push(text.trim());
			}
		}

		return entityTypes;
	}

	/**
	 * Click an entity type card by entity type name
	 */
	async clickEntityType(entityType: string): Promise<void> {
		const card = this.page
			.locator(this.browseSelectors.entityTypeCard)
			.filter({ hasText: entityType });
		await card.click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Get number of entity type cards displayed
	 */
	async getEntityTypeCount(): Promise<number> {
		await this.waitForVisible(this.browseSelectors.browseGrid);
		const cards = this.page.locator(this.browseSelectors.entityTypeCard);
		return cards.count();
	}

	/**
	 * Assert browse page is loaded and ready
	 */
	async expectBrowseLoaded(): Promise<void> {
		await this.waitForLoadingComplete();
		await this.expectNoError();
		await expect(this.page.locator(this.browseSelectors.browseGrid)).toBeVisible();
	}

	/**
	 * Check if entity type card is visible
	 */
	async isEntityTypeVisible(entityType: string): Promise<boolean> {
		const card = this.page
			.locator(this.browseSelectors.entityTypeCard)
			.filter({ hasText: entityType });
		return card.isVisible();
	}

	/**
	 * Get page title text
	 */
	async getPageTitle(): Promise<string | null> {
		const titleLocator = this.page.locator(this.browseSelectors.pageTitle);
		const isVisible = await titleLocator.isVisible().catch(() => false);

		if (isVisible) {
			return titleLocator.textContent();
		}

		// Fallback to h1 if data-testid not found
		const h1 = this.page.locator("h1");
		const isH1Visible = await h1.isVisible().catch(() => false);
		return isH1Visible ? h1.textContent() : null;
	}

	/**
	 * Assert page title contains expected text
	 */
	async expectPageTitle(expectedTitle: string): Promise<void> {
		const title = await this.getPageTitle();
		expect(title).toContain(expectedTitle);
	}

	/**
	 * Assert specific entity type card is visible
	 */
	async expectEntityTypeVisible(entityType: string): Promise<void> {
		const card = this.page
			.locator(this.browseSelectors.entityTypeCard)
			.filter({ hasText: entityType });
		await expect(card).toBeVisible();
	}

	/**
	 * Assert minimum number of entity type cards are displayed
	 */
	async expectMinimumEntityTypes(minCount: number): Promise<void> {
		const count = await this.getEntityTypeCount();
		expect(count).toBeGreaterThanOrEqual(minCount);
	}
}

// Named export
export { BrowsePage as BrowsePageObject };

// Default export
