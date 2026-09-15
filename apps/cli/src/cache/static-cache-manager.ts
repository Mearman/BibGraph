/**
 * Static Cache Manager for OpenAlex CLI
 * Handles environment-aware static data cache operations
 */

import { access, mkdir, readdir, readFile, rm, stat, writeFile } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { logError, logger } from "@bibgraph/utils/logger"
import { z } from "zod"

import { type StaticEntityType,SUPPORTED_ENTITIES } from "../entity-detection.js"

// Environment detection
type CacheMode = "development" | "production"

interface StaticCacheConfig {
	mode: CacheMode
	basePath: string
	githubPagesUrl?: string
}

// Cache statistics interfaces
interface CacheStatistics {
	mode: CacheMode
	totalEntities: number
	entityDistribution: Record<StaticEntityType, number>
	totalSize: number
	lastUpdated: string
	isHealthy: boolean
	healthIssues: string[]
}

interface CacheValidationResult {
	isValid: boolean
	errors: string[]
	warnings: string[]
	entityCounts: Record<StaticEntityType, number>
	corruptedFiles: string[]
	missingIndexes: StaticEntityType[]
}

interface CacheGenerationOptions {
	entityTypes?: StaticEntityType[]
	limit?: number
	force?: boolean
	dryRun?: boolean
}

// Zod schemas for validation
const EntityIndexEntrySchema = z.object({
	$ref: z.string(),
	lastModified: z.string(),
	contentHash: z.string(),
})

const UnifiedIndexSchema = z.record(z.string(), EntityIndexEntrySchema)

const STATIC_DATA_PATH = "apps/web/public/data/openalex"

// Constants for repeated strings
const LOG_CONTEXT = "static-cache"
const INDEX_FILENAME = "index.json"
const PRODUCTION_MODE_ERROR = "Cannot generate static cache in production mode"
const PRODUCTION_CLEAR_ERROR = "Cannot clear static cache in production mode"
const VALIDATION_FAILED_MESSAGE = "Cache validation failed"
const STATISTICS_FAILED_MESSAGE = "Failed to get cache statistics"

/**
 * Narrow a possibly-incomplete per-entity-type record down to a record that is guaranteed to hold every {@link StaticEntityType} key.
 */
const isCompleteEntityDistribution = (
	distribution: Readonly<Partial<Record<StaticEntityType, number>>>
): distribution is Record<StaticEntityType, number> => {
	return SUPPORTED_ENTITIES.every((entityType) => entityType in distribution)
}

/**
 * Build a {@link Record} covering every {@link StaticEntityType}, initialised to zero.
 */
const createEmptyEntityDistribution = (): Record<StaticEntityType, number> => {
	const distribution: Partial<Record<StaticEntityType, number>> = {}
	for (const entityType of SUPPORTED_ENTITIES) {
		distribution[entityType] = 0
	}
	if (!isCompleteEntityDistribution(distribution)) {
		throw new Error("Failed to initialise entity distribution for all supported entity types")
	}
	return distribution
}

