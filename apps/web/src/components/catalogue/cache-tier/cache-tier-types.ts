/**
 * Type definitions for Cache Tier components
 * @module components/catalogue/cache-tier/cache-tier-types
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";

export interface CacheTierSummary {
  memory: { count: number; entities: CachedEntityEntry[] };
  indexedDB: { count: number; entities: CachedEntityEntry[] };
}

export interface StaticCacheTierConfig {
  gitHubPages: {
    url: string;
    isConfigured: boolean;
    isProduction: boolean;
    isLocalhost: boolean;
  };
  localStatic: {
    path: string;
    isAvailable: boolean;
  };
}

export interface CacheTierStats {
  requests: number;
  hits: number;
  averageLoadTime: number;
}

export interface EntityTypeCount {
  entityType: string;
  count: number;
}
