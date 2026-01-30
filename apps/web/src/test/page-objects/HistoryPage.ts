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
		historyContainer: "main, [class*='Stack']",
		historyEntry: ".mantine-Card-root",
		historyEntryTitle: ".mantine-Card-root .mantine-Text-root",
		historyEntryTimestamp: ".mantine-Card-root .mantine-Text-root[style]",
		clearAllButton: "button:has-text('Clear History')",
		searchInput:
			"input[placeholder='Search history...'], input[aria-label='Search navigation history']",
		emptyState: "text='No navigation history yet'",
	};

	constructor(page: Page) {
		super(page);
	}

	async gotoHistory(): Promise<void> {
		await this.goto("#/history");
		await this.waitForLoadingComplete();
	}

	async getEntryCount(): Promise<number> {
		const cards = this.page.locator(this.historySelectors.historyEntry);
		return cards.count();
	}

	/**
	 * Wait for history entries to appear on the page.
	 * Returns the number of entries found, or 0 if none appear within the timeout.
	 * The useUserInteractions hook has a 10-second internal timeout that can cause
	 * history data loading to fail in test environments, so this method is lenient.
	 */
	async waitForEntries(
		minCount: number = 1,
		timeout: number = 30_000,
	): Promise<number> {
		try {
			await this.page
				.locator(this.historySelectors.historyEntry)
				.first()
				.waitFor({ state: "visible", timeout });
			// Give a moment for all entries to render
			await this.page.waitForTimeout(500);
			const count = await this.getEntryCount();
			if (count >= minCount) {
				return count;
			}
			// Wait a bit longer for additional entries
			await this.page.waitForTimeout(2_000);
			return this.getEntryCount();
		} catch {
			return 0;
		}
	}

	/**
	 * Get the entity type badge text from a history card.
	 * The HistoryManager renders an entity type Badge (e.g. "Work", "Author")
	 * as the first child inside a Group with gap="xs" within each Card.
	 * This targets that specific badge, avoiding count/notification badges elsewhere.
	 */
	async getEntityTypeBadge(cardIndex: number): Promise<string | null> {
		const card = this.page
			.locator(this.historySelectors.historyEntry)
			.nth(cardIndex);
		// The entity type badge is inside Stack > Group (first group) > Badge
		const badge = card.locator(
			".mantine-Stack-root .mantine-Group-root .mantine-Badge-root",
		).first();
		try {
			await badge.waitFor({ state: "visible", timeout: 5_000 });
			return badge.textContent();
		} catch {
			return null;
		}
	}

	async getEntries(): Promise<string[]> {
		const cards = this.page.locator(this.historySelectors.historyEntry);
		const count = await cards.count();
		const titles: string[] = [];
		for (let i = 0; i < count; i++) {
			const firstText = cards.nth(i).locator(".mantine-Text-root").first();
			const text = await firstText.textContent();
			if (text) {
				titles.push(text.trim());
			}
		}
		return titles;
	}

	async clearAll(): Promise<void> {
		await this.page.getByRole("button", { name: "Clear History" }).click();
		// The component opens a Mantine confirm modal with labels: { confirm: "Clear All" }
		const confirmButton = this.page.locator(
			'.mantine-Modal-root button:has-text("Clear All")',
		);
		await confirmButton.waitFor({ state: "visible", timeout: 5_000 });
		await confirmButton.click();
		await this.waitForLoadingComplete();
	}

	async searchHistory(query: string): Promise<void> {
		await this.page
			.getByPlaceholder("Search history...")
			.or(this.page.getByLabel("Search navigation history"))
			.fill(query);
		await this.waitForLoadingComplete();
	}

	async clickEntry(index: number): Promise<void> {
		const card = this.page.locator(this.historySelectors.historyEntry).nth(index);
		const firstText = card.locator(".mantine-Text-root").first();
		const title = await firstText.textContent();
		if (title) {
			await card
				.getByRole("button", { name: `Navigate to ${title.trim()}` })
				.click();
		} else {
			// Fallback: click the first ActionIcon in the card
			await card.locator("button.mantine-ActionIcon-root").first().click();
		}
		await this.waitForLoadingComplete();
	}

	async hasEmptyState(): Promise<boolean> {
		return this.page
			.getByText("No navigation history yet")
			.isVisible()
			.catch(() => false);
	}
}

export { HistoryPage as HistoryPageObject };
