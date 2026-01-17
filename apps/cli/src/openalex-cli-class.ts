/**
 * OpenAlex CLI Client Class (Refactored)
 * Orchestrates API calls, caching, and statistics through focused services
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { cachedOpenAlex, CachedOpenAlexClient } from "@bibgraph/client/cached-client"
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

const generateCanonicalEntityUrl = ({
	entityType,
	entityId,
}: {
	entityType: string
	entityId: string
}): string => {
	return `https://api.openalex.org/${entityType}/${entityId}`
}

const generateContentHash = (content: string): string => {
	let hash = 0
	for (let i = 0; i < content.length; i++) {
		const char = content.charCodeAt(i)
		hash = (hash << 5) - hash + char
		hash = hash & hash
	}
	return hash.toString(36)
}

// Type definitions for OpenAlex API response
type OpenAlexEntity = {
	id: string
	display_name: string
}

type OpenAlexAPIResponse = {
	results: OpenAlexEntity[]
	meta: {
		count: number
		page: number
		per_page: number
	}
}

/**
 * Main OpenAlex CLI class - orchestrates services for API, caching, and statistics
 */
export class OpenAlexCLI {
	private static instance: OpenAlexCLI | undefined
	private dataPath: string
	private cachedClient: CachedOpenAlexClient

	// Service instances
	private entityCacheService: EntityCacheService
	private queryCacheService: QueryCacheService
	private indexManagementService: IndexManagementService
	private statisticsService: StatisticsService
	private staticDataGeneratorService: StaticDataGeneratorService

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
	 * @param dataPath
	 */
	static getInstance(dataPath?: string): OpenAlexCLI {
		if (!OpenAlexCLI.instance) {
			OpenAlexCLI.instance = new OpenAlexCLI(dataPath)
		}
		return OpenAlexCLI.instance
	}

