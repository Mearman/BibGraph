/**
 * Cache configuration system for BibGraph
 *
 * Provides environment-specific configuration for static data paths and cache strategies.
 * Handles differences between local development (public/ directory) and production (GitHub Pages URLs).
 */

import { type BuildContext,EnvironmentDetector } from "./environment-detector.js"
import { BYTES_PER_MB, MS_PER_DAY, MS_PER_HOUR, MS_PER_MINUTE, MS_PER_WEEK } from "./size-and-time-units.js"

/**
 * Static data path configuration
 */
export interface StaticDataPaths {
	/**
	Base URL for static data
	 */
	baseUrl: string
	/**
	Path to OpenAlex static data
	 */
	openalexPath: string
	/**
	Full URL to OpenAlex data directory
	 */
	openalexBaseUrl: string
	/**
	Whether paths are absolute URLs or relative
	 */
	isAbsolute: boolean
	/**
	CDN or cache headers configuration
	 */
	cacheHeaders?: Record<string, string>
}

/**
 * Cache storage configuration
 */
export interface CacheStorageConfig {
	/**
	Maximum cache size in bytes
	 */
	maxSize: number
	/**
	Cache expiration time in milliseconds
	 */
	expirationTime: number
	/**
	Whether to persist cache across sessions
	 */
	persistent: boolean
	/**
	Storage mechanism preference
	 */
	storagePreference: "indexeddb" | "localstorage" | "memory"
	/**
	Whether to enable compression
	 */
	compression: boolean
	/**
	Debug mode for cache operations
	 */
	debug: boolean
}

/**
 * Network configuration for cache behavior
 */
export interface NetworkConfig {
	/**
	Request timeout in milliseconds
	 */
	timeout: number
	/**
	Number of retry attempts
	 */
	retries: number
	/**
	Retry delay multiplier
	 */
	retryDelayMs: number
	/**
	Enable request deduplication
	 */
	deduplication: boolean
	/**
	Enable background cache warming
	 */
	backgroundSync: boolean
	/**
	Rate limiting configuration
	 */
	rateLimit?: {
		requestsPerMinute: number
		burstLimit: number
	}
}

/**
 * Complete cache configuration
 */
export interface CacheConfig {
	/**
	Static data path configuration
	 */
	paths: StaticDataPaths
	/**
	Cache storage configuration
	 */
	storage: CacheStorageConfig
	/**
	Network configuration
	 */
	network: NetworkConfig
	/**
	Environment context
	 */
	environment: BuildContext
}

const CACHE_CONFIG_GITHUB_PAGES_DOMAIN = "bibgraph.joenash.uk"
const CACHE_CONFIG_GITHUB_IO_DOMAIN = "mearman.github.io"
const CACHE_CONFIG_LOCAL_DATA_PATH = "/data"
const CACHE_CONFIG_OPENALEX_SUBPATH = "/openalex"

const DEV_STORAGE_MAX_SIZE_MB = 50
const DEV_EXPIRATION_MINUTES = 10
const PROD_STORAGE_MAX_SIZE_MB = 200
const E2E_STORAGE_MAX_SIZE_MB = 100
const TEST_STORAGE_MAX_SIZE_MB = 10
const TEST_EXPIRATION_MINUTES = 5
const DEFAULT_STORAGE_MAX_SIZE_MB = 100
const RESEARCH_STORAGE_MAX_SIZE_MB = 500
const OPTIMIZED_TEST_STORAGE_MAX_SIZE_MB = 5

/**
 * Cache configuration factory
 */
