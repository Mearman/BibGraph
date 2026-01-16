/**
 * Path and URL conversion utilities for user interactions
 * Functions for converting between internal paths and OpenAlex API URLs
 */

import type { StoredNormalizedRequest } from "./types.js"

/**
 * Convert internal path to API URL
 * @param internalPath - Internal application path (e.g., "/authors/A5017898742")
 * @returns Full API URL (e.g., "https://api.openalex.org/authors/A5017898742")
 */
export const internalPathToApiUrl = (internalPath: string): string => {
	if (internalPath.startsWith('https://api.openalex.org')) {
		return internalPath // Already an API URL
	}

	if (internalPath.startsWith('/')) {
		return `https://api.openalex.org${internalPath}`
	}

	return `https://api.openalex.org/${internalPath}`
};

/**
 * Convert API URL to internal path
 * @param apiUrl - Full API URL (e.g., "https://api.openalex.org/authors/A5017898742")
 * @returns Internal application path (e.g., "/authors/A5017898742")
 */
export const apiUrlToInternalPath = (apiUrl: string): string => {
	if (apiUrl.startsWith('https://api.openalex.org')) {
		return apiUrl.replace('https://api.openalex.org', '')
	}

	return apiUrl
};

/**
 * Create a StoredNormalizedRequest with API URL support
 * @param internalPath - Internal application path
 * @param params - Request parameters
 * @param hash - Request hash for deduplication
 * @returns StoredNormalizedRequest with API URL fields populated
 */
export const createApiUrlRequest = (internalPath: string, params: Record<string, unknown>, hash: string): StoredNormalizedRequest => {
	const apiUrl = internalPathToApiUrl(internalPath)

	// Add query parameters to API URL if present
	let fullApiUrl = apiUrl
	if (Object.keys(params).length > 0) {
		const searchParams = new URLSearchParams()
		Object.entries(params).forEach(([key, value]) => {
			if (value !== undefined && value !== null) {
				searchParams.append(key, String(value))
			}
		})
		const queryString = searchParams.toString()
		if (queryString && !apiUrl.includes('?')) {
			fullApiUrl += `?${queryString}`
		} else if (queryString) {
			fullApiUrl += `&${queryString}`
		}
	}

	const endpoint = internalPath.split('/')[1] || ''

	return {
		cacheKey: fullApiUrl, // Store API URL as primary key
		hash,
		endpoint, // Include endpoint for backward compatibility
		internalEndpoint: internalPath,
		params: JSON.stringify(params),
		apiUrl: fullApiUrl,
		internalPath,
	}
};
