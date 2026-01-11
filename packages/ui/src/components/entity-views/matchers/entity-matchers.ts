// Matcher utilities for entity views
import type { EntityType, OpenAlexEntity } from "@bibgraph/types";
import type { ComponentType } from "react";

export interface EntityMatcher {
	test: (entity: OpenAlexEntity) => boolean;
	component: ComponentType<{ entity: OpenAlexEntity }>;
}

export const createMatcher = (pattern: string | RegExp | ((entity: OpenAlexEntity) => boolean)): EntityMatcher => {
	const test = typeof pattern === "string"
		? (entity: OpenAlexEntity) => entity.display_name?.includes(pattern)
		: (pattern instanceof RegExp
		? (entity: OpenAlexEntity) => pattern.test(entity.display_name || "")
		: pattern);

	return {
		test,
		component: () => null, // Placeholder
	};
};

export const defaultMatchers: EntityMatcher[] = [
	createMatcher(/author/i),
	createMatcher(/work/i),
	createMatcher(/source/i),
	createMatcher(/institution/i),
	createMatcher(/topic/i),
];

/**
 * Map of OpenAlex ID prefixes to entity types
 */
const OPENALEX_PREFIX_TO_ENTITY_TYPE: Record<string, EntityType> = {
	W: "works",
	A: "authors",
	S: "sources",
	I: "institutions",
	P: "publishers",
	C: "concepts",
	F: "funders",
	T: "topics",
	K: "keywords",
	V: "sources", // Venues (deprecated, now sources)
};

/**
 * Extracts the entity type from an OpenAlex ID prefix
 * @param id - OpenAlex ID (e.g., "W1234567890", "T10211")
 * @returns EntityType or null if not recognized
 */
const getEntityTypeFromIdPrefix = (id: string): EntityType | null => {
	const prefix = id.charAt(0).toUpperCase();
	return OPENALEX_PREFIX_TO_ENTITY_TYPE[prefix] ?? null;
};

/**
 * Converts an OpenAlex URL or ID to a relative URL path with proper entity type prefix
 * @param urlOrId - Either a full OpenAlex URL (https://openalex.org/A123) or just an ID (A123)
 * @returns A hash-based relative URL with entity type (e.g., #/authors/A123, #/topics/T10211)
 */
export const convertToRelativeUrl = (urlOrId: string): string => {
	// Extract just the ID part if it's a full URL
	// Handle both direct ID URLs (openalex.org/T10211) and path-based URLs (openalex.org/topics/T10211)
	const id = urlOrId.replace(/^https?:\/\/(?:api\.)?openalex\.org\//, '');

	// If the ID already includes an entity type path (e.g., "topics/T10211", "keywords/machine-learning"),
	// return it directly
	const pathBasedPattern = /^(works|authors|sources|institutions|topics|publishers|funders|concepts|fields|domains|subfields|keywords)\//i;
	if (pathBasedPattern.test(id)) {
		return `#/${id}`;
	}

	// For bare IDs like "T10211" or "W1234567890", detect entity type from prefix
	const entityType = getEntityTypeFromIdPrefix(id);
	if (entityType) {
		return `#/${entityType}/${id}`;
	}

	// Fallback: return as-is (shouldn't happen for valid OpenAlex IDs)
	return `#/${id}`;
};