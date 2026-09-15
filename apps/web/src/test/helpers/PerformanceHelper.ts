import type { Page } from "@playwright/test";

export interface PerformanceMetrics {
	loadTime: number;
	domContentLoaded: number;
	firstPaint?: number;
	firstContentfulPaint?: number;
}

interface MemoryUsage {
	usedJSHeapSize: number;
	totalJSHeapSize: number;
}

export class PerformanceHelper {
	private readonly timers = new Map<string, number>();

	constructor(private readonly page: Page) {}

	/**
	 * Start a performance timer with a label
	 */
	startTimer(label: string): void {
		this.timers.set(label, Date.now());
	}

	/**
	 * Stop a timer and return elapsed time in milliseconds
	 * @throws Error if timer was not started
	 */
	stopTimer(label: string): number {
		const startTime = this.timers.get(label);
		if (startTime === undefined) {
			throw new Error(`Timer "${label}" was not started`);
		}
		const elapsed = Date.now() - startTime;
		this.timers.delete(label);
		return elapsed;
	}

	/**
	 * Get navigation timing metrics from the browser
	 */
	async getNavigationTiming(): Promise<PerformanceMetrics> {
		const metrics = await this.page.evaluate(() => {
			// Use the modern PerformanceNavigationTiming API
			const navigationEntries = performance.getEntriesByType("navigation");
			const navigationTiming = navigationEntries.length > 0 ? navigationEntries[0] : undefined;

			// Get paint timing entries
			const paintEntries = performance.getEntriesByType("paint");
			const firstPaint = paintEntries.find(
				(entry) => entry.name === "first-paint"
			);
			const firstContentfulPaint = paintEntries.find(
				(entry) => entry.name === "first-contentful-paint"
			);

			return {
				loadTime: navigationTiming !== undefined ? navigationTiming.loadEventEnd : 0,
				domContentLoaded: navigationTiming !== undefined ? navigationTiming.domContentLoadedEventEnd : 0,
				firstPaint: firstPaint?.startTime,
				firstContentfulPaint: firstContentfulPaint?.startTime,
			};
		});

		return metrics;
	}

	/**
	 * Navigate to a URL and measure page load performance
	 */
	async measurePageLoad(url: string): Promise<PerformanceMetrics> {
		await this.page.goto(url, { waitUntil: "load" });
		return this.getNavigationTiming();
	}

	/**
	 * Assert that page load time is under a threshold
	 * @throws Error if load time exceeds threshold
	 */
	async assertLoadTimeUnder(maxMs: number): Promise<void> {
		const metrics = await this.getNavigationTiming();
		if (metrics.loadTime > maxMs) {
			throw new Error(
				`Page load time (${String(metrics.loadTime)}ms) exceeded threshold (${String(maxMs)}ms)`
			);
		}
	}

	/**
	 * Get memory usage (Chrome only)
	 * Returns null if performance.memory is not available
	 */
	async getMemoryUsage(): Promise<MemoryUsage | null> {
		const memory = await this.page.evaluate(() => {
			// performance.memory is a non-standard, Chrome-specific extension not declared on the DOM lib's Performance interface, so it is narrowed via a local type guard.
			interface PerformanceWithMemory extends Performance {
				memory: { usedJSHeapSize: number; totalJSHeapSize: number; jsHeapSizeLimit: number };
			}

			const hasMemoryInfo = (perf: Performance): perf is PerformanceWithMemory => "memory" in perf;

			if (!hasMemoryInfo(performance)) {
				return null;
			}

			return {
				usedJSHeapSize: performance.memory.usedJSHeapSize,
				totalJSHeapSize: performance.memory.totalJSHeapSize,
			};
		});

		return memory;
	}

	/**
	 * Log current timer value to console
	 * @throws Error if timer was not started
	 */
	logPerformance(label: string): void {
		const startTime = this.timers.get(label);
		if (startTime === undefined) {
			throw new Error(`Timer "${label}" was not started`);
		}
		const elapsed = Date.now() - startTime;
		console.log(`[Performance] ${label}: ${String(elapsed)}ms`);
	}
}

/**
 * Factory function to create a PerformanceHelper instance
 */
export const performanceHelper = (page: Page): PerformanceHelper => {
	return new PerformanceHelper(page);
};
