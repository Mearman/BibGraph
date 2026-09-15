/**
 * Cache strategies for BibGraph
 *
 * Defines environment-specific cache strategies and behaviors.
 * Provides type-safe cache strategy selection based on environment detection.
 */

import { type BuildContext,EnvironmentMode } from "./environment-detector.js"
import { BYTES_PER_GB, BYTES_PER_MB, MS_PER_DAY, MS_PER_MINUTE, MS_PER_SECOND, MS_PER_WEEK } from "./size-and-time-units.js"

/**
 * Cache strategy enumeration
 * Defines how caching should behave in different environments
 */
export enum CacheStrategy {
	/**
	Development: Write cache to disk, read from memory first
	 */
	DEVELOPMENT_DISK_WRITE = "development_disk_write",

	/**
	Development: Memory-only caching, no persistence
	 */
	DEVELOPMENT_MEMORY_ONLY = "development_memory_only",

	/**
	Production: Read from GitHub Pages static files
	 */
	PRODUCTION_GITHUB_READ = "production_github_read",

	/**
	Production: Hybrid cache with IndexedDB persistence
	 */
	PRODUCTION_HYBRID_CACHE = "production_hybrid_cache",

	/**
	Test: Mock responses, no real caching
	 */
	TEST_MOCK_RESPONSES = "test_mock_responses",

	/**
	Test: In-memory cache for testing cache logic
	 */
	TEST_MEMORY_CACHE = "test_memory_cache",

	/**
	Research: Long-term persistent cache optimized for academic use
	 */
	RESEARCH_PERSISTENT = "research_persistent",

	/**
	Offline: Use only cached data, no network requests
	 */
	OFFLINE_CACHE_ONLY = "offline_cache_only",

	/**
	Debug: Verbose logging and cache inspection
	 */
	DEBUG_VERBOSE = "debug_verbose",
}

/**
 * Cache operation modes
 */
export enum CacheOperation {
	/**
	Read from cache, fetch if missing
	 */
	READ_THROUGH = "read_through",

	/**
	Write to cache when data is fetched
	 */
	WRITE_THROUGH = "write_through",

	/**
	Write to cache asynchronously
	 */
	WRITE_BEHIND = "write_behind",

	/**
	Cache only, never fetch
	 */
	CACHE_ONLY = "cache_only",

	/**
	Network only, never cache
	 */
	NETWORK_ONLY = "network_only",

	/**
	Cache first, fallback to network
	 */
	CACHE_FIRST = "cache_first",

	/**
	Network first, fallback to cache
	 */
	NETWORK_FIRST = "network_first",

	/**
	Invalidate and refresh cache
	 */
	INVALIDATE_REFRESH = "invalidate_refresh",
}

/**
 * Cache priority levels
 */
export enum CachePriority {
	/**
	Critical data that should never be evicted
	 */
	CRITICAL = "critical",

	/**
	High priority data
	 */
	HIGH = "high",

	/**
	Normal priority data
	 */
	NORMAL = "normal",

	/**
	Low priority data, can be evicted
	 */
	LOW = "low",

	/**
	Temporary data, evict first
	 */
	TEMPORARY = "temporary",
}

/**
 * Cache storage backend types
 * Note: This is different from cache-browser's CacheStorageType which refers to data types.
 */
export enum CacheBackendType {
	/**
	In-memory storage (fastest, not persistent)
	 */
	MEMORY = "memory",

	/**
	Local storage (persistent, size limited)
	 */
	LOCAL_STORAGE = "local_storage",

	/**
	IndexedDB (persistent, large capacity)
	 */
	INDEXED_DB = "indexed_db",

	/**
	Static file cache (read-only, CDN-friendly)
	 */
	STATIC_FILE = "static_file",

	/**
	Service Worker cache (offline-capable)
	 */
	SERVICE_WORKER = "service_worker",

	/**
	Mock storage (for testing)
	 */
	MOCK = "mock",
}

