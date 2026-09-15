/**
 * Entity type detection utilities for CLI
 */

import type { EntityType } from "@bibgraph/types"

/**
 * Map OpenAlex ID prefixes to entity types
 */
const prefixToEntityType = (prefix: string): EntityType => {
	switch (prefix) {
		case "W": {
			return "works"
		}
		case "A": {
			return "authors"
		}
		case "S": {
			return "sources"
		}
		case "I": {
			return "institutions"
		}
		case "T": {
			return "topics"
		}
		case "C": {
			return "concepts"
		}
		case "P": {
			return "publishers"
		}
		case "F": {
			return "funders"
		}
		default: {
			throw new Error(`Unknown entity prefix: ${prefix}`)
		}
	}
};

/**
 * Detect entity type from OpenAlex ID
 */
export const detectEntityType = (entityId: string): EntityType => {
	// Detect from ID format (W123456789, A123456789, etc.)
	const match = /^https:\/\/openalex\.org\/([AFIPSTW])\d+$/.exec(entityId)
	if (match?.[1] !== undefined) {
		const prefix = match[1]
		return prefixToEntityType(prefix)
	}

	// Handle bare IDs
	const bareMatch = /^([AFIPSTW])\d+$/.exec(entityId)
	if (bareMatch?.[1] !== undefined) {
		const prefix = bareMatch[1]
		return prefixToEntityType(prefix)
	}

	throw new Error(`Cannot detect entity type from ID: ${entityId}`)
};

/**
 * Supported entity types for CLI operations
 */
export const SUPPORTED_ENTITIES = [
	"authors",
	"works",
	"institutions",
	"topics",
	"publishers",
	"funders",
] as const

export type StaticEntityType = (typeof SUPPORTED_ENTITIES)[number]

const SUPPORTED_ENTITY_SET: ReadonlySet<string> = new Set(SUPPORTED_ENTITIES)

const isStaticEntityType = (entityType: EntityType): entityType is StaticEntityType =>
	SUPPORTED_ENTITY_SET.has(entityType)

/**
 * Convert EntityType to StaticEntityType
 */
export const toStaticEntityType = (entityType: EntityType): StaticEntityType => {
	if (isStaticEntityType(entityType)) {
		return entityType
	}
	throw new Error(`Unsupported entity type for CLI: ${entityType}`)
};
