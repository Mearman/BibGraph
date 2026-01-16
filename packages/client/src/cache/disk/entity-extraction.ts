/**
 * Entity extraction and path generation for disk cache
 * Handles extracting entity type/id from URLs and responses, and generating file paths
 */

import type { EntityType, OpenAlexEntity, OpenAlexResponse } from "@bibgraph/types";
import { generateContentHash, sanitizeUrlForCaching } from "@bibgraph/utils";
import * as NodeModules from "./nodejs-modules";

const ERROR_MESSAGE_ENTITY_EXTRACTION_FAILED = "Entity info extraction failed";
const UNKNOWN_ERROR_MESSAGE = "Unknown error";

/**
 * Entity information extracted from URL or response
 */
export interface EntityInfo {
	entityType?: EntityType;
	entityId?: string;
	queryParams?: string;
	isQueryResponse?: boolean;
}

/**
 * Intercepted request/response data for caching
 */
export interface InterceptedData {
	url: string;
	finalUrl?: string;
	method: string;
	requestHeaders: Record<string, string>;
	responseData: unknown;
	statusCode: number;
	responseHeaders: Record<string, string>;
	timestamp: string;
}

/**
 * Metadata for cached response
 */
export interface CacheMetadata {
	/** Original request URL */
	url: string;
	/** Final URL after redirects (if different from original) */
	finalUrl?: string;
	/** Request method */
	method: string;
	/** Request headers */
	requestHeaders: Record<string, string>;
	/** Response status code */
	statusCode: number;
	/** Response headers */
	responseHeaders: Record<string, string>;
	/** Response timestamp */
	timestamp: string;
	/** Content type */
	contentType?: string;
	/** Cache write timestamp */
	cacheWriteTime: string;
	/** Entity type detected */
	entityType?: EntityType;
	/** Entity ID detected */
	entityId?: string;
	/** File size in bytes */
	fileSizeBytes: number;
	/** Content hash for integrity verification */
	contentHash: string;
}

/**
 * Extract entity type and ID from URL or response data
 */
export const extractEntityInfo = async (data: InterceptedData): Promise<EntityInfo> => {
	try {
		// Try to extract from URL first
		const urlInfo = extractEntityInfoFromUrl(data.url);

		// Check if this is an autocomplete response (special case)
		if (urlInfo.entityId?.startsWith("autocomplete/")) {
			return urlInfo;
		}

		if (urlInfo.entityType) {
			return urlInfo;
		}

		// Try to extract from response data
		const responseInfo = extractEntityInfoFromResponse(data.responseData);
		if (responseInfo.entityType) {
			// Check if the original URL contains an external canonical ID
			const externalIdInfo = extractExternalCanonicalIdFromUrl(data.url);
			if (externalIdInfo) {
				// Use the external ID for caching instead of the OpenAlex ID
				return { ...externalIdInfo, ...responseInfo };
			}
			return { ...responseInfo, ...urlInfo };
		}

		// Default fallback - use URL hash
		const urlHash = await generateContentHash(data.url);
		return {
			entityType: "works", // Default entity type
			entityId: `unknown_${urlHash.slice(0, 8)}`,
		};
	} catch (error) {
		const { logError, logger } = await import("@bibgraph/utils");
		logError(logger, "Failed to extract entity info", error);
		throw new Error(
			`${ERROR_MESSAGE_ENTITY_EXTRACTION_FAILED}: ${error instanceof Error ? error.message : UNKNOWN_ERROR_MESSAGE}`,
		);
	}
};

/**
 * Extract entity info from URL path
 */
export const extractEntityInfoFromUrl = (url: string): EntityInfo => {
	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split("/").filter(Boolean);
		// Sanitize query parameters to remove sensitive information like api_key and mailto
		const sanitizedQuery = sanitizeUrlForCaching(urlObj.search);
		const queryParams = sanitizedQuery.startsWith("?")
			? sanitizedQuery.slice(1)
			: sanitizedQuery; // Remove leading '?'

		// Check for autocomplete endpoint first
		if (pathParts.length > 0 && pathParts[0] === "autocomplete") {
			// Autocomplete can be /autocomplete?q=query or /autocomplete/entity_type?q=query
			if (pathParts.length === 1) {
				// General autocomplete: /autocomplete?q=query
				return {
					// Don't set entityType for autocomplete - use undefined to mark as special case
					queryParams,
					isQueryResponse: true,
					entityId: "autocomplete/general", // Special marker for autocomplete
				};
			} else if (pathParts.length === 2) {
				// Entity-specific autocomplete: /autocomplete/works?q=query
				const entitySubtype = pathParts[1];
				return {
					// Don't set entityType for autocomplete - use undefined to mark as special case
					queryParams,
					isQueryResponse: true,
					entityId: `autocomplete/${entitySubtype}`, // Special marker for autocomplete with subtype
				};
			}
		}

		// Validate entity type
		const validEntityTypes: EntityType[] = [
			"works",
			"authors",
			"sources",
			"institutions",
			"topics",
			"concepts",
			"publishers",
			"funders",
			"keywords",
		];

		// OpenAlex API URL pattern: /entity_type/entity_id or /entity_type?params
		if (pathParts.length > 0) {
			const entityType = pathParts[0];

			const typedEntityType = validEntityTypes.find((type) => type === entityType);
			if (typedEntityType) {
				// Single entity: /entity_type/entity_id
				if (pathParts.length >= 2 && !queryParams) {
					const entityId = pathParts[1];
					return {
						entityType: typedEntityType,
						entityId,
						isQueryResponse: false,
					};
				}
				// Query/filter response: /entity_type?params
				else if (queryParams) {
					return {
						entityType: typedEntityType,
						queryParams,
						isQueryResponse: true,
						entityId: typedEntityType, // Use entity type as ID for collections
					};
				}
				// Collection without params: /entity_type
				else {
					return {
						entityType: typedEntityType,
						isQueryResponse: true,
						entityId: typedEntityType, // Use entity type as ID for collections
					};
				}
			}
		}

		return {};
	} catch {
		return {};
	}
};