/**
 * Cache strategy configuration
 */
export interface CacheStrategyConfig {
	/**
	Primary cache strategy
	 */
	strategy: CacheStrategy

	/**
	Supported cache operations
	 */
	operations: CacheOperation[]

	/**
	Storage type preference
	 */
	storageType: CacheBackendType

	/**
	Fallback storage types
	 */
	fallbackStorageTypes: CacheBackendType[]

	/**
	Default cache priority
	 */
	defaultPriority: CachePriority

	/**
	Whether to enable background sync
	 */
	backgroundSync: boolean

	/**
	Whether to enable compression
	 */
	compression: boolean

	/**
	Whether to enable encryption
	 */
	encryption: boolean

	/**
	TTL (time to live) in milliseconds
	 */
	ttl: number

	/**
	Maximum cache size in bytes
	 */
	maxSize: number

	/**
	Whether to enable debug logging
	 */
	debug: boolean

	/**
	Custom metadata
	 */
	metadata?: Record<string, unknown>
}

const DEV_DISK_TTL_MINUTES = 10
const DEV_DISK_MAX_SIZE_MB = 50
const DEV_MEMORY_TTL_MINUTES = 5
const DEV_MEMORY_MAX_SIZE_MB = 25
const PROD_MAX_SIZE_MB = 200
const TEST_MEMORY_TTL_SECONDS = 30
const TEST_MEMORY_MAX_SIZE_MB = 5
const RESEARCH_MAX_SIZE_MB = 500
const DEBUG_TTL_MINUTES = 2
const DEBUG_MAX_SIZE_MB = 10
const DEFAULT_STRATEGY_TTL_MINUTES = 5
const DEFAULT_STRATEGY_MAX_SIZE_MB = 10

/**
 * Cache strategy selector based on environment
 */
