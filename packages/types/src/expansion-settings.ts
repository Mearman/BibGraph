/**
 * Types and interfaces for flexible expansion settings
 * Supports arbitrary sorting and filtering for entity/edge type expansions
 */

import type { EntityType } from "./entities"
import { RelationType } from "./relationships"

export type ExpansionTarget = EntityType | RelationType

export interface ExpansionOptions {
	depth?: number
	limit?: number
	force?: boolean
}

export interface SortCriteria {
	/**
	The property to sort by (e.g., "publication_year", "cited_by_count")
	 */
	property: string
	/**
	Sort direction
	 */
	direction: "asc" | "desc"
	/**
	Priority for multiple sorts (1 = primary, 2 = secondary, etc.)
	 */
	priority: number
	/**
	Optional display label for the property
	 */
	label?: string
}

export type FilterOperator =
	| "eq"
	| "ne"
	| "gt"
	| "lt"
	| "gte"
	| "lte"
	| "contains"
	| "startswith"
	| "endswith"
	| "between"
	| "in"
	| "notin"

export interface FilterCriteria {
	/**
	The property to filter by
	 */
	property: string
	/**
	Filter operator
	 */
	operator: FilterOperator
	/**
	Filter value(s) - can be primitive, array, or [min, max] for between
	 */
	value: unknown
	/**
	Whether this filter is currently enabled
	 */
	enabled: boolean
	/**
	Optional display label for the property
	 */
	label?: string
}

export interface ExpansionSettings extends Record<string, unknown> {
	/**
	The target type (entity or edge type) these settings apply to
	 */
	target: ExpansionTarget
	/**
	Maximum number of results to return (0 = no limit)
	 */
	limit?: number
	/**
	Sort criteria in priority order
	 */
	sorts?: SortCriteria[]
	/**
	Filter criteria
	 */
	filters?: FilterCriteria[]
	/**
	Whether expansion is enabled for this target
	 */
	enabled?: boolean
	/**
	Optional custom name for this configuration
	 */
	name?: string
}

export type PropertyType = "string" | "number" | "boolean" | "date" | "year" | "enum"

export interface PropertyDefinition {
	/**
	Property name as used in API
	 */
	property: string
	/**
	Human-readable label
	 */
	label: string
	/**
	Data type of the property
	 */
	type: PropertyType
	/**
	Whether this property can be used for sorting
	 */
	sortable: boolean
	/**
	Whether this property can be used for filtering
	 */
	filterable: boolean
	/**
	For enum types, the possible values
	 */
	enumValues?: {
		value: string
		label: string
	}[]
	/**
	Optional description
	 */
	description?: string
	/**
	Example values for documentation
	 */
	examples?: string[]
}

export interface EntityTypeProperties {
	/**
	Entity or relation type
	 */
	target: ExpansionTarget
	/**
	Available properties for this type
	 */
	properties: PropertyDefinition[]
}

// Predefined property definitions for different entity types
export const ENTITY_PROPERTIES: Record<string, PropertyDefinition[]> = {
	works: [
		{
			property: "publication_year",
			label: "Publication Year",
			type: "year",
			sortable: true,
			filterable: true,
			description: "Year the work was published",
			examples: ["2023", "2020"],
		},
		{
			property: "cited_by_count",
			label: "Citation Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Number of times this work has been cited",
			examples: ["150", "23"],
		},
		{
			property: "is_oa",
			label: "Open Access",
			type: "boolean",
			sortable: false,
			filterable: true,
			description: "Whether the work is open access",
			examples: ["true", "false"],
		},
		{
			property: "type",
			label: "Publication Type",
			type: "enum",
			sortable: false,
			filterable: true,
			enumValues: [
				{ value: "journal-article", label: "Journal Article" },
				{ value: "book-chapter", label: "Book Chapter" },
				{ value: "book", label: "Book" },
				{ value: "dataset", label: "Dataset" },
				{ value: "thesis", label: "Thesis" },
				{ value: "preprint", label: "Preprint" },
			],
			description: "Type of publication",
			examples: ["journal-article", "book"],
		},
		{
			property: "language",
			label: "Language",
			type: "string",
			sortable: false,
			filterable: true,
			description: "Primary language of the work",
			examples: ["en", "es", "fr"],
		},
		{
			property: "referenced_works_count",
			label: "Reference Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Number of works this work references",
			examples: ["45", "12"],
		},
	],
	authors: [
		{
			property: "works_count",
			label: "Works Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Total number of works by this author",
			examples: ["150", "23"],
		},
		{
			property: "cited_by_count",
			label: "Citation Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Total citations across all works",
			examples: ["2500", "145"],
		},
		{
			property: "last_known_institution.country_code",
			label: "Country",
			type: "string",
			sortable: false,
			filterable: true,
			description: "Country code of last known institution",
			examples: ["US", "GB", "DE"],
		},
	],
	sources: [
		{
			property: "works_count",
			label: "Works Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Number of works published in this source",
			examples: ["5000", "250"],
		},
		{
			property: "cited_by_count",
			label: "Citation Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Total citations for works in this source",
			examples: ["50000", "1200"],
		},
		{
			property: "is_oa",
			label: "Open Access",
			type: "boolean",
			sortable: false,
			filterable: true,
			description: "Whether this is an open access source",
			examples: ["true", "false"],
		},
		{
			property: "type",
			label: "Source Type",
			type: "enum",
			sortable: false,
			filterable: true,
			enumValues: [
				{ value: "journal", label: "Journal" },
				{ value: "book-series", label: "Book Series" },
				{ value: "conference", label: "Conference" },
				{ value: "repository", label: "Repository" },
			],
			description: "Type of source",
			examples: ["journal", "conference"],
		},
	],
	institutions: [
		{
			property: "works_count",
			label: "Works Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Number of works affiliated with this institution",
			examples: ["15000", "500"],
		},
		{
			property: "cited_by_count",
			label: "Citation Count",
			type: "number",
			sortable: true,
			filterable: true,
			description: "Total citations for affiliated works",
			examples: ["250000", "12000"],
		},
		{
			property: "country_code",
			label: "Country",
			type: "string",
			sortable: false,
			filterable: true,
			description: "Country where institution is located",
			examples: ["US", "GB", "DE"],
		},
		{
			property: "type",
			label: "Institution Type",
			type: "enum",
			sortable: false,
			filterable: true,
			enumValues: [
				{ value: "education", label: "Educational" },
				{ value: "healthcare", label: "Healthcare" },
				{ value: "company", label: "Company" },
				{ value: "archive", label: "Archive" },
				{ value: "nonprofit", label: "Nonprofit" },
				{ value: "government", label: "Government" },
				{ value: "facility", label: "Facility" },
				{ value: "other", label: "Other" },
			],
			description: "Type of institution",
			examples: ["education", "company"],
		},
	],
}

