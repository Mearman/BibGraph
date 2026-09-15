/**
 * Entity URL Detection Utilities
 *
 * This module provides utilities for detecting entity types and extracting IDs from URLs.
 * It handles various URL formats including full URLs, pathnames, and hash routes.
 * @example
 * ```typescript
 * import {
 *   detectEntityTypeFromURL,
 *   extractEntityId,
 *   isEntityPage,
 *   parseEntityUrl,
 * } from '@bibgraph/utils';
 *
 * // Detect entity type from URL
 * const entityType = detectEntityTypeFromURL('/works/W1234567890');
 * // => 'works'
 *
 * // Extract entity ID
 * const entityId = extractEntityId('/works/W1234567890', 'works');
 * // => 'W1234567890'
 *
 * // Check if URL is an entity page
 * const isEntity = isEntityPage('/works/W1234567890');
 * // => true
 *
 * // Parse URL in one operation
 * const { entityType, entityId } = parseEntityUrl('/works/W1234567890');
 * // => { entityType: 'works', entityId: 'W1234567890' }
 * ```
 */

import type { EntityType } from "@bibgraph/types"

/**
 * Entity URL path patterns for different entity types
 * Matches paths like /works/, /authors/, etc.
 */
const ENTITY_PATH_PATTERNS: Record<EntityType, RegExp> = {
	works: /\/works\//i,
	authors: /\/authors\//i,
	sources: /\/sources\//i,
	institutions: /\/institutions\//i,
	publishers: /\/publishers\//i,
	funders: /\/funders\//i,
	topics: /\/topics\//i,
	concepts: /\/concepts\//i,
	keywords: /\/keywords\//i,
	domains: /\/domains\//i,
	fields: /\/fields\//i,
	subfields: /\/subfields\//i,
}

/**
 * Entity ID extraction patterns
 * Matches the ID segment after the entity type path
 */
const ENTITY_ID_PATTERNS: Record<EntityType, RegExp> = {
	works: /\/works\/([A-Z]\d+)/i,
	authors: /\/authors\/(A\d+)/i,
	sources: /\/sources\/(S\d+)/i,
	institutions: /\/institutions\/(I\d+)/i,
	publishers: /\/publishers\/(P\d+)/i,
	funders: /\/funders\/(F\d+)/i,
	topics: /\/topics\/(T\d+)/i,
	concepts: /\/concepts\/(C\d+)/i,
	keywords: /\/keywords\/(K\d+)/i,
	domains: /\/domains\/(\d+)/i,
	fields: /\/fields\/(\d+)/i,
	subfields: /\/subfields\/(\d+)/i,
}

/**
 * Query path patterns that should NOT be treated as entity pages
 */
const QUERY_PATH_PATTERNS = [
	/\/works\?/i,
	/\/authors\?/i,
	/\/sources\?/i,
	/\/institutions\?/i,
	/\/publishers\?/i,
	/\/funders\?/i,
	/\/topics\?/i,
	/\/concepts\?/i,
	/\/keywords\?/i,
	/\/works$/i,
	/\/authors$/i,
	/\/sources$/i,
	/\/institutions$/i,
	/\/publishers$/i,
	/\/funders$/i,
	/\/topics$/i,
	/\/concepts$/i,
	/\/keywords$/i,
]

const isEntityType = (value: string): value is EntityType => value in ENTITY_PATH_PATTERNS

/**
 * Normalizes a URL string by removing hash fragments and ensuring proper format
 * @param urlString - URL string to normalize (may be partial path or full URL)
 * @returns Normalized pathname string
 * @example normalizeUrl("https://example.com/works/W123#section") // "/works/W123" normalizeUrl("#/works/W123") // "/works/W123" normalizeUrl("/works/W123") // "/works/W123"
 */
