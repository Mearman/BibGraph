/**
 * Subfields Detail Page Object
 *
 * Page object for Subfield entity detail pages in BibGraph.
 * Represents the middle-lower level of OpenAlex taxonomy hierarchy (Domain → Field → Subfield → Topic).
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → SubfieldsDetailPage
 * @see spec-020 Phase 6: E2E test coverage for Subfields entity
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseEntityPageObject } from "./BaseEntityPageObject";

export class SubfieldsDetailPage extends BaseEntityPageObject {
	// Subfield-specific selectors
	private readonly subfieldSelectors = {
		subfieldId: "[data-testid='subfield-id']",
		subfieldName: "[data-testid='entity-title']",
		parentField: "[data-testid='parent-field']",
		parentDomain: "[data-testid='parent-domain']",
		topicCount: "[data-testid='topic-count']",
		relatedTopics: "[data-testid='related-topics']",
	};

	constructor(page: Page) {
		super(page, { entityType: "subfields" });
	}

	/**
	 * Navigate to a subfield detail page
	 * @param subfieldId - Subfield ID (e.g., "138" or "https://openalex.org/subfields/1303")
	 */
	async gotoSubfield(subfieldId: string): Promise<void> {
		// Strip full URL if provided, keep only the numeric ID
		const numericId = subfieldId.includes("/")
			? subfieldId.split("/").pop() || subfieldId
			: subfieldId;
		await this.goto(`#/subfields/${numericId}`);
	}

	/**
	 * Get subfield display name
	 */
	async getSubfieldName(): Promise<string | null> {
		return this.getText(this.subfieldSelectors.subfieldName);
	}

	/**
	 * Get parent field name
	 */
	async getParentField(): Promise<string | null> {
		const visible = await this.isVisible(this.subfieldSelectors.parentField);
		return visible ? this.getText(this.subfieldSelectors.parentField) : null;
	}

	/**
	 * Get parent domain name
	 */
	async getParentDomain(): Promise<string | null> {
		const visible = await this.isVisible(this.subfieldSelectors.parentDomain);
		return visible ? this.getText(this.subfieldSelectors.parentDomain) : null;
	}

	/**
	 * Get count of related topics
	 */
	async getTopicCount(): Promise<number> {
		const countText = await this.getText(this.subfieldSelectors.topicCount);
		return countText ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get list of related topic names
	 */
	async getRelatedTopics(): Promise<string[]> {
		return this.getAllTexts(this.subfieldSelectors.relatedTopics);
	}

	/**
	 * Navigate to parent field
	 */
	async clickParentField(): Promise<void> {
		await this.click(this.subfieldSelectors.parentField);
		await this.waitForLoadingComplete();
	}

	/**
	 * Navigate to parent domain
	 */
	async clickParentDomain(): Promise<void> {
		await this.click(this.subfieldSelectors.parentDomain);
		await this.waitForLoadingComplete();
	}

	/**
	 * Assert subfield page loaded correctly
	 */
	async expectSubfieldLoaded(): Promise<void> {
		await this.waitForEntityLoaded();
		await this.expectNoError();
		await expect(
			this.page.locator(this.subfieldSelectors.subfieldName)
		).toBeVisible();
	}
}

// Named export