export const CacheConfigFactory = {
	/**
	 * Create static data paths configuration based on environment
	 */
	createStaticDataPaths: (context: Readonly<BuildContext>): StaticDataPaths => {
		if (context.isDevelopment && context.isDevServer) {
			// Local development server - use relative paths to public directory
			// In development with Vite, static files are served from public/
			return {
				baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
				openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
				openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
				isAbsolute: false,
				cacheHeaders: {
					"Cache-Control": "no-cache, no-store, must-revalidate",
					Pragma: "no-cache",
					Expires: "0",
				},
			}
		}

		if (context.isTest) {
			// Check if running in E2E mode with filesystem cache available
			const isE2E = process.env.RUNNING_E2E === 'true' || process.env.PLAYWRIGHT_TEST === 'true';

			if (isE2E) {
				// E2E tests - detect if filesystem cache is available via MSW setup
				// The global setup creates public/data/openalex directory
				const hasFilesystemCache = typeof window !== 'undefined' &&
					(window.location.pathname.startsWith('/data/openalex/') ||
						// Check for MSW filesystem cache indicators
						localStorage.getItem('e2e-filesystem-cache-available') === 'true');

				if (hasFilesystemCache) {
					// Use filesystem cache paths for E2E tests
					return {
						baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
						openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
						openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
						isAbsolute: false,
						cacheHeaders: {
							"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
							"Accept-Encoding": "gzip, deflate, br",
						},
					};
				}
				// Regular unit tests - no cache headers
				return {
					baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
					openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
					openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
					isAbsolute: false,
					cacheHeaders: {
						"Cache-Control": "no-cache",
					},
				};
			}
			// Non-E2E test environment
			return {
				baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
				openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
				openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
				isAbsolute: false,
				cacheHeaders: {
					"Cache-Control": "no-cache",
				},
			}
		}

		if (context.isProduction && context.isGitHubPages) {
			// GitHub Pages production deployment
			const baseUrl =
				context.hostname === CACHE_CONFIG_GITHUB_PAGES_DOMAIN
					? `https://${CACHE_CONFIG_GITHUB_PAGES_DOMAIN}${CACHE_CONFIG_LOCAL_DATA_PATH}`
					: `https://${CACHE_CONFIG_GITHUB_IO_DOMAIN}/BibGraph${CACHE_CONFIG_LOCAL_DATA_PATH}`

			return {
				baseUrl,
				openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
				openalexBaseUrl: `${baseUrl}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
				isAbsolute: true,
				cacheHeaders: {
					"Cache-Control": "public, max-age=3600, stale-while-revalidate=86400",
					"Accept-Encoding": "gzip, deflate, br",
				},
			}
		}

		if (context.isProduction) {
			// Production build not on GitHub Pages (potential local static server)
			return {
				baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
				openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
				openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
				isAbsolute: false,
				cacheHeaders: {
					"Cache-Control": "public, max-age=1800",
				},
			}
		}

		// Default environment - minimal local paths
		return {
			baseUrl: CACHE_CONFIG_LOCAL_DATA_PATH,
			openalexPath: CACHE_CONFIG_OPENALEX_SUBPATH,
			openalexBaseUrl: `${CACHE_CONFIG_LOCAL_DATA_PATH}${CACHE_CONFIG_OPENALEX_SUBPATH}`,
			isAbsolute: false,
			cacheHeaders: {
				"Cache-Control": "no-cache",
			},
		}
	},

	/**
	 * Create cache storage configuration based on environment
	 */
	createCacheStorageConfig: (context: Readonly<BuildContext>): CacheStorageConfig => {
		if (context.isDevelopment) {
			return {
				maxSize: DEV_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 50MB for development
				expirationTime: DEV_EXPIRATION_MINUTES * MS_PER_MINUTE, // 10 minutes
				persistent: false, // Don't persist in development for faster iteration
				storagePreference: "memory",
				compression: false, // Faster without compression in dev
				debug: true,
			}
		}

		if (context.isProduction) {
			return {
				maxSize: PROD_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 200MB for production
				expirationTime: MS_PER_DAY, // 24 hours
				persistent: true, // Persist for better user experience
				storagePreference: "indexeddb",
				compression: true, // Save space in production
				debug: false,
			}
		}

		if (context.isTest) {
			// Check if running in E2E mode with filesystem cache available
			const isE2E = process.env.RUNNING_E2E === 'true' || process.env.PLAYWRIGHT_TEST === 'true';
			const hasFilesystemCache = isE2E && typeof window !== 'undefined' &&
				// Check if static filesystem cache is available at /data/openalex/
				// This will be true when running against preview server with cached data
				window.location.pathname.startsWith('/data/openalex/') ||
				// Or when MSW has set up the filesystem cache directory
				(document.querySelector('script[src*="/data/openalex/"]') !== null ||
				 localStorage.getItem('e2e-filesystem-cache-available') === 'true');

			if (hasFilesystemCache) {
				// E2E tests with filesystem cache - use larger persistent cache
				return {
					maxSize: E2E_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 100MB for E2E with filesystem cache
					expirationTime: MS_PER_HOUR, // 1 hour
					persistent: true, // Persist to leverage filesystem cache
					storagePreference: "indexeddb",
					compression: true, // Save space
					debug: false,
				};
			}
			// Regular unit tests - small memory cache
			return {
				maxSize: TEST_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 10MB for tests
				expirationTime: TEST_EXPIRATION_MINUTES * MS_PER_MINUTE, // 5 minutes
				persistent: false, // Don't persist test data
				storagePreference: "memory",
				compression: false,
				debug: false,
			};
		}

		// Default configuration
		return {
			maxSize: DEFAULT_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 100MB default
			expirationTime: MS_PER_HOUR, // 1 hour
			persistent: true,
			storagePreference: "indexeddb",
			compression: true,
			debug: false,
		}
	},

	/**
	 * Create network configuration based on environment
	 */
	createNetworkConfig: (context: Readonly<BuildContext>): NetworkConfig => {
		if (context.isDevelopment) {
			return {
				timeout: 30_000, // 30 seconds for dev (slower responses expected)
				retries: 2,
				retryDelayMs: 1000,
				deduplication: true,
				backgroundSync: false, // Disable background sync in dev
				rateLimit: {
					requestsPerMinute: 120, // Higher rate limit for development
					burstLimit: 20,
				},
			}
		}

		if (context.isProduction) {
			return {
				timeout: 15_000, // 15 seconds for production
				retries: 3,
				retryDelayMs: 2000,
				deduplication: true,
				backgroundSync: true, // Enable background sync for better UX
				rateLimit: {
					requestsPerMinute: 60, // Respect OpenAlex rate limits
					burstLimit: 10,
				},
			}
		}

		if (context.isTest) {
			return {
				timeout: 5000, // 5 seconds for tests (fast failure)
				retries: 1,
				retryDelayMs: 100,
				deduplication: false, // Disable deduplication for test predictability
				backgroundSync: false,
				rateLimit: {
					requestsPerMinute: 300, // High rate limit for tests
					burstLimit: 50,
				},
			}
		}

		// Default configuration
		return {
			timeout: 20_000, // 20 seconds default
			retries: 2,
			retryDelayMs: 1500,
			deduplication: true,
			backgroundSync: true,
			rateLimit: {
				requestsPerMinute: 60,
				burstLimit: 10,
			},
		}
	},

	/**
	 * Create complete cache configuration for current environment
	 */
	createCacheConfig: (context?: BuildContext): CacheConfig => {
		const environmentContext = context ?? EnvironmentDetector.getBuildContext()

		return {
			paths: CacheConfigFactory.createStaticDataPaths(environmentContext),
			storage: CacheConfigFactory.createCacheStorageConfig(environmentContext),
			network: CacheConfigFactory.createNetworkConfig(environmentContext),
			environment: environmentContext,
		}
	},

	/**
	 * Get optimized configuration for specific use cases
	 */
	createOptimizedConfig: ({
		useCase,
		context,
	}: {
		useCase: "research" | "production" | "testing" | "development"
		context?: BuildContext
	}): CacheConfig => {
		const baseConfig = CacheConfigFactory.createCacheConfig(context)

		switch (useCase) {
			case "research":
				// Optimize for academic research - longer cache times, more storage
				return {
					...baseConfig,
					storage: {
						...baseConfig.storage,
						maxSize: RESEARCH_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 500MB for research datasets
						expirationTime: MS_PER_WEEK, // 7 days
						persistent: true,
						debug: true, // Enable debug for research insights
					},
					network: {
						...baseConfig.network,
						backgroundSync: true,
						rateLimit: {
							requestsPerMinute: 30, // Conservative for research ethics
							burstLimit: 5,
						},
					},
				}

			case "production":
				// Optimize for production performance
				return {
					...baseConfig,
					storage: {
						...baseConfig.storage,
						compression: true,
						persistent: true,
						debug: false,
					},
					network: {
						...baseConfig.network,
						backgroundSync: true,
						timeout: 10_000, // Faster timeout for production
					},
				}

			case "testing":
				// Optimize for testing reliability
				return {
					...baseConfig,
					storage: {
						...baseConfig.storage,
						maxSize: OPTIMIZED_TEST_STORAGE_MAX_SIZE_MB * BYTES_PER_MB, // 5MB for tests
						persistent: false,
						compression: false,
						debug: false,
					},
					network: {
						...baseConfig.network,
						timeout: 3000,
						retries: 0, // No retries in tests for faster feedback
						backgroundSync: false,
						deduplication: false,
					},
				}

			case "development":
				// Optimize for development experience
				return {
					...baseConfig,
					storage: {
						...baseConfig.storage,
						persistent: false, // Fresh state on each reload
						compression: false, // Faster without compression
						debug: true,
					},
					network: {
						...baseConfig.network,
						timeout: 60_000, // Longer timeout for debugging
						backgroundSync: false,
					},
				}

			default:
				return baseConfig
		}
	},
};

/**
 * Convenience function to get current cache configuration
 */
export const getCurrentCacheConfig = (): CacheConfig => CacheConfigFactory.createCacheConfig();

/**
 * Convenience function to get optimized cache configuration
 */
export const getOptimizedCacheConfig = (useCase: "research" | "production" | "testing" | "development"): CacheConfig => CacheConfigFactory.createOptimizedConfig({ useCase });

/**
 * Get static data URL for a given path
 */
export const getStaticDataUrl = ({
	relativePath,
	config,
}: {
	relativePath: string
	config?: CacheConfig
}): string => {
	const cacheConfig = config ?? getCurrentCacheConfig()
	const { paths } = cacheConfig

	// Ensure relative path starts with /
	const normalizedPath = relativePath.startsWith("/") ? relativePath : `/${relativePath}`

	if (paths.isAbsolute) {
		return `${paths.baseUrl}${normalizedPath}`
	}

	// For relative paths, assume current origin
	return `${paths.baseUrl}${normalizedPath}`
};

/**
 * Get OpenAlex data URL for a given entity path
 */
export const getOpenAlexDataUrl = ({
	entityPath,
	config,
}: {
	entityPath: string
	config?: CacheConfig
}): string => {
	const cacheConfig = config ?? getCurrentCacheConfig()
	const { paths } = cacheConfig

	// Ensure entity path starts with /
	const normalizedPath = entityPath.startsWith("/") ? entityPath : `/${entityPath}`

	if (paths.isAbsolute) {
		return `${paths.openalexBaseUrl}${normalizedPath}`
	}

	return `${paths.openalexBaseUrl}${normalizedPath}`
};
