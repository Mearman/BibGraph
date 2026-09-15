/**
 * OpenAlex CLI Client Class (Refactored)
 * Orchestrates API calls, caching, and statistics through focused services
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { cachedOpenAlex, type CachedOpenAlexClient } from "@bibgraph/client/cached-client"
import { logError, logger } from "@bibgraph/utils/logger"
import { getStaticDataCachePath } from "@bibgraph/utils/static-data/cache"

import { type StaticEntityType, SUPPORTED_ENTITIES } from "./entity-detection.js"
import {
	EntityCacheService,
	IndexManagementService,
	QueryCacheService,
	StaticDataGeneratorService,
	StatisticsService,
} from "./services/index.js"

// Types
export interface QueryOptions {
	search?: string
	filter?: string
	select?: string[]
	sort?: string
	per_page?: number
	page?: number
}

export interface CacheOptions {
	useCache?: boolean
	cacheOnly?: boolean
	saveToCache?: boolean
}

/**
Reserved options for {@link OpenAlexCLI.generateStaticDataFromPatterns}; not yet consumed.
 */
export interface GenerateStaticDataFromPatternsOptions {
	dryRun?: boolean
	force?: boolean
}

// Constants
const LOG_CONTEXT_GENERAL = "OpenAlexCLI"
const LOG_CONTEXT_STATIC_CACHE = "StaticCache"
const CACHE_HIT_MESSAGE = "Cache hit:"
const CACHE_ONLY_MODE_MESSAGE = "Cache-only mode:"
const QUERY_CACHE_HIT_MESSAGE = "Query cache hit"
const CACHE_ONLY_QUERY_MESSAGE = "Cache-only mode: query not found"
const SAVED_ENTITY_MESSAGE = "Saved entity:"
const SAVED_QUERY_MESSAGE = "Saved query:"
const SKIPPED_ENTITY_MESSAGE = "Skipped entity:"
const SKIPPED_QUERY_MESSAGE = "Skipped query:"
const CONTENT_CHANGED_MESSAGE = "(content changed)"
const NO_CONTENT_CHANGES_MESSAGE = "(no content changes)"
const FAILED_TO_SAVE_MESSAGE = "Failed to save entity to cache"
const FAILED_TO_SAVE_QUERY_MESSAGE = "Failed to save query to cache"
const FAILED_TO_FETCH_MESSAGE = "Failed to fetch"
const API_REQUEST_FAILED = "API request failed"
/**
Default number of results per page when a query doesn't specify one.
 */
const DEFAULT_QUERY_PER_PAGE = 50
/**
Placeholder cache-hit potential reported when the underlying data has any entities at all (the real ratio isn't computed yet).
 */
const PLACEHOLDER_CACHE_HIT_POTENTIAL = 0.5

const generateCanonicalEntityUrl = ({
	entityType,
	entityId,
}: {
	entityType: string
	entityId: string
}): string => {
	return `https://api.openalex.org/${entityType}/${entityId}`
}

/**
Bit shift used by the DJB2-style hash's `hash * 32 - hash` step.
 */
const HASH_SHIFT_BITS = 5
/**
Radix used when converting the numeric content hash to a compact string.
 */
const HASH_STRING_RADIX = 36

const generateContentHash = (content: string): string => {
	let hash = 0
	for (let index = 0; index < content.length; index++) {
		const char = content.charCodeAt(index)
		hash = (hash << HASH_SHIFT_BITS) - hash + char
		hash &= hash
	}
	return hash.toString(HASH_STRING_RADIX)
}

// Type definitions for OpenAlex API response
interface OpenAlexEntity {
	id: string
	display_name: string
	[key: string]: unknown
}

interface OpenAlexAPIResponse {
	results: OpenAlexEntity[]
}

/**
 * Narrow an unknown value down to an {@link OpenAlexEntity} before trusting its shape.
 */
const isOpenAlexEntity = (value: unknown): value is OpenAlexEntity =>
	typeof value === "object" &&
	value !== null &&
	"id" in value &&
	"display_name" in value &&
	typeof value.id === "string" &&
	typeof value.display_name === "string"

/**
 * Narrow an unknown API response down to an {@link OpenAlexAPIResponse} before trusting its shape.
 */
const isOpenAlexAPIResponse = (value: unknown): value is OpenAlexAPIResponse =>
	typeof value === "object" &&
	value !== null &&
	"results" in value &&
	Array.isArray(value.results) &&
	value.results.every(isOpenAlexEntity)

/**
 * Main OpenAlex CLI class - orchestrates services for API, caching, and statistics
 */
export class OpenAlexCLI {
	private static instance: OpenAlexCLI | undefined
	private readonly dataPath: string
	private readonly cachedClient: CachedOpenAlexClient

