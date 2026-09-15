/**
 * Query Cache Service
 * Handles query result caching and query index management
 */

import { readdir, readFile } from "node:fs/promises"
import { join } from "node:path"

import { logError, logger } from "@bibgraph/utils/logger"

import { type StaticEntityType } from "../entity-detection.js"

const LOG_CONTEXT_GENERAL = "QueryCacheService"

// CLI-specific query index entry type
interface CLIQueryIndexEntry {
	url: string
	lastModified: string
	contentHash: string
}

interface CLIQueryIndex {
	queries: CLIQueryIndexEntry[]
}

/**
 * Narrows an unknown parsed value to {@link CLIQueryIndexEntry}.
 */
const isCLIQueryIndexEntry = (value: unknown): value is CLIQueryIndexEntry => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("url" in value) || !("lastModified" in value) || !("contentHash" in value)) {
		return false
	}
	return typeof value.url === "string" && typeof value.lastModified === "string" && typeof value.contentHash === "string"
}

/**
 * Narrows an unknown parsed value to {@link CLIQueryIndex}.
 */
const isCLIQueryIndex = (value: unknown): value is CLIQueryIndex => {
	if (typeof value !== "object" || value === null) {
		return false
	}
	if (!("queries" in value) || !Array.isArray(value.queries)) {
		return false
	}
	return value.queries.every(isCLIQueryIndexEntry)
}

/**
 * Service for managing cached query results
 */
export class QueryCacheService {
	constructor(private readonly dataPath: string) {}

	/**
	 * Load cached query result
	 */
	async loadQuery(entityType: StaticEntityType, queryUrl: string): Promise<unknown> {
		// First try to load from query index
		const indexedQuery = await this.tryLoadFromQueryIndex(entityType, queryUrl)
		if (indexedQuery !== undefined) {
			return indexedQuery
		}

		// Fallback to scanning directory for matching query file
		const scannedQuery = await this.scanDirectoryForQuery(entityType, queryUrl)
		if (scannedQuery !== undefined) {
			return scannedQuery
		}

		return undefined
	}