/**
 * Narrow a JSON-parsed value down to a plain record before indexing into it.
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
	return typeof value === "object" && value !== null && !Array.isArray(value)
}

export class StaticCacheManager {
	private config: StaticCacheConfig
	private readonly projectRoot: string

	constructor(config?: Partial<StaticCacheConfig>) {
		// Detect environment
		const mode = this.detectEnvironment()

		// Get project root
		const currentFileUrl = import.meta.url
		const currentFilePath = fileURLToPath(currentFileUrl)
		this.projectRoot = resolve(dirname(currentFilePath), "../../../..")

		this.config = {
			mode,
			basePath: config?.basePath ?? join(this.projectRoot, STATIC_DATA_PATH),
			githubPagesUrl:
				config?.githubPagesUrl ?? "https://mearman.github.io/BibGraph/data/openalex",
			...config,
		}

		logger.debug(LOG_CONTEXT, `Initialized StaticCacheManager in ${mode} mode`, {
			basePath: this.config.basePath,
			githubPagesUrl: this.config.githubPagesUrl,
		})
	}

	/**
	 * Detect environment based on NODE_ENV and other factors
	 */
	private detectEnvironment(): CacheMode {
		const nodeEnvironment = process.env.NODE_ENV

		if (nodeEnvironment === "production") {
			return "production"
		}

		if (nodeEnvironment === "development") {
			return "development"
		}

		// Default to development for CLI usage
		return "development"
	}

	/**
	 * Get cache statistics including health status
	 */
	async getCacheStatistics(): Promise<CacheStatistics> {
		const stats: CacheStatistics = {
			mode: this.config.mode,
			totalEntities: 0,
			entityDistribution: createEmptyEntityDistribution(),
			totalSize: 0,
			lastUpdated: new Date().toISOString(),
			isHealthy: true,
			healthIssues: [],
		}

		try {
			for (const entityType of SUPPORTED_ENTITIES) {
				const count = await this.getEntityCount(entityType)
				stats.entityDistribution[entityType] = count
				stats.totalEntities += count
			}

			if (this.config.mode === "development") {
				stats.totalSize = await this.calculateCacheSize()
			}

			// Basic health checks
			const validation = await this.validateCache()
			stats.isHealthy = validation.isValid
			stats.healthIssues = [...validation.errors, ...validation.warnings]
		} catch (error) {
			stats.isHealthy = false
			stats.healthIssues.push(
				`Failed to collect statistics: ${error instanceof Error ? error.message : String(error)}`
			)
			logError(logger, STATISTICS_FAILED_MESSAGE, error, LOG_CONTEXT)
		}

		return stats
	}

	/**
	 * Validate cache integrity and structure
	 */
	async validateCache(): Promise<CacheValidationResult> {
		const result: CacheValidationResult = {
			isValid: true,
			errors: [],
			warnings: [],
			entityCounts: createEmptyEntityDistribution(),
			corruptedFiles: [],
			missingIndexes: [],
		}

		try {
			for (const entityType of SUPPORTED_ENTITIES) {
				await this.validateEntityType({ entityType, result })
			}

			result.isValid = result.errors.length === 0
		} catch (error) {
			result.isValid = false
			result.errors.push(
				`Validation failed: ${error instanceof Error ? error.message : String(error)}`
			)
			logError(logger, VALIDATION_FAILED_MESSAGE, error, LOG_CONTEXT)
		}

		return result
	}

	/**
	 * Validate a specific entity type
	 */
	private async validateEntityType({
		entityType,
		result,
	}: {
		entityType: StaticEntityType
		result: CacheValidationResult
	}): Promise<void> {
		if (this.config.mode === "production") {
			// In production mode, we can't validate local files
			result.warnings.push(`Skipping file validation in production mode for ${entityType}`)
			result.entityCounts[entityType] = 0
			return
		}

		const entityDir = join(this.config.basePath, entityType)

		try {
			await access(entityDir)
		} catch {
			result.warnings.push(`Entity directory missing: ${entityType}`)
			result.entityCounts[entityType] = 0
			return
		}

		// Check for index.json
		const indexPath = join(entityDir, INDEX_FILENAME)
		try {
			await access(indexPath)

			// Validate index content
			const indexContent = await readFile(indexPath, "utf-8")

			const index: unknown = JSON.parse(indexContent)
			const validation = UnifiedIndexSchema.safeParse(index)

			if (validation.success) {
				result.entityCounts[entityType] = Object.keys(validation.data).length

				// Check for referenced files
				for (const [entityId, entry] of Object.entries(validation.data)) {
					const filePath = join(
						entityDir,
						entry.$ref.startsWith("./") ? entry.$ref.slice(2) : entry.$ref
					)
					try {
						await access(filePath)
					} catch {
						result.corruptedFiles.push(`${entityType}/${entry.$ref} (referenced by ${entityId})`)
					}
				}
			} else {
				result.errors.push(`Invalid index format for ${entityType}: ${validation.error.message}`)
			}
		} catch (error) {
			result.missingIndexes.push(entityType)
			result.errors.push(
				`Missing or corrupted index for ${entityType}: ${error instanceof Error ? error.message : String(error)}`
			)
			result.entityCounts[entityType] = 0
		}
	}

	/**
	 * Generate static cache from current data patterns
	 */
	async generateStaticCache(options: CacheGenerationOptions = {}): Promise<void> {
		if (this.config.mode === "production") {
			throw new Error(PRODUCTION_MODE_ERROR)
		}

		logger.debug(LOG_CONTEXT, "Starting static cache generation", options)

		const entityTypes = options.entityTypes ?? SUPPORTED_ENTITIES
		const totalSteps = entityTypes.length
		let currentStep = 0

		for (const entityType of entityTypes) {
			currentStep++
			logger.debug(
				LOG_CONTEXT,
				`Generating cache for ${entityType} (${currentStep.toString()}/${totalSteps.toString()})`
			)

			try {
				await this.generateEntityTypeCache({ entityType, options })
			} catch (error) {
				logError(logger, `Failed to generate cache for ${entityType}`, error, LOG_CONTEXT)
				if (options.force !== true) {
					throw error
				}
			}
		}

		logger.debug(LOG_CONTEXT, "Static cache generation completed")
	}

	/**
	 * Generate cache for a specific entity type
	 */
	private async generateEntityTypeCache({
		entityType,
		options,
	}: {
		entityType: StaticEntityType
		options: CacheGenerationOptions
	}): Promise<void> {
		// This is a placeholder - in a real implementation, this would:
		// 1. Analyze usage patterns from synthetic cache
		// 2. Fetch popular/well-populated entities
		// 3. Save them to static cache
		// 4. Update indexes

		if (options.dryRun === true) {
			logger.debug(LOG_CONTEXT, `DRY RUN: Would generate cache for ${entityType}`)
			return
		}

		// Create entity directory
		const entityDir = join(this.config.basePath, entityType)
		await mkdir(entityDir, { recursive: true })

		// Create empty index if none exists
		const indexPath = join(entityDir, INDEX_FILENAME)
		try {
			await access(indexPath)
		} catch {
			await writeFile(indexPath, JSON.stringify({}, null, 2))
			logger.debug(LOG_CONTEXT, `Created empty index for ${entityType}`)
		}
	}

	/**
	 * Clear static cache data
	 */
	async clearStaticCache(entityTypes?: readonly StaticEntityType[]): Promise<void> {
		if (this.config.mode === "production") {
			throw new Error(PRODUCTION_CLEAR_ERROR)
		}

		const typesToClear = entityTypes ?? SUPPORTED_ENTITIES

		for (const entityType of typesToClear) {
			try {
				const entityDir = join(this.config.basePath, entityType)
				await rm(entityDir, { recursive: true, force: true })
				logger.debug(LOG_CONTEXT, `Cleared cache for ${entityType}`)
			} catch (error) {
				if (error instanceof Error && "code" in error && error.code === "ENOENT") {
					// Directory doesn't exist, which is fine
					continue
				}
				logError(logger, `Failed to clear cache for ${entityType}`, error, LOG_CONTEXT)
			}
		}

		logger.debug(LOG_CONTEXT, "Static cache cleared", {
			entityTypes: typesToClear,
		})
	}

	/**
	 * Get entity count for a specific type
	 */
	private async getEntityCount(entityType: StaticEntityType): Promise<number> {
		if (this.config.mode === "production") {
			// In production, we can't count local files
			return 0
		}

		try {
			const indexPath = join(this.config.basePath, entityType, INDEX_FILENAME)
			const indexContent = await readFile(indexPath, "utf-8")
			const parsed: unknown = JSON.parse(indexContent)
			if (!isRecord(parsed)) {
				return 0
			}
			return Object.keys(parsed).length
		} catch {
			return 0
		}
	}

	/**
	 * Calculate total cache size in bytes
	 */
	private async calculateCacheSize(): Promise<number> {
		if (this.config.mode === "production") {
			return 0
		}

		let totalSize = 0

		for (const entityType of SUPPORTED_ENTITIES) {
			try {
				const entityDir = join(this.config.basePath, entityType)
				const stats = await this.getDirectorySize(entityDir)
				totalSize += stats
			} catch {
				// Directory might not exist
				continue
			}
		}

		return totalSize
	}

	/**
	 * Calculate directory size recursively
	 */
	private async getDirectorySize(dirPath: string): Promise<number> {
		let totalSize = 0

		try {
			const items = await readdir(dirPath)

			for (const item of items) {
				const itemPath = join(dirPath, item)
				const stats = await stat(itemPath)

				totalSize += stats.isDirectory() ? (await this.getDirectorySize(itemPath)) : stats.size;
			}
		} catch {
			// Handle errors silently
		}

		return totalSize
	}

	/**
	 * Get cache configuration
	 */
	getConfig(): StaticCacheConfig {
		return { ...this.config }
	}

	/**
	 * Update cache configuration
	 */
	updateConfig(newConfig: Readonly<Partial<StaticCacheConfig>>): void {
		this.config = { ...this.config, ...newConfig }
		logger.debug(LOG_CONTEXT, "Cache configuration updated", this.config)
	}
}
