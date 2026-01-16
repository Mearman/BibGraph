/**
 * Cache Utilities Types
 * Type definitions for static data cache management
 */

import type { CacheStorageType } from "../../cache-browser/types.js"

/**
 * Metadata structure for cached files
 */
export interface CacheEntryMetadata {
	/** Content hash excluding volatile fields */
	contentHash: string
	/** When the file was last modified/cached */
	lastModified: string
	/** Original URL that generated this cache entry */
	sourceUrl?: string
	/** Content type of the cached data */
	contentType?: string
}

/**
 * File entry structure for cached API responses
 *
 * Supports both legacy single-URL format and enhanced multi-URL format for collision handling.
 * In the multi-URL format, multiple equivalent URLs (differing only in sensitive parameters
 * like api_key or mailto) map to the same cache file. This prevents data duplication while
 * preserving request history and enabling debugging of collision scenarios.
 *
 * Legacy entries (without equivalentUrls) are automatically migrated to the multi-URL format
 * when accessed by modern systems, ensuring backward compatibility without data loss.
 */
export interface FileEntry {
	/** Original API URL that generated this response (primary URL for this entry) */
	url: string
	/** Reference to the actual data file */
	$ref: string
	/** When the response was retrieved from the API (updated on content changes) */
	lastRetrieved: string
	/** Content hash excluding volatile metadata fields (used for change detection) */
	contentHash: string
	/**
	 * Array of equivalent URLs that all map to this same cache file.
	 * Includes the primary url as the first element. Equivalent URLs differ only in
	 * sensitive parameters (api_key, mailto) or normalized parameters (cursor=*).
	 * This field is optional for legacy compatibility; absent entries are treated as
	 * single-URL entries with [url] as the only equivalent.
	 */
	equivalentUrls?: string[]
	/**
	 * Timestamps when each equivalent URL was first associated with this entry.
	 * Keys are URLs from equivalentUrls, values are ISO timestamps.
	 * Ensures audit trail for collision detection and migration history.
	 * Optional for legacy compatibility.
	 */
	urlTimestamps?: Record<string, string>
	/**
	 * Summary statistics about URL collisions and merges for this entry.
	 * Tracks how many times this entry has been merged with colliding URLs,
	 * providing insights into cache efficiency and potential data conflicts.
	 * Optional for legacy compatibility; defaults to no collisions.
	 */
	collisionInfo?: CollisionInfo
}

/**
 * Information about URL collisions and merge history for a FileEntry.
 * Captures statistics for debugging cache behavior, migration analysis,
 * and understanding how multiple request variations map to the same data.
 *
 * Collision scenarios include:
 * - Different api_key parameters (stripped for caching but vary per request)
 * - Different mailto parameters (contact info, varies by user)
 * - Cursor pagination normalization (cursor=* for all paginated results)
 * - Parameter reordering (normalized alphabetically for consistency)
 *
 * This metadata has minimal performance impact as it's only stored in indexes,
 * not in the actual data files.
 */
export interface CollisionInfo {
	/** Number of times this entry has been merged with colliding URLs (increments on each new equivalent URL) */
	mergedCount: number
	/** Timestamp when the first collision was detected and merged (ISO string) */
	firstCollision?: string
	/** Timestamp of the most recent merge operation (ISO string) */
	lastMerge?: string
	/** Total number of unique equivalent URLs tracked for this entry */
	totalUrls: number
}

/**
 * Directory entry structure for subdirectories
 */
export interface DirectoryEntry {
	/** Reference to the subdirectory */
	$ref: string
	/** When the directory was last modified */
	lastModified: string
}

/**
 * Directory index structure - used by all systems
 */
export interface DirectoryIndex {
	/** When this index was last updated */
	lastUpdated: string
	/** Relative path from static data root (optional, used by root index) */
	path?: string
	/** Cached API responses in this directory */
	files?: Record<string, FileEntry>
	/** Subdirectories in this directory */
	directories?: Record<string, DirectoryEntry>
	/** Aggregated collision statistics from this directory and subdirectories */
	aggregatedCollisions?: {
		totalMerged: number
		lastCollision?: string
		totalWithCollisions: number
	}
}

/**
 * Parsed OpenAlex URL information
 */
export interface ParsedOpenAlexUrl {
	/** Path segments from URL */
	pathSegments: string[]
	/** Whether this is a query URL (has search params) */
	isQuery: boolean
	/** Query string including leading ? */
	queryString: string
	/** Detected entity type */
	entityType?: CacheStorageType
	/** Entity ID (for single entity URLs) */
	entityId?: string
}

/**
 * Unified index entry structure
 * Combines file and directory entries for simplified traversal
 */
export interface UnifiedIndexEntry {
	/** Entry type */
	type: "file" | "directory"
	/** File entry (if type is 'file') */
	file?: FileEntry
	/** Directory entry (if type is 'directory') */
	directory?: DirectoryEntry
}

/**
 * Unified index type for simplified index traversal
 */
export type UnifiedIndex = Record<string, UnifiedIndexEntry>