/**
 * Extract entity info from response data
 */
export const extractEntityInfoFromResponse = (responseData: unknown): EntityInfo => {
	try {
		// Single entity response
		if (isOpenAlexEntity(responseData)) {
			const entityType = detectEntityType(responseData);
			return {
				entityType,
				entityId: responseData.id,
				isQueryResponse: false,
			};
		}

		// Collection response
		if (isOpenAlexResponse(responseData) && responseData.results.length > 0) {
			const firstResult = responseData.results[0];
			if (isOpenAlexEntity(firstResult)) {
				const entityType = detectEntityType(firstResult);
				return {
					entityType,
					entityId: entityType, // Use entity type as ID for collections
					isQueryResponse: true,
				};
			}
		}

		return {};
	} catch {
		return {};
	}
};

/**
 * Extract external canonical ID from URL for proper caching
 */
export const extractExternalCanonicalIdFromUrl = (url: string): {
	entityType?: EntityType;
	entityId?: string;
} | null => {
	try {
		const urlObj = new URL(url);
		const pathParts = urlObj.pathname.split("/").filter(Boolean);

		// Check if this is a works route with an external canonical ID
		if (pathParts.length >= 2 && pathParts[0] === "works") {
			const potentialId = decodeURIComponent(pathParts[1]);

			// Check if this looks like an external canonical ID
			if (isExternalCanonicalId(potentialId)) {
				// Determine entity type from the external ID
				let entityType: EntityType;

				if (
					potentialId.includes("orcid.org/") ||
					/^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(potentialId)
				) {
					entityType = "authors";
				} else if (
					potentialId.includes("ror.org/") ||
					/^[0-9a-z]{9}$/i.test(potentialId)
				) {
					entityType = "institutions";
				} else {
					// Default to works for DOI and other cases
					entityType = "works";
				}

				return {
					entityType,
					entityId: potentialId,
				};
			}
		}

		return null;
	} catch {
		return null;
	}
};

/**
 * Check if a string looks like an external canonical ID
 */
const isExternalCanonicalId = (id: string): boolean => {
	// DOI patterns
	if (id.includes("doi.org/") || /^10\.\d+\/\S+$/.test(id)) {
		return true;
	}

	// ORCID patterns
	if (id.includes("orcid.org/") || /^\d{4}-\d{4}-\d{4}-\d{3}[0-9X]$/i.test(id)) {
		return true;
	}

	// ROR patterns
	if (id.includes("ror.org/") || /^[0-9a-z]{9}$/i.test(id)) {
		return true;
	}

	return false;
};

/**
 * Type guard for OpenAlex entity
 */
const isOpenAlexEntity = (data: unknown): data is OpenAlexEntity => {
	const obj = data as Record<string, unknown>;
	return (
		typeof data === "object" &&
		data !== null &&
		typeof obj.id === "string" &&
		typeof obj.display_name === "string"
	);
};

/**
 * Type guard for OpenAlex response
 */
const isOpenAlexResponse = (
	data: unknown,
): data is OpenAlexResponse<OpenAlexEntity> => {
	const obj = data as Record<string, unknown>;
	return (
		typeof data === "object" &&
		data !== null &&
		Array.isArray(obj.results) &&
		typeof obj.meta === "object"
	);
};

/**
 * Detect entity type from entity data
 */
