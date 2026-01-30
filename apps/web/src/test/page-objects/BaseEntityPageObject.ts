/**
 * Base Entity Page Object
 *
 * Extends BaseSPAPageObject with entity-specific functionality for OpenAlex entities.
 * Handles entity detail pages, relationships, metadata, and common entity operations.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → [Entity]Page
 * @see spec-020 Phase 1: T006
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseSPAPageObject, type SPAPageObjectOptions } from "./BaseSPAPageObject";

export type EntityType =
	| "works"
	| "authors"
	| "sources"
	| "institutions"
	| "publishers"
	| "funders"
	| "topics"
	| "concepts"
	| "keywords"
	| "domains"
	| "fields"
	| "subfields";

export interface EntityPageObjectOptions extends SPAPageObjectOptions {
	/** Entity type for this page object */
	entityType: EntityType;
}

export class BaseEntityPageObject extends BaseSPAPageObject {
	protected readonly entityType: EntityType;

	// Entity-specific selectors
	protected readonly entitySelectors = {
		// Entity header
		entityTitle: "[data-testid='entity-title']",
		entitySubtitle: "[data-testid='entity-subtitle']",
		entityBadge: "[data-testid='entity-type-badge']",

		// Entity metadata
		metadataSection: "[data-testid='entity-metadata']",
		metadataField: "[data-testid='metadata-field']",
		metadataLabel: "[data-testid='metadata-label']",
		metadataValue: "[data-testid='metadata-value']",

		// Relationships
		relationshipsSection: "[data-testid='relationships-section']",
		incomingRelationships: "[data-testid='incoming-relationships']",
		outgoingRelationships: "[data-testid='outgoing-relationships']",
		relationshipCount: "[data-testid='relationship-count']",
		relationshipItem: "[data-testid='relationship-item']",
		relationshipTypeFilter: "[data-testid='relationship-type-filter']",

		// Actions
		bookmarkButton: "[data-testid='entity-bookmark-button']",
		shareButton: "[data-testid='share-button']",
		exportButton: "[data-testid='export-button']",

		// External links
		externalLink: "[data-testid='external-link']",
		openAlexLink: "[data-testid='openalex-link']",
		doiLink: "[data-testid='doi-link']",
		orcidLink: "[data-testid='orcid-link']",
		rorLink: "[data-testid='ror-link']",

		// Work-specific
		abstractSection: "[data-testid='abstract']",
		citationSection: "[data-testid='citations']",
		referencesSection: "[data-testid='references']",

		// Author-specific
		affiliationsSection: "[data-testid='affiliations']",
		worksCountBadge: "[data-testid='works-count']",
		citedByCountBadge: "[data-testid='cited-by-count']",
	};

	constructor(page: Page, options: EntityPageObjectOptions) {
		super(page, options);
		this.entityType = options.entityType;
	}

	/**
	 * Navigate to an entity detail page
	 * @param entityId
	 */
	async gotoEntity(entityId: string): Promise<void> {
		await this.goto(`#/${this.entityType}/${entityId}`);
	}

	/**
	 * Wait for entity data to load
	 */
	async waitForEntityLoaded(): Promise<void> {
		await this.waitForLoadingComplete();
		await this.waitForVisible(this.entitySelectors.entityTitle);
	}

	/**
	 * Get entity title
	 */
	async getEntityTitle(): Promise<string | null> {
		return this.getText(this.entitySelectors.entityTitle);
	}

	/**
	 * Get entity subtitle (if present)
	 */
	async getEntitySubtitle(): Promise<string | null> {
		const visible = await this.isVisible(this.entitySelectors.entitySubtitle);
		return visible ? this.getText(this.entitySelectors.entitySubtitle) : null;
	}

	/**
	 * Get entity type badge text
	 */
	async getEntityTypeBadge(): Promise<string | null> {
		return this.getText(this.entitySelectors.entityBadge);
	}

	/**
	 * Check if relationships section is visible
	 */
	async hasRelationships(): Promise<boolean> {
		return this.isVisible(this.entitySelectors.relationshipsSection);
	}

	/**
	 * Get incoming relationship count
	 */
	async getIncomingRelationshipCount(): Promise<number> {
		const countText = await this.getText(
			`${this.entitySelectors.incomingRelationships} ${this.entitySelectors.relationshipCount}`
		);
		return countText ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get outgoing relationship count
	 */
	async getOutgoingRelationshipCount(): Promise<number> {
		const countText = await this.getText(
			`${this.entitySelectors.outgoingRelationships} ${this.entitySelectors.relationshipCount}`
		);
		return countText ? Number.parseInt(countText, 10) : 0;
	}

	/**
	 * Get all relationship items
	 */
	async getRelationshipItems(): Promise<string[]> {
		return this.getAllTexts(this.entitySelectors.relationshipItem);
	}

	/**
	 * Click a relationship item
	 * @param index
	 */
	async clickRelationship(index: number): Promise<void> {
		const items = this.page.locator(this.entitySelectors.relationshipItem);
		await items.nth(index).click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Filter relationships by type
	 * @param type
	 */
	async filterRelationshipsByType(type: string): Promise<void> {
		await this.click(this.entitySelectors.relationshipTypeFilter);
		await this.page.getByRole("option", { name: type }).click();
		await this.waitForLoadingComplete();
	}

	/**
	 * Toggle bookmark for this entity
	 */
	async toggleBookmark(): Promise<void> {
		await this.click(this.entitySelectors.bookmarkButton);
	}

	/**
	 * Check if entity is bookmarked
	 */
	async isBookmarked(): Promise<boolean> {
		const button = this.page.locator(this.entitySelectors.bookmarkButton);
		const ariaPressed = await button.getAttribute("aria-pressed");
		return ariaPressed === "true";
	}

	/**
	 * Get metadata field value by label
	 * @param label
	 */
	async getMetadataValue(label: string): Promise<string | null> {
		const fields = this.page.locator(this.entitySelectors.metadataField);
		const count = await fields.count();

		for (let i = 0; i < count; i++) {
			const field = fields.nth(i);
			const fieldLabel = await field
				.locator(this.entitySelectors.metadataLabel)
				.textContent();
			if (fieldLabel?.includes(label)) {
				return field
					.locator(this.entitySelectors.metadataValue)
					.textContent();
			}
		}
		return null;
	}

	/**
	 * Click OpenAlex external link
	 */
	async clickOpenAlexLink(): Promise<void> {
		await this.click(this.entitySelectors.openAlexLink);
	}

	/**
	 * Assert entity title is displayed
	 * @param title
	 */
	async expectEntityTitle(title: string): Promise<void> {
		await expect(
			this.page.locator(this.entitySelectors.entityTitle)
		).toContainText(title);
	}

	/**
	 * Assert entity has metadata section
	 */
	async expectMetadataVisible(): Promise<void> {
		await expect(
			this.page.locator(this.entitySelectors.metadataSection)
		).toBeVisible();
	}

	/**
	 * Assert entity has relationships
	 */
	async expectRelationshipsVisible(): Promise<void> {
		await expect(
			this.page.locator(this.entitySelectors.relationshipsSection)
		).toBeVisible();
	}

	/**
	 * Assert page loaded without errors
	 */
	async expectEntityLoaded(): Promise<void> {
		await this.waitForEntityLoaded();
		await this.expectNoError();
		await expect(
			this.page.locator(this.entitySelectors.entityTitle)
		).toBeVisible();
	}
}