const normalizeUrl = (urlString: string): string => {
	try {
		// Remove hash prefix if present
		let normalized = urlString.startsWith("#") ? urlString.slice(1) : urlString

		// Try parsing as URL if it looks like a full URL
		if (normalized.startsWith("http://") || normalized.startsWith("https://")) {
			const url = new URL(normalized)
			normalized = url.pathname
		}

		// Remove any remaining hash fragments
		normalized = normalized.split("#", 1)[0]

		// Ensure leading slash
		if (!normalized.startsWith("/")) {
			normalized = `/${normalized}`
		}

		return normalized
	} catch {
		// If URL parsing fails, try to extract pathname-like segment
		const cleaned = urlString.replace(/^#/, "").split("#", 1)[0].split("?", 1)[0]
		return cleaned.startsWith("/") ? cleaned : `/${cleaned}`
	}
};

/**
 * Detects entity type from a URL string
 * @param urlString - URL string (can be full URL, pathname, or hash route)
 * @returns EntityType if URL matches an entity page pattern, undefined otherwise
 * @example
 * detectEntityTypeFromURL("https://api.openalex.org/works/W1234") // "works"
 * detectEntityTypeFromURL("/authors/A5678") // "authors"
 * detectEntityTypeFromURL("#/sources/S9012") // "sources"
 * detectEntityTypeFromURL("/works?filter=...") // undefined (query page)
 * detectEntityTypeFromURL("/search") // undefined (not an entity page)
 */
export const detectEntityTypeFromURL = (urlString: string): EntityType | undefined => {
	const pathname = normalizeUrl(urlString)

	// Check if it's a query page (should NOT be treated as entity page)
	const isQueryPage = QUERY_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
	if (isQueryPage) {
		return undefined
	}

	// Check each entity type pattern
	for (const [entityType, pattern] of Object.entries(ENTITY_PATH_PATTERNS)) {
		if (pattern.test(pathname) && isEntityType(entityType)) {
			return entityType
		}
	}

	return undefined
};

/**
 * Extracts entity ID from a URL string for a given entity type
 * @param urlString - URL string containing the entity ID
 * @param entityType - Expected entity type to extract ID for
 * @returns OpenAlex ID if found, undefined otherwise
 * @example
 * extractEntityId("/works/W1234567890", "works") // "W1234567890"
 * extractEntityId("https://api.openalex.org/authors/A123", "authors") // "A123"
 * extractEntityId("#/sources/S456?select=id", "sources") // "S456"
 * extractEntityId("/works/W123", "authors") // undefined (wrong entity type)
 * extractEntityId("/works", "works") // undefined (no ID in URL)
 */
export const extractEntityId = (urlString: string, entityType: EntityType): string | undefined => {
	const pathname = normalizeUrl(urlString)
	const pattern = ENTITY_ID_PATTERNS[entityType]

	const match = pathname.match(pattern)
	return match?.[1]
};

/**
 * Checks if a URL represents an entity page (not a query/listing page)
 * @param urlString - URL string to check
 * @returns true if URL matches an entity page pattern with an ID
 * @example
 * isEntityPage("/works/W1234") // true
 * isEntityPage("/authors/A5678") // true
 * isEntityPage("/works") // false (query/listing page)
 * isEntityPage("/works?filter=...") // false (query page)
 * isEntityPage("/search") // false (not an entity route)
 */
export const isEntityPage = (urlString: string): boolean => {
	const pathname = normalizeUrl(urlString)

	// Check if it's a query page first
	const isQueryPage = QUERY_PATH_PATTERNS.some((pattern) => pattern.test(pathname))
	if (isQueryPage) {
		return false
	}

	// Check if any entity ID pattern matches
	return Object.values(ENTITY_ID_PATTERNS).some((pattern) => pattern.test(pathname))
};

/**
 * Extracts both entity type and ID from a URL in a single operation
 * @param urlString - URL string to parse
 * @returns Object with entityType and entityId if found, or both undefined
 * @example
 * ```typescript
 * parseEntityUrl("/works/W123") // { entityType: "works", entityId: "W123" }
 * parseEntityUrl("/authors/A456") // { entityType: "authors", entityId: "A456" }
 * parseEntityUrl("/works") // { entityType: undefined, entityId: undefined }
 * parseEntityUrl("/search") // { entityType: undefined, entityId: undefined }
 * ```
 */
export const parseEntityUrl = (urlString: string): {
	entityType: EntityType | undefined
	entityId: string | undefined
} => {
	const entityType = detectEntityTypeFromURL(urlString)
	if (!entityType) {
		return { entityType: undefined, entityId: undefined }
	}

	const entityId = extractEntityId(urlString, entityType)
	return { entityType, entityId }
};
