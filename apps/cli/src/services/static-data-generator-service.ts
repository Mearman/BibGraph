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

const DEFAULT_ENTITY_TYPES: StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"]
const DEFAULT_SAMPLE_SIZE = 100
const DEFAULT_BATCH_SIZE = 10

/**
 * A single entity summary as returned within an OpenAlex list response's `results` array.
 */
interface OpenAlexApiEntitySummary {
	id: string
}

/**
 * Shape of an OpenAlex list endpoint's JSON response, narrowed to the fields this service reads.
 */
interface OpenAlexApiListResponse {
	results: OpenAlexApiEntitySummary[]
}

const isOpenAlexApiEntitySummary = (value: unknown): value is OpenAlexApiEntitySummary => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("id" in value)) {
		return false
	}
	return typeof value.id === "string"
}

const isOpenAlexApiListResponse = (value: unknown): value is OpenAlexApiListResponse => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("results" in value) || !Array.isArray(value.results)) {
		return false
	}
	return value.results.every(isOpenAlexApiEntitySummary)
}

/**
 * Service for generating static data from usage patterns
 */
export class StaticDataGeneratorService {
	constructor(private readonly dataPath: string) {}

	/**
	 * Generate static data from detected patterns
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
		const entityTypes = options.entityTypes ?? DEFAULT_ENTITY_TYPES
		const sampleSize = options.sampleSize ?? DEFAULT_SAMPLE_SIZE
		const batchSize = options.batchSize ?? DEFAULT_BATCH_SIZE

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
			const url = `https://api.openalex.org/${entityType}?filter=${encodeURIComponent(filter)}&per_page=${String(count)}`
			const response = await fetch(url)

			if (!response.ok) {
				throw new Error(`API request failed: ${response.statusText}`)
			}

			const data: unknown = await response.json()
			const results = isOpenAlexApiListResponse(data) ? data.results : []

			for (const entity of results) {
				processed++

				const isFetchedEntity = await this.fetchEntityForCaching(entityType, entity.id)
				if (isFetchedEntity) {
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

		return filters[entityType]
	}

	/**
	 * Get popular collection filters for entity type
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

		return filters[entityType]
	}
}
