/**
 * URL Parsing and Normalization Utilities
 *
 * Provides utilities for parsing, sanitizing, and normalizing OpenAlex URLs
 * for consistent caching and file system operations.
 */

import type { ParsedOpenAlexUrl } from "./types.js"
import { isCacheStorageType } from "./constants.js"
import { logger } from "../../logger.js"
import type { CacheStorageType } from "../../cache-browser/types.js"

/**
 * Parse OpenAlex URL into structured information
 * @param url
 */
export const parseOpenAlexUrl = (url: string): ParsedOpenAlexUrl | null => {
	if (typeof url !== "string" || url.trim().length === 0) {
		logger.warn("cache", "Invalid URL input for parsing", { url: typeof url })
		return null
	}

	// Basic validation: must start with http(s)://
	if (!url.startsWith("http://") && !url.startsWith("https://")) {
		logger.warn("cache", "URL does not start with http(s)://", { url })
		return null
	}

	try {
		const urlObj = new URL(url)

		// Only handle api.openalex.org URLs
		if (urlObj.hostname !== "api.openalex.org") {
			return null
		}

		const pathSegments = urlObj.pathname.split("/").filter(Boolean)

		if (pathSegments.length === 0) {
			return null
		}

		// Detect entity type from first path segment
		const potentialEntityType = pathSegments[0]

		const entityType: CacheStorageType | undefined = isCacheStorageType(potentialEntityType)
			? potentialEntityType
			: undefined

		// Invalid entity types should return null
		if (!entityType) {
			return null
		}

		// Extract entity ID for single entity URLs
		let entityId: string | undefined
		if (pathSegments.length >= 2) {
			const entityIdCandidate = pathSegments[1]

			const decodeSegment = (segment: string): string => {
				try {
					return decodeURIComponent(segment)
				} catch {
					return segment
				}
			}

			const decodedCandidate = decodeSegment(entityIdCandidate)
			const isOpenAlexId =
				/^[A-Z]\d+$/i.test(entityIdCandidate) || /^[A-Z]\d+$/i.test(decodedCandidate)
			const isOpenAlexUrl =
				/^https?:\/\/openalex\.org\/[A-Z]\d+$/i.test(decodedCandidate) ||
				/^https%3A%2F%2Fopenalex\.org%2F[A-Z]\d+$/i.test(entityIdCandidate)
			const isOrcidId =
				/^(?:\d{4}-){3}\d{3}[0-9X]$/i.test(decodedCandidate) ||
				/^https?:\/\/orcid\.org\/(?:\d{4}-){3}\d{3}[0-9X]$/i.test(decodedCandidate) ||
				/^orcid:(?:\d{4}-){3}\d{3}[0-9X]$/i.test(decodedCandidate) ||
				/^https%3A%2F%2Forcid\.org%2F(?:\d{4}-){3}\d{3}[0-9X]$/i.test(entityIdCandidate)

			if (isOpenAlexId || isOpenAlexUrl || isOrcidId) {
				entityId = entityIdCandidate
			}
		}

		return {
			pathSegments,
			isQuery: !!urlObj.search,
			queryString: urlObj.search,
			entityType,
			entityId,
		}
	} catch (error) {
		logger.warn("cache", "Failed to parse OpenAlex URL", { url, error })
		return null
	}
};

/**
 * Remove sensitive parameters from URL query string for caching
 * Strips api_key and mailto parameters completely from the query
 * Handles both query-only strings (?param=value) and path+query strings (/path?param=value)
 * @param urlString
 */
export const sanitizeUrlForCaching = (urlString: string): string => {
	if (!urlString) return urlString

	// Handle both full URLs with ? and query-only strings
	const hasPath = urlString.includes("?")
	let path = ""
	let query = ""

	if (hasPath) {
		;[path, query] = urlString.split("?", 2)
	} else {
		query = urlString
	}

	// Split by & and filter out sensitive parameters
	const paramPairs = query.split("&")
	const filteredParams: string[] = []
	for (const param of paramPairs) {
		const key = param.split("=")[0]
		if (key !== "api_key" && key !== "mailto") {
			filteredParams.push(param)
		}
	}

	const sanitizedQuery = filteredParams.join("&")

	// Reconstruct the result
	if (hasPath) {
		return sanitizedQuery ? `${path}?${sanitizedQuery}` : path
	} else {
		return sanitizedQuery
	}
};

/**
 * Normalize query string for consistent filename generation
 * - Normalizes cursor values to "*" for pagination consistency
 * - Sorts parameters alphabetically for deterministic ordering
 * - URL encodes parameter values for filesystem safety
 * @param queryString
 */
export const normalizeQueryForFilename = (queryString: string): string => {
	if (!queryString || queryString === "?") {
		return ""
	}

	try {
		// Remove leading ? if present
		const cleanQuery = queryString.startsWith("?") ? queryString.slice(1) : queryString

		if (!cleanQuery) {
			return ""
		}

		const params = new URLSearchParams(cleanQuery)

		// Normalize cursor values to "*" for consistency
		if (params.has("cursor")) {
			params.set("cursor", "*")
		}

		// Sort parameters alphabetically for consistent ordering
		const sortedParams = new URLSearchParams()
		const keys: string[] = [...params.keys()].sort()
		for (const key of keys) {
			const value = params.get(key)
			if (value !== null) {
				sortedParams.set(key, value)
			}
		}

		const result = sortedParams.toString()
		return result ? `?${result}` : ""
	} catch (error) {
		logger.warn("cache", "Failed to normalize query for filename", {
			queryString,
			error,
		})
		return queryString // Return original on error
	}
};

/**
 * Encode filename by replacing problematic characters with hex codes
 * Uses format __XX__ where XX is the hex code of the character
 *
 * This encoding:
 * 1. First decodes any URL encoding (%XX) to get original characters
 * 2. Then encodes filesystem-unsafe and URL-special characters to __XX__ format
 * 3. Provides unified encoding format across all special characters
 *
 * This is reversible and creates consistent filenames regardless of input format
 * @param filename
 */
export const encodeFilename = (filename: string): string => {
	if (typeof filename !== "string") {
		logger.warn("cache", "Invalid filename input for encoding", {
			filename: typeof filename,
		})
		return ""
	}

	if (filename.length === 0) {
		return ""
	}

	try {
		// First decode any URL encoding to get original characters
		// This handles cases where input is already URL-encoded (e.g., "filter%3Ayear%3A2020")
		const decoded = decodeURIComponent(filename)

		// Then encode all special characters with hex format
		// Encodes: filesystem-unsafe (<>"|*?/\) + URL-special (:=%&+,)
		return decoded.replaceAll(
			/["%&*+,/:<=>?\\|]/g,
			(char) => `__${char.charCodeAt(0).toString(16).toUpperCase()}__`
		)
	} catch (error) {
		// Fallback if decoding fails (e.g., malformed URL encoding)
		// Just encode filesystem-unsafe characters
		logger.warn("cache", "Failed to decode URL encoding in filename, using fallback", {
			filename,
			error,
		})
		return filename.replaceAll(
			/["*/<>?\\|]/g,
			(char) => `__${char.charCodeAt(0).toString(16).toUpperCase()}__`
		)
	}
};

/**
 * Decode filename by converting hex codes back to original characters
 * Reverses the encoding done by encodeFilename
 * @param filename
 */
export const decodeFilename = (filename: string): string => filename.replaceAll(/__([0-9A-F]+)__/g, (match, hex) => {
	const hexStr = String(hex)
	const codePoint = Number.parseInt(hexStr, 16)
	return String.fromCharCode(codePoint)
});