	/**
	 * Make API call to OpenAlex
	 * @param entityType
	 * @param options
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
	 * @param entityType
	 * @param entityId
	 * @param cacheOptions
	 */
	async getEntityWithCache(
		entityType: StaticEntityType,
		entityId: string,
		cacheOptions: CacheOptions
	): Promise<{
		id: string
		display_name: string
		[key: string]: unknown
	} | null> {
		// Try cache first if enabled
		if (cacheOptions.useCache || cacheOptions.cacheOnly) {
			const cached = await this.entityCacheService.loadEntity(entityType, entityId)
			if (cached) {
				logger.debug(LOG_CONTEXT_GENERAL, `${CACHE_HIT_MESSAGE} ${entityType}/${entityId}`)
				return cached
			}

			if (cacheOptions.cacheOnly) {
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

			const results = (apiResult as OpenAlexAPIResponse | undefined)?.results
			if (results && results.length > 0) {
				const entity = results[0]

				if (
					entity &&
					typeof entity === "object" &&
					"id" in entity &&
					"display_name" in entity &&
					typeof entity.id === "string" &&
					typeof entity.display_name === "string"
				) {
					if (cacheOptions.saveToCache) {
						await this.saveEntityToCache(entityType, entity)
					}

					return entity
				}
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
	 * @param entityType
	 * @param entity
	 * @param entity.id
	 * @param entity.display_name
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
			const contentChanged = existingEntry?.contentHash !== newContentHash

			if (contentChanged) {
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

				if (existingEntry?.lastModified) {
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
	 * @param entityType
	 * @param queryOptions
	 * @param cacheOptions
	 */
	async queryWithCache(
		entityType: StaticEntityType,
		queryOptions: QueryOptions,
		cacheOptions: CacheOptions
	): Promise<unknown> {
		const url = this.buildQueryUrl(entityType, queryOptions)

		// Try cache first if enabled
		if (cacheOptions.useCache || cacheOptions.cacheOnly) {
			const cached = await this.queryCacheService.loadQuery(entityType, url)
			if (cached) {
				logger.debug(LOG_CONTEXT_GENERAL, QUERY_CACHE_HIT_MESSAGE)
				return cached
			}

			if (cacheOptions.cacheOnly) {
				logger.warn(LOG_CONTEXT_GENERAL, CACHE_ONLY_QUERY_MESSAGE)
				return null
			}
		}

		// Fetch from API if cache miss and not cache-only
		try {
			const apiResult = await this.fetchFromAPI(entityType, queryOptions)

			if (cacheOptions.saveToCache) {
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
	 * @param entityType
	 * @param url
	 * @param result
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
			const contentChanged = existingEntry?.contentHash !== newContentHash

			if (contentChanged) {
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
	 * @param entityType
	 * @param options
	 */
	buildQueryUrl(entityType: StaticEntityType, options: QueryOptions = {}): string {
		const baseUrl = `https://api.openalex.org/${entityType}`
		const params = new URLSearchParams()

		if (options.search) {
			params.append("search", options.search)
		}

		if (options.filter) {
			params.append("filter", options.filter)
		}

		if (options.select) {
			params.append("select", options.select.join(","))
		}

		if (options.sort) {
			params.append("sort", options.sort)
		}

		params.append("per_page", (options.per_page ?? 50).toString())

		if (options.page) {
			params.append("page", options.page.toString())
		}

		const queryString = params.toString()
		return queryString ? `${baseUrl}?${queryString}` : baseUrl
	}

	// Delegate methods to services

	/**
	 * Check if static data exists for entity type
	 * @param entityType
	 */
	async hasStaticData(entityType: StaticEntityType): Promise<boolean> {
		return this.indexManagementService.hasStaticData(entityType)
	}

	/**
	 * Load index for entity type
	 * @param entityType
	 */
	async loadIndex(entityType: StaticEntityType) {
		return this.indexManagementService.loadIndex(entityType)
	}

	/**
	 * Get entity summary from index (single entity)
	 * @param entityType
	 * @param entityId
	 */
	async getEntitySummary(entityType: StaticEntityType, entityId: string) {
		return this.indexManagementService.getEntitySummary(entityType, entityId)
	}

	/**
	 * Get entity type overview with count and entity list
	 * Used for CLI stats and overview commands
	 * @param entityType
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
	 * @param entityType
	 */
	async loadUnifiedIndex(entityType: StaticEntityType) {
		return this.indexManagementService.loadUnifiedIndex(entityType)
	}

	/**
	 * List all cached entities for entity type
	 * @param entityType
	 */
	async listEntities(entityType: StaticEntityType): Promise<string[]> {
		return this.entityCacheService.listEntities(entityType)
	}

	/**
	 * Load entity from cache
	 * @param entityType
	 * @param entityId
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
	 * @param entityType
	 * @param searchTerm
	 */
	async searchEntities(entityType: StaticEntityType, searchTerm: string) {
		return this.entityCacheService.searchEntities(entityType, searchTerm)
	}

	/**
	 * List all cached queries for entity type
	 * @param entityType
	 */
	async listCachedQueries(entityType: StaticEntityType) {
		return this.queryCacheService.listCachedQueries(entityType)
	}

	/**
	 * Get comprehensive cache statistics
	 * Returns data in format: { [entityType]: { count: number, lastModified: string } }
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
			cacheHitPotential: stats.totalEntities > 0 ? 0.5 : 0,
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
	async getWellPopulatedEntities(): Promise<Array<{
		entityId: string
		fieldCount: number
		fields: string[]
	}>> {
		// Return empty array as this is a placeholder for the CLI
		return []
	}

	/**
	 * Get popular collections
	 */
	async getPopularCollections(): Promise<Array<{
		queryKey: string
		entityCount: number
		pageCount: number
	}>> {
		// Return empty array as this is a placeholder for the CLI
		return []
	}

	/**
	 * Generate static data from detected patterns
	 * @param entityType Optional specific entity type
	 * @param options Generation options
	 * @param options.dryRun
	 * @param options.force
	 * @param _options
	 * @param _options.dryRun
	 * @param _options.force
	 */
	async generateStaticDataFromPatterns(
		entityType?: StaticEntityType,
		_options?: {
			dryRun?: boolean
			force?: boolean
		}
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
