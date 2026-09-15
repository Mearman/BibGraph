/// <reference types="vite/client" />

/**
 * Environment detection utilities for BibGraph
 *
 * Detects development vs production mode using NODE_ENV, process.env, and build context.
 * Provides robust environment detection for both browser and Node.js environments.
 */

// Type declarations for global environment properties
declare const __DEV__: boolean | undefined
declare const __BUILD_INFO__: Record<string, unknown> | undefined

/**
 * Environment mode enumeration
 */
export enum EnvironmentMode {
	DEVELOPMENT = "development",
	PRODUCTION = "production",
	TEST = "test",
}

/**
 * Build context information
 */
export interface BuildContext {
	/**
	Whether this is a development build
	 */
	isDevelopment: boolean
	/**
	Whether this is a production build
	 */
	isProduction: boolean
	/**
	Whether this is a test environment
	 */
	isTest: boolean
	/**
	Current environment mode
	 */
	mode: EnvironmentMode
	/**
	Build timestamp if available
	 */
	buildTimestamp?: string
	/**
	Commit hash if available
	 */
	commitHash?: string
	/**
	Whether running in browser context
	 */
	isBrowser: boolean
	/**
	Whether running in Node.js context
	 */
	isNode: boolean
	/**
	Whether running in worker context
	 */
	isWorker: boolean
	/**
	Whether development server is detected
	 */
	isDevServer: boolean
	/**
	Whether this is a GitHub Pages deployment
	 */
	isGitHubPages: boolean
	/**
	Current hostname (browser only)
	 */
	hostname?: string
	/**
	Current protocol (browser only)
	 */
	protocol?: string
}

let cachedBuildContext: BuildContext | undefined

const getModeFromNodeEnv = (): EnvironmentMode | null => {
	if (process.env.NODE_ENV !== undefined && process.env.NODE_ENV !== "") {
		const nodeEnvironment = process.env.NODE_ENV.toLowerCase()
		switch (nodeEnvironment) {
			case "production":
				return EnvironmentMode.PRODUCTION
			case "test":
				return EnvironmentMode.TEST
			case "development":
				return EnvironmentMode.DEVELOPMENT
		}
	}
	return null
}

const getModeFromViteEnv = (): EnvironmentMode | null => {
	if (!("env" in import.meta)) {
		return null
	}

	try {
		const environment = import.meta.env

		// Check MODE first
		const mode = environment.MODE
		if (typeof mode === "string") {
			const modeLower = mode.toLowerCase()
			switch (modeLower) {
				case "production":
					return EnvironmentMode.PRODUCTION
				case "test":
					return EnvironmentMode.TEST
				case "development":
					return EnvironmentMode.DEVELOPMENT
			}
		}

		// Check boolean flags
		if (environment.DEV) return EnvironmentMode.DEVELOPMENT
		if (environment.PROD) return EnvironmentMode.PRODUCTION

		return null
	} catch {
		// Ignore errors if import.meta.env is not available
		return null
	}
}

const getModeFromDevFlag = (): EnvironmentMode | null => {
	if (
		typeof globalThis !== "undefined" &&
		Object.prototype.hasOwnProperty.call(globalThis, "__DEV__")
	) {
		try {
			if (typeof __DEV__ === "boolean") {
				return __DEV__ ? EnvironmentMode.DEVELOPMENT : EnvironmentMode.PRODUCTION
			}
		} catch {
			// Ignore errors if __DEV__ is not accessible
		}
	}
	return null
}

const getModeFromBrowser = (): EnvironmentMode | null => {
	if (typeof window !== "undefined") {
		const hostname = window.location.hostname

		// Local development indicators
		if (hostname === "localhost" || hostname === "127.0.0.1" || hostname.endsWith(".local")) {
			return EnvironmentMode.DEVELOPMENT
		}

		// Development port indicators
		const port = window.location.port
		if (port !== "" && ["3000", "5173", "8080", "4173"].includes(port)) {
			return EnvironmentMode.DEVELOPMENT
		}

		// GitHub Pages or custom domain = production
		if (hostname === "bibgraph.joenash.uk" || hostname.endsWith(".github.io")) {
			return EnvironmentMode.PRODUCTION
		}
	}
	return null
}

/**
 * Extract build info from raw build data
 */
const extractBuildInfo = (buildInfo: Readonly<Record<string, unknown>>): {
	buildTimestamp?: string
	commitHash?: string
} => {
	const buildTimestamp = buildInfo.buildTimestamp
	const commitHash = buildInfo.commitHash
	const shortCommitHash = buildInfo.shortCommitHash

	return {
		buildTimestamp: typeof buildTimestamp === "string" ? buildTimestamp : undefined,
		commitHash:
			typeof commitHash === "string"
				? commitHash
				: (typeof shortCommitHash === "string"
					? shortCommitHash
					: undefined),
	}
}

/**
 * Runtime environment detection utilities
 */
