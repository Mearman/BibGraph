/**
 * Entity Cache Service
 * Handles entity CRUD operations, file loading, and directory scanning
 */

import { readdir, readFile, stat } from "node:fs/promises"
import { join } from "node:path"

import { logError, logger } from "@bibgraph/utils/logger"

import { type StaticEntityType } from "../entity-detection.js"

const LOG_CONTEXT_GENERAL = "EntityCacheService"

/**
 * Shape of a cached entity as stored on disk: an OpenAlex entity always has an `id` and `display_name`, plus arbitrary additional fields.
 */
interface CachedEntity {
	id: string
	display_name: string
	[key: string]: unknown
}

/**
 * Narrows an unknown parsed value to {@link CachedEntity}, verifying that both `id` and `display_name` are present and are strings.
 */
const isCachedEntity = (value: unknown): value is CachedEntity => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("id" in value) || !("display_name" in value)) {
		return false
	}
	return typeof value.id === "string" && typeof value.display_name === "string"
}

/**
 * Service for managing cached entity files
 */
export class EntityCacheService {
	constructor(private readonly dataPath: string) {}

	/**
	 * Load entity from filesystem cache
	 */
	async loadEntity(entityType: StaticEntityType, entityId: string): Promise<CachedEntity | undefined> {
		try {
			const filename = encodeURIComponent(entityId) + ".json"
			const entityPath = join(this.dataPath, entityType, filename)

			const content = await readFile(entityPath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return isCachedEntity(parsed) ? parsed : undefined
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Entity not found in cache: ${entityType}/${entityId}`)
			return undefined
		}
	}

	/**
	 * Load entity from filesystem using unified index
	 */
	async loadUnifiedIndexForEntity(
		entityType: StaticEntityType,
		entityId: string
	): Promise<CachedEntity | undefined> {
		return this.loadEntity(entityType, entityId)
	}

	/**
	 * Load entity directly from file path
	 */
	async loadEntityFromFile(filePath: string): Promise<CachedEntity | undefined> {
		try {
			const content = await readFile(filePath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return isCachedEntity(parsed) ? parsed : undefined
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Failed to load entity from file: ${filePath}`)
			return undefined
		}
	}

	/**
	 * List all cached entities for a given entity type
	 */
	async listEntities(entityType: StaticEntityType): Promise<string[]> {
		try {
			const entityDir = join(this.dataPath, entityType)
			const files = await readdir(entityDir)

			// Filter out query indices and subdirectories
			const entityFiles = files.filter(
				(file) => file.endsWith(".json") && file !== "unified-index.json" && !file.startsWith("query-")
			)

			// Decode URL-encoded filenames and remove .json extension
			const entityIds = entityFiles.map((file) => {
				const decoded = decodeURIComponent(file)
				return decoded.replace(/\.json$/, "")
			})

			return entityIds
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `No cached entities found for ${entityType}`)
			return []
		}
	}

	/**
	 * Search entities by name in cache
	 */
	async searchEntities(entityType: StaticEntityType, searchTerm: string): Promise<CachedEntity[]> {
		const entityIds = await this.listEntities(entityType)
		const results: CachedEntity[] = []

		const lowerSearchTerm = searchTerm.toLowerCase()

		for (const entityId of entityIds) {
			const entity = await this.loadEntity(entityType, entityId)
			if (entity?.display_name.toLowerCase().includes(lowerSearchTerm) === true) {
				results.push(entity)
			}
		}

		return results
	}

	/**
	 * Calculate size of entity directory in bytes
	 */
	async calculateEntityDirectorySize(entityType: string): Promise<number> {
		try {
			const entityDir = join(this.dataPath, entityType)
			const files = await readdir(entityDir)

			let totalSize = 0
			for (const file of files) {
				const filePath = join(entityDir, file)
				const fileStat = await stat(filePath)
				if (fileStat.isFile()) {
					totalSize += fileStat.size
				}
			}

			return totalSize
		} catch (error) {
			logError(logger, `Failed to calculate directory size for ${entityType}`, error, LOG_CONTEXT_GENERAL)
			return 0
		}
	}
}
