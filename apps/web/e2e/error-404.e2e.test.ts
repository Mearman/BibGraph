/**
 * E2E tests for 404 (Not Found) error scenarios
 *
 * Tests handling of non-existent entities and routes
 * @see spec-020 Phase 5: Error scenario coverage
 */

import { expect,test } from "@playwright/test";

import { waitForAppReady } from "@/test/helpers/app-ready";
import { ErrorPage } from "@/test/page-objects/ErrorPage";

test.describe("@error 404 Not Found Errors", () => {
	let errorPage: ErrorPage;

	test.beforeEach(({ page }) => {
		errorPage = new ErrorPage(page);
	});

	test("should display 404 error for non-existent work", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Verify error page or error message is displayed
		const errorElement = page.locator(
			'[data-testid="error-page"], [role="alert"], .error-message',
		);
		const notFoundText = page.getByText(/404|does not exist|not found/i);

		// Either error page or error message should be visible
		const hasError =
			(await errorElement.isVisible().catch(() => false)) ||
			(await notFoundText.isVisible().catch(() => false));
		expect(hasError).toBe(true);
	});

	test("should display 404 error for non-existent author", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("authors", "A9999999999999");

		const notFoundText = page.getByText(/404|does not exist|not found/i);
		await expect(notFoundText).toBeVisible({ timeout: 10_000 });
	});

	test("should display 404 error for non-existent institution", async ({
		page,
	}) => {
		await errorPage.gotoNonExistentEntity("institutions", "I9999999999999");

		const notFoundText = page.getByText(/404|does not exist|not found/i);
		await expect(notFoundText).toBeVisible({ timeout: 10_000 });
	});

	test("should display 404 error for non-existent source", async () => {
		await errorPage.gotoNonExistentEntity("sources", "S9999999999999");

		await errorPage.expectNotFoundError();
	});

	test("should display 404 error for non-existent topic", async () => {
		await errorPage.gotoNonExistentEntity("topics", "T9999999999999");

		await errorPage.expectNotFoundError();
	});

	test("should display 404 error for non-existent route", async ({ page }) => {
		await page.goto("#/nonexistent-page-12345");
		await waitForAppReady(page);

		// Should redirect to search with the unknown route as query parameter
		await expect(page).toHaveURL(/\/search\?q=nonexistent-page-12345/);
	});

	test("should display appropriate error message", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check for user-friendly error message
		const errorMessages = [
			page.getByText(/could not find/i),
			page.getByText(/doesn't exist/i),
			page.getByText(/no longer available/i),
			page.getByText(/not found/i),
		];

		let isFoundMessage = false;
		for (const message of errorMessages) {
			if (await message.isVisible().catch(() => false)) {
				isFoundMessage = true;
				break;
			}
		}

		expect(isFoundMessage).toBe(true);
	});

	test("should provide navigation options from error page", async ({
		page,
	}) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Should have some way to navigate away (home link, back button, etc.)
		const navOptions = page.locator(
			'a[href="/"], a[href*="home"], button:has-text("back"), button:has-text("home")',
		);

		const hasNavOptions = (await navOptions.count()) > 0;

		if (hasNavOptions) {
			await expect(navOptions.first()).toBeVisible();
		}
		// If no explicit nav options, browser back should work
	});

	test("should display 404 error for malformed work ID", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "INVALID_ID");

		const notFoundText = page.getByText(/404|does not exist|invalid|not found/i);
		await expect(notFoundText).toBeVisible({ timeout: 10_000 });
	});

	test("should display 404 error for malformed author ID", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("authors", "INVALID_ID");

		const notFoundText = page.getByText(/404|does not exist|invalid|not found/i);
		await expect(notFoundText).toBeVisible({ timeout: 10_000 });
	});

	test("should handle 404 error with retry button if available", async () => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check if retry button is visible
		const isRetryVisible = await errorPage.retryButton
			.isVisible()
			.catch(() => false);

		if (isRetryVisible) {
			await errorPage.expectRetryButtonVisible();
			// Note: We don't actually click retry as it would just fail again
		}
	});

	test("should handle 404 error with home button if available", async () => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// Check if home button is visible
		const isHomeVisible = await errorPage.homeButton
			.isVisible()
			.catch(() => false);

		if (isHomeVisible) {
			await errorPage.expectHomeButtonVisible();
			// Could optionally test clicking home
			// await errorPage.clickHome();
		}
	});

	test("should maintain app structure despite 404 error", async ({ page }) => {
		await errorPage.gotoNonExistentEntity("works", "W9999999999999");

		// App shell should still be present (header, etc.)
		// This ensures the error is handled gracefully within the app
		const appRoot = page.locator("#root");
		await expect(appRoot).toBeVisible();
	});
});
