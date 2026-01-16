/**
 * File Path Utilities for Static Data Cache
 *
 * Provides functions for generating cache file paths, static file paths,
 * and managing cache entry metadata.
 */

import type { FileEntry } from "./types.js"
import { logger } from "../../logger.js"
import {
	encodeFilename,
	generateContentHash,
	normalizeQueryForFilename,
	parseOpenAlexUrl,
	sanitizeUrlForCaching,
} from "../cache-utilities.js"

/**
 * Generate cache file path from OpenAlex URL
 * This is the canonical mapping used by all systems
 * @param root0
 * @param root0.url
 * @param root0.staticDataRoot
 */
export const getCacheFilePath = async ({
	url,
	staticDataRoot,
}: {
	url: string
	staticDataRoot: string
}): Promise<string | null> => {
	const parsed = parseOpenAlexUrl(url)
	if (!parsed) {
		return null
	}

	const { pathSegments, isQuery, queryString } = parsed

	try {
		if (isQuery) {
			return await generateQueryFilePath(pathSegments, queryString, staticDataRoot, url)
		}
		return generateEntityFilePath({ pathSegments, staticDataRoot })
	} catch (error) {
		logger.warn("cache", "Failed to generate cache file path", { url, error })
		return null
	}
}

const generateQueryFilePath = async (pathSegments: string[], queryString: string, staticDataRoot: string, url: string): Promise<string | null> => {
	// Normalize query string to remove sensitive information before caching
	const sanitized = sanitizeUrlForCaching(queryString.slice(1)) // Remove leading '?'
	const normalizedQuery = normalizeQueryForFilename(sanitized)

	// If all query parameters were stripped, treat this as a base collection URL
	if (!normalizedQuery || normalizedQuery === "?") {
		return generateBaseCollectionPath({ pathSegments, staticDataRoot })
	}

	// Handle actual query parameters - create query file
	const baseDir = pathSegments.join("/")
	const cleanQuery = normalizedQuery.startsWith("?") ? normalizedQuery.slice(1) : normalizedQuery
	const queryFilename = encodeFilename(cleanQuery)

	// Handle very long filenames that exceed filesystem limits
	const MAX_FILENAME_LENGTH = 240 // Leave some buffer below 255 char limit
	if (queryFilename.length > MAX_FILENAME_LENGTH) {
		// Skip caching for very long queries to avoid filesystem errors
		return null
	}

	// Ensure we have a valid filename for the query
	if (!queryFilename || queryFilename.trim() === "") {
		// This should not happen if normalization worked correctly
		logger.warn("cache", "Empty query filename after normalization", {
			url,
			normalizedQuery,
		})
		return generateBaseCollectionPath({ pathSegments, staticDataRoot })
	}

	return `${staticDataRoot}/${baseDir}/queries/${queryFilename}.json`
}

const generateEntityFilePath = ({
	pathSegments,
	staticDataRoot,
}: {
	pathSegments: string[]
	staticDataRoot: string
}): string | null => {
	if (pathSegments.length === 1) {
		// For root collections: /authors → authors.json (at top level)
		return `${staticDataRoot}/${pathSegments[0]}.json`
	}

	if (pathSegments.length === 2) {
		// For single entities: /authors/A123 → authors/A123.json
		const [entityType, entityId] = pathSegments
		return `${staticDataRoot}/${entityType}/${entityId}.json`
	}

	if (pathSegments.length > 2) {
		// For nested paths: /authors/A123/works → authors/A123/works.json
		const fileName = pathSegments[pathSegments.length - 1]
		const dirPath = pathSegments.slice(0, -1).join("/")
		return `${staticDataRoot}/${dirPath}/${fileName}.json`
	}

	return null
}

const generateBaseCollectionPath = ({
	pathSegments,
	staticDataRoot,
}: {
	pathSegments: string[]
	staticDataRoot: string
}): string => {
	if (pathSegments.length === 1) {
		return `${staticDataRoot}/${pathSegments[0]}.json`
	}

	// For nested paths without meaningful query params
	const fileName = pathSegments[pathSegments.length - 1]
	const dirPath = pathSegments.slice(0, -1).join("/")
	return `${staticDataRoot}/${dirPath}/${fileName}.json`
}

/**
 * Generate static file path for service worker
 * Maps OpenAlex URLs to static file paths for production serving
 * @param url
 */
export const getStaticFilePath = async (url: string): Promise<string> => {
	const parsed = parseOpenAlexUrl(url)
	if (!parsed) {
		return `/data/openalex${new URL(url).pathname}.json`
	}

	// Use the same logic as cache file path but with /data/openalex prefix
	const cacheFilePath = await getCacheFilePath({ url, staticDataRoot: "" })
	return `/data/openalex${cacheFilePath}`
}

/**
 * Determine if cached content needs updating based on content hash
 * @param root0
 * @param root0.existingMetadata
 * @param root0.newData
 * @param root0.maxAge
 */
export const shouldUpdateCache = async ({
	existingMetadata,
	newData,
	maxAge,
}: {
	existingMetadata: { contentHash: string; lastModified: string } | null
	newData: unknown
	maxAge?: number
}): Promise<boolean> => {
	if (!existingMetadata) {
		return true // No existing cache
	}

	// Check content hash
	const newContentHash = await generateContentHash(newData)
	if (existingMetadata.contentHash !== newContentHash) {
		return true // Content has changed
	}

	// Check age if specified
	if (maxAge) {
		const lastModified = new Date(existingMetadata.lastModified)
		const ageMs = Date.now() - lastModified.getTime()
		if (ageMs > maxAge) {
			return true // Content is too old
		}
	}

	return false // Cache is still valid
}

/**
 * Create cache entry metadata for new cached content
 * @param root0
 * @param root0.data
 * @param root0.sourceUrl
 * @param root0.contentType
 */
export const createCacheEntryMetadata = async ({
	data,
	sourceUrl,
	contentType,
}: {
	data: unknown
	sourceUrl?: string
	contentType?: string
}): Promise<{
	contentHash: string
	lastModified: string
	sourceUrl?: string
	contentType?: string
}> => ({
	contentHash: await generateContentHash(data),
	lastModified: new Date().toISOString(),
	sourceUrl,
	contentType,
})
