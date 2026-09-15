/**
 * Static data utilities for OpenAlex client
 * Internal utilities without external dependencies
 */

export type StaticEntityType = 'authors' | 'works' | 'sources' | 'institutions' | 'topics' | 'publishers' | 'funders' | 'concepts';

const VALID_ENTITY_TYPES = new Set<string>(['authors', 'works', 'sources', 'institutions', 'topics', 'publishers', 'funders', 'concepts']);

const isStaticEntityType = (value: string): value is StaticEntityType => VALID_ENTITY_TYPES.has(value);

/**
 * Validate and return entity type for static cache lookup
 */
export const toStaticEntityType = (entityType: string): StaticEntityType => {
	if (isStaticEntityType(entityType)) {
		return entityType;
	}
	throw new Error(`Unknown entity type: ${entityType}`);
};

/**
 * Clean OpenAlex ID by removing URL prefix if present
 */
export const cleanOpenAlexId = (id: string): string => {
	// Handle null/undefined/empty - return as-is to preserve for error handling
	if (!id || typeof id !== 'string') {
		return id;
	}
	// Remove https://openalex.org/ prefix if present
	if (id.startsWith('https://openalex.org/')) {
		return id.replace('https://openalex.org/', '');
	}
	return id;
};