/**
 * URL Reconstruction Utility
 *
 * Reconstructs navigation URLs from entity type + ID pairs. Supports all identifier formats handled by EntityDetectionService:
 * - OpenAlex IDs (W123, A456, etc.)
 * - External identifiers (DOI, ORCID, ROR, ISSN)
 * - GitHub Pages base path normalization
 */

import type { EntityType } from "@bibgraph/types"
import { isEntityType } from "@bibgraph/types"

/**
 * Configuration options for URL reconstruction
 */
export interface UrlReconstructionOptions {
	/**
	 * Base path for GitHub Pages deployment (e.g., "/BibGraph") Defaults to "/" for standard deployment
	 */
	basePath?: string

	/**
	 * Whether to preserve external identifier URLs as-is If false, converts to app routes (e.g., DOI → /works/doi:...) Default: false
	 */
	preserveExternalUrls?: boolean
}

/**
 * Default base path used for GitHub Pages deployment
 */
const DEFAULT_BASE_PATH = "/"

/**
 * GitHub Pages base path for the project
 */
const GITHUB_PAGES_BASE_PATH = "/BibGraph"

/**
 * Checks if an entity ID represents an external identifier
 * @param entityId - The entity ID to check
 */
const isExternalIdentifier = (entityId: string): boolean => {
	// DOI pattern (including DOI URL format)
	if (/^10\.\d+\/\S+$/.test(entityId) || /^https?:\/\/doi\.org\/10\.\d+\/\S+$/i.test(entityId)) {
		return true
	}

	// ORCID pattern (including ORCID URL format)
	if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(entityId) || /^https?:\/\/orcid\.org\/\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(entityId)) {
		return true
	}

	// ROR pattern (including ROR URL format)
	if (/^[0-9a-z]{8,10}$/i.test(entityId)) {
		return true
	}
	if (/^https?:\/\/ror\.org\/[0-9a-z]{8,10}$/i.test(entityId)) {
		return true
	}

	// ISSN pattern
	if (/^\d{4}-\d{3}[0-9X]$/i.test(entityId)) {
		return true
	}

	return false
};

/**
 * Extracts clean external ID from URL format
 * @param entityId - The entity ID to extract from
 */
const extractExternalId = (entityId: string): string => {
	// DOI URL format
	const doiMatch = /https?:\/\/doi\.org\/(10\.\d+\/\S+)/i.exec(entityId)
	if (doiMatch) {
		return doiMatch[1]
	}

	// ORCID URL format
	const orcidMatch = /https?:\/\/orcid\.org\/(\d{4}-\d{4}-\d{4}-\d{3}[0-9X])/i.exec(entityId)
	if (orcidMatch) {
		return orcidMatch[1]
	}

	// ROR URL format
	const rorMatch = /https?:\/\/ror\.org\/([0-9a-z]{8,10})/i.exec(entityId)
	if (rorMatch) {
		return rorMatch[1]
	}

	return entityId
};

/**
 * Validates OpenAlex ID format against entity type
 * @param entityType - The entity type to validate
 * @param entityId - The entity ID to validate
 */
const isValidOpenAlexId = (entityType: EntityType, entityId: string): boolean => {
	// Check if ID starts with correct prefix for entity type
	const prefixMap: Record<EntityType, string> = {
		works: "W",
		authors: "A",
		sources: "S",
		institutions: "I",
		publishers: "P",
		concepts: "C",
		funders: "F",
		topics: "T",
		keywords: "K",
		domains: "D",
		subfields: "SF",
		fields: "FI"
	}

	const expectedPrefix = prefixMap[entityType]
	if (!expectedPrefix) {
		return false // Unknown entity type
	}

	// Check prefix and that it's followed by digits
	const prefixPattern = new RegExp(String.raw`^${expectedPrefix}\d+$`)
	return prefixPattern.test(entityId)
};

/**
 * Reconstructs URL for external identifiers as app routes
 * @param entityType - The entity type
 * @param entityId - The external entity ID
 * @param basePath - The base path for the URL
 */
