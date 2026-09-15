/**
 * Mode switcher for BibGraph
 *
 * Orchestrates cache behavior switching based on detected environment.
 * Provides a unified interface for selecting and configuring cache strategies.
 */

import { logger } from "../logger.js"
import { type CacheConfig,CacheConfigFactory } from "./cache-config.js"
import type {
	CacheOperation,
	CachePriority,
	CacheStrategy,
	CacheStrategyConfig} from "./cache-strategies.js";
import { CacheBackendType, CacheStrategySelector } from "./cache-strategies.js";
import { type BuildContext,EnvironmentDetector, EnvironmentMode } from "./environment-detector.js"
import { BYTES_PER_GB, MS_PER_SECOND } from "./size-and-time-units.js"


/**
 * Runtime mode configuration options
 */
export interface ModeOptions {
	/**
	Force specific environment mode
	 */
	forceMode?: "development" | "production" | "test"
	/**
	Use case optimization
	 */
	useCase?: "research" | "production" | "development" | "testing"
	/**
	Enable offline mode
	 */
	offline?: boolean
	/**
	Enable debug mode
	 */
	debug?: boolean
	/**
	Override cache strategy
	 */
	cacheStrategy?: CacheStrategy
	/**
	Override storage type
	 */
	storageType?: CacheBackendType
	/**
	Custom cache size limit
	 */
	maxCacheSize?: number
	/**
	Custom TTL in milliseconds
	 */
	ttl?: number
}

/**
 * Complete runtime environment configuration
 */
export interface RuntimeEnvironmentConfig {
	/**
	Environment context
	 */
	context: BuildContext
	/**
	Cache configuration
	 */
	cacheConfig: CacheConfig
	/**
	Cache strategy
	 */
	strategy: CacheStrategy
	/**
	Cache strategy configuration
	 */
	strategyConfig: CacheStrategyConfig
	/**
	Applied mode options
	 */
	options: ModeOptions
	/**
	Configuration timestamp
	 */
	timestamp: number
}

let currentRuntimeConfig: RuntimeEnvironmentConfig | undefined
let configListeners: ((config: RuntimeEnvironmentConfig) => void)[] = []

/**
 * Create environment context with potential overrides
 */
const createEnvironmentContext = (options: Readonly<ModeOptions>): BuildContext => {
	let context = EnvironmentDetector.getBuildContext()

	// Apply force mode override
	if (options.forceMode) {
		const forcedMode = options.forceMode
		context = {
			...context,
			isDevelopment: forcedMode === "development",
			isProduction: forcedMode === "production",
			isTest: forcedMode === "test",
			mode:
				forcedMode === "development"
					? EnvironmentMode.DEVELOPMENT
					: (forcedMode === "production"
						? EnvironmentMode.PRODUCTION
						: EnvironmentMode.TEST),
		}
	}

	return context
}

/**
 * Create cache configuration based on context and options
 */
const createCacheConfiguration = ({
	context,
	options,
}: Readonly<{
	context: BuildContext
	options: ModeOptions
}>): CacheConfig => {
	const config: CacheConfig = options.useCase ? CacheConfigFactory.createOptimizedConfig({
			useCase: options.useCase,
			context,
		}) : CacheConfigFactory.createCacheConfig(context);

	// Apply option overrides
	if (options.maxCacheSize !== undefined) {
		config.storage.maxSize = options.maxCacheSize
	}

	if (options.ttl !== undefined) {
		config.storage.expirationTime = options.ttl
	}

	if (options.debug !== undefined) {
		config.storage.debug = options.debug
	}

	return config
}

/**
 * Select cache strategy based on context and options
 */
const selectCacheStrategy = ({
	context,
	options,
}: Readonly<{
	context: BuildContext
	options: ModeOptions
}>): CacheStrategy => {
	if (options.cacheStrategy !== undefined) {
		return options.cacheStrategy
	}

	return CacheStrategySelector.selectStrategy({
		context,
		options: {
			useCase: options.useCase,
			offline: options.offline,
			debug: options.debug,
		},
	})
}

/**
 * Create strategy configuration with overrides
 */
