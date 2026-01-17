/**
 * GitHub Pages cache tier for static data
 * Fetches pre-cached entities from GitHub Pages or local static JSON files
 */

import { logger } from "@bibgraph/utils";

import type { CacheTierInterface } from "../../cache-tiers-types";
import type { StaticDataResult } from "../../static-data-provider";
import { CacheTier } from "../../static-data-provider";
import type { StaticEntityType } from "../../static-data-utils";

interface CacheStats {
	requests: number;
	hits: number;
	totalLoadTime: number;
}

interface FailureState {
	lastFailure: number;
	attempts: number;
	cooldownUntil?: number;
}

interface RetryConfig {
	maxAttempts: number;
	baseDelayMs: number;
	maxDelayMs: number;
	jitterMs: number;
	cooldownMs: number;
}

interface HttpError {
	message: string;
	status: number;
	retryAfter?: string;
}

/**
 * Calculate cache statistics from raw stats
 * @param stats
 */
const calculateCacheStats = (stats: CacheStats): {
	requests: number;
	hits: number;
	averageLoadTime: number;
} => ({
		requests: stats.requests,
		hits: stats.hits,
		averageLoadTime:
			stats.requests > 0 ? stats.totalLoadTime / stats.requests : 0,
	});

/**
 * GitHub Pages cache implementation for static data
 */
export class GitHubPagesCacheTier implements CacheTierInterface {
	private stats: CacheStats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private readonly LOG_PREFIX = "github-pages-cache";
	private baseUrl: string;

	// Track recent failures per URL to avoid repeated bursts against remote
	private recentFailures: Map<string, FailureState> = new Map();

	// Configurable retry policy for remote tier
	private retryConfig: RetryConfig = (() => {
		const isTest = Boolean(
			globalThis.process?.env?.VITEST ??
				globalThis.process?.env?.NODE_ENV === "test",
		);
		return {
			maxAttempts: 3,
			baseDelayMs: isTest ? 50 : 1000,
			maxDelayMs: isTest ? 200 : 10_000,
			jitterMs: isTest ? 0 : 500,
			cooldownMs: isTest ? 1000 : 30_000, // shorter cooldown in tests
		};
	})();

	constructor(baseUrl?: string) {
		// Don't set a default URL - require explicit configuration
		// This prevents attempting to fetch from non-existent placeholder URLs
		this.baseUrl = baseUrl ?? "";
	}

	private getUrl(entityType: StaticEntityType, id: string): string {
		// Sanitize ID for URL
		const sanitizedId = encodeURIComponent(id);
		return `${this.baseUrl}${entityType}/${sanitizedId}.json`;
	}

	/**
	 * Create a typed HTTP error object
	 * @param response
	 */
	private createHttpError(response: Response): HttpError {
		return {
			message: `HTTP ${response.status}: ${response.statusText}`,
			status: response.status,
			retryAfter: response.headers.get("Retry-After") ?? undefined,
		};
	}

	/**
	 * Calculate retry delay with exponential backoff and jitter
	 * @param attempt
	 * @param retryAfterSec
	 */
	private calculateRetryDelay(attempt: number, retryAfterSec?: number): number {
		const base = this.retryConfig.baseDelayMs * Math.pow(2, attempt - 1);
		const jitter = Math.random() * this.retryConfig.jitterMs;
		return Math.min(
			(retryAfterSec ? retryAfterSec * 1000 : base) + jitter,
			this.retryConfig.maxDelayMs,
		);
	}

	/**
	 * Update failure state for a URL
	 * @param url
	 * @param error
	 */
	private updateFailureState(url: string, error: unknown): void {
		const prev = this.recentFailures.get(url) ?? {
			lastFailure: 0,
			attempts: 0,
			cooldownUntil: undefined,
		};
		const newState: FailureState = {
			lastFailure: Date.now(),
			attempts: prev.attempts + 1,
			cooldownUntil: prev.cooldownUntil,
		};

		// If it's a 404, don't set cooldown
		const is404 =
			typeof error === "object" &&
			error !== null &&
			"status" in error &&
			typeof (error as Record<string, unknown>).status === "number" &&
			(error as Record<string, unknown>).status === 404;

		if (!is404 && newState.attempts >= this.retryConfig.maxAttempts) {
			newState.cooldownUntil = Date.now() + this.retryConfig.cooldownMs;
		}

		this.recentFailures.set(url, newState);
	}