	/**
	 * Try to load query from query index
	 */
	private async tryLoadFromQueryIndex(
		entityType: StaticEntityType,
		queryUrl: string
	): Promise<unknown> {
		try {
			const queryIndexPath = join(this.dataPath, entityType, "query-index.json")
			const content = await readFile(queryIndexPath, "utf-8")
			const parsedIndex: unknown = JSON.parse(content)
			if (!isCLIQueryIndex(parsedIndex)) {
				return undefined
			}

			const isQueryEntry = parsedIndex.queries.some((q) => q.url === queryUrl)
			if (!isQueryEntry) {
				return undefined
			}

			const filename = encodeURIComponent(queryUrl) + ".json"
			const queryPath = join(this.dataPath, entityType, "queries", filename)

			const queryContent = await readFile(queryPath, "utf-8")
			const parsedQuery: unknown = JSON.parse(queryContent)
			return parsedQuery
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Query not found in index: ${queryUrl}`)
			return undefined
		}
	}

	/**
	 * Scan directory for query file matching URL
	 */
	private async scanDirectoryForQuery(
		entityType: StaticEntityType,
		queryUrl: string
	): Promise<unknown> {
		try {
			const queryDir = join(this.dataPath, entityType, "queries")
			const files = await readdir(queryDir)

			for (const file of files) {
				const result = await this.tryMatchQueryFile(queryDir, file, queryUrl)
				if (result !== undefined) {
					return result
				}
			}

			return undefined
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Query directory not found for ${entityType}`)
			return undefined
		}
	}

	/**
	 * Try to match query file by URL
	 */
	private async tryMatchQueryFile(
		queryDir: string,
		file: string,
		queryUrl: string
	): Promise<unknown> {
		if (!file.endsWith(".json")) {
			return undefined
		}

		const filename = decodeURIComponent(file.replace(/\.json$/, ""))
		if (filename === queryUrl) {
			return this.loadQueryFile(queryDir, file)
		}

		return undefined
	}

	/**
	 * Load query file from disk
	 */
	private async loadQueryFile(queryDir: string, file: string): Promise<unknown> {
		try {
			const queryPath = join(queryDir, file)
			return await this.loadQueryFileFromPath(queryPath)
		} catch (error) {
			logError(logger, `Failed to load query file: ${file}`, error, LOG_CONTEXT_GENERAL)
			return undefined
		}
	}

	/**
	 * Load query file from specific path
	 */
	private async loadQueryFileFromPath(filePath: string): Promise<unknown> {
		try {
			const content = await readFile(filePath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return parsed
		} catch (error) {
			logError(logger, `Failed to read query file: ${filePath}`, error, LOG_CONTEXT_GENERAL)
			return undefined
		}
	}

	/**
	 * Load query index for entity type
	 */
	async loadQueryIndex(entityType: StaticEntityType): Promise<CLIQueryIndex | null> {
		try {
			const queryIndexPath = join(this.dataPath, entityType, "query-index.json")
			const content = await readFile(queryIndexPath, "utf-8")
			const parsed: unknown = JSON.parse(content)
			return isCLIQueryIndex(parsed) ? parsed : null
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `Query index not found for ${entityType}`)
			return null
		}
	}

	/**
	 * Save query index for entity type
	 */
	async saveQueryIndex(entityType: StaticEntityType, queryIndex: CLIQueryIndex): Promise<void> {
		try {
			const { writeFile } = await import("node:fs/promises")
			const queryIndexPath = join(this.dataPath, entityType, "query-index.json")
			await writeFile(queryIndexPath, JSON.stringify(queryIndex, null, 2))
		} catch (error) {
			logError(logger, `Failed to save query index for ${entityType}`, error, LOG_CONTEXT_GENERAL)
		}
	}

	/**
	 * List all cached queries for entity type
	 */
	async listCachedQueries(entityType: StaticEntityType): Promise<
		{
			url: string
			lastModified: string
		}[]
	> {
		try {
			const queryIndex = await this.loadQueryIndex(entityType)
			if (!queryIndex) {
				return []
			}

			return queryIndex.queries.map((q) => ({
				url: q.url,
				lastModified: q.lastModified,
			}))
		} catch (error) {
			logError(logger, `Failed to list cached queries for ${entityType}`, error, LOG_CONTEXT_GENERAL)
			return []
		}
	}

	/**
	 * Scan query files from filesystem
	 */
	async scanQueryFilesFromFilesystem(entityType: StaticEntityType): Promise<
		{
			url: string
			lastModified: string
		}[]
	> {
		try {
			const queryDir = join(this.dataPath, entityType, "queries")
			const files = await readdir(queryDir)

			const queries: {
				url: string
				lastModified: string
			}[] = []

			for (const file of files) {
				const result = await this.processQueryFile(queryDir, file)
				if (result) {
					queries.push(result)
				}
			}

			return queries
		} catch {
			logger.debug(LOG_CONTEXT_GENERAL, `No query directory found for ${entityType}`)
			return []
		}
	}

	/**
	 * Process individual query file
	 */
	private async processQueryFile(
		queryDir: string,
		file: string
	): Promise<
		| {
				url: string
				lastModified: string
		  }
		| undefined
	> {
		if (!file.endsWith(".json")) {
			return undefined
		}

		try {
			const { stat } = await import("node:fs/promises")
			const queryPath = join(queryDir, file)
			const fileStat = await stat(queryPath)

			const url = decodeURIComponent(file.replace(/\.json$/, ""))
			return {
				url,
				lastModified: fileStat.mtime.toISOString(),
			}
		} catch (error) {
			logError(logger, `Failed to process query file: ${file}`, error, LOG_CONTEXT_GENERAL)
			return undefined
		}
	}
}