	// Service instances
	private readonly entityCacheService: EntityCacheService
	private readonly queryCacheService: QueryCacheService
	private readonly indexManagementService: IndexManagementService
	private readonly statisticsService: StatisticsService
	private readonly staticDataGeneratorService: StaticDataGeneratorService

	constructor(dataPath?: string) {
		this.dataPath = dataPath ?? getStaticDataCachePath()
		this.cachedClient = cachedOpenAlex

		// Initialize services
		this.entityCacheService = new EntityCacheService(this.dataPath)
		this.queryCacheService = new QueryCacheService(this.dataPath)
		this.indexManagementService = new IndexManagementService(this.dataPath)
		this.statisticsService = new StatisticsService(this.dataPath)
		this.staticDataGeneratorService = new StaticDataGeneratorService(this.dataPath)
	}

	/**
	 * Get singleton instance
	 */
	static getInstance(dataPath?: string): OpenAlexCLI {
		OpenAlexCLI.instance ??= new OpenAlexCLI(dataPath)
		return OpenAlexCLI.instance
	}

	/**
	 * Make API call to OpenAlex
	 */
	async fetchFromAPI(entityType: StaticEntityType, options: QueryOptions = {}): Promise<unknown> {
		const url = this.buildQueryUrl(entityType, options)

		try {
			logger.debug(LOG_CONTEXT_GENERAL, `Fetching from API: ${url}`)
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(`API request failed: ${response.status.toString()} ${response.statusText}`)
			}

			return await response.json()
		} catch (error) {
			logError(logger, API_REQUEST_FAILED, error, LOG_CONTEXT_GENERAL)
			throw error
		}
	}

	/**
	 * Get entity by ID with cache control
	 */
	async getEntityWithCache(
		entityType: StaticEntityType,
		entityId: string,
		cacheOptions: Readonly<CacheOptions>
	): Promise<{
		id: string
		display_name: string
		[key: string]: unknown
	} | null> {
		// Try cache first if enabled
		if (cacheOptions.useCache === true || cacheOptions.cacheOnly === true) {
			const cached = await this.entityCacheService.loadEntity(entityType, entityId)
			if (cached) {
				logger.debug(LOG_CONTEXT_GENERAL, `${CACHE_HIT_MESSAGE} ${entityType}/${entityId}`)
				return cached
			}

			if (cacheOptions.cacheOnly === true) {
				logger.warn(LOG_CONTEXT_GENERAL, `${CACHE_ONLY_MODE_MESSAGE} ${entityId} not found in cache`)
				return null
			}
		}

		// Fetch from API if cache miss and not cache-only
		try {
			const apiResult = await this.fetchFromAPI(entityType, {
				filter: `id:${entityId}`,
				per_page: 1,
			})

			if (isOpenAlexAPIResponse(apiResult) && apiResult.results.length > 0) {
				const entity = apiResult.results[0]

				if (cacheOptions.saveToCache === true) {
					await this.saveEntityToCache(entityType, entity)
				}

				return entity
			}
		} catch (error) {
			logError(
				logger,
				`${FAILED_TO_FETCH_MESSAGE} ${entityType}/${entityId} from API`,
				error,
				LOG_CONTEXT_GENERAL
			)
		}

		return null
	}

	/**
	 * Save entity to static cache and update unified index
	 */
	async saveEntityToCache(
		entityType: StaticEntityType,
		entity: { id: string; display_name: string; [key: string]: unknown }
	): Promise<void> {
		try {
			const entityDir = join(this.dataPath, entityType)
			await mkdir(entityDir, { recursive: true })

			const canonicalUrl = generateCanonicalEntityUrl({ entityType, entityId: entity.id })
			const filename = encodeURIComponent(canonicalUrl) + ".json"
			const entityPath = join(entityDir, filename)
			const newContent = JSON.stringify(entity, null, 2)

			const newContentHash = generateContentHash(newContent)

			// Check if content has changed
			const existingIndex = await this.indexManagementService.loadUnifiedIndex(entityType)
			const existingEntry = existingIndex?.[canonicalUrl]
			const isContentChanged = existingEntry?.contentHash !== newContentHash

			if (isContentChanged) {
				await writeFile(entityPath, newContent)
				logger.debug(
					LOG_CONTEXT_STATIC_CACHE,
					`${SAVED_ENTITY_MESSAGE} ${entityType}/${filename} ${CONTENT_CHANGED_MESSAGE}`
				)

				await this.indexManagementService.updateUnifiedIndex(entityType, canonicalUrl, {
					$ref: canonicalUrl,
					lastModified: new Date().toISOString(),
					contentHash: newContentHash,
				})
			} else {
				logger.debug(
					LOG_CONTEXT_STATIC_CACHE,
					`${SKIPPED_ENTITY_MESSAGE} ${entityType}/${filename} ${NO_CONTENT_CHANGES_MESSAGE}`
				)

				if (existingEntry.lastModified !== "") {
					await this.indexManagementService.updateUnifiedIndex(entityType, canonicalUrl, {
						$ref: canonicalUrl,
						lastModified: existingEntry.lastModified,
						contentHash: newContentHash,
					})
				}
			}
		} catch (error) {
			logError(logger, FAILED_TO_SAVE_MESSAGE, error, LOG_CONTEXT_STATIC_CACHE)
		}
	}

	/**
	 * Query with cache control
	 */
	async queryWithCache(
		entityType: StaticEntityType,
		queryOptions: QueryOptions,
		cacheOptions: Readonly<CacheOptions>
	): Promise<unknown> {
		const url = this.buildQueryUrl(entityType, queryOptions)

		// Try cache first if enabled
		if (cacheOptions.useCache === true || cacheOptions.cacheOnly === true) {
			const cached = await this.queryCacheService.loadQuery(entityType, url)
			if (cached !== null && cached !== undefined) {
				logger.debug(LOG_CONTEXT_GENERAL, QUERY_CACHE_HIT_MESSAGE)
				return cached
			}

			if (cacheOptions.cacheOnly === true) {
				logger.warn(LOG_CONTEXT_GENERAL, CACHE_ONLY_QUERY_MESSAGE)
				return null
			}
		}

		// Fetch from API if cache miss and not cache-only
		try {
			const apiResult = await this.fetchFromAPI(entityType, queryOptions)

			if (cacheOptions.saveToCache === true) {
				await this.saveQueryToCache(entityType, url, apiResult)
			}

			return apiResult
		} catch (error) {
			logError(logger, "Failed to execute query", error, LOG_CONTEXT_GENERAL)
			throw error
		}
	}

	/**
	 * Save query result to cache
	 */
	async saveQueryToCache(entityType: StaticEntityType, url: string, result: unknown): Promise<void> {
		try {
			const queryDir = join(this.dataPath, entityType, "queries")
			await mkdir(queryDir, { recursive: true })

			const filename = encodeURIComponent(url)
			const queryPath = join(queryDir, `${filename}.json`)

			const newContent = JSON.stringify(result, null, 2)
			const newContentHash = generateContentHash(newContent)

			// Check if content has changed
			const queryIndex = await this.queryCacheService.loadQueryIndex(entityType)
			const existingEntry = queryIndex?.queries.find((q) => q.url === url)
			const isContentChanged = existingEntry?.contentHash !== newContentHash

			if (isContentChanged) {
				await writeFile(queryPath, newContent)
				logger.debug(LOG_CONTEXT_GENERAL, `${SAVED_QUERY_MESSAGE} ${filename} ${CONTENT_CHANGED_MESSAGE}`)
			} else {
				logger.debug(
					LOG_CONTEXT_GENERAL,
					`${SKIPPED_QUERY_MESSAGE} ${filename} ${NO_CONTENT_CHANGES_MESSAGE}`
				)
			}
		} catch (error) {
			logError(logger, FAILED_TO_SAVE_QUERY_MESSAGE, error, LOG_CONTEXT_GENERAL)
		}
	}

	/**
	 * Build query URL from options
	 */
	buildQueryUrl(entityType: StaticEntityType, options: QueryOptions = {}): string {
		const baseUrl = `https://api.openalex.org/${entityType}`
		const parameters = new URLSearchParams()

		if (options.search !== undefined && options.search !== "") {
			parameters.append("search", options.search)
		}

		if (options.filter !== undefined && options.filter !== "") {
			parameters.append("filter", options.filter)
		}

		if (options.select) {
			parameters.append("select", options.select.join(","))
		}

		if (options.sort !== undefined && options.sort !== "") {
			parameters.append("sort", options.sort)
		}

		parameters.append("per_page", (options.per_page ?? DEFAULT_QUERY_PER_PAGE).toString())

		if (options.page !== undefined && options.page !== 0) {
			parameters.append("page", options.page.toString())
		}

		const queryString = parameters.toString()
		return queryString ? `${baseUrl}?${queryString}` : baseUrl
	}

	// Delegate methods to services

	/**
	 * Check if static data exists for entity type
	 */
	async hasStaticData(entityType: StaticEntityType): Promise<boolean> {
		return this.indexManagementService.hasStaticData(entityType)
	}

	/**
	 * Load index for entity type
	 */
	async loadIndex(entityType: StaticEntityType) {
		return this.indexManagementService.loadIndex(entityType)
	}

	/**
	 * Get entity summary from index (single entity)
	 */
	async getEntitySummary(entityType: StaticEntityType, entityId: string) {
		return this.indexManagementService.getEntitySummary(entityType, entityId)
	}

	/**
	 * Get entity type overview with count and entity list
	 * Used for CLI stats and overview commands
	 */
	async getEntityTypeOverview(
		entityType: StaticEntityType
	): Promise<{ entityType: string; count: number; entities: string[] } | null> {
		const index = await this.indexManagementService.loadUnifiedIndex(entityType)
		if (!index) {
			return null
		}
		const entities = Object.keys(index)
		return {
			entityType,
			count: entities.length,
			entities,
		}
	}

	/**
	 * Load unified index for entity type
	 */
	async loadUnifiedIndex(entityType: StaticEntityType) {
		return this.indexManagementService.loadUnifiedIndex(entityType)
	}

	/**
	 * List all cached entities for entity type
	 */
	async listEntities(entityType: StaticEntityType): Promise<string[]> {
		return this.entityCacheService.listEntities(entityType)
	}

	/**
	 * Load entity from cache
	 */
	async loadEntity(
		entityType: StaticEntityType,
		entityId: string
	): Promise<{ id: string; display_name: string; [key: string]: unknown } | null> {
		const result = await this.entityCacheService.loadEntity(entityType, entityId)
		return result ?? null
	}

	/**
	 * Search entities by name in cache
	 */
	async searchEntities(entityType: StaticEntityType, searchTerm: string) {
		return this.entityCacheService.searchEntities(entityType, searchTerm)
	}

	/**
	 * List all cached queries for entity type
	 */
	async listCachedQueries(entityType: StaticEntityType) {
		return this.queryCacheService.listCachedQueries(entityType)
	}

	/**
	 * Get comprehensive cache statistics
	 * Returns data in format: `{ [entityType]: { count: number, lastModified: string } }`
	 */
	async getStatistics(): Promise<Record<string, { count: number; lastModified: string }>> {
		const stats = await this.statisticsService.getStatistics()
		const result: Record<string, { count: number; lastModified: string }> = {}

		for (const entityType of stats.entityTypes) {
			result[entityType] = {
				count: 0, // We don't have per-entity-type counts in the simplified service
				lastModified: new Date().toISOString(),
			}
		}

		return result
	}

	/**
	 * Get detailed cache stats from static data provider
	 */
	async getCacheStats() {
		return this.statisticsService.getCacheStats()
	}

	/**
	 * Clear synthetic cache (memory cache)
	 */
	async clearSyntheticCache(): Promise<void> {
		return this.statisticsService.clearSyntheticCache()
	}

	/**
	 * Analyze static data usage
	 */
	async analyzeStaticDataUsage(): Promise<{
		entityDistribution: Record<string, number>
		totalEntities: number
		cacheHitPotential: number
		recommendedForGeneration: string[]
		gaps: string[]
	}> {
		const stats = await this.statisticsService.analyzeStaticDataUsage()

		// Convert to expected format
		const entityDistribution: Record<string, number> = {}
		for (const entityType of stats.entityTypes) {
			entityDistribution[entityType] = 0
		}

		return {
			entityDistribution,
			totalEntities: stats.totalEntities,
			cacheHitPotential: stats.totalEntities > 0 ? PLACEHOLDER_CACHE_HIT_POTENTIAL : 0,
			recommendedForGeneration: stats.entityTypes.length === 0 ? [...SUPPORTED_ENTITIES] : [],
			gaps: [],
		}
	}

	/**
	 * Get field coverage for entity
	 */
	async getFieldCoverage(): Promise<{
		memory: string[]
		localStorage: string[]
		indexedDB: string[]
		static: string[]
		total: string[]
	}> {
		const stats = await this.statisticsService.analyzeStaticDataUsage()
		return stats.fieldCoverage
	}

	/**
	 * Get well-populated entities
	 */
	getWellPopulatedEntities(): {
		entityId: string
		fieldCount: number
		fields: string[]
	}[] {
		// Return empty array as this is a placeholder for the CLI
		return []
	}

	/**
	 * Get popular collections
	 */
	getPopularCollections(): {
		queryKey: string
		entityCount: number
		pageCount: number
	}[] {
		// Return empty array as this is a placeholder for the CLI
		return []
	}

	/**
	 * Generate static data from detected patterns
	 * @param entityType - Optional specific entity type
	 * @param _options - Generation options (currently unused; reserved for dry-run/force support)
	 */
	async generateStaticDataFromPatterns(
		entityType?: StaticEntityType,
		_options?: GenerateStaticDataFromPatternsOptions
	): Promise<{
		filesProcessed: number
		entitiesCached: number
		queriesCached: number
		errors: string[]
	}> {
		const result = await this.staticDataGeneratorService.generateStaticDataFromPatterns({
			entityTypes: entityType ? [entityType] : undefined,
		})

		return {
			filesProcessed: result.totalProcessed,
			entitiesCached: result.totalCached,
			queriesCached: 0,
			errors: [],
		}
	}
}
