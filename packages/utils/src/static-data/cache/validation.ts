/**
 * Validation Utilities
 *
 * Type guards and validation functions for OpenAlex entities and query results.
 * Provides runtime type checking for cached data structures.
 */

import type { CacheStorageType } from "../../cache-browser/types.js"
import { isCacheStorageType } from "./constants.js"
import { parseOpenAlexUrl } from "./url.js"

/**
 * Validate that data appears to be a valid OpenAlex entity
 * Checks for required fields (id, display_name)
 * @param data - Unknown data to validate
 * @returns True if data has expected OpenAlex entity structure
 */
export const isValidOpenAlexEntity = (data: unknown): boolean => {
	if (!data || typeof data !== "object") {
		return false
	}

	const obj = data as Record<string, unknown>

	// OpenAlex entities should have id and display_name
	return typeof obj.id === "string" && typeof obj.display_name === "string"
}

/**
 * Validate that data appears to be a valid OpenAlex query result
 * Checks for required fields (results array, meta object)
 * @param data - Unknown data to validate
 * @returns True if data has expected OpenAlex query result structure
 */
export const isValidOpenAlexQueryResult = (data: unknown): boolean => {
	if (!data || typeof data !== "object") {
		return false
	}

	const obj = data as Record<string, unknown>

	// OpenAlex query results should have results array and meta object
	return Array.isArray(obj.results) && typeof obj.meta === "object"
}

/**
 * Extract entity type from file path or URL
 * Handles both URLs (https://api.openalex.org/...) and file paths
 * @param pathOrUrl - File path or URL to extract entity type from
 * @returns CacheStorageType if found, null otherwise
 */
export const extractEntityType = (pathOrUrl: string): CacheStorageType | null => {
	// Handle URLs
	if (pathOrUrl.startsWith("http")) {
		const parsed = parseOpenAlexUrl(pathOrUrl)
		return parsed?.entityType ?? null
	}

	// Handle file paths
	const segments = pathOrUrl.split("/").filter(Boolean)

	for (const segment of segments) {
		if (isCacheStorageType(segment)) {
			return segment
		}
	}

	return null
}
