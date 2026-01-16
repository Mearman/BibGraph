/**
 * Cache Constants and Type Guards
 *
 * Shared constants and validation utilities for cache operations.
 * Extracted from cache-utilities.ts for better organization.
 */

import * as path from "node:path"

import type { CacheStorageType } from "../../cache-browser/types.js"

/**
 * Type guard to validate CacheStorageType values
 * @param value - String to validate as a CacheStorageType
 * @returns True if the value is a valid CacheStorageType
 */
export const isCacheStorageType = (value: string): value is CacheStorageType => {
	const validCacheTypes: readonly string[] = [
		"works",
		"authors",
		"sources",
		"institutions",
		"topics",
		"publishers",
		"funders",
		"concepts",
		"keywords",
		"autocomplete",
		"domains",
		"fields",
		"subfields",
	]
	return validCacheTypes.includes(value)
}

/**
 * Static data cache path (relative to workspace root)
 */
export const STATIC_DATA_CACHE_PATH = "apps/web/public/data/openalex"

/**
 * Get the absolute path to the static data cache directory
 * @param projectRoot - Optional project root override (defaults to current working directory)
 * @returns Absolute path to the static data cache directory
 */
export const getStaticDataCachePath = (projectRoot?: string): string => {
	// In Node.js environments, we can try to detect the project root
	// For browser environments, this should be provided
	const root = projectRoot ?? process.cwd?.() ?? ""
	return path.join(root, STATIC_DATA_CACHE_PATH)
}