export const EnvironmentDetector = {
	/**
	 * Detect the current environment mode from NODE_ENV and other indicators
	 */
	detectMode: (): EnvironmentMode => {
		// Check NODE_ENV first (most reliable)
		const nodeEnvironmentMode = getModeFromNodeEnv()
		if (nodeEnvironmentMode !== null) return nodeEnvironmentMode

		// Check Vite environment variables
		const viteMode = getModeFromViteEnv()
		if (viteMode !== null) return viteMode

		// Check global __DEV__ flag (from Vite define)
		const developmentFlagMode = getModeFromDevFlag()
		if (developmentFlagMode !== null) return developmentFlagMode

		// Browser-based detection
		const browserMode = getModeFromBrowser()
		if (browserMode !== null) return browserMode

		// Default to development if uncertain
		return EnvironmentMode.DEVELOPMENT
	},

	/**
	 * Detect if running in browser context
	 */
	isBrowser: (): boolean => {
		return typeof window !== "undefined" && typeof document !== "undefined"
	},

	/**
	 * Detect if running in Node.js context
	 */
	isNode: (): boolean => {
		return typeof process !== "undefined"
	},

	/**
	 * Detect if running in Web Worker context
	 */
	isWorker: (): boolean => {
		return (
			typeof globalThis !== "undefined" &&
			"importScripts" in globalThis &&
			typeof window === "undefined"
		)
	},

	/**
	 * Detect if development server is running
	 */
	isDevServer: (): boolean => {
		if (!EnvironmentDetector.isBrowser()) return false

		const hostname = window.location.hostname
		const port = window.location.port
		const protocol = window.location.protocol

		// Local development indicators
		if (hostname === "localhost" || hostname === "127.0.0.1") {
			return true
		}

		// Development ports
		if (port !== "" && ["3000", "5173", "8080", "4173"].includes(port)) {
			return true
		}

		// HTTP in development (vs HTTPS in production)
		if (protocol === "http:" && hostname !== "localhost") {
			return true
		}

		return false
	},

	/**
	 * Detect if running on GitHub Pages
	 */
	isGitHubPages: (): boolean => {
		if (!EnvironmentDetector.isBrowser()) return false

		const hostname = window.location.hostname
		return (hostname === "bibgraph.joenash.uk") || hostname.endsWith(".github.io")
	},

	/**
	 * Get build information from injected metadata
	 */
	getBuildInfo: (): { buildTimestamp?: string; commitHash?: string } => {
		try {
			// Check for Vite-injected build info
			if (
				typeof globalThis !== "undefined" &&
				Object.prototype.hasOwnProperty.call(globalThis, "__BUILD_INFO__")
			) {
				try {
					if (__BUILD_INFO__ !== undefined && typeof __BUILD_INFO__ === "object") {
						return extractBuildInfo(__BUILD_INFO__)
					}
				} catch {
					// Ignore errors if __BUILD_INFO__ is not accessible
				}
			}
		} catch {
			// Ignore errors in build info detection
		}

		return {}
	},

	/**
	 * Get current hostname (browser only)
	 */
	getHostname: (): string | undefined => {
		if (EnvironmentDetector.isBrowser()) {
			return window.location.hostname
		}
		return undefined
	},

	/**
	 * Get current protocol (browser only)
	 */
	getProtocol: (): string | undefined => {
		if (EnvironmentDetector.isBrowser()) {
			return window.location.protocol
		}
		return undefined
	},

	/**
	 * Get complete build context with caching
	 */
	getBuildContext: (): BuildContext => {
		if (cachedBuildContext !== undefined) {
			return cachedBuildContext
		}

		const mode = EnvironmentDetector.detectMode()
		const buildInfo = EnvironmentDetector.getBuildInfo()
		const isBrowser = EnvironmentDetector.isBrowser()
		const isNode = EnvironmentDetector.isNode()
		const isWorker = EnvironmentDetector.isWorker()
		const isDevelopmentServer = EnvironmentDetector.isDevServer()
		const isGitHubPages = EnvironmentDetector.isGitHubPages()

		cachedBuildContext = {
			isDevelopment: mode === EnvironmentMode.DEVELOPMENT,
			isProduction: mode === EnvironmentMode.PRODUCTION,
			isTest: mode === EnvironmentMode.TEST,
			mode,
			buildTimestamp: buildInfo.buildTimestamp,
			commitHash: buildInfo.commitHash,
			isBrowser,
			isNode,
			isWorker,
			isDevServer: isDevelopmentServer,
			isGitHubPages,
			hostname: EnvironmentDetector.getHostname(),
			protocol: EnvironmentDetector.getProtocol(),
		}

		return cachedBuildContext
	},

	/**
	 * Clear cached context (useful for testing)
	 */
	clearCache: (): void => {
		cachedBuildContext = undefined
	},

	/**
	 * Get a human-readable environment description
	 */
	getEnvironmentDescription: (): string => {
		const context = EnvironmentDetector.getBuildContext()

		if (context.isTest) {
			return "Test Environment"
		}

		if (context.isDevelopment) {
			if (context.isDevServer) {
				return `Development Server (${context.hostname ?? "unknown"}:${window.location.port === "" ? "unknown" : window.location.port})`
			}
			return "Development Build"
		}

		if (context.isProduction) {
			if (context.isGitHubPages) {
				return `Production (GitHub Pages: ${context.hostname ?? "unknown"})`
			}
			return "Production Build"
		}

		return "Unknown Environment"
	},
}

/**
 * Convenience function to get current environment mode
 */
export const getCurrentEnvironmentMode = (): EnvironmentMode => EnvironmentDetector.detectMode();

/**
 * Convenience function to check if in development mode
 */
export const isDevelopment = (): boolean => EnvironmentDetector.detectMode() === EnvironmentMode.DEVELOPMENT;

/**
 * Convenience function to check if in production mode
 */
export const isProduction = (): boolean => EnvironmentDetector.detectMode() === EnvironmentMode.PRODUCTION;

/**
 * Convenience function to check if in test mode
 */
export const isTest = (): boolean => EnvironmentDetector.detectMode() === EnvironmentMode.TEST;

/**
 * Convenience function to get complete build context
 */
export const getBuildContext = (): BuildContext => EnvironmentDetector.getBuildContext();
