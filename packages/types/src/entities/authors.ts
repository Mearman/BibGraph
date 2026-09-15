/**
 * Author-specific schemas and types for OpenAlex API using Zod
 */

import { z } from "zod"

import { BaseAutocompleteOptionsSchema } from "./common"
import { AuthorsFiltersSchema } from "./filters"
import { authorSchema } from "./schemas"
import { createSchemaTypeGuard } from "./utils"

const MIN_PUBLICATION_YEAR = 1000
const MAX_PUBLICATION_YEAR = 2100
const MAX_AUTHOR_GROUPING_PER_PAGE = 200

/**
 * Type guard for Author entities
 */
export const isAuthor = createSchemaTypeGuard(authorSchema)

// ============================================================================
// AUTHOR SCHEMAS
// ============================================================================

/**
 * Author sort options
 */
export const AuthorSortOptionSchema = z.enum([
	"relevance_score:desc",
	"cited_by_count",
	"works_count",
	"created_date",
])

export type AuthorSortOption = z.infer<typeof AuthorSortOptionSchema>

/**
 * Author works filters (extends base AuthorsFilters)
 */
export const AuthorWorksFiltersSchema = z.object({
	publication_year: z.union([z.string(), z.number()]).optional(),
	is_oa: z.boolean().optional(),
	type: z.union([z.string(), z.array(z.string())]).optional(),
	"primary_topic.id": z.union([z.string(), z.array(z.string())]).optional(),
})

export type AuthorWorksFilters = z.infer<typeof AuthorWorksFiltersSchema>

/**
 * Author collaborators filters
 */
export const AuthorCollaboratorsFiltersSchema = z.object({
	min_works: z.number().min(0).optional(),
	from_publication_year: z.number().min(MIN_PUBLICATION_YEAR).max(MAX_PUBLICATION_YEAR).optional(),
	to_publication_year: z.number().min(MIN_PUBLICATION_YEAR).max(MAX_PUBLICATION_YEAR).optional(),
})

export type AuthorCollaboratorsFilters = z.infer<typeof AuthorCollaboratorsFiltersSchema>

/**
 * Group by result for author statistics
 */
export const GroupByResultSchema = z.object({
	key: z.string(),
	key_display_name: z.string(),
	count: z.number().min(0),
})

export type GroupByResult = z.infer<typeof GroupByResultSchema>

/**
 * Author grouping options
 */
export const AuthorGroupingOptionsSchema = z.object({
	filters: z.lazy(() => AuthorsFiltersSchema).optional(),
	sort: z.string().optional(),
	per_page: z.number().min(1).max(MAX_AUTHOR_GROUPING_PER_PAGE).optional(),
	page: z.number().min(1).optional(),
})

export type AuthorGroupingOptions = z.infer<typeof AuthorGroupingOptionsSchema>

/**
 * Author autocomplete options (extends base)
 */
export const AuthorAutocompleteOptionsSchema = BaseAutocompleteOptionsSchema.extend({})

export type AuthorAutocompleteOptions = z.infer<typeof AuthorAutocompleteOptionsSchema>

/**
 * Author search options
 */
export const AuthorSearchOptionsSchema = z.object({
	filters: z.lazy(() => AuthorsFiltersSchema).optional(),
	sort: z.enum(["relevance_score", "cited_by_count", "works_count", "created_date"]).optional(),
	page: z.number().optional(),
	per_page: z.number().optional(),
	select: z.array(z.string()).optional(),
})

export type AuthorSearchOptions = z.infer<typeof AuthorSearchOptionsSchema>
