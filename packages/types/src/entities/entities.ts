/**
 * Entity types for OpenAlex API
 */

import { z } from "zod"

import type {
	OpenAlexId,
	PartialExceptId,
} from "./base"
import type {
	authorSchema,
	conceptSchema,
	domainSchema,
	fieldSchema,
	institutionSchema,
	publisherSchema,
	subfieldSchema,
	workSchema,
} from "./schemas"
import {
	funderSchema,
	keywordSchema,
	sourceSchema,
	topicSchema,
} from "./schemas"

/**
 * Maps base entity field names to their types.
 */
interface BaseEntityFieldMap {
	id: OpenAlexId
	display_name: string
	cited_by_count: number
	counts_by_year: CountsByYear[]
	updated_date: string
	created_date: string
}

/**
 * Maps entity-with-works field names to their types (includes base fields).
 */
interface EntityWithWorksFieldMap extends BaseEntityFieldMap {
	works_count: number
	works_api_url: string
}

/**
 * Generic base entity type that picks only the specified fields. `Keys` is a union type of allowed field names for this entity.
 * @example
 * ```
 * type AuthorKeys = 'id' | 'display_name' | 'orcid';
 * interface Author extends BaseEntity<AuthorKeys> {
 * orcid?: ORCID;
 * }
 * ```
 */
export type BaseEntity<Keys extends string = string> = {
	[K in Keys & keyof BaseEntityFieldMap]: BaseEntityFieldMap[K]
}

/**
 * Generic entity-with-works type that picks only the specified fields. `Keys` is a union type of allowed field names for this entity.
 */
export type EntityWithWorks<Keys extends string = string> = {
	[K in Keys & keyof EntityWithWorksFieldMap]: EntityWithWorksFieldMap[K]
}

// Common utility types - schema-based types
export const CountsByYearSchema = z.object({
	year: z.number(),
	cited_by_count: z.number(),
	works_count: z.number().optional(),
	oa_works_count: z.number().optional(),
})

export type CountsByYear = z.infer<typeof CountsByYearSchema>

export const LocationSchema = z.object({
	source: z
		.object({
			id: z.string(),
			display_name: z.string(),
			issn_l: z.string().optional(),
			issn: z.array(z.string()).optional(),
			is_oa: z.boolean(),
			is_in_doaj: z.boolean(),
			host_organization: z.string().optional(),
			host_organization_name: z.string().optional(),
			host_organization_lineage: z.array(z.string()).optional(),
			type: z.string(),
		})
		.optional(),
	landing_page_url: z.string().optional(),
	pdf_url: z.string().optional(),
	is_oa: z.boolean(),
	version: z.string().optional(),
	license: z.string().optional(),
})

export type Location = z.infer<typeof LocationSchema>

// Note: InstitutionEntity is the main institution type inferred from institutionSchema
// This Institution type might be for a simplified institution representation in other contexts
export const InstitutionSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	ror: z.string().optional(),
	country_code: z.string().optional(),
	type: z.string(),
	lineage: z.array(z.string()).optional(),
})

export type Institution = z.infer<typeof InstitutionSchema>

export const AuthorshipSchema = z.object({
	author_position: z.enum(["first", "middle", "last"]),
	author: z.object({
		id: z.string(),
		display_name: z.string(),
		orcid: z.string().optional(),
	}),
	institutions: z.array(InstitutionSchema),
	countries: z.array(z.string()),
	is_corresponding: z.boolean(),
	raw_author_name: z.string().optional(),
	raw_affiliation_strings: z.array(z.string()).optional(),
})

export type Authorship = z.infer<typeof AuthorshipSchema>

// Work entity
// Work type inferred from comprehensive Zod schema
export type Work = z.infer<typeof workSchema>

// Partial hydration types - only id is guaranteed, all other fields are optional
export type PartialWork = PartialExceptId<Work>

/**
 * Author entity - define the complete type first.
 */
// Author type inferred from comprehensive Zod schema
export type Author = z.infer<typeof authorSchema>

export type PartialAuthor = PartialExceptId<Author>

// Source entity (journals, conferences, etc.)
// Source type inferred from comprehensive Zod schema
export type Source = z.infer<typeof sourceSchema>

