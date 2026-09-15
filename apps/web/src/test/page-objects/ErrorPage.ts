/**
 * Page object for error pages (404, 500, network errors, etc.)
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect, type Page } from "@playwright/test";

import { BaseSPAPageObject } from "./BaseSPAPageObject";

/**
 * Page object for error state pages
 */
export class ErrorPage extends BaseSPAPageObject {
	constructor(page: Page) {
		super(page, { baseUrl: "/" });
	}

	// Locators for error page elements
	get errorContainer() {
		return this.page.locator('[data-testid="error-page"], .error-page, [role="alert"]');
	}

	get errorTitle() {
		return this.page.locator('[data-testid="error-title"], h1');
	}

	get errorMessage() {
		return this.page.locator('[data-testid="error-message"], .error-message');
	}

	get errorCode() {
		return this.page.locator('[data-testid="error-code"], .error-code');
	}

	get retryButton() {
		return this.page.locator(
			'[data-testid="retry-button"], button:has-text("Retry"), button:has-text("Try again")',
		);
	}

	get homeButton() {
		return this.page.locator('[data-testid="home-button"], a:has-text("Home"), a[href="/"]');
	}

	get backButton() {
		return this.page.locator(
			'[data-testid="back-button"], button:has-text("Back"), button:has-text("Go back")',
		);
	}

	// Navigation methods
	async gotoNonExistentEntity(type: string, id: string): Promise<void> {
		await this.page.goto(`#/${type}/${id}`);
		await this.waitForLoadingComplete();
	}

	// Assertion methods
	async expectErrorDisplayed(): Promise<void> {
		await expect(this.errorContainer).toBeVisible();
	}

	async expectErrorTitle(expected: string | RegExp): Promise<void> {
		await expect(this.errorTitle).toContainText(expected);
	}

	async expectErrorCode(code: string | number): Promise<void> {
		const codeText = String(code);
		const codeLocator = this.page.getByText(codeText);
		await expect(codeLocator.or(this.errorCode)).toBeVisible();
	}

	async expectRetryButtonVisible(): Promise<void> {
		await expect(this.retryButton).toBeVisible();
	}

	async expectHomeButtonVisible(): Promise<void> {
		await expect(this.homeButton).toBeVisible();
	}

	// Action methods
	override async clickRetry(): Promise<void> {
		await this.retryButton.click();
		await this.waitForLoadingComplete();
	}

	async clickHome(): Promise<void> {
		await this.homeButton.click();
		await this.waitForLoadingComplete();
		await expect(this.page).toHaveURL(/^\/?#?\/?$/);
	}

	async clickBack(): Promise<void> {
		await this.backButton.click();
		await this.waitForLoadingComplete();
	}

	// Helper methods for specific error types
	async expectNotFoundError(): Promise<void> {
		await this.expectErrorDisplayed();
		const page = this.page;
		const has404 = await page
			.getByText(/404|not found/i)
			.isVisible()
			.catch(() => false);
		expect(has404).toBe(true);
	}

	async expectServerError(): Promise<void> {
		await this.expectErrorDisplayed();
		const page = this.page;
		const has500 = await page
			.getByText(/500|internal error|server error/i)
			.isVisible()
			.catch(() => false);
		expect(has500).toBe(true);
	}

	async expectNetworkError(): Promise<void> {
		await this.expectErrorDisplayed();
		const page = this.page;
		const hasNetworkError = await page
			.getByText(/connection|failed to fetch|network|offline/i)
			.isVisible()
			.catch(() => false);
		expect(hasNetworkError).toBe(true);
	}

	async expectTimeoutError(): Promise<void> {
		await this.expectErrorDisplayed();
		const page = this.page;
		const hasTimeout = await page
			.getByText(/timed out|timeout|took too long/i)
			.isVisible()
			.catch(() => false);
		expect(hasTimeout).toBe(true);
	}
}
