/**
 * Statistics Service
 * Handles cache statistics, analysis, and metrics
 */

import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

import { logError, logger } from "@bibgraph/utils/logger"

import { type StaticEntityType } from "../entity-detection.js"

const LOG_CONTEXT_GENERAL = "StatisticsService"

// Cache statistics type definition (simplified)
interface CacheStats {
	enabled: boolean
	performance?: {
		totalRequests: number
		cacheHitRate: number
		surgicalRequestCount: number
		bandwidthSaved: number
	}
	storage?: {
		memory?: {
			entities?: number
			fields?: number
			collections?: number
			size?: number
		}
	}
}

// Simplified field coverage type for CLI
interface FieldCoverageByTier {
	memory: string[]
	localStorage: string[]
	indexedDB: string[]
	static: string[]
	total: string[]
}

/**
 * Service for cache statistics and analysis
 */
export class StatisticsService {
	constructor(private dataPath: string) {}

	/**
	 * Get comprehensive cache statistics
	 */
	async getStatistics(): Promise<{
		entityTypes: StaticEntityType[]
		totalCachedEntities: number
		totalCachedQueries: number
		totalStorageSize: number
	}> {
		const entityTypes: StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"]
		const stats = {
			entityTypes: [] as StaticEntityType[],
			totalCachedEntities: 0,
			totalCachedQueries: 0,
			totalStorageSize: 0,
		}

		for (const entityType of entityTypes) {
			try {
				const entityDir = join(this.dataPath, entityType)
				await stat(entityDir)

				stats.entityTypes.push(entityType)

				const entityCount = await this.countEntities(entityType)
				stats.totalCachedEntities += entityCount

				const queryCount = await this.countQueries(entityType)
				stats.totalCachedQueries += queryCount

				const dirSize = await this.calculateDirectorySize(entityDir)
				stats.totalStorageSize += dirSize
			} catch {
				// Entity type not cached
			}
		}

		return stats
	}

	/**
	 * Get detailed cache stats (simplified version)
	 */
	async getCacheStats(): Promise<CacheStats> {
		// Return simplified stats since staticDataProvider.getStatistics() doesn't exist
		const stats = await this.getStatistics()

		return {
			enabled: true,
			performance: {
				totalRequests: stats.totalCachedEntities + stats.totalCachedQueries,
				cacheHitRate: 0, // Not tracked in current implementation
				surgicalRequestCount: 0,
				bandwidthSaved: 0, // Not tracked
			},
			storage: {
				memory: {
					entities: stats.totalCachedEntities,
					fields: stats.totalCachedQueries,
					size: stats.totalStorageSize,
				},
			},
		}
	}

	/**
	 * Clear synthetic cache (no-op for CLI filesystem cache)
	 */
	async clearSyntheticCache(): Promise<void> {
		// CLI uses filesystem cache, so there's no synthetic/memory cache to clear
		logger.info(LOG_CONTEXT_GENERAL, "CLI uses filesystem cache - no synthetic cache to clear")
	}

	/**
	 * Analyze static data usage
	 */
	async analyzeStaticDataUsage(): Promise<{
		entityTypes: StaticEntityType[]
		totalEntities: number
		totalQueries: number
		storageSize: number
		fieldCoverage: FieldCoverageByTier
	}> {
		const entityTypes: StaticEntityType[] = []
		let totalEntities = 0
		let totalQueries = 0
		let storageSize = 0

		const fieldCoverage: FieldCoverageByTier = {
			memory: [],
			localStorage: [],
			indexedDB: [],
			static: [],
			total: [],
		}

		const supportedEntityTypes: StaticEntityType[] = ["authors", "works", "institutions", "topics", "publishers", "funders"]

		for (const entityType of supportedEntityTypes) {
			try {
				const entityDir = join(this.dataPath, entityType)
				await stat(entityDir)

				entityTypes.push(entityType)

				const entityCount = await this.countEntities(entityType)
				totalEntities += entityCount

				const queryCount = await this.countQueries(entityType)
				totalQueries += queryCount

				storageSize += await this.calculateDirectorySize(entityDir)

				// Analyze field coverage from sample entity
				await this.analyzeFieldCoverage(entityType, fieldCoverage)
			} catch {
				// Entity type not cached
			}
		}

		// Deduplicate total fields
		fieldCoverage.total = [...new Set(fieldCoverage.total)]

		return {
			entityTypes,
			totalEntities,
			totalQueries,
			storageSize,
			fieldCoverage,
		}
	}

	/**
	 * Count entities for given type
	 */
	private async countEntities(entityType: StaticEntityType): Promise<number> {
		try {
			const entityDir = join(this.dataPath, entityType)
			const files = await readdir(entityDir)

			return files.filter(
				(file) => file.endsWith(".json") && file !== "unified-index.json" && !file.startsWith("query-")
			).length
		} catch {
			return 0
		}
	}

	/**
	 * Count queries for given type
	 */
	private async countQueries(entityType: StaticEntityType): Promise<number> {
		try {
			const queryDir = join(this.dataPath, entityType, "queries")
			const files = await readdir(queryDir)

			return files.filter((file) => file.endsWith(".json")).length
		} catch {
			return 0
		}
	}

	/**
	 * Calculate directory size
	 */
	private async calculateDirectorySize(dirPath: string): Promise<number> {
		try {
			const files = await readdir(dirPath)
			let totalSize = 0

			for (const file of files) {
				const filePath = join(dirPath, file)
				const fileStat = await stat(filePath)

				if (fileStat.isDirectory()) {
					totalSize += await this.calculateDirectorySize(filePath)
				} else if (fileStat.isFile()) {
					totalSize += fileStat.size
				}
			}

			return totalSize
		} catch {
			return 0
		}
	}

	/**
	 * Analyze field coverage from sample entity
	 */
	private async analyzeFieldCoverage(
		entityType: StaticEntityType,
		fieldCoverage: FieldCoverageByTier
	): Promise<void> {
		try {
			const entityDir = join(this.dataPath, entityType)
			const files = await readdir(entityDir)

			// Find first non-index entity file
			const entityFile = files.find(
				(file) => file.endsWith(".json") && file !== "unified-index.json" && !file.startsWith("query-")
			)

			if (!entityFile) {
				return
			}

			const filePath = join(entityDir, entityFile)
			const content = await readFile(filePath, "utf-8")
			const entity = JSON.parse(content)

			// Extract all field names
			const fields = Object.keys(entity)
			fieldCoverage.static.push(...fields)
			fieldCoverage.total.push(...fields)
		} catch {
			// Skip if analysis fails
		}
	}
}