const reconstructExternalIdRoute = (entityType: EntityType, entityId: string, basePath: string): string => {
	// Strip URL prefixes for external identifiers
	const cleanId = extractExternalId(entityId)

	// Route patterns for external identifiers
	switch (entityType) {
		case "works":
			if (cleanId.startsWith("10.")) {
				// DOI route
				return `${basePath}/doi/${cleanId}`
			}
			break

		case "authors":
			if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(cleanId)) {
				// ORCID route
				return `${basePath}/authors/orcid/${cleanId}`
			}
			break

		case "institutions":
			if (/^[0-9a-z]{8,10}$/i.test(cleanId)) {
				// ROR route
				return `${basePath}/institutions/ror/${cleanId}`
			}
			break

		case "sources":
			if (/^\d{4}-\d{3}[0-9X]$/i.test(cleanId)) {
				// ISSN route
				return `${basePath}/sources/issn/${cleanId}`
			}
			break

		case "topics":
		case "concepts":
		case "publishers":
		case "funders":
		case "keywords":
		case "domains":
		case "fields":
		case "subfields":
			// No dedicated external-ID route for these entity types; fall through to the generic route below
			break
	}

	// Fallback to standard entity route (also covers entity types with no dedicated external-ID route above)
	return `${basePath}/${entityType}/${cleanId}`
};

/**
 * Reconstructs URL for OpenAlex entities (direct IDs)
 * @param entityType - The entity type
 * @param entityId - The OpenAlex entity ID
 * @param basePath - The base path for the URL
 */
const reconstructOpenAlexUrl = (entityType: EntityType, entityId: string, basePath: string): string => {
	// Remove any trailing slash
	const cleanId = entityId.replace(/\/$/, "")

	// For standard OpenAlex IDs, convert to uppercase
	const isStandardId = /^[WASIPCFKTD]\d+$/i.test(cleanId)
	const finalId = isStandardId ? cleanId.toUpperCase() : cleanId

	// Validate that it's a proper OpenAlex ID for the entity type (only for standard IDs)
	if (isStandardId && !isValidOpenAlexId(entityType, finalId)) {
		// If validation fails, still construct the URL but let the app handle 404s
		console.warn(`Invalid OpenAlex ID format for ${entityType}: ${finalId}`)
	}

	return `${basePath}/${entityType}/${finalId}`
};

/**
 * Reconstructs a navigation URL from entity type and ID
 *
 * This is the reverse of EntityDetectionService - it converts entity type + ID pairs back to navigation URLs that work with the app's routing system.
 * @param entityType - The OpenAlex entity type
 * @param entityId - The normalized entity ID (may be external identifier), or null/undefined for a malformed caller input
 * @param options - Configuration options
 * @returns Navigation URL path (without domain)
 */
export const reconstructEntityUrl = (entityType: EntityType, entityId: string | null | undefined, options: Readonly<UrlReconstructionOptions> = {}): string => {
	// Handle undefined/null inputs gracefully
	if (entityId == null) {
		return ""
	}

	const { basePath = DEFAULT_BASE_PATH, preserveExternalUrls = false } = options

	// Normalize base path to ensure it starts with / and doesn't end with /
	const normalizedBasePath = basePath.startsWith("/") ? basePath : `/${basePath}`
	const finalBasePath = normalizedBasePath.endsWith("/")
		? normalizedBasePath.slice(0, -1)
		: normalizedBasePath

	// Handle external identifiers
	if (isExternalIdentifier(entityId)) {
		if (preserveExternalUrls) {
			// Return the original external URL
			return entityId
		}
		// Convert to app route for external identifiers
		return reconstructExternalIdRoute(entityType, entityId, finalBasePath)
	}

	// Handle OpenAlex entities (direct IDs)
	return reconstructOpenAlexUrl(entityType, entityId, finalBasePath)
};

/**
 * Detects if a URL is an external identifier URL This is useful for backward compatibility with existing bookmark data
 * @param url - The URL to check
 */
