import type { Page, Route } from '@playwright/test';

/**
 * Helper class for mocking OpenAlex API routes in E2E tests using Playwright.
 *
 * Provides methods to:
 * - Mock successful API responses with optional delays
 * - Simulate API errors (4xx, 5xx)
 * - Simulate network failures
 * - Mock timeout scenarios
 * - Mock specific OpenAlex entity and list endpoints
 * @example
 * ```typescript
 * const mockHelper = apiMockHelper(page);
 * await mockHelper.mockOpenAlexEntity('works', 'W123', { id: 'W123', title: 'Test Work' });
 * await mockHelper.mockApiError('/api/openalex/authors/A999', 404, 'Not Found');
 * await mockHelper.clearAllMocks();
 * ```
 */
/**
 * Optional configuration for {@link ApiMockHelper.mockApiRoute}.
 */
interface MockApiRouteOptions {
	/**
	 * HTTP status code (default: 200)
	 */
	status?: number;
	/**
	 * Delay in milliseconds before responding (default: 0)
	 */
	delay?: number;
}

export class ApiMockHelper {
	private readonly page: Page;
	private readonly mockedPatterns: (string | RegExp)[] = [];

	constructor(page: Page) {
		this.page = page;
	}

	/**
	 * Mock an API route to return a JSON response.
	 * @param urlPattern - URL pattern (string or RegExp) to intercept
	 * @param response - Response data to return (will be JSON stringified)
	 * @param options - Optional configuration
	 */
	async mockApiRoute(
		urlPattern: string | RegExp,
		response: unknown,
		options?: MockApiRouteOptions
	): Promise<void> {
		const { status = 200, delay = 0 } = options ?? {};

		await this.page.route(urlPattern, async (route: Readonly<Route>) => {
			if (delay > 0) {
				await new Promise((resolve) => { setTimeout(resolve, delay); });
			}

			await route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify(response),
			});
		});

		this.mockedPatterns.push(urlPattern);
	}

	/**
	 * Mock an API error response.
	 * @param urlPattern - URL pattern (string or RegExp) to intercept
	 * @param status - HTTP error status code (e.g., 404, 500)
	 * @param message - Error message
	 */
	async mockApiError(
		urlPattern: string | RegExp,
		status: number,
		message: string
	): Promise<void> {
		await this.page.route(urlPattern, async (route: Readonly<Route>) => {
			await route.fulfill({
				status,
				contentType: 'application/json',
				body: JSON.stringify({
					error: message,
					status,
				}),
			});
		});

		this.mockedPatterns.push(urlPattern);
	}

	/**
	 * Simulate a network failure by aborting the request.
	 * @param urlPattern - URL pattern (string or RegExp) to intercept
	 */
	async mockNetworkFailure(urlPattern: string | RegExp): Promise<void> {
		await this.page.route(urlPattern, async (route: Readonly<Route>) => {
			await route.abort('failed');
		});

		this.mockedPatterns.push(urlPattern);
	}

	/**
	 * Simulate a timeout by delaying the response.
	 * @param urlPattern - URL pattern (string or RegExp) to intercept
	 * @param delay - Delay in milliseconds before timeout
	 */
	async mockTimeout(
		urlPattern: string | RegExp,
		delay: number
	): Promise<void> {
		await this.page.route(urlPattern, async (route: Readonly<Route>) => {
			await new Promise((resolve) => { setTimeout(resolve, delay); });
			await route.abort('timedout');
		});

		this.mockedPatterns.push(urlPattern);
	}

	/**
	 * Clear all mocked routes.
	 */
	async clearAllMocks(): Promise<void> {
		for (const pattern of this.mockedPatterns) {
			await this.page.unroute(pattern);
		}
		this.mockedPatterns.length = 0;
	}

	/**
	 * Mock a response for a specific OpenAlex entity endpoint.
	 * @param entityType - Entity type (e.g., 'works', 'authors')
	 * @param entityId - Entity ID (e.g., 'W123', 'A456')
	 * @param data - Entity data to return
	 */
	async mockOpenAlexEntity(
		entityType: string,
		entityId: string,
		data: unknown
	): Promise<void> {
		const pattern = new RegExp(
			`/api/openalex/${entityType}/${entityId.replaceAll(/[$()*+.?[\\\]^{|}]/g, String.raw`\$&`)}`
		);

		await this.mockApiRoute(pattern, data);
	}

	/**
	 * Mock a response for an OpenAlex list endpoint.
	 * @param entityType - Entity type (e.g., 'works', 'authors')
	 * @param data - List response data to return
	 */
	async mockOpenAlexList(
		entityType: string,
		data: unknown
	): Promise<void> {
		const pattern = new RegExp(String.raw`/api/openalex/${entityType}(?:\?|$)`);

		await this.mockApiRoute(pattern, data);
	}
}

/**
 * Factory function to create an ApiMockHelper instance.
 * @param page - Playwright Page instance
 * @returns ApiMockHelper instance
 */
export const apiMockHelper = (page: Page): ApiMockHelper => {
	return new ApiMockHelper(page);
};
