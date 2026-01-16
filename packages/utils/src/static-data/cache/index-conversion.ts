/**
 * Index Conversion Utilities
 * Provides conversion functions between DirectoryIndex and UnifiedIndex formats
 */

import { logger } from "../../logger.js"
import type { DirectoryIndex, FileEntry } from "./types.js"

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
 * @param dirIndex
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
 * @param unifiedIndex
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
 * @param index
 */
export const isUnifiedIndex = (index: unknown): index is UnifiedIndex => {
	if (!index || typeof index !== "object") {
		return false
	}

	// Explicitly reject arrays; an empty array should not be considered a UnifiedIndex.
	if (Array.isArray(index)) return false

	// UnifiedIndex is a flat object with string keys mapping to entries with $ref, lastModified, contentHash
	const obj = index as Record<string, unknown>

	// Check if it has DirectoryIndex properties (lastUpdated, files, directories)
	if ("lastUpdated" in obj || "files" in obj || "directories" in obj) {
		return false // This is a DirectoryIndex
	}

	// Check if all values are UnifiedIndexEntry-like
	for (const value of Object.values(obj)) {
		if (!value || typeof value !== "object") {
			return false
		}
		const entry = value as Record<string, unknown>
		if (!("$ref" in entry) || !("lastModified" in entry) || !("contentHash" in entry)) {
			return false
		}
	}

	return true
}

/**
 * Check if an index is in DirectoryIndex format (hierarchical structure)
 * @param index
 */
export const isDirectoryIndex = (index: unknown): index is DirectoryIndex => {
	if (!index || typeof index !== "object") {
		return false
	}

	const obj = index as Record<string, unknown>

	// DirectoryIndex must have lastUpdated
	if (!("lastUpdated" in obj) || typeof obj.lastUpdated !== "string") {
		return false
	}

	// If it has files or directories, they should be objects
	if ("files" in obj && obj.files !== null && typeof obj.files !== "object") {
		return false
	}
	if ("directories" in obj && obj.directories !== null && typeof obj.directories !== "object") {
		return false
	}

	return true
}

/**
 * Smart index reader that handles both formats
 * Automatically converts to the requested format
 * @param index
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
 * @param index
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