const createStrategyConfiguration = ({
	strategy,
	options,
}: Readonly<{
	strategy: CacheStrategy
	options: ModeOptions
}>): CacheStrategyConfig => {
	let config = CacheStrategySelector.getStrategyConfig(strategy)

	// Apply option overrides
	if (options.storageType !== undefined) {
		config = {
			...config,
			storageType: options.storageType,
		}
	}

	if (options.maxCacheSize !== undefined) {
		config = {
			...config,
			maxSize: options.maxCacheSize,
		}
	}

	if (options.ttl !== undefined) {
		config = {
			...config,
			ttl: options.ttl,
		}
	}

	if (options.debug !== undefined) {
		config = {
			...config,
			debug: options.debug,
		}
	}

	return config
}

/**
 * Notify all listeners of configuration changes
 */
const notifyListeners = (config: Readonly<RuntimeEnvironmentConfig>): void => {
	for (const listener of configListeners) {
		try {
			listener(config)
		} catch (error) {
			logger.error("mode-switcher", "Error in mode switcher listener:", error)
		}
	}
}

/**
 * Mode switcher for dynamic environment configuration
 */
export const ModeSwitcher = {
	/**
	 * Initialize mode switcher with optional overrides
	 */
	initialize: (options: Readonly<ModeOptions> = {}): RuntimeEnvironmentConfig => {
		const context = createEnvironmentContext(options)
		const cacheConfig = createCacheConfiguration({ context, options })
		const strategy = selectCacheStrategy({ context, options })
		const strategyConfig = createStrategyConfiguration({
			strategy,
			options,
		})

		const config: RuntimeEnvironmentConfig = {
			context,
			cacheConfig,
			strategy,
			strategyConfig,
			options,
			timestamp: Date.now(),
		}

		currentRuntimeConfig = config
		notifyListeners(config)

		return config
	},

	/**
	 * Get current runtime configuration
	 */
	getCurrentConfig: (): RuntimeEnvironmentConfig => {
		if (currentRuntimeConfig === undefined) {
			return ModeSwitcher.initialize()
		}
		return currentRuntimeConfig
	},

	/**
	 * Reconfigure with new options
	 */
	reconfigure: (options: Readonly<ModeOptions>): RuntimeEnvironmentConfig => {
		return ModeSwitcher.initialize(options)
	},

	/**
	 * Switch to specific mode
	 */
	switchToMode: (
		mode: "development" | "production" | "test",
		additionalOptions: Readonly<Omit<ModeOptions, "forceMode">> = {}
	): RuntimeEnvironmentConfig => {
		return ModeSwitcher.initialize({
			...additionalOptions,
			forceMode: mode,
		})
	},

	/**
	 * Switch to research mode
	 */
	switchToResearchMode: (options: Readonly<Omit<ModeOptions, "useCase">> = {}): RuntimeEnvironmentConfig => {
		return ModeSwitcher.initialize({
			...options,
			useCase: "research",
		})
	},

	/**
	 * Switch to offline mode
	 */
	switchToOfflineMode: (options: Readonly<Omit<ModeOptions, "offline">> = {}): RuntimeEnvironmentConfig => {
		return ModeSwitcher.initialize({
			...options,
			offline: true,
		})
	},

	/**
	 * Switch to debug mode
	 */
	switchToDebugMode: (options: Readonly<Omit<ModeOptions, "debug">> = {}): RuntimeEnvironmentConfig => {
		return ModeSwitcher.initialize({
			...options,
			debug: true,
		})
	},

	/**
	 * Add configuration change listener
	 */
	addConfigListener: (listener: (config: RuntimeEnvironmentConfig) => void): () => void => {
		configListeners.push(listener)
		return () => {
			const index = configListeners.indexOf(listener)
			if (index !== -1) {
				configListeners.splice(index, 1)
			}
		}
	},

	/**
	 * Get available modes for current context
	 */
	getAvailableModes: (): {
		environments: ("development" | "production" | "test")[]
		useCases: ("research" | "production" | "development" | "testing")[]
		strategies: CacheStrategy[]
		storageTypes: CacheBackendType[]
	} => {
		const context = EnvironmentDetector.getBuildContext()
		const strategies = CacheStrategySelector.getAvailableStrategies(context)

		return {
			environments: ["development", "production", "test"],
			useCases: ["research", "production", "development", "testing"],
			strategies,
			storageTypes: [
				CacheBackendType.MEMORY,
				CacheBackendType.LOCAL_STORAGE,
				CacheBackendType.INDEXED_DB,
				CacheBackendType.STATIC_FILE,
			],
		}
	},

	/**
	 * Validate configuration compatibility
	 */
	validateConfiguration: (options: Readonly<ModeOptions>): {
		valid: boolean
		errors: string[]
		warnings: string[]
	} => {
		const errors: string[] = []
		const warnings: string[] = []

		// Check for conflicting options
		if (options.offline === true && options.useCase === "development") {
			warnings.push("Offline mode in development may not work as expected")
		}

		// Check storage type compatibility
		if (options.storageType === CacheBackendType.STATIC_FILE && options.offline !== true) {
			warnings.push("Static file storage works best in offline mode")
		}

		// Check cache size limits
		if (options.maxCacheSize !== undefined && options.maxCacheSize > BYTES_PER_GB) {
			warnings.push("Cache size over 1GB may impact performance")
		}

		// Check TTL values
		if (options.ttl !== undefined && options.ttl < MS_PER_SECOND) {
			warnings.push("TTL under 1 second may cause excessive cache thrashing")
		}

		return {
			valid: errors.length === 0,
			errors,
			warnings,
		}
	},

	/**
	 * Get performance metrics for current configuration
	 */
	getPerformanceMetrics: (): {
		configurationTime: number
		cacheHitRate?: number
		memoryUsage?: number
		storageUsage?: number
	} => {
		const config = ModeSwitcher.getCurrentConfig()

		return {
			configurationTime: config.timestamp,
			// Placeholder for actual metrics - would be implemented by cache implementation
			cacheHitRate: undefined,
			memoryUsage: undefined,
			storageUsage: undefined,
		}
	},

	/**
	 * Reset mode switcher state (useful for testing)
	 */
	reset: (): void => {
		currentRuntimeConfig = undefined
		configListeners = []
		EnvironmentDetector.clearCache()
	},
}