// Default expansion settings for different targets - no filters, sorting, or limits by default
export const DEFAULT_EXPANSION_SETTINGS: Record<string, ExpansionSettings> = {
	[RelationType.REFERENCE]: {
		target: RelationType.REFERENCE,
		name: "References",
	},
	[RelationType.AUTHORSHIP]: {
		target: RelationType.AUTHORSHIP,
		name: "Works",
	},
	[RelationType.AFFILIATION]: {
		target: RelationType.AFFILIATION,
		name: "Institutions",
	},
	[RelationType.PUBLICATION]: {
		target: RelationType.PUBLICATION,
		name: "Sources",
	},
	[RelationType.FUNDED_BY]: {
		target: RelationType.FUNDED_BY,
		name: "Funders",
	},
	[RelationType.RELATED_TO]: {
		target: RelationType.RELATED_TO,
		name: "Related",
	},
}

/**
 * Helper function to get property definitions for a given target
 */
export const getPropertiesForTarget = (target: ExpansionTarget): PropertyDefinition[] => {
	// For relation types, use properties of the target entity type
	// This is a simplified mapping - in practice you might want more sophisticated logic
	const relationTypeValues: readonly string[] = Object.values(RelationType);

	const isRelationType = (value: string): value is RelationType => relationTypeValues.includes(value);

	if (isRelationType(target)) {
		// For now, return work properties as most relations involve works
		return ENTITY_PROPERTIES.works
	}

	const isEntityType = (value: string): value is EntityType => !relationTypeValues.includes(value);

	if (isEntityType(target)) {
		return ENTITY_PROPERTIES[target] ?? []
	}

	return []
};

/**
 * Helper function to get default settings for a target
 */
export const getDefaultSettingsForTarget = (target: ExpansionTarget): ExpansionSettings => {
	const defaultSettings = DEFAULT_EXPANSION_SETTINGS[target] ?? { target }

	// Return settings with proper defaults for optional properties
	const result: ExpansionSettings = {
		target,
		limit: defaultSettings.limit ?? 0, // 0 means no limit
		sorts: defaultSettings.sorts ?? [],
		filters: defaultSettings.filters ?? [],
		enabled: defaultSettings.enabled ?? true,
	}

	if (defaultSettings.name !== undefined && defaultSettings.name !== "") {
		result.name = defaultSettings.name
	}

	return result
};

/**
 * Helper function to validate filter criteria
 */
export const validateFilterCriteria = (
	filter: FilterCriteria,
	property: PropertyDefinition
): boolean => {
	// Check if operator is valid for property type
	switch (property.type) {
		case "number":
		case "year":
			return ["eq", "ne", "gt", "lt", "gte", "lte", "between", "in", "notin"].includes(
				filter.operator
			)
		case "string":
			return ["eq", "ne", "contains", "startswith", "endswith", "in", "notin"].includes(
				filter.operator
			)
		case "boolean":
			return ["eq", "ne"].includes(filter.operator)
		case "enum":
			return ["eq", "ne", "in", "notin"].includes(filter.operator)
		case "date":
			return ["eq", "ne", "gt", "lt", "gte", "lte", "between"].includes(filter.operator)
		default:
			return false
	}
};
