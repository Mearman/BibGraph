/**
 * Domains Detail Page Object
 *
 * Page object for Domain entity detail pages in BibGraph.
 * Handles domain-specific fields, related fields/subfields, and domain metadata.
 * @see spec-020 Phase 1: T010 - Domain entity E2E tests
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseEntityPageObject } from "./BaseEntityPageObject";

export class DomainsDetailPage extends BaseEntityPageObject {
	// Domain-specific selectors
	private readonly domainSelectors = {
		domainId: "[data-testid='domain-id']",
		domainName: "[data-testid='entity-title']",
		fieldCount: "[data-testid='field-count']",
		subfieldCount: "[data-testid='subfield-count']",
		relatedFields: "[data-testid='related-fields']",
	};

	constructor(page: Page) {
		super(page, { entityType: "domains" });
	}

	/**
	 * Navigate to a domain detail page
	 * @param domainId
	 */
	async gotoDomain(domainId: string): Promise<void> {
		await this.goto(`#/domains/${domainId}`);
	}

	/**
	 * Get domain display name
	 */
	async getDomainName(): Promise<string | null> {
		return this.getText(this.domainSelectors.domainName);
	}

	/**
	 * Get count of related fields
	 */
	async getFieldCount(): Promise<number> {
		const countText = await this.getText(this.domainSelectors.fieldCount);
		return countText ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get count of related subfields
	 */
	async getSubfieldCount(): Promise<number> {
		const countText = await this.getText(this.domainSelectors.subfieldCount);
		return countText ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get list of related field names
	 */
	async getRelatedFields(): Promise<string[]> {
		return this.getAllTexts(this.domainSelectors.relatedFields);
	}

	/**
	 * Click a related field link
	 * @param index
	 */
	async clickRelatedField(index: number): Promise<void> {
		const items = this.page.locator(this.domainSelectors.relatedFields);
		await items.nth(index).click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Assert domain page loaded correctly
	 */
	async expectDomainLoaded(): Promise<void> {
		await this.waitForEntityLoaded();
		await this.expectNoError();
		await expect(this.page.locator(this.domainSelectors.domainName)).toBeVisible();
	}
}

// Named export
export { DomainsDetailPage as DomainsDetailPageObject };

// Default export
