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
		/** Only match history entry cards within main content (not sidebar), which contain a Badge */
		historyEntry: "main .mantine-Card-root:has(.mantine-Badge-root)",
		historyEntryTitle: "main .mantine-Card-root:has(.mantine-Badge-root) .mantine-Text-root",
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
	 * inside a Group with gap="xs" within each Card's Stack.
	 * We target the Badge label specifically to get the text content,
	 * avoiding any wrapper elements that might interfere.
	 */
	async getEntityTypeBadge(cardIndex: number): Promise<string | null> {
		const card = this.page
			.locator(this.historySelectors.historyEntry)
			.nth(cardIndex);
		// Target the Badge's inner label span (.mantine-Badge-label) for reliable
		// text extraction. Using .textContent() on .mantine-Badge-root can return
		// unexpected text from child elements (e.g. count spans).
		const badge = card.locator(".mantine-Badge-label").filter({
			hasText: /^(Work|Author|Source|Institution|Topic|Concept|Publisher|Funder|Keyword|Domain|Field|Subfield)$/,
		}).first();
		try {
			await badge.waitFor({ state: "visible", timeout: 5_000 });
			const text = await badge.innerText();
			return text?.trim() ?? null;
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
		const clearButton = this.page.getByRole("button", { name: "Clear History" });
		// Wait for button to be visible first
		await clearButton.waitFor({ state: "visible", timeout: 10_000 });
		// Wait for button to become enabled.
		// The button is disabled when recentHistory.length === 0.
		// Poll with a longer timeout to account for hook loading delays.
		await this.page.waitForFunction(
			() => {
				const buttons = document.querySelectorAll("button");
				for (const btn of buttons) {
					if (
						btn.textContent?.includes("Clear History") &&
						!btn.disabled &&
						btn.getAttribute("data-disabled") !== "true"
					) {
						return true;
					}
				}
				return false;
			},
			undefined,
			{ timeout: 30_000, polling: 500 },
		);
		await clearButton.click();
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
		// The navigate ActionIcon has aria-label="Navigate to ${title}" but the title
		// may still be loading (Skeleton), so match any aria-label starting with "Navigate to".
		// Fall back to finding the ActionIcon by its tooltip wrapper if aria-label is not set.
		const navigateButton = card.locator('[aria-label^="Navigate to"]').first();
		try {
			await navigateButton.waitFor({ state: "visible", timeout: 10_000 });
			await navigateButton.click();
		} catch {
			// Fallback: click the first ActionIcon (navigate) in the card's action group
			const firstActionIcon = card.locator(".mantine-ActionIcon-root").first();
			await firstActionIcon.waitFor({ state: "visible", timeout: 5_000 });
			await firstActionIcon.click();
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
