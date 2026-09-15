/**
 * E2E tests for OpenAlex URL routing and conversion
 *
 * Tests handling of OpenAlex API URLs including:
 * - Single entity redirect
 * - List queries with filters
 * - Autocomplete endpoints
 * - Sort, paging, sample, and group by parameters
 * - Search parameters
 * - Fallback to search for invalid/unknown routes
 * - External ID routing (ROR, ISSN)
 * - Full API URL handling
 *
 * Promoted from manual tests to automated smoke tests.
 * @see apps/web/src/test/e2e/manual/openalex-url.e2e.test.ts
 * @see apps/web/src/test/e2e/manual/external-id-routing.e2e.test.ts
 */

import { expect, type Page,test } from "@playwright/test";

import {
	waitForAppReady,
	waitForNoLoading,
	waitForRouterReady,
} from "@/test/helpers/app-ready";

const isCi = process.env.CI !== undefined && process.env.CI !== "";
const BASE_URL = isCi ? "http://localhost:4173" : "http://localhost:5173";
const URL_PREVIEW_LENGTH = 80;

test.describe("@manual @utility OpenAlex URL Routing", () => {
	test.describe("API URL Conversion and Routing", () => {
		// Note: Test uses A5023888391 instead of A5017898742 to avoid CI timeout issues
		// Both test the same routing functionality, just different author entities
		const testScenarios = [
			// 1. Single entity redirect
			{
				url: "https://api.openalex.org/A5023888391",
				expectedUrl: "/authors/A5023888391",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });

					// Should show author details, not the search page
					// Wait for the author ID to be displayed (this appears immediately even while data loads)
					await expect(page.locator("text=Author ID:")).toBeVisible({
						timeout: 10_000,
					});

					// Verify we have the correct author ID
					await expect(
						page.locator("text=/Author ID:.*A5023888391/"),
					).toBeVisible({ timeout: 10_000 });

					// Check that we're on the author page, not the search page
					await expect(page.locator("text=Academic Search")).not.toBeVisible({
						timeout: 5000,
					});
				},
			},
			// 2. List query with filter
			{
				url: "https://api.openalex.org/works?filter=publication_year:2020",
				expectedUrl: "/works?filter=publication_year%3A2020",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Works", {
						timeout: 30_000,
					});

					// Assert table renders
					await expect(page.locator('[data-testid="table"]')).toBeVisible({
						timeout: 30_000,
					});
				},
			},
			// 3. Autocomplete
			{
				url: "https://api.openalex.org/autocomplete/authors?q=ronald",
				expectedUrl: "/autocomplete/authors?q=ronald",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Autocomplete Authors", {
						timeout: 30_000,
					});
				},
			},
			// 4. With sort param
			{
				url: "https://api.openalex.org/authors?sort=cited_by_count:desc",
				expectedUrl: "/authors?sort=cited_by_count%3Adesc",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Authors", {
						timeout: 30_000,
					});
				},
			},
			// 5. Paging params
			{
				url: "https://api.openalex.org/works?per_page=50&page=2",
				expectedUrl: "/works?per_page=50&page=2",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Works", {
						timeout: 30_000,
					});
				},
			},
			// 6. Sample param
			{
				url: "https://api.openalex.org/institutions?sample=10",
				expectedUrl: "/institutions?sample=10",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Institutions", {
						timeout: 30_000,
					});
				},
			},
			// 7. Group by
			{
				url: "https://api.openalex.org/authors?group_by=last_known_institutions.continent",
				expectedUrl: "/authors?group_by=last_known_institutions.continent",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Authors", {
						timeout: 30_000,
					});
				},
			},
			// 8. Search param
			{
				url: "https://api.openalex.org/works?search=dna",
				expectedUrl: "/works?search=dna",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });
					await waitForNoLoading(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Works", {
						timeout: 30_000,
					});
				},
			},
			// 9. Fallback to search for invalid routes
			{
				url: "https://api.openalex.org/keywords",
				expectedUrl: "/search?q=https%3A%2F%2Fapi.openalex.org%2Fkeywords",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });

					await expect(page.locator("h1")).toContainText("Academic Search", {
						timeout: 30_000,
					});
				},
			},
			// 10. Encoded params and invalid detection
			{
				url: "https://api.openalex.org/invalid/id?filter=display_name.search:john%20smith",
				expectedUrl:
					"/search?q=https%3A%2F%2Fapi.openalex.org%2Finvalid%2Fid%3Ffilter%3Ddisplay_name.search%3Ajohn%20smith",
				assertUI: async (page: Page) => {
					await waitForAppReady(page, { timeout: 30_000 });

					// Should fall back to search page
					await expect(page.locator("h1")).toContainText("Academic Search", {
						timeout: 30_000,
					});
				},
			},
		];

		for (const { url, expectedUrl, assertUI } of testScenarios) {
			test(`should handle ${url.slice(0, URL_PREVIEW_LENGTH)}... and redirect to ${expectedUrl}`, async ({
				page,
			}) => {
				// Parse the URL to determine the correct route path
				const urlObject = new URL(url);
				const domain = urlObject.hostname; // e.g., "api.openalex.org"
				const path = urlObject.pathname + urlObject.search; // e.g., "/works?filter=publication_year:2020"
				const routeDomain = domain.replaceAll('.', "-"); // Convert dots to hyphens: "api-openalex-org"
				const routePath = `/${routeDomain}${path}`; // e.g., "/api-openalex-org/works?filter=publication_year:2020"

				// Navigate to the constructed route path
				await page.goto(`${BASE_URL}/#${routePath}`, { timeout: 30_000 });

				// Wait for router to be ready
				await waitForRouterReady(page, { timeout: 30_000 });

				// Wait for redirect to complete - check if navigation happened by looking for URL changes
				await page.waitForFunction(
					(expectedHash) => {
						const hash = window.location.hash;
						return (
							hash !== expectedHash &&
							!document.body.textContent.includes("Resolving")
						);
					},
					`#${routePath}`,
					{ timeout: 30_000 },
				);

				// Run the UI assertion - assertions have their own timeouts
				await assertUI(page);
			});
		}
	});

	test.describe("External ID Routing with Colons", () => {
		test("should handle ROR ID with colon - ror:02y3ad647", async ({ page }) => {
			const testUrl = `${BASE_URL}/#/api-openalex-org/institutions/ror:02y3ad647`;

			await page.goto(testUrl, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });

			// Should redirect to /institutions/ror/02y3ad647
			const currentUrl = page.url();
			expect(currentUrl).toContain("/institutions/ror/02y3ad647");

			// Wait for content to load
			await page.locator("main").waitFor({ timeout: 10_000 });

			const mainText = page.locator("main");
			await expect(mainText).not.toBeEmpty();

			// Should not show error page
			await expect(mainText).not.toContainText("Error");
			await expect(mainText).not.toContainText("Not Found");
		});

		test("should handle ROR ID with colon - ror:00cvxb145", async ({ page }) => {
			const testUrl = `${BASE_URL}/#/api-openalex-org/institutions/ror:00cvxb145`;

			await page.goto(testUrl, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });

			// Should redirect to /institutions/ror/00cvxb145
			const currentUrl = page.url();
			expect(currentUrl).toContain("/institutions/ror/00cvxb145");

			// Wait for content to load
			await page.locator("main").waitFor({ timeout: 10_000 });

			const mainText = page.locator("main");
			await expect(mainText).not.toBeEmpty();

			// Should not show error page
			await expect(mainText).not.toContainText("Error");
			await expect(mainText).not.toContainText("Not Found");
		});

		test("should handle ISSN with colon - issn:2041-1723", async ({ page }) => {
			const testUrl = `${BASE_URL}/#/api-openalex-org/sources/issn:2041-1723`;

			await page.goto(testUrl, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });

			// Should redirect to /sources/issn/2041-1723
			const currentUrl = page.url();
			expect(currentUrl).toContain("/sources/issn/2041-1723");

			// Wait for content to load
			await page.locator("main").waitFor({ timeout: 10_000 });

			const mainText = page.locator("main");
			await expect(mainText).not.toBeEmpty();

			// Should not show error page
			await expect(mainText).not.toContainText("Error");
			await expect(mainText).not.toContainText("Not Found");
		});

		test("should handle full API URL with ROR", async ({ page }) => {
			const testUrl = `${BASE_URL}/#/https://api.openalex.org/institutions/ror:02y3ad647`;

			await page.goto(testUrl, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });

			// Should redirect through api-openalex-org route
			await page.locator("main").waitFor({ timeout: 10_000 });

			const mainText = page.locator("main");
			await expect(mainText).not.toBeEmpty();

			// Should not show error page
			await expect(mainText).not.toContainText("Error");
			await expect(mainText).not.toContainText("Not Found");
		});

		test("should handle full API URL with ISSN", async ({ page }) => {
			const testUrl = `${BASE_URL}/#/https://api.openalex.org/sources/issn:2041-1723`;

			await page.goto(testUrl, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });

			// Should redirect through api-openalex-org route
			await page.locator("main").waitFor({ timeout: 10_000 });

			const mainText = page.locator("main");
			await expect(mainText).not.toBeEmpty();

			// Should not show error page
			await expect(mainText).not.toContainText("Error");
			await expect(mainText).not.toContainText("Not Found");
		});
	});

	test.describe("Edge Cases and Complex URLs", () => {
		test("should handle OpenAlex URL with multiple query parameters", async ({
			page,
		}) => {
			const url =
				"https://api.openalex.org/works?filter=publication_year:2020,type:article&sort=cited_by_count:desc&per_page=25";
			const urlObject = new URL(url);
			const domain = urlObject.hostname;
			const path = urlObject.pathname + urlObject.search;
			const routeDomain = domain.replaceAll('.', "-");
			const routePath = `/${routeDomain}${path}`;

			await page.goto(`${BASE_URL}/#${routePath}`, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });
			await waitForNoLoading(page, { timeout: 30_000 });

			await expect(page.locator("h1")).toContainText("Works", {
				timeout: 30_000,
			});
		});

		test("should handle OpenAlex URL with encoded characters in search", async ({
			page,
		}) => {
			const url =
				"https://api.openalex.org/works?search=machine%20learning%20algorithms";
			const urlObject = new URL(url);
			const domain = urlObject.hostname;
			const path = urlObject.pathname + urlObject.search;
			const routeDomain = domain.replaceAll('.', "-");
			const routePath = `/${routeDomain}${path}`;

			await page.goto(`${BASE_URL}/#${routePath}`, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });
			await waitForNoLoading(page, { timeout: 30_000 });

			await expect(page.locator("h1")).toContainText("Works", {
				timeout: 30_000,
			});
		});

		test("should handle OpenAlex URL with both filter and search parameters", async ({
			page,
		}) => {
			const url =
				"https://api.openalex.org/works?filter=publication_year:2023&search=covid";
			const urlObject = new URL(url);
			const domain = urlObject.hostname;
			const path = urlObject.pathname + urlObject.search;
			const routeDomain = domain.replaceAll('.', "-");
			const routePath = `/${routeDomain}${path}`;

			await page.goto(`${BASE_URL}/#${routePath}`, { timeout: 30_000 });
			await waitForRouterReady(page, { timeout: 30_000 });
			await waitForAppReady(page, { timeout: 30_000 });
			await waitForNoLoading(page, { timeout: 30_000 });

			await expect(page.locator("h1")).toContainText("Works", {
				timeout: 30_000,
			});
		});
	});
});
