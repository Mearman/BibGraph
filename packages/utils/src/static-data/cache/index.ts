/**
 * Static Data Cache Management
 * Unified logic for content hashing, URL mapping, and index management
 * Used by service worker, build plugins, and development cache middleware
 */

// Export all types
export * from "./types.js"

// Export core utilities
export { generateContentHash } from "./hash.js"
export { isCacheStorageType, getStaticDataCachePath, STATIC_DATA_CACHE_PATH } from "./constants.js"

// Export URL utilities
export { decodeFilename, encodeFilename, normalizeQueryForFilename, parseOpenAlexUrl, sanitizeUrlForCaching } from "./url.js"

// Export file path utilities
export { createCacheEntryMetadata, getCacheFilePath, getStaticFilePath, shouldUpdateCache } from "./file-path.js"

// Export validation utilities
export { extractEntityType, isValidOpenAlexEntity, isValidOpenAlexQueryResult } from "./validation.js"

// Export query utilities
export { filenameToQuery, queryToFilename } from "./query.js"

// Export collision handling
export {
	areUrlsEquivalentForCaching,
	hasCollision,
	isMultiUrlFileEntry,
	mergeCollision,
	migrateToMultiUrl,
	reconstructPossibleCollisions,
	validateFileEntry,
} from "./collision-handling.js"

// Export index conversion utilities
export {
	directoryIndexToUnifiedIndex,
	isDirectoryIndex,
	isUnifiedIndex,
	readIndexAsDirectory,
	readIndexAsUnified,
	unifiedIndexToDirectoryIndex,
} from "./index-conversion.js"
