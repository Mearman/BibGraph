/**
 * Local disk cache tier (Node.js only)
 * Filesystem-based caching with graceful fallback in browser
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
 * Local disk cache implementation (Node.js only)
 */
export class LocalDiskCacheTier implements CacheTierInterface {
	private stats: CacheStats = { requests: 0, hits: 0, totalLoadTime: 0 };
	private cacheDir = "./cache/static-data";
	private readonly LOG_PREFIX = "local-disk-cache";

	private getFilePath(entityType: StaticEntityType, id: string): string {
		// Sanitize ID for filesystem
		const sanitizedId = id.replaceAll(/[^\w-]/g, "_");
		return `${this.cacheDir}/${entityType}/${sanitizedId}.json`;
	}

	async get(
		entityType: StaticEntityType,
		id: string,
	): Promise<StaticDataResult> {
		const startTime = Date.now();
		this.stats.requests++;

		try {
			// In browser environment, this will fail gracefully
			if (typeof globalThis !== "undefined" && "window" in globalThis) {
				return { found: false };
			}

			const filePath = this.getFilePath(entityType, id);

			// Dynamic import for Node.js fs module
			const fs = await import("node:fs");

			if (!fs.existsSync(filePath)) {
				return { found: false };
			}

			const parsedData = JSON.parse(fs.readFileSync(filePath, "utf8"));
			// Validate that parsedData is a valid value (not null/undefined for our use case)
			if (parsedData === null || parsedData === undefined) {
				throw new Error(`Invalid JSON data in file: ${filePath}`);
			}

			this.stats.hits++;
			const loadTime = Date.now() - startTime;
			this.stats.totalLoadTime += loadTime;

			return {
				found: true,
				data: parsedData,
				cacheHit: true,
				tier: CacheTier.LOCAL_DISK,
				loadTime,
			};
		} catch (error: unknown) {
			logger.debug(this.LOG_PREFIX, "Local disk cache miss", {
				entityType,
				id,
				error,
			});
			return { found: false };
		}
	}

	async has(entityType: StaticEntityType, id: string): Promise<boolean> {
		try {
			if (typeof globalThis !== "undefined" && "window" in globalThis) {
				return false;
			}

			const filePath = this.getFilePath(entityType, id);
			const fs = await import("node:fs");
			return fs.existsSync(filePath);
		} catch {
			return false;
		}
	}

	async set(
		entityType: StaticEntityType,
		id: string,
		data: unknown,
	): Promise<void> {
		try {
			if (typeof globalThis !== "undefined" && "window" in globalThis) {
				return; // Skip in browser
			}

			const filePath = this.getFilePath(entityType, id);
			const fs = await import("node:fs");
			const path = await import("node:path");

			// Ensure directory exists
			fs.mkdirSync(path.dirname(filePath), { recursive: true });

			// Write data
			fs.writeFileSync(filePath, JSON.stringify(data, null, 2));
		} catch (error: unknown) {
			logger.warn(this.LOG_PREFIX, "Failed to write to local disk cache", {
				entityType,
				id,
				error,
			});
		}
	}

	async clear(): Promise<void> {
		try {
			if (typeof globalThis !== "undefined" && "window" in globalThis) {
				return;
			}

			const fs = await import("node:fs");
			if (fs.existsSync(this.cacheDir)) {
				fs.rmSync(this.cacheDir, { recursive: true, force: true });
			}
			this.stats = { requests: 0, hits: 0, totalLoadTime: 0 };
		} catch (error: unknown) {
			logger.warn(this.LOG_PREFIX, "Failed to clear local disk cache", {
				error,
			});
		}
	}

	async getStats(): Promise<{
		requests: number;
		hits: number;
		averageLoadTime: number;
	}> {
		return calculateCacheStats(this.stats);
	}
}
