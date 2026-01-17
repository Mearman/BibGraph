/**
 * Custom hooks for Cache Tier data management
 * @module components/catalogue/cache-tier/useCacheTierData
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useNavigate } from "@tanstack/react-router";
import { useCallback, useEffect, useMemo, useState } from "react";

import type { CacheTierStats, CacheTierSummary, StaticCacheTierConfig } from "./cache-tier-types";

/**
 * Hook for navigating to entity detail pages
 */
export const useEntityNavigation = () => {
  const navigate = useNavigate();

  return useCallback((entity: CachedEntityEntry) => {
    const entityType = entity.entityType as EntityType;
    const path = `/${entityType}/${entity.entityId}`;
    navigate({ to: path });
  }, [navigate]);
};

interface UseCacheTierDataReturn {
  summary: CacheTierSummary | null;
  staticCacheEntities: CachedEntityEntry[];
  tierStats: { gitHubPages: CacheTierStats | null } | null;
  staticConfig: StaticCacheTierConfig | null;
  isLoading: boolean;
  isRefreshingMemory: boolean;
  isRefreshingIndexedDB: boolean;
  isRefreshingStatic: boolean;
  handleRefreshMemory: () => Promise<void>;
  handleRefreshIndexedDB: () => Promise<void>;
  handleClearIndexedDB: () => Promise<void>;
  handleRefreshStatic: () => Promise<void>;
}

/**
 * Hook for managing cache tier data loading and refresh operations
 */
export const useCacheTierData = (): UseCacheTierDataReturn => {
  const [summary, setSummary] = useState<CacheTierSummary | null>(null);
  const [staticCacheEntities, setStaticCacheEntities] = useState<CachedEntityEntry[]>([]);
  const [tierStats, setTierStats] = useState<{
    gitHubPages: CacheTierStats | null;
  } | null>(null);
  const [hasInitialLoadCompleted, setHasInitialLoadCompleted] = useState(false);
  const [isRefreshingMemory, setIsRefreshingMemory] = useState(false);
  const [isRefreshingIndexedDB, setIsRefreshingIndexedDB] = useState(false);
  const [isRefreshingStatic, setIsRefreshingStatic] = useState(false);

  const isLoading = useMemo(() => !hasInitialLoadCompleted, [hasInitialLoadCompleted]);

  const staticConfig = useMemo<StaticCacheTierConfig | null>(() => {
    try {
      return cachedOpenAlex.getStaticCacheTierConfig();
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load static cache config", { error });
      return null;
    }
  }, []);

  const loadCacheSummary = useCallback(async () => {
    try {
      const result = await cachedOpenAlex.getCacheTierSummary();
      setSummary(result);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load cache tier summary", { error });
    }
  }, []);

  const loadTierStats = useCallback(async () => {
    try {
      const stats = await cachedOpenAlex.getStaticCacheStats();
      setTierStats({
        gitHubPages: stats.tierStats?.github_pages ?? null,
      });
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load tier stats", { error });
    }
  }, []);

  const loadStaticCacheEntities = useCallback(async () => {
    try {
      const entities = await cachedOpenAlex.enumerateStaticCacheEntities();
      setStaticCacheEntities(entities);
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to load static cache entities", { error });
    }
  }, []);

  useEffect(() => {
    void Promise.all([loadCacheSummary(), loadTierStats(), loadStaticCacheEntities()])
      .catch((error) => {
        logger.error("cache-tier-ui", "Failed to load cache data", { error });
      })
      .finally(() => setHasInitialLoadCompleted(true));
  }, [loadCacheSummary, loadTierStats, loadStaticCacheEntities]);

  const handleRefreshMemory = useCallback(async () => {
    setIsRefreshingMemory(true);
    try {
      const memoryEntities = cachedOpenAlex.enumerateMemoryCacheEntities();
      setSummary(prev => prev ? {
        ...prev,
        memory: { count: memoryEntities.length, entities: memoryEntities }
      } : null);
    } finally {
      setIsRefreshingMemory(false);
    }
  }, []);

  const handleRefreshIndexedDB = useCallback(async () => {
    setIsRefreshingIndexedDB(true);
    try {
      const indexedDBEntities = await cachedOpenAlex.enumerateIndexedDBEntities();
      setSummary(prev => prev ? {
        ...prev,
        indexedDB: { count: indexedDBEntities.length, entities: indexedDBEntities }
      } : null);
    } finally {
      setIsRefreshingIndexedDB(false);
    }
  }, []);

  const handleClearIndexedDB = useCallback(async () => {
    try {
      await cachedOpenAlex.clearStaticCache();
      await loadCacheSummary();
      logger.info("cache-tier-ui", "IndexedDB cache cleared");
    } catch (error) {
      logger.error("cache-tier-ui", "Failed to clear IndexedDB cache", { error });
    }
  }, [loadCacheSummary]);

  const handleRefreshStatic = useCallback(async () => {
    setIsRefreshingStatic(true);
    try {
      await Promise.all([loadTierStats(), loadStaticCacheEntities()]);
    } finally {
      setIsRefreshingStatic(false);
    }
  }, [loadTierStats, loadStaticCacheEntities]);

  return {
    summary,
    staticCacheEntities,
    tierStats,
    staticConfig,
    isLoading,
    isRefreshingMemory,
    isRefreshingIndexedDB,
    isRefreshingStatic,
    handleRefreshMemory,
    handleRefreshIndexedDB,
    handleClearIndexedDB,
    handleRefreshStatic,
  };
};
