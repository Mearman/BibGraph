import { expect, type Page } from "@playwright/test";

/**
 * Enhanced Playwright assertion helper for BibGraph E2E tests.
 * Provides domain-specific assertions with consistent timeout handling.
 */
export class AssertionHelper {
	private readonly page: Page;

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Assert that an element is visible within the specified timeout.
	 * @param selector - CSS selector for the element
	 * @param timeout - Optional timeout in milliseconds (default: Playwright default)
	 */
	async expectVisible(selector: string, timeout?: number): Promise<void> {
		const locator = this.page.locator(selector);
		await expect(locator).toBeVisible({ timeout });
	}

	/**
	 * Assert that an element is hidden within the specified timeout.
	 * @param selector - CSS selector for the element
	 * @param timeout - Optional timeout in milliseconds (default: Playwright default)
	 */
	async expectHidden(selector: string, timeout?: number): Promise<void> {
		const locator = this.page.locator(selector);
		await expect(locator).toBeHidden({ timeout });
	}

	/**
	 * Assert that an element contains the specified text.
	 * @param selector - CSS selector for the element
	 * @param text - Text string or RegExp pattern to match
	 */
	async expectText(selector: string, text: string | RegExp): Promise<void> {
		const locator = this.page.locator(selector);
		await expect(locator).toContainText(text);
	}

	/**
	 * Assert that the number of elements matching the selector equals the expected count.
	 * @param selector - CSS selector for the elements
	 * @param count - Expected number of matching elements
	 */
	async expectCount(selector: string, count: number): Promise<void> {
		const locator = this.page.locator(selector);
		await expect(locator).toHaveCount(count);
	}

	/**
	 * Assert that the current URL matches the specified pattern.
	 * @param pattern - URL string or RegExp pattern to match
	 */
	async expectUrl(pattern: string | RegExp): Promise<void> {
		await expect(this.page).toHaveURL(pattern);
	}

	/**
	 * Assert that the page title matches the specified pattern.
	 * @param title - Title string or RegExp pattern to match
	 */
	async expectTitle(title: string | RegExp): Promise<void> {
		await expect(this.page).toHaveTitle(title);
	}

	/**
	 * Assert that no error boundary is visible on the page.
	 * Checks for the absence of [data-testid='error-boundary'] elements.
	 */
	async expectNoErrors(): Promise<void> {
		const errorBoundary = this.page.locator("[data-testid='error-boundary']");
		await expect(errorBoundary).toBeHidden();
	}

	/**
	 * Assert that no loading spinners are visible on the page.
	 * Checks for the absence of [data-testid='loading'] elements.
	 */
	async expectLoaded(): Promise<void> {
		const loadingSpinner = this.page.locator("[data-testid='loading']");
		await expect(loadingSpinner).toBeHidden();
	}

	/**
	 * Assert that the entity title is visible and contains the specified text.
	 * @param title - Expected entity title text
	 */
	async expectEntityTitle(title: string): Promise<void> {
		const entityTitle = this.page.locator("[data-testid='entity-title']");
		await expect(entityTitle).toBeVisible();
		await expect(entityTitle).toContainText(title);
	}

	/**
	 * Placeholder for axe-core accessibility integration. TODO: Integrate `@axe-core/playwright` for full accessibility testing.
	 */
	async expectAccessible(): Promise<void> {
		console.log("AssertionHelper: expectAccessible() - Placeholder for axe-core integration");
		await Promise.resolve();
	}
}

/**
 * Factory function to create an AssertionHelper instance.
 * @param page - Playwright Page instance
 * @returns New AssertionHelper instance
 */
export const assertionHelper = (page: Page): AssertionHelper =>
	new AssertionHelper(page);