// Institution entity
// Institution type inferred from comprehensive Zod schema
export type InstitutionEntity = z.infer<typeof institutionSchema>

// Concept type inferred from comprehensive Zod schema
export type Concept = z.infer<typeof conceptSchema>

// Topic entity (replacing Concepts)
// Topic type inferred from comprehensive Zod schema
export type Topic = z.infer<typeof topicSchema>

// Domain entity (top level of taxonomy hierarchy)
// Domain type inferred from comprehensive Zod schema
export type Domain = z.infer<typeof domainSchema>

// Field entity (middle level of taxonomy hierarchy)
// Field type inferred from comprehensive Zod schema
export type Field = z.infer<typeof fieldSchema>

// Subfield entity (below field, above topic in taxonomy hierarchy)
// Subfield type inferred from comprehensive Zod schema
export type Subfield = z.infer<typeof subfieldSchema>

// Publisher entity
// Publisher type inferred from comprehensive Zod schema
export type Publisher = z.infer<typeof publisherSchema>

// Funder entity
// Funder type inferred from comprehensive Zod schema
export type Funder = z.infer<typeof funderSchema>

/**
 * Keywords Entity - Research keywords and their usage
 */
// Keyword type inferred from comprehensive Zod schema
export type Keyword = z.infer<typeof keywordSchema>

/**
 * Year-by-year statistics for a keyword - schema-based type
 */
export const KeywordCountsByYearSchema = z.object({
	/**
	Calendar year (4-digit year)
	 */
	year: z.number(),

	/**
	Number of works published in this year with this keyword (non-negative)
	 */
	works_count: z.number(),

	/**
	Number of citations in this year for works with this keyword (non-negative)
	 */
	cited_by_count: z.number(),
})

export type KeywordCountsByYear = z.infer<typeof KeywordCountsByYearSchema>

// Partial types for other entities
export type PartialSource = PartialExceptId<Source>
export type PartialInstitution = PartialExceptId<InstitutionEntity>

// Union types for all entities
export type OpenAlexEntity =
	| Work
	| Author
	| Source
	| InstitutionEntity
	| Topic
	| Concept
	| Publisher
	| Funder
	| Keyword
	| Domain
	| Field
	| Subfield

/**
 * All entity types as a typed readonly array - SINGLE SOURCE OF TRUTH
 * EntityType is derived from this array
 */
export const ENTITY_TYPES = [
	"works",
	"authors",
	"sources",
	"institutions",
	"topics",
	"concepts",
	"publishers",
	"funders",
	"keywords",
	"domains",
	"fields",
	"subfields",
] as const

/**
Entity type union - derived from ENTITY_TYPES
 */
export type EntityType = (typeof ENTITY_TYPES)[number]

// Mapping from entity type to entity interface
export interface EntityTypeMap {
	works: Work
	authors: Author
	sources: Source
	institutions: InstitutionEntity
	topics: Topic
	concepts: Concept
	publishers: Publisher
	funders: Funder
	keywords: Keyword
	domains: Domain
	fields: Field
	subfields: Subfield
}

// Field arrays for use with select parameter

/**
 * Fields that can be selected for BaseEntity. These are the core fields present on all OpenAlex entities.
 */
export const BASE_ENTITY_FIELDS = [
	"id",
	"display_name",
	"cited_by_count",
	"counts_by_year",
	"updated_date",
	"created_date",
] as const satisfies readonly (keyof BaseEntity)[]

export type BaseEntityField = (typeof BASE_ENTITY_FIELDS)[number]

/**
 * Fields that can be selected for EntityWithWorks. These are the fields present on entities that have associated works collections.
 */
export const ENTITY_WITH_WORKS_FIELDS = [
	...BASE_ENTITY_FIELDS,
	"works_count",
	"works_api_url",
] as const satisfies readonly (keyof EntityWithWorks)[]

export type EntityWithWorksField = (typeof ENTITY_WITH_WORKS_FIELDS)[number]

/**
 * Fields that can be selected for Author entities.
 * Use with the select parameter to request specific fields.
 */
export const AUTHOR_FIELDS = [
	"id",
	"display_name",
	"cited_by_count",
	"counts_by_year",
	"updated_date",
	"created_date",
	"orcid",
	"display_name_alternatives",
	"ids",
	"last_known_institutions",
	"affiliations",
	"summary_stats",
	"x_concepts",
	"topics",
] as const satisfies readonly (keyof Author)[]

