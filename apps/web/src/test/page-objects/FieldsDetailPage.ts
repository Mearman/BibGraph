/**
 * Fields Detail Page Object
 *
 * Represents the Field entity detail page in BibGraph.
 * Fields are mid-level academic classifications between Domains and Subfields.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → FieldsDetailPage
 * @see spec-020 E2E Test Coverage
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseEntityPageObject } from "./BaseEntityPageObject";

export class FieldsDetailPage extends BaseEntityPageObject {
	// Field-specific selectors
	private readonly fieldSelectors = {
		fieldId: "[data-testid='field-id']",
		fieldName: "[data-testid='entity-title']",
		parentDomain: "[data-testid='parent-domain']",
		subfieldCount: "[data-testid='subfield-count']",
		relatedSubfields: "[data-testid='related-subfields']",
	};

	constructor(page: Page) {
		super(page, { entityType: "fields" });
	}

	/**
	 * Navigate to a specific field detail page
	 */
	async gotoField(fieldId: string): Promise<void> {
		await this.gotoEntity(fieldId);
	}

	/**
	 * Get the field display name
	 */
	async getFieldName(): Promise<string | null> {
		return this.getText(this.fieldSelectors.fieldName);
	}

	/**
	 * Get the parent domain name
	 */
	async getParentDomain(): Promise<string | null> {
		const isVisible = await this.isVisible(this.fieldSelectors.parentDomain);
		return isVisible ? this.getText(this.fieldSelectors.parentDomain) : null;
	}

	/**
	 * Get count of related subfields
	 */
	async getSubfieldCount(): Promise<number> {
		const countText = await this.getText(this.fieldSelectors.subfieldCount);
		return countText !== null ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get list of related subfield names
	 */
	async getRelatedSubfields(): Promise<string[]> {
		const isVisible = await this.isVisible(this.fieldSelectors.relatedSubfields);
		if (!isVisible) {
			return [];
		}

		const subfieldItems = this.page.locator(
			`${this.fieldSelectors.relatedSubfields} ${this.entitySelectors.relationshipItem}`
		);
		const count = await subfieldItems.count();
		const subfields: string[] = [];

		for (let index = 0; index < count; index++) {
			const text = await subfieldItems.nth(index).textContent();
			if (text !== null) {
				subfields.push(text.trim());
			}
		}

		return subfields;
	}

	/**
	 * Navigate to the parent domain
	 */
	async clickParentDomain(): Promise<void> {
		await this.click(this.fieldSelectors.parentDomain);
		await this.waitForLoadingComplete();
	}

	/**
	 * Click a related subfield link by index
	 */
	async clickRelatedSubfield(index: number): Promise<void> {
		const subfieldItems = this.page.locator(
			`${this.fieldSelectors.relatedSubfields} ${this.entitySelectors.relationshipItem}`
		);
		await subfieldItems.nth(index).click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Assert field page loaded correctly
	 */
	async expectFieldLoaded(): Promise<void> {
		await this.waitForEntityLoaded();
		await this.expectNoError();
		await expect(
			this.page.locator(this.fieldSelectors.fieldName)
		).toBeVisible();
	}
}

