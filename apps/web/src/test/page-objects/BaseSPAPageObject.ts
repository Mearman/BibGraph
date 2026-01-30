/**
 * Base SPA Page Object
 *
 * Extends BasePageObject with SPA-specific functionality for BibGraph.
 * Handles TanStack Router navigation, React hydration, and app initialization.
 *
 * Hierarchy: BasePageObject → BaseSPAPageObject → BaseEntityPageObject → [Entity]Page
 * @see spec-020 Phase 1: T005
 */

import type { Page } from "@playwright/test";
import { expect } from "@playwright/test";

import { BasePageObject, type BasePageObjectOptions } from "./BasePageObject";

export interface SPAPageObjectOptions extends BasePageObjectOptions {
	/** Wait for app to be fully initialized before operations */
	waitForAppReady?: boolean;
}

export class BaseSPAPageObject extends BasePageObject {
	private readonly shouldWaitForAppReady: boolean;

	// Common selectors for BibGraph SPA
	protected readonly selectors = {
		// App shell
		appRoot: "#root",
		mainContent: "[data-testid='main-content']",
		sidebar: "[data-testid='sidebar']",
		header: "header",

		// Loading states
		loadingSpinner: "[data-testid='loading']",
		skeleton: ".mantine-Skeleton-root",

		// Error states
		errorBoundary: "[data-testid='error-boundary']",
		errorMessage: "[data-testid='error-message']",
		retryButton: "[data-testid='retry-button']",

		// Navigation
		navLink: "nav a",
		breadcrumb: "[data-testid='breadcrumb']",

		// Search
		searchInput: "[data-testid='search-input']",
		searchButton: "[data-testid='search-button']",
		searchResults: "[data-testid='search-results']",
	};

	constructor(page: Page, options: SPAPageObjectOptions = {}) {
		super(page, options);
		this.shouldWaitForAppReady = options.waitForAppReady ?? true;
	}

	/**
	 * Navigate to a path and wait for SPA to be ready
	 * @param path
	 */
	override async goto(path: string): Promise<void> {
		await super.goto(path);
		// Dismiss onboarding tour to prevent it from blocking interaction
		await this.page.evaluate(() => {
			localStorage.setItem('bibgraph-onboarding-completed', 'true');
		}).catch(() => {
			// localStorage may not be available yet
		});
		if (this.shouldWaitForAppReady) {
			await this.waitForAppInitialized();
		}
	}

	/**
	 * Wait for the React app to be fully initialized
	 */
	async waitForAppInitialized(): Promise<void> {
		// Wait for root element
		await this.waitForVisible(this.selectors.appRoot);

		// Wait for React hydration to complete
		await this.page.waitForFunction(() => {
			const root = document.querySelector("#root");
			return root && root.hasChildNodes();
		});

		// Wait for any initial loading to complete
		await this.waitForLoadingComplete();
	}

	/**
	 * Wait for loading spinners/skeletons to disappear
	 * @param timeout
	 */
	async waitForLoadingComplete(timeout?: number): Promise<void> {
		const loadingTimeout = timeout || this.defaultTimeout;

		try {
			// Wait for loading spinner to disappear (if present)
			const spinner = this.page.locator(this.selectors.loadingSpinner);
			if (await spinner.isVisible({ timeout: 1000 }).catch(() => false)) {
				await spinner.waitFor({ state: "hidden", timeout: loadingTimeout });
			}

			// Wait for skeletons to disappear (if present)
			const skeleton = this.page.locator(this.selectors.skeleton).first();
			if (await skeleton.isVisible({ timeout: 1000 }).catch(() => false)) {
				await skeleton.waitFor({ state: "hidden", timeout: loadingTimeout });
			}
		} catch {
			// Loading elements may not be present, which is fine
		}
	}

	/**
	 * Navigate using SPA router (client-side navigation)
	 * @param path
	 */
	async navigateTo(path: string): Promise<void> {
		// Use client-side navigation if possible
		await this.page.evaluate((p) => {
			window.history.pushState({}, "", p);
			window.dispatchEvent(new PopStateEvent("popstate"));
		}, path);

		await this.waitForLoadingComplete();
	}

	/**
	 * Check if there's an error state
	 */
	async hasError(): Promise<boolean> {
		return this.isVisible(this.selectors.errorBoundary);
	}

	/**
	 * Get error message text
	 */
	async getErrorMessage(): Promise<string | null> {
		if (await this.hasError()) {
			return this.getText(this.selectors.errorMessage);
		}
		return null;
	}

	/**
	 * Click retry button on error state
	 */
	async clickRetry(): Promise<void> {
		await this.click(this.selectors.retryButton);
		await this.waitForLoadingComplete();
	}

	/**
	 * Search using the header search input
	 * @param query
	 */
	async search(query: string): Promise<void> {
		await this.fill(this.selectors.searchInput, query);
		await this.click(this.selectors.searchButton);
		await this.waitForLoadingComplete();
	}

	/**
	 * Check if sidebar is visible
	 */
	async isSidebarVisible(): Promise<boolean> {
		return this.isVisible(this.selectors.sidebar);
	}

	/**
	 * Wait for main content to be rendered
	 */
	async waitForMainContent(): Promise<void> {
		await this.waitForVisible(this.selectors.mainContent);
	}

	/**
	 * Assert no error state present
	 */
	async expectNoError(): Promise<void> {
		const hasError = await this.hasError();
		expect(hasError).toBe(false);
	}

	/**
	 * Assert app is fully loaded (no loading states)
	 */
	async expectLoaded(): Promise<void> {
		await this.waitForLoadingComplete();
		await this.expectNoError();
	}

	/**
	 * Get all navigation links
	 */
	async getNavLinks(): Promise<string[]> {
		return this.getAllTexts(this.selectors.navLink);
	}

	/**
	 * Click a navigation link by text
	 * @param text
	 */
	async clickNavLink(text: string): Promise<void> {
		await this.page.getByRole("link", { name: text }).click();
		await this.waitForLoadingComplete();
	}
}
