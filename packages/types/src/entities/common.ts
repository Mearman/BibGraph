/**
 * Common utility types, responses, and query parameters for OpenAlex API
 */

import { z } from "zod"

// Response types - schema-based types
export const OpenAlexResponseSchema = <T extends z.ZodType>(resultSchema: T) =>
	z.object({
		results: z.array(resultSchema),
		meta: z.object({
			count: z.number(),
			db_response_time_ms: z.number(),
			page: z.number(),
			per_page: z.number(),
			groups_count: z.number().optional(),
		}),
		group_by: z
			.array(
				z.object({
					key: z.string(),
					key_display_name: z.string(),
					count: z.number(),
					cited_by_count: z.number().optional(),
					works_count: z.number().optional(),
					h_index: z.number().optional(),
				})
			)
			.optional(),
	})

export interface OpenAlexResponse<T> {
	results: T[]
	meta: {
		count: number
		db_response_time_ms: number
		page: number
		per_page: number
		groups_count?: number
	}
	group_by?: {
		key: string
		key_display_name: string
		count: number
		cited_by_count?: number
		works_count?: number
		h_index?: number
	}[]
}

// Query parameters - schema-based types
export const QueryParamsSchema = z
	.object({
		filter: z.string().optional(),
		search: z.string().optional(),
		sort: z.string().optional(),
		page: z.number().optional(),
		per_page: z.number().optional(),
		cursor: z.string().optional(),
		select: z.array(z.string()).optional(),
		sample: z.number().optional(),
		seed: z.number().optional(),
		group_by: z.string().optional(),
		mailto: z.string().optional(),
	})
	.catchall(z.unknown())

export type QueryParams = z.infer<typeof QueryParamsSchema>

// Statistical endpoint parameters - schema-based types
export const StatsParamsSchema = z.object({
	entity_type: z.string().optional(),
	timeframe: z.enum(["all", "year", "month"]).optional(),
	format: z.enum(["json", "csv"]).optional(),
})

export type StatsParams = z.infer<typeof StatsParamsSchema>

// Random sampling parameters - schema-based types
export const SampleParamsSchema = QueryParamsSchema.extend({
	seed: z.number().optional(),
	sample_size: z.number().optional(),
})

export type SampleParams = z.infer<typeof SampleParamsSchema>

// Grouping parameters - schema-based types
export const GroupParamsSchema = QueryParamsSchema.extend({
	group_by: z.string().optional(),
	group_limit: z.number().optional(),
})

export type GroupParams = z.infer<typeof GroupParamsSchema>

// Autocomplete types - schema-based types Base result shape returned by the per-entity autocomplete endpoints (`autocomplete/works`, etc.), which omit entity_type because the requested entity type is implied by the endpoint itself
export const AutocompleteBaseResultSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	hint: z.string().optional(),
	cited_by_count: z.number().optional(),
	works_count: z.number().optional(),
	external_id: z.string().optional(),
	filter_key: z.string().optional(),
})

export type AutocompleteBaseResult = z.infer<typeof AutocompleteBaseResultSchema>

// Full result shape returned by the cross-entity `/autocomplete` endpoint, which tags every result with its entity type
export const AutocompleteResultSchema = AutocompleteBaseResultSchema.extend({
	entity_type: z.enum([
		"work",
		"author",
		"source",
		"institution",
		"topic",
		"publisher",
		"funder",
		"concept",
		"keyword",
		"domain",
		"field",
		"subfield",
	]),
})

export type AutocompleteResult = z.infer<typeof AutocompleteResultSchema>

// Envelope schemas for the two autocomplete response shapes
export const AutocompleteBaseResponseSchema = z.object({
	results: z.array(AutocompleteBaseResultSchema),
	meta: z
		.object({
			count: z.number().optional(),
			page: z.number().optional(),
			per_page: z.number().optional(),
		})
		.optional(),
})

