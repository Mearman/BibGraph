/**
 * URL Parameter Extraction Utility
 *
 * Provides functions for parsing OpenAlex API URLs, extracting query parameters,
 * and reconstructing URLs with proper encoding. Handles the OpenAlex-specific
 * requirement that `select` parameter commas must NOT be URL-encoded.
 */

import type { EntityType } from "@bibgraph/types"

import { inferEntityTypeFromOpenAlexId } from "./entity-type-inference"

/**
 * Parsed URL structure containing all relevant components
 */
export interface ParsedURL {
	/**
	Original full URL string
	 */
	url: string
	/**
	Base path without query parameters
	 */
	basePath: string
	/**
	All query parameters as key-value pairs
	 */
	queryParams: Record<string, string>
	/**
	Parsed select fields (if select parameter exists)
	 */
	selectFields: string[]
	/**
	Detected entity type from URL pattern (if present)
	 */
	entityType: EntityType | null
	/**
	Extracted entity ID (if present in URL path)
	 */
	entityId: string | null
}

/**
 * Entity type patterns in URL paths
 * Maps URL segments to EntityType values
 */
const URL_ENTITY_PATTERNS: Record<string, EntityType> = {
	works: "works",
	authors: "authors",
	sources: "sources",
	institutions: "institutions",
	topics: "topics",
	concepts: "concepts",
	publishers: "publishers",
	funders: "funders",
	keywords: "keywords",
}

/**
 * Extracts select fields from a URL or select parameter string
 *
 * Handles comma-separated field names and returns them as an array.
 * Trims whitespace from each field name.
 * @param input - Full URL string or just the select parameter value
 * @returns Array of field names, empty array if no select parameter found
 * @example
 * ```typescript
 * extractSelectFields("id,display_name,cited_by_count")
 * // Returns: ["id", "display_name", "cited_by_count"]
 *
 * extractSelectFields("https://api.openalex.org/works?select=id,title")
 * // Returns: ["id", "title"]
 *
 * extractSelectFields("https://api.openalex.org/works")
 * // Returns: []
 * ```
 */
export const extractSelectFields = (input: string): string[] => {
	let selectValue: string | null = null

	// Check if input looks like a URL (has protocol or query string)
	if (input.includes("://") || input.includes("?")) {
		try {
			const url = new URL(input.startsWith("http") ? input : `https://${input}`)
			selectValue = url.searchParams.get("select")
		} catch {
			// If URL parsing fails, return empty array
			return []
		}
	} else if (input.startsWith("/")) {
		// Input is a path without query string, no select parameter
		return []
	} else {
		// Input is just the select value (comma-separated fields)
		selectValue = input
	}

	// Return empty array if no select value found
	if (selectValue === null || selectValue === "") {
		return []
	}

	// Split by comma and trim whitespace
	return selectValue
		.split(",")
		.map((field) => field.trim())
		.filter((field) => field.length > 0)
};

/**
 * Parses a URL and extracts all relevant components
 *
 * Extracts query parameters, entity type, entity ID, and select fields
 * from an OpenAlex API URL or any URL with query parameters.
 * @param urlString - The URL to parse (relative or absolute)
 * @returns Parsed URL object with all extracted components
 * @example
 * ```typescript
 * parseURL("https://api.openalex.org/works/W123456?select=id,title&filter=is_oa:true")
 * // Returns:
 * // {
 * //   url: "https://api.openalex.org/works/W123456?select=id,title&filter=is_oa:true",
 * //   basePath: "/works/W123456",
 * //   queryParams: { select: "id,title", filter: "is_oa:true" },
 * //   selectFields: ["id", "title"],
 * //   entityType: "works",
 * //   entityId: "W123456"
 * // }
 *
 * parseURL("/authors?filter=last_known_institution.id:I123")
 * // Returns:
 * // {
 * //   url: "/authors?filter=last_known_institution.id:I123",
 * //   basePath: "/authors",
 * //   queryParams: { filter: "last_known_institution.id:I123" },
 * //   selectFields: [],
 * //   entityType: "authors",
 * //   entityId: null
 * // }
 * ```
 */
