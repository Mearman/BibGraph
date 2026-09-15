/**
 * Index Management Service
 * Handles unified index operations and static data detection
 */

import { mkdir, readdir, readFile, stat, writeFile } from "node:fs/promises"
import { join } from "node:path"

import { logError, logger } from "@bibgraph/utils/logger"

import { type StaticEntityType } from "../entity-detection.js"

const LOG_CONTEXT_GENERAL = "IndexManagementService"

// CLI-specific index entry type (simpler than utils package format)
export interface CLIIndexEntry {
	$ref: string
	lastModified: string
	contentHash: string
}

// CLI-specific unified index type
export type CLIUnifiedIndex = Record<string, CLIIndexEntry>

/**
 * Narrows an unknown parsed value to {@link CLIIndexEntry}.
 */
const isCLIIndexEntry = (value: unknown): value is CLIIndexEntry => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("$ref" in value) || !("lastModified" in value) || !("contentHash" in value)) {
		return false
	}
	return (
		typeof value.$ref === "string" && typeof value.lastModified === "string" && typeof value.contentHash === "string"
	)
}

/**
 * Narrows an unknown parsed value to {@link CLIUnifiedIndex}: a plain object whose every value is a valid {@link CLIIndexEntry}.
 */
const isCLIUnifiedIndex = (value: unknown): value is CLIUnifiedIndex => {
	if (typeof value !== "object" || value === null || Array.isArray(value)) {
		return false
	}
	return Object.values(value).every(isCLIIndexEntry)
}

/**
 * Narrows an unknown parsed value to an object carrying a string `id` field.
 */
const isEntityWithId = (value: unknown): value is { id: string } => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("id" in value)) {
		return false
	}
	return typeof value.id === "string"
}

/**
 * Service for managing unified indices
 */
export class IndexManagementService {
	constructor(private readonly dataPath: string) {}

	/**
	 * Check if static data exists for entity type
	 */
	async hasStaticData(entityType: StaticEntityType): Promise<boolean> {
		try {
			const indexPath = join(this.dataPath, entityType, "unified-index.json")
			await stat(indexPath)
			return true
		} catch {
			return false
		}
	}

	/**
	 * Load index for entity type
	 */
	async loadIndex(entityType: StaticEntityType): Promise<CLIUnifiedIndex | null> {
		try {
			const indexPath = join(this.dataPath, entityType, "unified-index.json")
			const content = await readFile(indexPath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return isCLIUnifiedIndex(parsed) ? parsed : null
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Index not found for ${entityType}`)
			return null
		}
	}

	/**
	 * Get entity summary from index
	 */
	async getEntitySummary(
		entityType: StaticEntityType,
		entityId: string
	): Promise<{ id: string; display_name: string } | null> {
		try {
			const index = await this.loadUnifiedIndex(entityType)
			if (index === null || !(entityId in index)) {
				return null
			}

			const entry = index[entityId]
			return {
				id: entityId,
				display_name: entry.$ref.split("/").pop() ?? entityId,
			}
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Entity summary not found: ${entityType}/${entityId}`)
			return null
		}
	}

	/**
	 * Load unified index for entity type
	 */
	async loadUnifiedIndex(entityType: StaticEntityType): Promise<CLIUnifiedIndex | null> {
		try {
			const indexPath = join(this.dataPath, entityType, "unified-index.json")
			const content = await readFile(indexPath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return isCLIUnifiedIndex(parsed) ? parsed : null
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Unified index not found for ${entityType}`)
			return null
		}
	}

	/**
	 * Save unified index for entity type
	 */
	async saveUnifiedIndex(entityType: StaticEntityType, index: CLIUnifiedIndex): Promise<void> {
		try {
			await mkdir(join(this.dataPath, entityType), { recursive: true })
			const indexPath = join(this.dataPath, entityType, "unified-index.json")
			await writeFile(indexPath, JSON.stringify(index, null, 2))
		} catch (error) {
			logError(logger, `Failed to save unified index for ${entityType}`, error, LOG_CONTEXT_GENERAL)
			throw error
		}
	}

	/**
	 * Update unified index with new entry
	 */
	async updateUnifiedIndex(
		entityType: StaticEntityType,
		canonicalUrl: string,
		entry: Readonly<CLIIndexEntry>
	): Promise<void> {
		try {
			const index = await this.loadUnifiedIndex(entityType)

			if (index) {
				index[canonicalUrl] = entry
				await this.saveUnifiedIndex(entityType, index)
			}
		} catch (error) {
			logError(
				logger,
				`Failed to update unified index for ${entityType}/${canonicalUrl}`,
				error,
				LOG_CONTEXT_GENERAL
			)
			throw error
		}
	}

	/**
	 * Rebuild unified index from existing entity files
	 */
	async rebuildUnifiedIndex(entityType: StaticEntityType): Promise<void> {
		try {
			const entityDir = join(this.dataPath, entityType)
			const files = await readdir(entityDir)
			const index: CLIUnifiedIndex = {}

			for (const file of files) {
				if (!file.endsWith(".json") || file === "unified-index.json" || file.startsWith("query-")) {
					continue
				}

				try {
					const filePath = join(entityDir, file)
					const fileStat = await stat(filePath)
					const content = await readFile(filePath, "utf-8")

					const parsedEntity: unknown = JSON.parse(content)
					if (isEntityWithId(parsedEntity)) {
						const contentHash = this.generateContentHash(content)
						index[parsedEntity.id] = {
							$ref: parsedEntity.id,
							lastModified: fileStat.mtime.toISOString(),
							contentHash,
						}
					}
				} catch {
					// Skip invalid files
					continue
				}
			}

			await this.saveUnifiedIndex(entityType, index)
		} catch (error) {
			logError(logger, `Failed to rebuild unified index for ${entityType}`, error, LOG_CONTEXT_GENERAL)
			throw error
		}
	}

	/**
	 * Generate content hash
	 */
	private generateContentHash(content: string): string {
		const HASH_SHIFT_BITS = 5
		const HASH_STRING_RADIX = 36

		let hash = 0
		for (let index = 0; index < content.length; index++) {
			const char = content.charCodeAt(index)
			hash = (hash << HASH_SHIFT_BITS) - hash + char
			hash &= hash // Convert to 32bit integer
		}
		return hash.toString(HASH_STRING_RADIX)
	}
}