export const isExternalIdentifierUrl = (url: string): boolean => /^https?:\/\/(?:doi\.org|orcid\.org|ror\.org)\//i.test(url);

/**
 * Extracts entity type and ID from existing app URLs Useful for migration and backward compatibility
 * @param url - The URL to parse
 */
export const parseExistingAppUrl = (url: string): { entityType?: EntityType; entityId?: string } | null => {
	try {
		// Handle both full URLs and relative paths
		let pathname: string
		try {
			const urlObject = new URL(url)
			pathname = urlObject.pathname
		} catch {
			// If it's not a full URL, treat it as a relative path Remove query parameters and hash fragments from relative URLs
			const cleanUrl = url.split('?', 1)[0].split('#', 1)[0]
			pathname = cleanUrl.startsWith('/') ? cleanUrl : `/${cleanUrl}`
		}

		// Handle GitHub Pages base path
		const pathWithoutBase = pathname.startsWith(GITHUB_PAGES_BASE_PATH)
			? pathname.slice(GITHUB_PAGES_BASE_PATH.length)
			: pathname

		// Parse entity routes: /works/W123, /authors/A456, etc.
		const entityRouteMatch = /^\/([^/]+)\/([^/]+)$/.exec(pathWithoutBase)
		if (entityRouteMatch) {
			const entityType = entityRouteMatch[1]
			const entityId = entityRouteMatch[2]

			// Validate entity type
			if (isEntityType(entityType)) {
				return {
					entityType,
					entityId
				}
			}
		}

		// Handle DOI routes: /doi/10.1234/example
		const doiRouteMatch = /^\/doi\/(.+)$/.exec(pathWithoutBase)
		if (doiRouteMatch) {
			const doi = doiRouteMatch[1]
			if (/^10\.\d+\/\S+$/.test(doi)) {
				return {
					entityType: "works",
					entityId: `https://doi.org/${doi}`
				}
			}
		}

		// Handle ORCID routes: /authors/orcid/0000-0000-0000-0000
		const orcidRouteMatch = /^\/authors\/orcid\/(.+)$/.exec(pathWithoutBase)
		if (orcidRouteMatch) {
			const orcid = orcidRouteMatch[1]
			if (/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(orcid)) {
				return {
					entityType: "authors",
					entityId: `https://orcid.org/${orcid}`
				}
			}
		}

		// Handle ROR routes: /institutions/ror/02y3ad647
		const rorRouteMatch = /^\/institutions\/ror\/(.+)$/.exec(pathWithoutBase)
		if (rorRouteMatch) {
			const ror = rorRouteMatch[1]
			if (/^[0-9a-z]{8,10}$/i.test(ror)) {
				return {
					entityType: "institutions",
					entityId: `https://ror.org/${ror}`
				}
			}
		}

		// Handle ISSN routes: /sources/issn/1234-5678
		const issnRouteMatch = /^\/sources\/issn\/(.+)$/.exec(pathWithoutBase)
		if (issnRouteMatch) {
			const issn = issnRouteMatch[1]
			if (/^\d{4}-\d{3}[0-9X]$/i.test(issn)) {
				return {
					entityType: "sources",
					entityId: issn
				}
			}
		}

		return null
	} catch {
		// Invalid URL format
		return null
	}
};

/**
 * Creates a URL reconstruction function with fixed options Useful for creating app-specific reconstruction utilities
 * @param options - The URL reconstruction options
 */
export const createUrlReconstructor = (options: Readonly<UrlReconstructionOptions>) => (entityType: EntityType, entityId: string | null | undefined): string => reconstructEntityUrl(entityType, entityId, options);

/**
 * Default URL reconstructor for standard deployment
 */
export const reconstructStandardUrl = createUrlReconstructor({
	basePath: DEFAULT_BASE_PATH,
	preserveExternalUrls: false
})

/**
 * URL reconstructor for GitHub Pages deployment
 */
export const reconstructGitHubPagesUrl = createUrlReconstructor({
	basePath: GITHUB_PAGES_BASE_PATH,
	preserveExternalUrls: false
})