export const AutocompleteResponseSchema = z.object({
	results: z.array(AutocompleteResultSchema),
	meta: z
		.object({
			count: z.number().optional(),
			page: z.number().optional(),
			per_page: z.number().optional(),
		})
		.optional(),
})

// N-grams types - schema-based types
export const NGramSchema = z.object({
	ngram: z.string(),
	ngram_tokens: z.number(),
	ngram_count: z.number(),
	work_count: z.number(),
})

export type NGram = z.infer<typeof NGramSchema>

// Error types - schema-based types
export const OpenAlexErrorSchema = z.object({
	error: z.string(),
	message: z.string(),
	status_code: z.number().optional(),
})

export type OpenAlexError = z.infer<typeof OpenAlexErrorSchema>

/**
 * Text Analysis Result - For /text endpoint - schema-based types
 */
export const TextAnalysisSchema = z.object({
	results: z.array(
		z.object({
			entity_type: z.enum(["topic", "concept", "keyword"]),
			entity_id: z.string(),
			display_name: z.string(),
			score: z.number(),
			confidence: z.number().optional(),
		})
	),
	meta: z.object({
		count: z.number(),
		processing_time_ms: z.number(),
		text_length: z.number(),
	}),
})

export type TextAnalysis = z.infer<typeof TextAnalysisSchema>

// Text analysis result types for the `/text` family of endpoints (`text`, `text/keywords`, `text/topics`, `text/concepts`)
export const TextAnalysisNamedRefSchema = z.object({
	id: z.string(),
	display_name: z.string(),
})

export const TextAnalysisKeywordSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	score: z.number(),
})

export const TextAnalysisTopicSchema = TextAnalysisKeywordSchema.extend({
	level: z.number().optional(),
	subfield: TextAnalysisNamedRefSchema.optional(),
	field: TextAnalysisNamedRefSchema.optional(),
	domain: TextAnalysisNamedRefSchema.optional(),
})

export const TextAnalysisConceptSchema = TextAnalysisKeywordSchema.extend({
	level: z.number(),
	wikidata: z.string().optional(),
})

export const TextAnalysisResponseSchema = z.object({
	keywords: z.array(TextAnalysisKeywordSchema),
	topics: z.array(TextAnalysisTopicSchema),
	concepts: z.array(TextAnalysisConceptSchema),
	meta: z
		.object({
			keywords_count: z.number(),
			topics_count: z.number(),
			concepts_count: z.number(),
			processing_time_ms: z.number().optional(),
		})
		.optional(),
})

export type TextAnalysisNamedRef = z.infer<typeof TextAnalysisNamedRefSchema>
export type TextAnalysisKeyword = z.infer<typeof TextAnalysisKeywordSchema>
export type TextAnalysisTopic = z.infer<typeof TextAnalysisTopicSchema>
export type TextAnalysisConcept = z.infer<typeof TextAnalysisConceptSchema>
export type TextAnalysisResponse = z.infer<typeof TextAnalysisResponseSchema>

/**
 * Base autocomplete options schema
 */
const MAX_AUTOCOMPLETE_PER_PAGE = 200

export const BaseAutocompleteOptionsSchema = z.object({
	per_page: z.number().min(1).max(MAX_AUTOCOMPLETE_PER_PAGE).optional(),
})

export type BaseAutocompleteOptions = z.infer<typeof BaseAutocompleteOptionsSchema>

/**
 * Generic grouped response schema factory
 */
export const createGroupedResponseSchema = <T>(itemSchema: z.ZodType<T>) => z.object({
		results: z.array(itemSchema),
		meta: z.any(), // meta schema is complex, using any for now
		group_by: z.array(
			z.object({
				key: z.string(),
				key_display_name: z.string(),
				count: z.number().min(0),
			})
		),
		next: z.string().optional(),
		previous: z.string().optional(),
	});

/**
 * Generic grouped response type
 */
export type GroupedResponse<T> = z.infer<ReturnType<typeof createGroupedResponseSchema<T>>>
