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
 * Service for managing unified indices
 */
export class IndexManagementService {
	constructor(private dataPath: string) {}

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
			return JSON.parse(content) as CLIUnifiedIndex
		} catch (error) {
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
			if (!index || !index[entityId]) {
				return null
			}

			const entry = index[entityId]
			return {
				id: entityId,
				display_name: entry.$ref.split("/").pop() ?? entityId,
			}
		} catch (error) {
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
			return JSON.parse(content) as CLIUnifiedIndex
		} catch (error) {
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
		entry: CLIIndexEntry
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

					const entity = JSON.parse(content)
					if (entity.id) {
						const contentHash = this.generateContentHash(content)
						index[entity.id] = {
							$ref: entity.id,
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
		let hash = 0
		for (let i = 0; i < content.length; i++) {
			const char = content.charCodeAt(i)
			hash = (hash << 5) - hash + char
			hash = hash & hash // Convert to 32bit integer
		}
		return hash.toString(36)
	}
}