export const parseURL = (urlString: string): ParsedURL => {
	// Handle empty or invalid input
	if (!urlString || typeof urlString !== "string") {
		return {
			url: "",
			basePath: "",
			queryParams: {},
			selectFields: [],
			entityType: null,
			entityId: null,
		}
	}

	let url: URL
	let basePath: string

	try {
		// Try to parse as absolute URL
		if (urlString.startsWith("http://") || urlString.startsWith("https://")) {
			url = new URL(urlString)
		} else {
			// Handle relative URLs by providing a dummy base
			url = new URL(urlString, "https://example.com")
		}
		basePath = url.pathname
	} catch {
		// If URL parsing completely fails, return empty result
		return {
			url: urlString,
			basePath: "",
			queryParams: {},
			selectFields: [],
			entityType: null,
			entityId: null,
		}
	}

	// Extract query parameters
	const queryParameters: Record<string, string> = {}
	url.searchParams.forEach((value, key) => {
		queryParameters[key] = value
	})

	// Extract select fields if present
	const selectFields = extractSelectFields(urlString)

	// Extract entity type and ID from path
	const pathSegments = basePath.split("/").filter((segment) => segment.length > 0)
	let entityType: EntityType | null = null
	let entityId: string | null = null

	// Look for entity type in path segments
	for (const segment of pathSegments) {
		if (segment in URL_ENTITY_PATTERNS) {
			entityType = URL_ENTITY_PATTERNS[segment]
			break
		}
	}

	// Look for entity ID (OpenAlex ID pattern like W123, A456, etc.)
	for (const segment of pathSegments) {
		const inferredType = inferEntityTypeFromOpenAlexId(segment)
		if (inferredType) {
			entityId = segment
			// If entity type not already found, use the inferred type
			entityType ??= inferredType
			break
		}
	}

	return {
		url: urlString,
		basePath,
		queryParams: queryParameters,
		selectFields,
		entityType,
		entityId,
	}
};

/**
 * Reconstructs a URL from components with proper encoding
 *
 * IMPORTANT: The `select` parameter commas are NOT URL-encoded to comply
 * with OpenAlex API requirements. All other parameters are properly encoded.
 * @param basePath - Base URL path (e.g., "/works" or "https://api.openalex.org/works")
 * @param queryParams - Query parameters as key-value pairs (optional)
 * @param selectFields - Array of field names for select parameter (optional)
 * @returns Complete URL with all parameters properly encoded
 * @example
 * ```typescript
 * reconstructURL("/works", { filter: "is_oa:true" }, ["id", "title", "cited_by_count"])
 * // Returns: "/works?filter=is_oa%3Atrue&select=id,title,cited_by_count"
 *
 * reconstructURL("https://api.openalex.org/authors/A123", {}, ["id", "display_name"])
 * // Returns: "https://api.openalex.org/authors/A123?select=id,display_name"
 *
 * reconstructURL("/works", { page: "2", "per-page": "50" })
 * // Returns: "/works?page=2&per-page=50"
 * ```
 */
export const reconstructURL = (basePath: string, queryParams?: Record<string, string>, selectFields?: readonly string[]): string => {
	// Handle empty base path
	if (!basePath || typeof basePath !== "string") {
		basePath = ""
	}

	// Build query string manually to control encoding
	const queryParts: string[] = []

	// Add all query parameters except 'select' (we'll handle select specially)
	if (queryParams) {
		for (const [key, value] of Object.entries(queryParams)) {
			if (key === "select") {
				continue;
			}

			// Properly encode both key and value
			const encodedKey = encodeURIComponent(key)
			const encodedValue = encodeURIComponent(value)
			queryParts.push(`${encodedKey}=${encodedValue}`)
		}
	}

	// Handle select parameter specially - commas must NOT be encoded
	let selectValue: string | null = null

	// First check if selectFields array is provided
	if (selectFields && selectFields.length > 0) {
		selectValue = selectFields.join(",")
	}
	// Then check if select exists in queryParams
	else if (queryParams?.select !== undefined && queryParams.select !== "") {
		selectValue = queryParams.select
	}

	// Add select parameter WITHOUT encoding commas
	if (selectValue !== null && selectValue !== "") {
		// Only encode the field names individually, not the commas
		const encodedFields = selectValue
			.split(",")
			.map((field) => field.trim())
			.filter((field) => field.length > 0)
			.map((field) => encodeURIComponent(field))
			.join(",")

		queryParts.push(`select=${encodedFields}`)
	}

	// Combine base path with query string
	if (queryParts.length === 0) {
		return basePath
	}

	const queryString = queryParts.join("&")
	const separator = basePath.includes("?") ? "&" : "?"

	return `${basePath}${separator}${queryString}`
};

/**
 * Whether the value is a URL whose host is exactly expectedHost or a subdomain
 * of it. Substring checks ('openalex.org' appearing anywhere) accept attacker
 * hosts like openalex.org.evil.example.
 */
export const hostnameMatches = (value: string, expectedHost: string): boolean => {
	try {
		const { hostname } = new URL(value);
		return hostname === expectedHost || hostname.endsWith(`.${expectedHost}`);
	} catch {
		return false;
	}
};
