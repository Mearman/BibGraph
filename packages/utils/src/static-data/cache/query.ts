/**
 * Query/Filename Conversion Utilities
 * Functions for converting between query strings and filesystem-safe filenames
 * Used by static data cache management for file naming consistency
 */

import { logger } from "../../logger.js"

const HEX_RADIX = 16

/**
 * Normalize query string for consistent filename generation
 *
 * This function:
 * - Removes leading "?" for processing
 * - Normalizes cursor values to "*" for consistency
 * - Sorts parameters alphabetically for deterministic ordering
 * - URL encodes parameter values for filesystem safety
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

		const parameters = new URLSearchParams(cleanQuery)

		// Normalize cursor values to "*" for consistency
		if (parameters.has("cursor")) {
			parameters.set("cursor", "*")
		}

		// Sort parameters alphabetically for consistent ordering
		const sortedParameters = new URLSearchParams()
		const keys: string[] = [...parameters.keys()].sort()
		for (const key of keys) {
			const value = parameters.get(key)
			if (value !== null) {
				sortedParameters.set(key, value)
			}
		}

		const result = sortedParameters.toString()
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
			(char) => `__${char.charCodeAt(0).toString(HEX_RADIX).toUpperCase()}__`
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
			(char) => `__${char.charCodeAt(0).toString(HEX_RADIX).toUpperCase()}__`
		)
	}
};

/**
 * Decode filename by converting hex codes back to original characters
 * Reverses the encoding done by encodeFilename
 */
export const decodeFilename = (filename: string): string => filename.replaceAll(/__([0-9A-F]+)__/g, (match, hex) => {
	const hexString = String(hex)
	const codePoint = Number.parseInt(hexString, HEX_RADIX)
	return String.fromCharCode(codePoint)
});

/**
 * Convert query string to filesystem-safe filename
 * Combines normalization and encoding for cache file naming
 */
export const queryToFilename = (queryString: string): string => {
	if (!queryString) return ""

	// Remove leading ? if present
	const cleanQuery = queryString.startsWith("?") ? queryString.slice(1) : queryString
	if (!cleanQuery) return ""

	// Normalize for consistent naming
	const normalized = normalizeQueryForFilename(`?${cleanQuery}`)
	const normalizedClean = normalized.startsWith("?") ? normalized.slice(1) : normalized

	// Encode for filesystem safety
	return encodeFilename(normalizedClean)
};

/**
 * Convert filesystem filename back to query string
 * Reverses the queryToFilename transformation
 */
export const filenameToQuery = (filename: string): string => {
	if (!filename) return ""

	// Decode from filesystem-safe format
	const decoded = decodeFilename(filename)

	// Add leading ? if we have content
	return decoded ? `?${decoded}` : ""
};
