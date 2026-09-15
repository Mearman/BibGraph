/**
 * Centralized entity metadata - SINGLE SOURCE OF TRUTH
 * All entity-related information consolidated in one structure
 *
 * This file contains comprehensive metadata for all OpenAlex entity types.
 * Use this as the canonical source for entity colors, labels, icons, and routing.
 */

import type { EntityType } from "./entities"

/**
 * Taxonomy entry for entities (backward compatibility with graph package)
 */
export interface Taxon {
	/**
	Human-readable display name
	 */
	displayName: string
	/**
	Detailed description
	 */
	description: string
	/**
	UI color identifier
	 */
	color: string
	/**
	Plural form for display
	 */
	plural: string
}

/**
 * Comprehensive metadata entry for entities
 * Centralizes all entity-related information in one structure
 */
export interface EntityMetadataEntry extends Taxon {
	/**
	Tabler icon name
	 */
	icon: string
	/**
	OpenAlex ID prefix (e.g., 'W' for works)
	 */
	idPrefix: string
	/**
	Base route path (e.g., '/works')
	 */
	routePath: string
	/**
	Singular form for catalogue compatibility (e.g., 'work')
	 */
	singularForm: string
}

/**
 * Comprehensive entity metadata - SINGLE SOURCE OF TRUTH
 * All entity-related information consolidated in one structure
 */
export const ENTITY_METADATA: Record<EntityType, EntityMetadataEntry> = {
	works: {
		displayName: "Work",
		plural: "Works",
		description: "Academic publications, articles, books, and other scholarly outputs",
		color: "blue",
		icon: "IconFileText",
		idPrefix: "W",
		routePath: "/works",
		singularForm: "work",
	},
	authors: {
		displayName: "Author",
		plural: "Authors",
		description: "Researchers, scholars, and contributors to academic works",
		color: "green",
		icon: "IconUser",
		idPrefix: "A",
		routePath: "/authors",
		singularForm: "author",
	},
	sources: {
		displayName: "Source",
		plural: "Sources",
		description: "Journals, conferences, books, and other publication venues",
		color: "purple",
		icon: "IconBook",
		idPrefix: "S",
		routePath: "/sources",
		singularForm: "source",
	},
	institutions: {
		displayName: "Institution",
		plural: "Institutions",
		description: "Universities, research centers, and academic organizations",
		color: "orange",
		icon: "IconBuilding",
		idPrefix: "I",
		routePath: "/institutions",
		singularForm: "institution",
	},
	publishers: {
		displayName: "Publisher",
		plural: "Publishers",
		description: "Publishing companies and organizations",
		color: "teal",
		icon: "IconPrinter",
		idPrefix: "P",
		routePath: "/publishers",
		singularForm: "publisher",
	},
	funders: {
		displayName: "Funder",
		plural: "Funders",
		description: "Funding agencies and research sponsors",
		color: "cyan",
		icon: "IconCoin",
		idPrefix: "F",
		routePath: "/funders",
		singularForm: "funder",
	},
	topics: {
		displayName: "Topic",
		plural: "Topics",
		description: "Research topics and subject areas",
		color: "red",
		icon: "IconTag",
		idPrefix: "T",
		routePath: "/topics",
		singularForm: "topic",
	},
	concepts: {
		displayName: "Concept",
		plural: "Concepts",
		description: "Semantic concepts and research areas from OpenAlex",
		color: "pink",
		icon: "IconBulb",
		idPrefix: "C",
		routePath: "/concepts",
		singularForm: "concept",
	},
	keywords: {
		displayName: "Keyword",
		plural: "Keywords",
		description: "User-defined keywords and tags",
		color: "gray",
		icon: "IconHash",
		idPrefix: "K",
		routePath: "/keywords",
		singularForm: "keyword",
	},
	domains: {
		displayName: "Domain",
		plural: "Domains",
		description: "Top-level academic domains in the OpenAlex taxonomy",
		color: "indigo",
		icon: "IconWorld",
		idPrefix: "D",
		routePath: "/domains",
		singularForm: "domain",
	},
	fields: {
		displayName: "Field",
		plural: "Fields",
		description: "Academic fields within domains",
		color: "violet",
		icon: "IconFolders",
		idPrefix: "FI",
		routePath: "/fields",
		singularForm: "field",
	},
	subfields: {
		displayName: "Subfield",
		plural: "Subfields",
		description: "Academic subfields within fields",
		color: "lime",
		icon: "IconFolder",
		idPrefix: "SF",
		routePath: "/subfields",
		singularForm: "subfield",
	},
}

// ==================
// Helper Functions
// ==================

/**
 * Check if a string is a valid entity type (plural form)
 */
export const isEntityType = (value: unknown): value is EntityType => {
	if (typeof value !== "string") return false
	return value in ENTITY_METADATA
};

/**
 * Get complete metadata for an entity type
 */
export const getEntityMetadata = (
	entityType: EntityType
): EntityMetadataEntry => ENTITY_METADATA[entityType];

/**
 * Get the singular form of an entity type (for catalogue compatibility)
 */
export const getEntitySingularForm = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].singularForm;

/**
 * Get the ID prefix for an entity type
 */
export const getEntityIdPrefix = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].idPrefix;

/**
 * Get the route path for an entity type
 */
export const getEntityRoutePath = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].routePath;

/**
 * Get the icon name for an entity type
 */
export const getEntityIcon = (entityType: EntityType): string => ENTITY_METADATA[entityType].icon;

/**
 * Get the color for an entity type
 */
export const getEntityColor = (entityType: EntityType): string => ENTITY_METADATA[entityType].color;

/**
 * Get the display name for an entity type
 */
export const getEntityDisplayName = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].displayName;

/**
 * Get the plural form for an entity type
 */
export const getEntityPlural = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].plural;

/**
 * Convert singular form to plural EntityType
 * @example `toEntityType('work') =\> 'works'`
 */
export const toEntityType = (singularForm: string): EntityType | null => {
	const entry = Object.entries(ENTITY_METADATA).find(
		([, metadata]) => metadata.singularForm === singularForm
	)
	if (entry === undefined) return null
	const [key] = entry
	return isEntityType(key) ? key : null
};

/**
 * Convert plural EntityType to singular form
 * @example `toSingularForm('works') =\> 'work'`
 */
export const toSingularForm = (
	entityType: EntityType
): string => ENTITY_METADATA[entityType].singularForm;

/**
 * Check if a string is a valid singular entity form
 */
export const isSingularEntityForm = (value: unknown): boolean => {
	if (typeof value !== "string") return false
	return Object.values(ENTITY_METADATA).some((metadata) => metadata.singularForm === value)
};

/**
 * Detect entity type from OpenAlex ID
 * @example `detectEntityType('W123456') =\> 'works'`
 */
export const detectEntityType = (openAlexId: string): EntityType | null => {
	const entry = Object.entries(ENTITY_METADATA).find(([, metadata]) =>
		openAlexId.startsWith(metadata.idPrefix)
	)
	if (entry === undefined) return null
	const [key] = entry
	return isEntityType(key) ? key : null
};