/**
 * Convenience functions for common mode operations
 */

/**
 * Get current cache strategy
 */
export const getCurrentCacheStrategy = (options?: {
	useCase?: "research" | "production" | "development" | "testing"
	offline?: boolean
	debug?: boolean
}): CacheStrategy => {
	if (options) {
		const config = ModeSwitcher.initialize(options)
		return config.strategy
	}

	const config = ModeSwitcher.getCurrentConfig()
	return config.strategy
};

/**
 * Get current cache configuration
 */
export const getCurrentCacheConfiguration = (): CacheConfig => {
	const config = ModeSwitcher.getCurrentConfig()
	return config.cacheConfig
};

/**
 * Get current strategy configuration
 */
export const getCurrentStrategyConfiguration = (): CacheStrategyConfig => {
	const config = ModeSwitcher.getCurrentConfig()
	return config.strategyConfig
};

/**
 * Check if specific cache operation is supported
 */
export const isCacheOperationSupported = (operation: CacheOperation): boolean => {
	const config = ModeSwitcher.getCurrentConfig()
	return config.strategyConfig.operations.includes(operation)
};

/**
 * Get default cache priority for current environment
 */
export const getDefaultCachePriority = (): CachePriority => {
	const config = ModeSwitcher.getCurrentConfig()
	return config.strategyConfig.defaultPriority
};

/**
 * Check if debug mode is enabled
 */
export const isDebugMode = (): boolean => {
	const config = ModeSwitcher.getCurrentConfig()
	return config.strategyConfig.debug
};

/**
 * Get environment description for current configuration
 */
export const getEnvironmentDescription = (): string => EnvironmentDetector.getEnvironmentDescription();

/**
 * Initialize environment with research-optimized settings
 */
export const initializeResearchEnvironment = (options: Readonly<Omit<ModeOptions, "useCase">> = {}): RuntimeEnvironmentConfig => ModeSwitcher.switchToResearchMode(options);

/**
 * Initialize environment with production-optimized settings
 */
export const initializeProductionEnvironment = (options: Readonly<Omit<ModeOptions, "useCase">> = {}): RuntimeEnvironmentConfig => ModeSwitcher.reconfigure({
		...options,
		useCase: "production",
	});

/**
 * Initialize environment with development-optimized settings
 */
export const initializeDevelopmentEnvironment = (options: Readonly<Omit<ModeOptions, "useCase">> = {}): RuntimeEnvironmentConfig => ModeSwitcher.reconfigure({
		...options,
		useCase: "development",
	});
