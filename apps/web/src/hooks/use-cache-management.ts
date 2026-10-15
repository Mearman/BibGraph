/**
 * Data hook for the /cache management page (US-26): loads the persistent IndexedDB cache's usage, per-type statistics and recent-entity previews, and performs per-type and whole-cache clears. Rendering stays in the components; this hook owns every client call.
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type {
	CachedEntityEntry,
	CachedEntityPreview,
} from "@bibgraph/client/internal/static-data-provider";
import { logger } from "@bibgraph/utils";
import { useCallback, useEffect, useMemo, useState } from "react";

import {
	aggregateByEntityType,
	type CacheUsageSummary,
	type EntityTypeCacheStats,
	summariseCacheUsage,
} from "@/components/cache/cache-management-utils";

/**
 * How many recent entities the page previews
 */
const PREVIEW_COUNT = 20;

const CACHE_MANAGEMENT_LOG_CONTEXT = "cache-management";

/**
 * Copy shown when a cache load fails; components render it verbatim
 */
export const CACHE_LOAD_ERROR_MESSAGE = "Unable to load the cache contents.";

export interface UseCacheManagementResult {
	/**
	Per-entity-type counts, sizes and recency, largest type first
	 */
	typeStats: EntityTypeCacheStats[];
	/**
	Whole-persistent-cache usage
	 */
	usage: CacheUsageSummary;
	/**
	Entries held by the in-memory tier for this session
	 */
	memoryEntryCount: number;
	/**
	Most recently accessed cached entities, for previews
	 */
	previews: CachedEntityPreview[];
	isLoading: boolean;
	/**
	True while a clear is running
	 */
	isClearing: boolean;
	error: string | null;
	/**
	Reload usage, type statistics and previews from the client
	 */
	refresh: () => Promise<void>;
	/**
	Remove every entry of one entity type from the persistent cache
	 */
	clearByType: (entityType: CachedEntityEntry["entityType"]) => Promise<void>;
	/**
	Remove every cached entry, in-memory and persistent
	 */
	clearAll: () => Promise<void>;
}

/**
 * Load and manage the browser cache contents for the /cache page
 */
export const useCacheManagement = (): UseCacheManagementResult => {
	const [entries, setEntries] = useState<CachedEntityEntry[]>([]);
	const [previews, setPreviews] = useState<CachedEntityPreview[]>([]);
	const [memoryEntryCount, setMemoryEntryCount] = useState(0);
	const [isLoading, setIsLoading] = useState(true);
	const [isClearing, setIsClearing] = useState(false);
	const [error, setError] = useState<string | null>(null);

	const refresh = useCallback(async () => {
		try {
			const [indexedDBEntries, entityPreviews, memoryEntries] = await Promise.all([
				cachedOpenAlex.enumerateIndexedDBEntities(),
				cachedOpenAlex.getIndexedDBEntityPreviews(PREVIEW_COUNT),
				Promise.resolve(cachedOpenAlex.enumerateMemoryCacheEntities()),
			]);
			setEntries(indexedDBEntries);
			setPreviews(entityPreviews);
			setMemoryEntryCount(memoryEntries.length);
			setError(null);
		} catch (loadError) {
			logger.error(CACHE_MANAGEMENT_LOG_CONTEXT, "Failed to load cache contents", {
				error: loadError,
			});
			setError(CACHE_LOAD_ERROR_MESSAGE);
		} finally {
			setIsLoading(false);
		}
	}, []);

	useEffect(() => {
		void refresh();
	}, [refresh]);

	const clearByType = useCallback(
		async (entityType: CachedEntityEntry["entityType"]) => {
			setIsClearing(true);
			try {
				await cachedOpenAlex.clearIndexedDBCacheByType(entityType);
				await refresh();
			} catch (clearError) {
				logger.error(CACHE_MANAGEMENT_LOG_CONTEXT, "Failed to clear cache by type", {
					entityType,
					error: clearError,
				});
				setError(CACHE_LOAD_ERROR_MESSAGE);
			} finally {
				setIsClearing(false);
			}
		},
		[refresh],
	);

	const clearAll = useCallback(async () => {
		setIsClearing(true);
		try {
			await cachedOpenAlex.clearStaticCache();
			await refresh();
		} catch (clearError) {
			logger.error(CACHE_MANAGEMENT_LOG_CONTEXT, "Failed to clear the cache", {
				error: clearError,
			});
			setError(CACHE_LOAD_ERROR_MESSAGE);
		} finally {
			setIsClearing(false);
		}
	}, [refresh]);

	const usage = useMemo(() => summariseCacheUsage(entries), [entries]);
	const typeStats = useMemo(() => aggregateByEntityType(entries), [entries]);

	return {
		typeStats,
		usage,
		memoryEntryCount,
		previews,
		isLoading,
		isClearing,
		error,
		refresh,
		clearByType,
		clearAll,
	};
};
