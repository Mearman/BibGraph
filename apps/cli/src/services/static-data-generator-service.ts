/**
 * Static Data Generator Service
 * Pattern-based static data generation from query patterns
 */

import { mkdir, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { cachedOpenAlex } from "@bibgraph/client/cached-client"
import { logError, logger } from "@bibgraph/utils/logger"

import { type StaticEntityType } from "../entity-detection.js"

const LOG_CONTEXT_GENERAL = "StaticDataGeneratorService"

/**
 * Service for generating static data from usage patterns
 */
export class StaticDataGeneratorService {
	constructor(private dataPath: string) {}

	/**
	 * Generate static data from detected patterns
	 * @param options
	 * @param options.entityTypes
	 * @param options.sampleSize
	 * @param options.batchSize
	 */
	async generateStaticDataFromPatterns(options: {
		entityTypes?: StaticEntityType[]
		sampleSize?: number
		batchSize?: number
	}): Promise<{
		totalProcessed: number
		totalCached: number
		entityTypeCounts: Record<string, number>
	}> {
		const entityTypes = options.entityTypes ?? (["authors", "works", "institutions", "topics", "publishers", "funders"] as StaticEntityType[])
		const sampleSize = options.sampleSize ?? 100
		const batchSize = options.batchSize ?? 10

		let totalProcessed = 0
		let totalCached = 0
		const entityTypeCounts: Record<string, number> = {}

		for (const entityType of entityTypes) {
			const result = await this.processEntityTypeForGeneration(entityType, sampleSize, batchSize)

			totalProcessed += result.processed
			totalCached += result.cached
			entityTypeCounts[entityType] = result.cached
		}

		return {
			totalProcessed,
			totalCached,
			entityTypeCounts,
		}
	}

	/**
	 * Process entity type for static data generation
	 * @param entityType
	 * @param sampleSize
	 * @param batchSize
	 */
	private async processEntityTypeForGeneration(
		entityType: StaticEntityType,
		sampleSize: number,
		batchSize: number
	): Promise<{
		processed: number
		cached: number
	}> {
		let processed = 0
		let cached = 0

		// Process well-populated entities first
		const wellPopulatedResult = await this.processWellPopulatedEntities(entityType, sampleSize, batchSize)
		processed += wellPopulatedResult.processed
		cached += wellPopulatedResult.cached

		// Process popular collections
		const collectionsResult = await this.processPopularCollections(entityType, batchSize)
		processed += collectionsResult.processed
		cached += collectionsResult.cached

		return { processed, cached }
	}

	/**
	 * Process well-populated entities (high completeness score)
	 * @param entityType
	 * @param sampleSize
	 * @param batchSize
	 */
	private async processWellPopulatedEntities(
		entityType: StaticEntityType,
		sampleSize: number,
		batchSize: number
	): Promise<{
		processed: number
		cached: number
	}> {
		let processed = 0
		let cached = 0

		try {
			// Search for entities with high completeness
			const searchFilters = this.getCompletenessFilters(entityType)

			for (const filter of searchFilters) {
				if (processed >= sampleSize) {
					break
				}

				const result = await this.processEntityForCaching(entityType, filter, Math.min(batchSize, sampleSize - processed))
				processed += result.processed
				cached += result.cached
			}
		} catch (error) {
			logError(logger, `Failed to process well-populated entities for ${entityType}`, error, LOG_CONTEXT_GENERAL)
		}

		return { processed, cached }
	}

	/**
	 * Process individual entity for caching
	 * @param entityType
	 * @param filter
	 * @param count
	 */
	private async processEntityForCaching(
		entityType: StaticEntityType,
		filter: string,
		count: number
	): Promise<{
		processed: number
		cached: number
	}> {
		let processed = 0
		let cached = 0

		try {
			// Use cachedOpenAlex API instead of non-existent getEntityList
			const url = `https://api.openalex.org/${entityType}?filter=${encodeURIComponent(filter)}&per_page=${count}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`)
			}

			const data = await response.json()
			const results = data.results ?? []

			for (const entity of results) {
				processed++

				const fetchedEntity = await this.fetchEntityForCaching(entityType, entity.id)
				if (fetchedEntity) {
					cached++
				}
			}
		} catch (error) {
			logError(logger, `Failed to process entity for caching: ${entityType}`, error, LOG_CONTEXT_GENERAL)
		}

		return { processed, cached }
	}

	/**
	 * Fetch entity and save to cache
	 * @param entityType
	 * @param entityId
	 */
	private async fetchEntityForCaching(entityType: StaticEntityType, entityId: string): Promise<boolean> {
		try {
			// Use cachedOpenAlex.client.getEntity - takes ID only (entity type is detected from ID)
			const entity = await cachedOpenAlex.client.getEntity(entityId)

			if (entity) {
				const entityDir = join(this.dataPath, entityType)
				await mkdir(entityDir, { recursive: true })

				const filename = encodeURIComponent(entity.id) + ".json"
				const entityPath = join(entityDir, filename)

				const content = JSON.stringify(entity, null, 2)
				await writeFile(entityPath, content)

				return true
			}

			return false
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Failed to fetch entity for caching: ${entityType}/${entityId}`)
			return false
		}
	}

	/**
	 * Process popular collections (cited works, related authors, etc.)
	 * @param entityType
	 * @param count
	 */
	private async processPopularCollections(
		entityType: StaticEntityType,
		count: number
	): Promise<{
		processed: number
		cached: number
	}> {
		let processed = 0
		let cached = 0

		try {
			const collectionFilters = this.getPopularCollectionFilters(entityType)

			for (const filter of collectionFilters) {
				const result = await this.processEntityForCaching(entityType, filter, count)
				processed += result.processed
				cached += result.cached
			}
		} catch (error) {
			logError(logger, `Failed to process popular collections for ${entityType}`, error, LOG_CONTEXT_GENERAL)
		}

		return { processed, cached }
	}

	/**
	 * Get completeness filters for entity type
	 * @param entityType
	 */
	private getCompletenessFilters(entityType: StaticEntityType): string[] {
		const filters: Record<StaticEntityType, string[]> = {
			authors: ["has_orcid:true", "last_known_in.country_code:*"],
			works: ["has_fulltext:true", "type:article"],
			institutions: ["country_code:*"],
			topics: [],
			publishers: [],
			funders: [],
		}

		return filters[entityType] ?? []
	}

	/**
	 * Get popular collection filters for entity type
	 * @param entityType
	 */
	private getPopularCollectionFilters(entityType: StaticEntityType): string[] {
		const filters: Record<StaticEntityType, string[]> = {
			authors: ["cited_by_count:>10"],
			works: ["cited_by_count:>5"],
			institutions: [],
			topics: [],
			publishers: [],
			funders: [],
		}

		return filters[entityType] ?? []
	}
}
