/**
 * Base Page Object
 *
 * Foundation for all page objects in the E2E test suite.
 * Provides common navigation, assertion, and interaction methods.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → [Entity]Page
 * @see spec-020 Phase 1: T004
 */

import type { Locator,Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { waitForStylesApplied } from "../helpers/css-ready";

export interface BasePageObjectOptions {
	/**
	Base URL for the application
	 */
	baseUrl?: string;
	/**
	Default timeout for operations
	 */
	timeout?: number;
}

const DEFAULT_TIMEOUT_MS = 30_000;

export class BasePageObject {
	protected readonly page: Page;
	protected readonly baseUrl: string;
	protected readonly defaultTimeout: number;

	constructor(page: Page, options: Readonly<BasePageObjectOptions> = {}) {
		this.page = page;
		this.baseUrl = options.baseUrl ?? "";
		this.defaultTimeout = options.timeout ?? DEFAULT_TIMEOUT_MS;
	}

	/**
	 * Navigate to a path relative to baseUrl
	 */
	async goto(path: string): Promise<void> {
		const url = this.baseUrl ? `${this.baseUrl}${path}` : path;
		await this.page.goto(url, { timeout: this.defaultTimeout });
	}

	/**
	 * Wait for navigation to complete
	 */
	async waitForNavigation(): Promise<void> {
		await this.page.waitForLoadState("networkidle", {
			timeout: this.defaultTimeout,
		});
	}

	/**
	 * Wait for CSS to be fully loaded and styles to be applied
	 * This fixes issues with elements having incorrect sizes or visibility
	 */
	async waitForStylesApplied(): Promise<void> {
		await waitForStylesApplied(this.page, this.defaultTimeout);
	}

	/**
	 * Wait for app to be ready including navigation and CSS
	 */
	async waitForAppReady(): Promise<void> {
		await this.waitForNavigation();
		await this.waitForStylesApplied();
	}

	/**
	 * Get the current URL
	 */
	getUrl(): string {
		return this.page.url();
	}

	/**
	 * Get the page title
	 */
	async getTitle(): Promise<string> {
		return this.page.title();
	}

	/**
	 * Check if element is visible
	 */
	async isVisible(selector: string): Promise<boolean> {
		return this.page.locator(selector).isVisible();
	}

	/**
	 * Wait for element to be visible
	 */
	async waitForVisible(
		selector: string,
		timeout?: number
	): Promise<Locator> {
		const locator = this.page.locator(selector);
		await locator.waitFor({
			state: "visible",
			timeout: timeout ?? this.defaultTimeout,
		});
		return locator;
	}

	/**
	 * Wait for element to be hidden
	 */
	async waitForHidden(selector: string, timeout?: number): Promise<void> {
		await this.page.locator(selector).waitFor({
			state: "hidden",
			timeout: timeout ?? this.defaultTimeout,
		});
	}

	/**
	 * Click an element
	 */
	async click(selector: string): Promise<void> {
		await this.page.locator(selector).click();
	}

	/**
	 * Fill an input field
	 */
	async fill(selector: string, value: string): Promise<void> {
		await this.page.locator(selector).fill(value);
	}

	/**
	 * Get text content of an element
	 */
	async getText(selector: string): Promise<string | null> {
		return this.page.locator(selector).textContent();
	}

	/**
	 * Get all text contents matching selector
	 */
	async getAllTexts(selector: string): Promise<string[]> {
		return this.page.locator(selector).allTextContents();
	}

	/**
	 * Count elements matching selector
	 */
	async count(selector: string): Promise<number> {
		return this.page.locator(selector).count();
	}

	/**
	 * Take a screenshot
	 */
	async screenshot(name: string): Promise<void> {
		await this.page.screenshot({ path: `screenshots/${name}.png` });
	}

	/**
	 * Wait for a specific text to appear on the page
	 */
	async waitForText(
		text: string,
		timeout?: number
	): Promise<void> {
		await this.page.getByText(text).waitFor({
			state: "visible",
			timeout: timeout ?? this.defaultTimeout,
		});
	}

	/**
	 * Assert page has title containing text
	 */
	async expectTitleContains(text: string): Promise<void> {
		await expect(this.page).toHaveTitle(new RegExp(text));
	}

	/**
	 * Assert URL contains path
	 */
	async expectUrlContains(path: string): Promise<void> {
		await expect(this.page).toHaveURL(new RegExp(path));
	}

	/**
	 * Assert element is visible
	 */
	async expectVisible(selector: string): Promise<void> {
		await expect(this.page.locator(selector)).toBeVisible();
	}

	/**
	 * Assert element contains text
	 */
	async expectText(selector: string, text: string): Promise<void> {
		await expect(this.page.locator(selector)).toContainText(text);
	}

	/**
	 * Get the underlying Playwright page object
	 */
	getPage(): Page {
		return this.page;
	}
}