export const CacheStrategySelector = {
	/**
	 * Get default cache strategy for environment mode
	 */
	getDefaultStrategy: (mode: EnvironmentMode): CacheStrategy => {
		switch (mode) {
			case EnvironmentMode.DEVELOPMENT:
				return CacheStrategy.DEVELOPMENT_DISK_WRITE

			case EnvironmentMode.PRODUCTION:
				return CacheStrategy.PRODUCTION_GITHUB_READ

			case EnvironmentMode.TEST:
				return CacheStrategy.TEST_MEMORY_CACHE

			default:
				return CacheStrategy.DEVELOPMENT_MEMORY_ONLY
		}
	},

	/**
	 * Get cache strategy configuration for specific strategy
	 */
	getStrategyConfig: (strategy: CacheStrategy): CacheStrategyConfig => {
		switch (strategy) {
			case CacheStrategy.DEVELOPMENT_DISK_WRITE:
				return {
					strategy,
					operations: [
						CacheOperation.READ_THROUGH,
						CacheOperation.WRITE_THROUGH,
						CacheOperation.INVALIDATE_REFRESH,
					],
					storageType: CacheBackendType.INDEXED_DB,
					fallbackStorageTypes: [CacheBackendType.LOCAL_STORAGE, CacheBackendType.MEMORY],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: DEV_DISK_TTL_MINUTES * MS_PER_MINUTE, // 10 minutes
					maxSize: DEV_DISK_MAX_SIZE_MB * BYTES_PER_MB, // 50MB
					debug: true,
				}

			case CacheStrategy.DEVELOPMENT_MEMORY_ONLY:
				return {
					strategy,
					operations: [CacheOperation.READ_THROUGH, CacheOperation.WRITE_THROUGH],
					storageType: CacheBackendType.MEMORY,
					fallbackStorageTypes: [],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: DEV_MEMORY_TTL_MINUTES * MS_PER_MINUTE, // 5 minutes
					maxSize: DEV_MEMORY_MAX_SIZE_MB * BYTES_PER_MB, // 25MB
					debug: true,
				}

			case CacheStrategy.PRODUCTION_GITHUB_READ:
				return {
					strategy,
					operations: [CacheOperation.CACHE_FIRST, CacheOperation.READ_THROUGH],
					storageType: CacheBackendType.STATIC_FILE,
					fallbackStorageTypes: [CacheBackendType.INDEXED_DB, CacheBackendType.LOCAL_STORAGE],
					defaultPriority: CachePriority.HIGH,
					backgroundSync: true,
					compression: true,
					encryption: false,
					ttl: MS_PER_DAY, // 24 hours
					maxSize: PROD_MAX_SIZE_MB * BYTES_PER_MB, // 200MB
					debug: false,
				}

			case CacheStrategy.PRODUCTION_HYBRID_CACHE:
				return {
					strategy,
					operations: [
						CacheOperation.READ_THROUGH,
						CacheOperation.WRITE_BEHIND,
						CacheOperation.CACHE_FIRST,
					],
					storageType: CacheBackendType.INDEXED_DB,
					fallbackStorageTypes: [CacheBackendType.LOCAL_STORAGE, CacheBackendType.MEMORY],
					defaultPriority: CachePriority.HIGH,
					backgroundSync: true,
					compression: true,
					encryption: false,
					ttl: MS_PER_DAY, // 24 hours
					maxSize: PROD_MAX_SIZE_MB * BYTES_PER_MB, // 200MB
					debug: false,
				}

			case CacheStrategy.TEST_MOCK_RESPONSES:
				return {
					strategy,
					operations: [CacheOperation.CACHE_ONLY],
					storageType: CacheBackendType.MOCK,
					fallbackStorageTypes: [],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: 1000, // 1 second
					maxSize: BYTES_PER_MB, // 1MB
					debug: false,
				}

			case CacheStrategy.TEST_MEMORY_CACHE:
				return {
					strategy,
					operations: [CacheOperation.READ_THROUGH, CacheOperation.WRITE_THROUGH],
					storageType: CacheBackendType.MEMORY,
					fallbackStorageTypes: [],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: TEST_MEMORY_TTL_SECONDS * MS_PER_SECOND, // 30 seconds
					maxSize: TEST_MEMORY_MAX_SIZE_MB * BYTES_PER_MB, // 5MB
					debug: false,
				}

			case CacheStrategy.RESEARCH_PERSISTENT:
				return {
					strategy,
					operations: [
						CacheOperation.READ_THROUGH,
						CacheOperation.WRITE_THROUGH,
						CacheOperation.CACHE_FIRST,
					],
					storageType: CacheBackendType.INDEXED_DB,
					fallbackStorageTypes: [CacheBackendType.LOCAL_STORAGE],
					defaultPriority: CachePriority.CRITICAL,
					backgroundSync: true,
					compression: true,
					encryption: false,
					ttl: MS_PER_WEEK, // 7 days
					maxSize: RESEARCH_MAX_SIZE_MB * BYTES_PER_MB, // 500MB
					debug: true,
					metadata: {
						researchMode: true,
						ethicalUse: true,
					},
				}

			case CacheStrategy.OFFLINE_CACHE_ONLY:
				return {
					strategy,
					operations: [CacheOperation.CACHE_ONLY],
					storageType: CacheBackendType.INDEXED_DB,
					fallbackStorageTypes: [CacheBackendType.LOCAL_STORAGE, CacheBackendType.MEMORY],
					defaultPriority: CachePriority.CRITICAL,
					backgroundSync: false,
					compression: true,
					encryption: false,
					ttl: Number.MAX_SAFE_INTEGER, // Never expire
					maxSize: BYTES_PER_GB, // 1GB
					debug: false,
				}

			case CacheStrategy.DEBUG_VERBOSE:
				return {
					strategy,
					operations: [
						CacheOperation.READ_THROUGH,
						CacheOperation.WRITE_THROUGH,
						CacheOperation.INVALIDATE_REFRESH,
					],
					storageType: CacheBackendType.MEMORY,
					fallbackStorageTypes: [CacheBackendType.INDEXED_DB],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: DEBUG_TTL_MINUTES * MS_PER_MINUTE, // 2 minutes
					maxSize: DEBUG_MAX_SIZE_MB * BYTES_PER_MB, // 10MB
					debug: true,
					metadata: {
						verboseLogging: true,
						performanceMetrics: true,
					},
				}

			default:
				// Fallback to safe defaults
				return {
					strategy: CacheStrategy.DEVELOPMENT_MEMORY_ONLY,
					operations: [CacheOperation.READ_THROUGH],
					storageType: CacheBackendType.MEMORY,
					fallbackStorageTypes: [],
					defaultPriority: CachePriority.NORMAL,
					backgroundSync: false,
					compression: false,
					encryption: false,
					ttl: DEFAULT_STRATEGY_TTL_MINUTES * MS_PER_MINUTE,
					maxSize: DEFAULT_STRATEGY_MAX_SIZE_MB * BYTES_PER_MB,
					debug: false,
				}
		}
	},

	/**
	 * Select optimal cache strategy based on build context
	 */
	selectStrategy: ({
		context,
		options,
	}: {
		context: BuildContext
		options?: {
			useCase?: "research" | "production" | "development" | "testing"
			offline?: boolean
			debug?: boolean
		}
	}): CacheStrategy => {
		const { useCase, offline, debug } = options ?? {}

		// Handle special cases
		if (offline === true) {
			return CacheStrategy.OFFLINE_CACHE_ONLY
		}

		if (debug === true) {
			return CacheStrategy.DEBUG_VERBOSE
		}

		// Handle use case overrides
		if (useCase === "research") {
			return CacheStrategy.RESEARCH_PERSISTENT
		}

		if (useCase === "testing" || context.isTest) {
			return CacheStrategy.TEST_MEMORY_CACHE
		}

		// Environment-based selection
		if (context.isDevelopment) {
			if (context.isDevServer) {
				return CacheStrategy.DEVELOPMENT_DISK_WRITE
			}
			return CacheStrategy.DEVELOPMENT_MEMORY_ONLY
		}

		if (context.isProduction) {
			if (context.isGitHubPages) {
				return CacheStrategy.PRODUCTION_GITHUB_READ
			}
			return CacheStrategy.PRODUCTION_HYBRID_CACHE
		}

		// Default fallback
		return CacheStrategy.DEVELOPMENT_MEMORY_ONLY
	},

	/**
	 * Get all available strategies for current environment
	 */
	getAvailableStrategies: (context: Readonly<BuildContext>): CacheStrategy[] => {
		const strategies: CacheStrategy[] = []

		// Always available
		strategies.push(CacheStrategy.DEVELOPMENT_MEMORY_ONLY, CacheStrategy.DEBUG_VERBOSE)

		if (context.isDevelopment) {
			strategies.push(CacheStrategy.DEVELOPMENT_DISK_WRITE, CacheStrategy.RESEARCH_PERSISTENT)
		}

		if (context.isProduction) {
			strategies.push(CacheStrategy.PRODUCTION_HYBRID_CACHE)

			if (context.isGitHubPages) {
				strategies.push(CacheStrategy.PRODUCTION_GITHUB_READ)
			}
		}

		if (context.isTest) {
			strategies.push(CacheStrategy.TEST_MEMORY_CACHE, CacheStrategy.TEST_MOCK_RESPONSES)
		}

		// Offline support (if service worker available)
		if (typeof navigator !== "undefined" && "serviceWorker" in navigator) {
			strategies.push(CacheStrategy.OFFLINE_CACHE_ONLY)
		}

		return strategies
	},
};

/**
 * Convenience function to get cache strategy configuration
 */
export const getCacheStrategyConfig = (strategy: CacheStrategy): CacheStrategyConfig => CacheStrategySelector.getStrategyConfig(strategy);

// Note: getCurrentCacheStrategy() is exported from mode-switcher.ts
// to avoid circular dependencies
