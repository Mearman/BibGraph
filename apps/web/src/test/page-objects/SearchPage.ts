/**
 * Search Page Object
 *
 * Page object for the Search utility page in BibGraph.
 * Handles search queries, entity type filtering, and result navigation.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → SearchPage
 * @see spec-020 Phase 1: Search page testing
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class SearchPage extends BaseSPAPageObject {
	// Search-specific selectors
	private readonly searchSelectors = {
		searchInput: "[data-testid='search-input'], input[aria-label*='Search academic'], input[type='search']",
		searchButton: "[data-testid='search-button'], button[aria-label='Execute search']",
		searchResults: "[data-testid='search-results']",
		searchResultItem: "[data-testid='search-result-item']",
		entityTypeFilter: "[data-testid='entity-type-filter']",
		noResults: "[data-testid='no-results']",
		loadingIndicator: "[data-testid='loading']",
	};

	constructor(page: Page) {
		super(page);
	}

	/**
	 * Navigate to the Search page
	 * @param query Optional search query to include in URL
	 */
	async gotoSearch(query?: string): Promise<void> {
		const path = query ? `#/search?q=${encodeURIComponent(query)}` : "#/search";
		await this.goto(path);
		await this.expectSearchLoaded();
	}

	/**
	 * Type a search query into the search input field
	 * @param query
	 */
	async enterSearchQuery(query: string): Promise<void> {
		await this.fill(this.searchSelectors.searchInput, query);
	}

	/**
	 * Submit the search (click search button or press Enter)
	 */
	async submitSearch(): Promise<void> {
		await this.click(this.searchSelectors.searchButton);
		await this.waitForLoadingComplete();
	}

	/**
	 * Perform a complete search: enter query + submit
	 * @param query
	 */
	async search(query: string): Promise<void> {
		await this.enterSearchQuery(query);
		await this.submitSearch();
	}

	/**
	 * Get the number of search results
	 */
	async getResultCount(): Promise<number> {
		return this.count(this.searchSelectors.searchResultItem);
	}

	/**
	 * Get the titles of all search results
	 */
	async getResultTitles(): Promise<string[]> {
		return this.getAllTexts(this.searchSelectors.searchResultItem);
	}

	/**
	 * Click a search result by index (0-based)
	 * @param index
	 */
	async clickResult(index: number): Promise<void> {
		const results = this.page.locator(this.searchSelectors.searchResultItem);
		await results.nth(index).click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Apply entity type filter
	 * @param entityType Entity type to filter by (e.g., "works", "authors")
	 */
	async filterByEntityType(entityType: string): Promise<void> {
		// Locate filter control and select the entity type
		const filter = this.page.locator(this.searchSelectors.entityTypeFilter);
		await filter.selectOption(entityType);
		await this.waitForLoadingComplete();
	}

	/**
	 * Wait for search results to appear
	 */
	async waitForResults(): Promise<void> {
		await this.waitForVisible(this.searchSelectors.searchResults);
		await this.waitForLoadingComplete();
	}

	/**
	 * Assert that the search page has loaded
	 */
	async expectSearchLoaded(): Promise<void> {
		await this.waitForVisible(this.searchSelectors.searchInput);
		await this.expectLoaded();
	}

	/**
	 * Assert that no results message is shown
	 */
	async expectNoResults(): Promise<void> {
		await this.waitForVisible(this.searchSelectors.noResults);
		const noResultsMsg = this.page.locator(this.searchSelectors.noResults);
		await expect(noResultsMsg).toBeVisible();
	}

	/**
	 * Switch result view mode (list, card, or table)
	 * Uses the Mantine SegmentedControl which renders radio inputs with tooltip labels.
	 * @param mode - The view mode to switch to
	 */
	async switchViewMode(mode: "list" | "card" | "table"): Promise<void> {
		// In Mantine v7, SegmentedControl labels contain the inputs (not siblings)
		const segmentedControl = this.page.locator('.mantine-SegmentedControl-root');
		// Click the label that wraps the input for the target mode
		const targetLabel = segmentedControl.locator(`label:has(input[value="${mode}"])`);
		await targetLabel.click();
		// Allow time for React state update and re-render
		await this.page.waitForTimeout(500);
	}

	/**
	 * Get the currently active view mode
	 * Reads the checked radio input value from the Mantine SegmentedControl.
	 */
	async getCurrentViewMode(): Promise<string> {
		const segmentedControl = this.page.locator('.mantine-SegmentedControl-root');
		// Mantine v7 uses standard checked attribute on input
		const checkedInput = segmentedControl.locator('input:checked');
		const value = await checkedInput.getAttribute('value').catch(() => null);
		return value ?? "table";
	}

	/**
	 * Get the current page number in pagination
	 */
	async getPageNumber(): Promise<number> {
		const activePage = this.page.locator(
			"[data-testid='pagination'] [aria-current='page'], .mantine-Pagination-control[data-active='true']"
		);
		const text = await activePage.textContent();
		return text ? Number.parseInt(text, 10) : 1;
	}

	/**
	 * Navigate to the next page of results
	 */
	async goToNextPage(): Promise<void> {
		const nextButton = this.page.locator(
			"[data-testid='pagination-next'], [aria-label='next']"
		);
		await nextButton.click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Get the total number of result pages
	 */
	async getTotalPages(): Promise<number> {
		const pageButtons = this.page.locator(
			"[data-testid='pagination'] button:not([aria-label]), .mantine-Pagination-control:not([data-dots])"
		);
		return pageButtons.count();
	}
}

// Named export
export { SearchPage as SearchPageObject };

// Default export
