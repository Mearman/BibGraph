/**
 * Settings Page Object
 *
 * Page object for the Settings utility page in BibGraph.
 * Handles theme toggling, xpac works inclusion, and settings management.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → SettingsPage
 * @see spec-020 Phase 1: Settings page testing
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

export class SettingsPage extends BaseSPAPageObject {
	// Settings-specific selectors
	private readonly settingsSelectors = {
		settingsForm: "main",
		themeToggle: "[data-testid='theme-toggle']",
		xpacToggle: "[data-testid='xpac-toggle'], switch[role='switch'], input[type='checkbox'][aria-label*='xpac' i]",
		saveButton: "[data-testid='save-settings']",
		resetButton: "[data-testid='reset-settings']",
		successMessage: "[data-testid='settings-saved']",
	};

	constructor(page: Page) {
		super(page);
	}

	/**
	 * Navigate to the Settings page
	 */
	async gotoSettings(): Promise<void> {
		await this.goto("#/settings");
		await this.expectSettingsLoaded();
	}

	/**
	 * Toggle the dark/light theme
	 */
	async toggleTheme(): Promise<void> {
		await this.click(this.settingsSelectors.themeToggle);
		// Wait for theme transition to complete
		await this.page.waitForTimeout(200);
	}

	/**
	 * Toggle xpac works inclusion.
	 *
	 * Mantine Switch places data-testid directly on the hidden <input> element.
	 * Clicking the input's parent label triggers the toggle visually.
	 */
	async toggleXpac(): Promise<void> {
		const input = this.page.locator("[data-testid='xpac-toggle']");
		// Click the parent label/wrapper so the visual switch responds
		const wrapper = input.locator("xpath=ancestor::label");
		await wrapper.click();
	}

	/**
	 * Check if xpac works are enabled.
	 *
	 * Mantine Switch renders data-testid on the native <input type="checkbox">,
	 * so we can query checked state directly.
	 */
	async isXpacEnabled(): Promise<boolean> {
		const input = this.page.locator("[data-testid='xpac-toggle']");
		return input.isChecked();
	}

	/**
	 * Get the current theme (dark/light)
	 */
	async getCurrentTheme(): Promise<string> {
		// Check the data-mantine-color-scheme attribute on html element
		const theme = await this.page.evaluate(() => {
			return document.documentElement.dataset.mantineColorScheme;
		});
		return theme || "light";
	}

	/**
	 * Click the save settings button
	 */
	async saveSettings(): Promise<void> {
		await this.click(this.settingsSelectors.saveButton);
	}

	/**
	 * Click the reset settings button
	 */
	async resetSettings(): Promise<void> {
		await this.click(this.settingsSelectors.resetButton);
	}

	/**
	 * Assert that the settings page has loaded
	 */
	async expectSettingsLoaded(): Promise<void> {
		await this.waitForVisible(this.settingsSelectors.settingsForm);
		await this.expectLoaded();
	}

	/**
	 * Assert that settings were saved successfully
	 */
	async expectSettingsSaved(): Promise<void> {
		await this.waitForVisible(this.settingsSelectors.successMessage);
		const message = this.page.locator(this.settingsSelectors.successMessage);
		await expect(message).toBeVisible();
	}
}

// Named export
export { SettingsPage as SettingsPageObject };

// Default export
