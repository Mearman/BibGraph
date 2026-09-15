/**
 * Concept-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"

import { BaseAutocompleteOptionsSchema } from "./common"
import { ConceptsFiltersSchema } from "./filters"
import { conceptSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

/**
 * Type guard for Concept entities
 */
export const isConcept = createSchemaTypeGuard(conceptSchema)

const MAX_CONCEPTS_PER_PAGE = 200

// ============================================================================
// CONCEPT SCHEMAS
// ============================================================================

/**
 * Concept sort options
 */
export const ConceptSortOptionSchema = z.enum([
	"relevance_score",
	"relevance_score:desc",
	"cited_by_count",
	"cited_by_count:desc",
	"works_count",
	"works_count:desc",
	"created_date",
	"created_date:desc",
	"updated_date",
	"updated_date:desc",
	"display_name",
	"display_name:desc",
	"level",
	"level:desc",
	"random",
])

export type ConceptSortOption = z.infer<typeof ConceptSortOptionSchema>

/**
 * Concept select fields
 */
export const ConceptSelectFieldSchema = z.enum([
	"id",
	"display_name",
	"description",
	"level",
	"wikidata",
	"works_count",
	"cited_by_count",
	"ids",
	"counts_by_year",
	"works_api_url",
	"updated_date",
	"created_date",
])

export type ConceptSelectField = z.infer<typeof ConceptSelectFieldSchema>

/**
 * Concept query parameters
 */
export const ConceptsQueryParamsSchema = z.object({
	filter: z.string().optional(),
	search: z.string().optional(),
	sort: ConceptSortOptionSchema.optional(),
	page: z.number().min(1).optional(),
	per_page: z.number().min(1).max(MAX_CONCEPTS_PER_PAGE).optional(),
	cursor: z.string().optional(),
	select: z.array(ConceptSelectFieldSchema).optional(),
	sample: z.number().min(0).optional(),
	seed: z.number().min(0).optional(),
	group_by: z.string().optional(),
})

export type ConceptsQueryParams = z.infer<typeof ConceptsQueryParamsSchema>

/**
 * Concept search options
 */
export const ConceptSearchOptionsSchema = z.object({
	filters: z.lazy(() => ConceptsFiltersSchema).optional(),
	sort: ConceptSortOptionSchema.optional(),
	page: z.number().min(1).optional(),
	per_page: z.number().min(1).max(MAX_CONCEPTS_PER_PAGE).optional(),
	select: z.array(ConceptSelectFieldSchema).optional(),
})

export type ConceptSearchOptions = z.infer<typeof ConceptSearchOptionsSchema>

/**
 * Concept autocomplete options (extends base)
 */
export const ConceptAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type ConceptAutocompleteOptions = z.infer<typeof ConceptAutocompleteOptionsSchema>
