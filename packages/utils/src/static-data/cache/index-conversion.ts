/**
 * Index Conversion Utilities
 * Provides conversion functions between DirectoryIndex and UnifiedIndex formats
 */

import { logger } from "../../logger.js"
import type { DirectoryIndex, FileEntry } from "./types.js"

const isRecord = (value: unknown): value is Record<string, unknown> =>
	typeof value === "object" && value !== null && !Array.isArray(value)

export interface UnifiedIndexEntry {
	$ref: string
	lastModified: string
	contentHash: string
}

export type UnifiedIndex = Record<string, UnifiedIndexEntry>

/**
 * Convert DirectoryIndex to UnifiedIndex format
 * Flattens the hierarchical DirectoryIndex structure into a flat map
 * suitable for CLI consumption
 */
export const directoryIndexToUnifiedIndex = (dirIndex: DirectoryIndex): UnifiedIndex => {
	const unified: UnifiedIndex = {}

	// Process all files in the directory index
	if (dirIndex.files) {
		for (const fileEntry of Object.values(dirIndex.files)) {
			// Use the primary URL as the key in the unified index
			const { url } = fileEntry
			if (url) {
				unified[url] = {
					$ref: fileEntry.$ref,
					lastModified: fileEntry.lastRetrieved,
					contentHash: fileEntry.contentHash,
				}
			}
		}
	}

	return unified
}

/**
 * Convert UnifiedIndex to DirectoryIndex format
 * Creates a hierarchical DirectoryIndex from a flat UnifiedIndex map
 */
export const unifiedIndexToDirectoryIndex = (unifiedIndex: UnifiedIndex): DirectoryIndex => {
	const files: Record<string, FileEntry> = {}

	// Convert each unified entry to a FileEntry
	for (const [url, entry] of Object.entries(unifiedIndex)) {
		// Extract the key from the $ref (filename without ./ prefix and .json extension)
		const key = entry.$ref.replace(/^\.\//, "").replace(/\.json$/, "")

		const fileEntry: FileEntry = {
			url,
			$ref: entry.$ref,
			lastRetrieved: entry.lastModified,
			contentHash: entry.contentHash,
		}

		files[key] = fileEntry
	}

	return {
		lastUpdated: new Date().toISOString(),
		files,
	}
}

/**
 * Check if an index is in UnifiedIndex format (flat structure)
 */
export const isUnifiedIndex = (index: unknown): index is UnifiedIndex => {
	// isRecord already rejects arrays; an empty array should not be considered a UnifiedIndex.
	if (!isRecord(index)) {
		return false
	}

	// Check if it has DirectoryIndex properties (lastUpdated, files, directories)
	if ("lastUpdated" in index || "files" in index || "directories" in index) {
		return false // This is a DirectoryIndex
	}

	// Check if all values are UnifiedIndexEntry-like
	for (const value of Object.values(index)) {
		if (!isRecord(value)) {
			return false
		}
		if (!("$ref" in value) || !("lastModified" in value) || !("contentHash" in value)) {
			return false
		}
	}

	return true
}

/**
 * Check if an index is in DirectoryIndex format (hierarchical structure)
 */
export const isDirectoryIndex = (index: unknown): index is DirectoryIndex => {
	if (!isRecord(index)) {
		return false
	}

	// DirectoryIndex must have lastUpdated
	if (!("lastUpdated" in index) || typeof index.lastUpdated !== "string") {
		return false
	}

	// If it has files or directories, they should be objects
	if ("files" in index && index.files !== null && typeof index.files !== "object") {
		return false
	}
	if ("directories" in index && index.directories !== null && typeof index.directories !== "object") {
		return false
	}

	return true
}

/**
 * Smart index reader that handles both formats
 * Automatically converts to the requested format
 */
export const readIndexAsUnified = (index: unknown): UnifiedIndex | null => {
	if (isUnifiedIndex(index)) {
		return index
	}

	if (isDirectoryIndex(index)) {
		return directoryIndexToUnifiedIndex(index)
	}

	logger.warn("cache", "Unknown index format", { index })
	return null
}

/**
 * Smart index reader that handles both formats
 * Automatically converts to the requested format
 */
export const readIndexAsDirectory = (index: unknown): DirectoryIndex | null => {
	if (isDirectoryIndex(index)) {
		return index
	}

	if (isUnifiedIndex(index)) {
		return unifiedIndexToDirectoryIndex(index)
	}

	logger.warn("cache", "Unknown index format", { index })
	return null
}