const detectEntityType = (entity: OpenAlexEntity): EntityType => {
	// Try to detect based on specific properties
	if ("doi" in entity || "publication_year" in entity) return "works";
	if ("orcid" in entity || "last_known_institutions" in entity) return "authors";
	if ("issn_l" in entity || "publisher" in entity) return "sources";
	if ("ror" in entity || "country_code" in entity) return "institutions";
	if ("description" in entity && "keywords" in entity) return "topics";
	if ("wikidata" in entity && "level" in entity) return "concepts";
	if ("hierarchy_level" in entity || "parent_publisher" in entity) return "publishers";
	if ("grants_count" in entity) return "funders";

	// Default fallback
	return "works";
};

/**
 * Generate file paths for cached data
 */
export const generateFilePaths = async (
	entityInfo: EntityInfo,
	basePath: string,
): Promise<{ dataFile: string; directoryPath: string }> => {
	await NodeModules.initializeNodeModules();
	const { path } = NodeModules.getNodeModules();

	const entityType = entityInfo.entityType ?? "unknown";

	let directoryPath: string;
	let filename: string;

	// Handle autocomplete responses specially
	if (entityInfo.entityId?.startsWith("autocomplete/")) {
		if (entityInfo.queryParams) {
			// Autocomplete: autocomplete/works/q=query.json or autocomplete/general/q=query.json
			// queryParams already contains the serialized query string (e.g., "q=neural+networks")
			const sanitizedQuery = sanitizeFilename(entityInfo.queryParams);
			const [, subdirectory] = entityInfo.entityId.split("/");
			directoryPath = path.join(basePath, "autocomplete", subdirectory);
			filename = sanitizedQuery;
		} else {
			// Autocomplete without query params - use hash as filename
			const urlHash = await generateContentHash(entityInfo.entityId);
			const [, subdirectory] = entityInfo.entityId.split("/");
			directoryPath = path.join(basePath, "autocomplete", subdirectory);
			filename = urlHash.slice(0, 8);
		}
	} else if (entityInfo.isQueryResponse && entityInfo.queryParams) {
		// Query/filter response: works/queries/filter=author.id:A123&select=display_name.json
		const sanitizedQuery = sanitizeFilename(`filter=${entityInfo.queryParams}`);
		directoryPath = path.join(basePath, entityType, "queries");
		filename = sanitizedQuery;
	} else if (entityInfo.entityId && !entityInfo.isQueryResponse) {
		// Single entity: works/W123456789.json
		const sanitizedId = sanitizeFilename(entityInfo.entityId);
		directoryPath = path.join(basePath, entityType);
		filename = sanitizedId;
	} else if (
		entityInfo.isQueryResponse &&
		entityInfo.entityId === entityType
	) {
		// Collection response: works.json (not works/works.json)
		directoryPath = basePath;
		filename = entityType;
	} else {
		// Default fallback
		const entityId = entityInfo.entityId ?? "unknown";
		const sanitizedId = sanitizeFilename(entityId);
		directoryPath = path.join(basePath, entityType);
		filename = sanitizedId;
	}

	const dataFile = path.join(directoryPath, `${filename}.json`);

	return { dataFile, directoryPath };
};

/**
 * Sanitize filename to be filesystem-safe
 * Uses hash for very long filenames to avoid ENAMETOOLONG errors
 */
const sanitizeFilename = (filename: string): string => {
	const sanitized = filename
		.replaceAll(/["*/:<>?\\|]/g, "_") // Replace invalid characters
		.replaceAll(/\s+/g, "_") // Replace spaces with underscores
		.replaceAll(/_{2,}/g, "_") // Replace multiple underscores with single
		.replace(/^_/, "") // Remove leading underscore
		.replace(/_$/, ""); // Remove trailing underscore

	// If filename is too long, use a hash to ensure it fits filesystem limits
	// Keep it under 100 chars to leave room for directory path and .json extension
	if (sanitized.length > 100) {
		// Create a simple hash from the filename
		let hash = 0;
		for (let i = 0; i < filename.length; i++) {
			const char = filename.charCodeAt(i);
			hash = (hash << 5) - hash + char;
			hash = hash & hash; // Convert to 32-bit integer
		}
		const hashStr = Math.abs(hash).toString(36);
		// Return first 50 chars + hash to make it somewhat readable
		return `${sanitized.slice(0, 50)}_${hashStr}`;
	}

	return sanitized;
};

/**
 * Exclude meta field from response data before caching
 */
export const excludeMetaField = (responseData: unknown): unknown => {
	if (
		typeof responseData === "object" &&
		responseData !== null &&
		"meta" in responseData
	) {
		// eslint-disable-next-line @typescript-eslint/no-unused-vars
		const { meta, ...rest } = responseData as Record<string, unknown>;
		return rest;
	}
	return responseData;
};

/**
 * Check if response data has empty results
 */
export const hasEmptyResults = (responseData: unknown): boolean => {
	if (
		typeof responseData === "object" &&
		responseData !== null &&
		"results" in responseData
	) {
		const data = responseData as Record<string, unknown>;
		return Array.isArray(data.results) && data.results.length === 0;
	}
	return false;
};
