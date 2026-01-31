import type { Page } from '@playwright/test';

interface WaitOptions {
	timeout?: number;
}

const DEFAULT_TIMEOUT = 45_000;

/**
 * Wait for the application to be fully initialized and ready for interaction.
 * Checks for root element, and waits for loading indicators to disappear.
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForAppReady = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	// Dismiss onboarding tour if present (prevents it from blocking interaction)
	await page.evaluate(() => {
		localStorage.setItem('bibgraph-onboarding-completed', 'true');
	}).catch(() => {
		// localStorage may not be available yet
	});

	// Close welcome dialog if it's already visible (race with React mount)
	try {
		const skipTourBtn = page.locator('button:has-text("Skip Tour")');
		await skipTourBtn.waitFor({ state: 'visible', timeout: 2000 });
		await skipTourBtn.click();
		await page.waitForTimeout(300);
	} catch {
		// Dialog may not be present if localStorage was set early enough
	}

	// Wait for root element to exist and have children
	try {
		await page.waitForSelector('#root:has(*)', { timeout, state: 'attached' });
	} catch (error) {
		// In CI, provide more diagnostic information if the app fails to load
		if (process.env.CI) {
			const diagnostics = await page.evaluate(() => {
				const scripts = [...document.querySelectorAll('script[src*="index-"]')];
				const mainScript = scripts.find(s => (s as HTMLScriptElement).src.includes('index-'));
				const rootEl = document.querySelector('#root');

				return {
					hasRoot: !!rootEl,
					rootHasChildren: rootEl ? rootEl.children.length > 0 : false,
					hasMainScript: !!mainScript,
					mainScriptSrc: mainScript ? (mainScript as HTMLScriptElement).src : null,
					documentReady: document.readyState,
					location: window.location.href,
					userAgent: navigator.userAgent
				};
			});

			console.error('CI smoke test failure diagnostics:', diagnostics);
		}
		throw error;
	}

	// Wait for loading indicators to be hidden (if present)
	try {
		await page.waitForSelector('[data-testid="loading"]', {
			timeout: 5000,
			state: 'hidden',
		});
	} catch {
		// Loading indicator may not be present, continue
	}

	// Wait for skeleton loaders to be hidden (if present)
	try {
		await page.waitForSelector('.mantine-Skeleton-root', {
			timeout: 5000,
			state: 'hidden',
		});
	} catch {
		// Skeleton loaders may not be present, continue
	}
};

/**
 * Wait for entity detail page data to be loaded and visible.
 * Checks for entity title and metadata elements.
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForEntityData = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	// Wait for entity detail layout to be present
	await page.waitForSelector('[data-testid="entity-detail-layout"]', {
		timeout,
		state: 'visible',
	});

	// Wait for entity title (h1) to be visible within the detail layout
	await page.waitForSelector('[data-testid="entity-detail-layout"] h1', {
		timeout,
		state: 'visible',
	});

	// Wait for entity ID to be visible (indicates data has loaded)
	try {
		await page.waitForSelector('[data-testid="entity-detail-layout"] code', {
			timeout: 5000,
			state: 'visible',
		});
	} catch {
		// Entity ID may not be present for all entity types, continue
	}
};

/**
 * Wait for search results to be loaded and visible.
 * Waits for the results container AND at least one result item or table row
 * to ensure actual data has rendered (not just the empty container).
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForSearchResults = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	await page.waitForSelector('[data-testid="search-results"]', {
		timeout,
		state: 'visible',
	});

	// Wait for the SearchResultsHeader SegmentedControl which only renders
	// when actual results have loaded (not during skeleton/loading states).
	await page.waitForSelector(
		'[data-testid="search-results"] .mantine-SegmentedControl-root',
		{ timeout, state: 'visible' },
	);
};

/**
 * Wait for D3 force simulation graph to be ready.
 * Checks for SVG element with nodes and stable simulation state.
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForGraphReady = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	// Wait for SVG element to exist with g.nodes children
	await page.waitForSelector('svg g.nodes', { timeout, state: 'attached' });

	// Wait for simulation to be stable (check for data-simulation-running='false' or absence)
	try {
		await page.waitForFunction(
			() => {
				const svgElement = document.querySelector('svg');
				if (!svgElement) return false;

				const simulationRunning =
					svgElement.dataset.simulationRunning;
				return simulationRunning === 'false' || simulationRunning === null;
			},
			{ timeout }
		);
	} catch {
		// Simulation status attribute may not be implemented, continue
	}
};

/**
 * Wait for TanStack Router to be ready.
 * Checks for router instance on window object.
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForRouterReady = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	await page.waitForFunction(
		() => {
			return (window as unknown as { __tanstack_router__?: unknown })
				.__tanstack_router__ !== undefined;
		},
		{ timeout }
	);
};

/**
 * Wait for all loading indicators to disappear from the page.
 * Includes loading spinners, skeleton loaders, and loading states.
 * @param page - Playwright page object
 * @param options - Optional timeout configuration
 */
export const waitForNoLoading = async (page: Page, options?: WaitOptions): Promise<void> => {
	const timeout = options?.timeout ?? DEFAULT_TIMEOUT;

	// Wait for all common loading indicators to be hidden
	const loadingSelectors = [
		'[data-testid="loading"]',
		'.mantine-Skeleton-root',
		'[data-loading="true"]',
		'.mantine-Loader-root',
	];

	for (const selector of loadingSelectors) {
		try {
			await page.waitForSelector(selector, {
				timeout: Math.min(timeout, 5000),
				state: 'hidden',
			});
		} catch {
			// Loading indicator may not be present, continue
		}
	}
};
