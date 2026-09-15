/**
 * Generic query key utilities for cache management
 * These utilities help create consistent cache keys across different data types
 */

/**
 * Generic query parameters interface
 */
export type QueryParams = Record<string, string | number | boolean | null | undefined | (string | number)[]>;

/**
 * Normalize a parameter value to a string for consistent cache keys
 */
const normalizeParameterValue = (value: unknown): string => {
	if (value === null || value === undefined) {
		return ""
	}

	if (Array.isArray(value)) {
		return value.map(String).sort().join(",")
	}

	if (typeof value === "object") {
		return JSON.stringify(value)
	}

	// At this point, value is a primitive (string, number, boolean, symbol, undefined)
	if (typeof value === "string") return value
	if (typeof value === "number") return value.toString()
	if (typeof value === "boolean") return value.toString()
	if (typeof value === "symbol") return value.toString()
	// undefined case
	return ""
};

/**
 * Create a deterministic cache key from query parameters
 */
export const createQueryKey = ({
	baseKey,
	params,
}: {
	baseKey: string
	params?: QueryParams
}): string => {
	if (!params || Object.keys(params).length === 0) {
		return baseKey
	}

	// Sort keys for deterministic ordering
	const sortedKeys = Object.keys(params).sort()
	const parameterPairs = sortedKeys
		.map((key) => {
			const value = params[key]
			const normalizedValue = normalizeParameterValue(value)
			return normalizedValue ? `${key}:${normalizedValue}` : null
		})
		.filter(Boolean)

	if (parameterPairs.length === 0) {
		return baseKey
	}

	return `${baseKey}?${parameterPairs.join("&")}`
};

/**
 * Create a cache key for a resource by ID
 */
export const createResourceKey = ({
	resourceType,
	id,
}: {
	resourceType: string
	id: string | number
}): string => `${resourceType}:${String(id)}`;

/**
 * Create a cache key for a collection query
 */
export const createCollectionKey = ({
	resourceType,
	params,
}: {
	resourceType: string
	params?: QueryParams
}): string => createQueryKey({ baseKey: `${resourceType}:collection`, params });

/**
 * Create a cache key for a search query
 */
export const createSearchKey = ({
	resourceType,
	query,
	params,
}: {
	resourceType: string
	query: string
	params?: QueryParams
}): string => {
	const searchParameters = { query, ...params }
	return createQueryKey({
		baseKey: `${resourceType}:search`,
		params: searchParameters,
	})
};

/**
 * Extract resource type from a cache key
 */
export const extractResourceType = (cacheKey: string): string | null => {
	const colonIndex = cacheKey.indexOf(":")
	return colonIndex > 0 ? cacheKey.slice(0, Math.max(0, colonIndex)) : null
};

/**
 * Extract ID from a resource cache key
 */
export const extractResourceId = (cacheKey: string): string | null => {
	const parts = cacheKey.split(":")
	if (parts.length >= 2 && parts[1] !== "collection" && parts[1] !== "search") {
		return parts[1] ?? null
	}
	return null
};

/**
 * Check if a cache key represents a collection query
 */
export const isCollectionKey = (cacheKey: string): boolean => cacheKey.includes(":collection");

/**
 * Check if a cache key represents a search query
 */
export const isSearchKey = (cacheKey: string): boolean => cacheKey.includes(":search");

/**
 * Check if a cache key represents a single resource
 */
export const isResourceKey = (cacheKey: string): boolean => !isCollectionKey(cacheKey) && !isSearchKey(cacheKey) && cacheKey.includes(":");

/**
 * Generate a wildcard pattern for invalidating related cache entries
 */
export const createInvalidationPattern = (resourceType: string): string => `${resourceType}:*`;

/**
 * Check if a cache key matches an invalidation pattern
 */
export const matchesPattern = ({
	cacheKey,
	pattern,
}: {
	cacheKey: string
	pattern: string
}): boolean => {
	if (pattern.endsWith("*")) {
		const prefix = pattern.slice(0, -1)
		return cacheKey.startsWith(prefix)
	}
	return cacheKey === pattern
};

/**
 * Create a hash from query parameters for short cache keys
 */
const HASH_SHIFT_BITS = 5;
const HASH_RADIX = 36;

export const hashParams = (params: QueryParams): string => {
	const string_ = JSON.stringify(params, Object.keys(params).sort())
	let hash = 0
	for (let index = 0; index < string_.length; index++) {
		const char = string_.charCodeAt(index)
		hash = (hash << HASH_SHIFT_BITS) - hash + char
		hash &= hash // Convert to 32bit integer
	}
	return Math.abs(hash).toString(HASH_RADIX)
};

/**
 * Create a short cache key using parameter hashing
 */
export const createShortQueryKey = ({
	baseKey,
	params,
}: {
	baseKey: string
	params?: QueryParams
}): string => {
	if (!params || Object.keys(params).length === 0) {
		return baseKey
	}

	const hash = hashParams(params)
	return `${baseKey}#${hash}`
};

/**
 * Cache key builder class for fluent API
 */
export class CacheKeyBuilder {
	private readonly parts: string[] = []

	constructor(baseKey: string) {
		this.parts.push(baseKey)
	}

	static create(baseKey: string): CacheKeyBuilder {
		return new CacheKeyBuilder(baseKey)
	}

	resource(id: string | number): this {
		this.parts.push(String(id))
		return this
	}

	collection(): this {
		this.parts.push("collection")
		return this
	}

	search(): this {
		this.parts.push("search")
		return this
	}

	custom(segment: string): this {
		this.parts.push(segment)
		return this
	}

	params(parameters: QueryParams): this {
		if (Object.keys(parameters).length > 0) {
			const hash = hashParams(parameters)
			this.parts.push(`#${hash}`)
		}
		return this
	}

	build(): string {
		return this.parts.join(":")
	}
}