export type AuthorField = (typeof AUTHOR_FIELDS)[number]

/**
 * Fields that can be selected for Work entities.
 */
export const WORK_FIELDS = [
	...BASE_ENTITY_FIELDS,
	"doi",
	"title",
	"publication_year",
	"publication_date",
	"ids",
	"primary_location",
	"best_oa_location",
	"locations",
	"locations_count",
	"authorships",
	"countries_distinct_count",
	"institutions_distinct_count",
	"corresponding_author_ids",
	"corresponding_institution_ids",
	"apc_list",
	"apc_paid",
	"fwci",
	"has_fulltext",
	"fulltext_origin",
	"cited_by_api_url",
	"type",
	"type_crossref",
	"indexed_in",
	"open_access",
	"cited_by_percentile_year",
	"concepts",
	"mesh",
	"alternate_host_venues",
	"referenced_works",
	"referenced_works_count",
	"related_works",
	"sustainable_development_goals",
	"grants",
	"datasets",
	"versions",
	"is_retracted",
	"is_paratext",
	"abstract_inverted_index",
	"biblio",
	"language",
	"topics",
	"keywords",
] as const satisfies readonly (keyof Work)[]

export type WorkField = (typeof WORK_FIELDS)[number]

/**
 * Fields that can be selected for Source entities.
 */
export const SOURCE_FIELDS = sourceSchema.keyof().options

export type SourceField = (typeof SOURCE_FIELDS)[number]

/**
 * Fields that can be selected for Institution entities.
 */
export const INSTITUTION_FIELDS = [
	"id",
	"display_name",
	"cited_by_count",
	"counts_by_year",
	"updated_date",
	"created_date",
	"ror",
	"country_code",
	"type",
	"homepage_url",
	"image_url",
	"image_thumbnail_url",
	"display_name_acronyms",
	"display_name_alternatives",
	"ids",
	"geo",
	"international",
	"associated_institutions",
	"x_concepts",
	"topics",
	"lineage",
] as const satisfies readonly (keyof InstitutionEntity)[]

export type InstitutionField = (typeof INSTITUTION_FIELDS)[number]

/**
 * Fields that can be selected for Concept entities.
 * Note: Concepts are being phased out in favor of Topics.
 */
export const CONCEPT_FIELDS = [
	"id",
	"display_name",
	"cited_by_count",
	"counts_by_year",
	"updated_date",
	"created_date",
	"works_count",
	"works_api_url",
	"wikidata",
	"level",
	"description",
	"ids",
	"image_url",
	"image_thumbnail_url",
	"international",
	"ancestors",
	"related_concepts",
	"summary_stats",
] as const satisfies readonly (keyof Concept)[]

export type ConceptField = (typeof CONCEPT_FIELDS)[number]

/**
 * Fields that can be selected for Topic entities.
 */
export const TOPIC_FIELDS = topicSchema.keyof().options

export type TopicField = (typeof TOPIC_FIELDS)[number]

/**
 * Fields that can be selected for Publisher entities.
 */
export const PUBLISHER_FIELDS = [
	"id",
	"display_name",
	"cited_by_count",
	"counts_by_year",
	"updated_date",
	"created_date",
	"works_count",
	"works_api_url",
	"alternate_titles",
	"country_codes",
	"hierarchy_level",
	"parent_publisher",
	"lineage",
	"sources_count",
	"ids",
	"sources_api_url",
] as const satisfies readonly (keyof Publisher)[]

export type PublisherField = (typeof PUBLISHER_FIELDS)[number]

/**
 * Fields that can be selected for Funder entities.
 */
export const FUNDER_FIELDS = funderSchema.keyof().options

export type FunderField = (typeof FUNDER_FIELDS)[number]

/**
 * Fields that can be selected for Keyword entities.
 */
export const KEYWORD_FIELDS = keywordSchema.keyof().options

export type KeywordField = (typeof KEYWORD_FIELDS)[number]

// Note: Types from ./base are exported via the barrel file (index.ts)
// Do not re-export here to avoid duplicate exports