	async get(
		entityType: StaticEntityType,
		id: string,
	): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		// Skip if no base URL configured
		if (!this.baseUrl) {
			return { found: false };
		}

		const url = this.getUrl(entityType, id);

		// If we recently hit repeated failures for this URL, respect cooldown
		const failureState = this.recentFailures.get(url);
		if (
			failureState?.cooldownUntil &&
			Date.now() < failureState.cooldownUntil
		) {
			logger.debug(
				this.LOG_PREFIX,
				"Skipping GitHub Pages fetch due to recent failures",
				{ url, entityType, id, failureState },
			);
			return { found: false };
		}

		const attemptFetch = async (attempt: number): Promise<StaticDataResult> => {
			try {
				const controller = new AbortController();
				const timeoutId = setTimeout(() => {
					controller.abort();
				}, 10_000); // 10 second timeout

				const response = await fetch(url, {
					method: "GET",
					headers: {
						Accept: "application/json",
						"Cache-Control": "max-age=3600", // 1 hour cache
					},
					signal: controller.signal,
				});

				clearTimeout(timeoutId);

				if (!response.ok) {
					if (response.status === 404) {
						return { found: false };
					}
					throw this.createHttpError(response);
				}

				const data: unknown = await response.json();
				this.recentFailures.delete(url);

				this.stats.hits++;
				const loadTime = Date.now() - startTime;
				this.stats.totalLoadTime += loadTime;

				return {
					found: true,
					data,
					cacheHit: true,
					tier: CacheTier.GITHUB_PAGES,
					loadTime,
				};
			} catch (error: unknown) {
				logger.debug(this.LOG_PREFIX, "GitHub Pages fetch attempt failed", {
					url,
					entityType,
					id,
					attempt,
					error,
				});

				this.updateFailureState(url, error);

				// Check if it's a 404 error
				const is404 =
					typeof error === "object" &&
					error !== null &&
					"status" in error &&
					typeof (error as Record<string, unknown>).status === "number" &&
					(error as Record<string, unknown>).status === 404;
				if (is404) {
					return { found: false };
				}

				// Retry if attempts remain
				if (attempt < this.retryConfig.maxAttempts) {
					let retryAfterSec: number | undefined;
					if (
						typeof error === "object" &&
						error !== null &&
						"retryAfter" in error
					) {
						const errorObj = error as Record<string, unknown>;
						const retryAfter = errorObj.retryAfter;
						if (typeof retryAfter === "string") {
							retryAfterSec = Number.parseInt(retryAfter);
						}
					}

					const delay = this.calculateRetryDelay(attempt, retryAfterSec);
					await new Promise((resolve) => setTimeout(resolve, delay));
					return attemptFetch(attempt + 1);
				}

				return { found: false };
			}
		};

		try {
			return await attemptFetch(1);
		} catch (finalErr) {
			logger.debug(this.LOG_PREFIX, "GitHub Pages fetch final failure", {
				url,
				entityType,
				id,
				error: String(finalErr),
			});
			return { found: false };
		}
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		// Skip if no base URL configured
		if (!this.baseUrl) {
			return false;
		}

		try {
			const url = this.getUrl(entityType, id);
			const controller = new AbortController();
			const timeoutId = setTimeout(() => {
				controller.abort();
			}, 5000); // 5 second timeout for HEAD request

			const response = await fetch(url, {
				method: "HEAD",
				signal: controller.signal,
			});

			clearTimeout(timeoutId);
			return response.ok;
		} catch {
			return false;
		}
	}

	async getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}> {
		return calculateCacheStats(this.stats);
	}

	/**
	 * Get the configured base URL for the GitHub Pages cache
	 */
	getBaseUrl(): string {
		return this.baseUrl;
	}
}
