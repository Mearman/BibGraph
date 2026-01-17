/**
 * Static Data Cache Management
 * Unified logic for content hashing, URL mapping, and index management
 * Used by service worker, build plugins, and development cache middleware
 */

// Export all types
export * from "./types"

// Export core utilities
export { generateContentHash } from "./hash"
export { isCacheStorageType, getStaticDataCachePath, STATIC_DATA_CACHE_PATH } from "./constants"

// Export URL utilities
export { decodeFilename, encodeFilename, normalizeQueryForFilename, parseOpenAlexUrl, sanitizeUrlForCaching } from "./url"

// Export file path utilities
export { createCacheEntryMetadata, getCacheFilePath, getStaticFilePath, shouldUpdateCache } from "./file-path"

// Export validation utilities
export { extractEntityType, isValidOpenAlexEntity, isValidOpenAlexQueryResult } from "./validation"

// Export query utilities
export { filenameToQuery, queryToFilename } from "./query"

// Export collision handling
export {
	areUrlsEquivalentForCaching,
	hasCollision,
	isMultiUrlFileEntry,
	mergeCollision,
	migrateToMultiUrl,
	reconstructPossibleCollisions,
	validateFileEntry,
} from "./collision-handling"

// Export index conversion utilities
export {
	directoryIndexToUnifiedIndex,
	isDirectoryIndex,
	isUnifiedIndex,
	readIndexAsDirectory,
	readIndexAsUnified,
	unifiedIndexToDirectoryIndex,
} from "./index-conversion"
