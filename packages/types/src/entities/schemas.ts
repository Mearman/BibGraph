/**
 * Zod schemas for OpenAlex API response validation
 * Provides type-safe validation of API responses
 */

import { z } from "zod"

// Base schemas for common structures
export const openAlexIdSchema = z.string().regex(/^https:\/\/openalex\.org\/[A-Z]\d+$/)

export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}$/)

const MAX_META_PER_PAGE = 200
const MAX_CONCEPT_LEVEL = 5

// Counts by year schema
export const countsByYearSchema = z.object({
	year: z.number().int(),
	cited_by_count: z.number().int().min(0),
	works_count: z.number().int().min(0),
})

// Meta schema for API responses
export const metaSchema = z.object({
	count: z.number().int().min(0),
	db_response_time_ms: z.number().min(0),
	page: z.number().int().min(1),
	per_page: z.number().int().min(1).max(MAX_META_PER_PAGE),
	groups_count: z.number().int().min(0).optional(),
})

// Group by schema for aggregated responses
export const groupBySchema = z.object({
	key: z.string(),
	key_display_name: z.string(),
	count: z.number().int().min(0),
	cited_by_count: z.number().int().min(0).optional(),
	works_count: z.number().int().min(0).optional(),
	h_index: z.number().int().min(0).optional(),
})

// Base entity schema
export const baseEntitySchema = z.object({
	id: openAlexIdSchema,
	display_name: z.string(),
	cited_by_count: z.number().int().min(0),
	counts_by_year: z.array(countsByYearSchema),
	updated_date: dateStringSchema,
	created_date: dateStringSchema,
})

// Entity with works schema (extends base entity)
export const entityWithWorksSchema = baseEntitySchema.extend({
	works_count: z.number().int().min(0),
	works_api_url: z.string(),
})

// Work schema
export const workSchema = baseEntitySchema.extend({
	doi: z.string().optional(),
	title: z.string().optional(),
	publication_year: z.number().int().optional(),
	publication_date: dateStringSchema.optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			doi: z.string().optional(),
			pmid: z.string().optional(),
			pmcid: z.string().optional(),
		})
		.optional(),
	primary_location: z.any().optional(), // Location schema would be complex
	best_oa_location: z.any().optional(), // Location schema would be complex
	locations: z.array(z.any()).optional(), // Location schema would be complex
	locations_count: z.number().int().optional(),
	authorships: z
		.array(
			z.object({
				author_position: z.string(),
				author: z.object({
					id: openAlexIdSchema.optional(),
					display_name: z.string(),
					orcid: z.string().optional(),
				}),
				institutions: z
					.array(
						z.object({
							id: openAlexIdSchema.optional(),
							display_name: z.string(),
							ror: z.string().optional(),
							country_code: z.string().optional(),
							type: z.string().optional(),
						})
					)
					.optional(),
			})
		)
		.optional(),
	countries_distinct_count: z.number().int().optional(),
	institutions_distinct_count: z.number().int().optional(),
	corresponding_author_ids: z.array(openAlexIdSchema).optional(),
	corresponding_institution_ids: z.array(openAlexIdSchema).optional(),
	apc_list: z.any().optional(), // APCInfo schema would be complex
	apc_paid: z.any().optional(), // APCInfo schema would be complex
	fwci: z.number().optional(),
	has_fulltext: z.boolean().optional(),
	fulltext_origin: z.string().optional(),
	cited_by_api_url: z.string().optional(),
	type: z.string().optional(),
	type_crossref: z.string().optional(),
	indexed_in: z.array(z.string()).optional(),
	open_access: z
		.object({
			is_oa: z.boolean().optional(),
			oa_status: z.string().optional(),
			oa_url: z.string().optional(),
			any_repository_has_fulltext: z.boolean().optional(),
		})
		.optional(),
	cited_by_percentile_year: z
		.object({
			min: z.number().optional(),
			max: z.number().optional(),
		})
		.optional(),
	concepts: z.array(z.any()).optional(), // ConceptItem schema would be complex
	mesh: z
		.array(
			z.object({
				descriptor_ui: z.string().optional(),
				descriptor_name: z.string().optional(),
				qualifier_ui: z.string().optional(),
				qualifier_name: z.string().optional(),
				is_major_topic: z.boolean().optional(),
			})
		)
		.optional(),
	alternate_host_venues: z
		.array(
			z.object({
				id: openAlexIdSchema.optional(),
				display_name: z.string().optional(),
				type: z.string().optional(),
				url: z.string().optional(),
				is_oa: z.boolean().optional(),
				version: z.string().optional(),
				license: z.string().optional(),
			})
		)
		.optional(),
	referenced_works: z.array(openAlexIdSchema).optional(),
	referenced_works_count: z.number().int().optional(),
	related_works: z.array(openAlexIdSchema).optional(),
	sustainable_development_goals: z
		.array(
			z.object({
				id: openAlexIdSchema.optional(),
				display_name: z.string().optional(),
				score: z.number().optional(),
			})
		)
		.optional(),
	grants: z
		.array(
			z.object({
				funder: z.string().optional(),
				funder_display_name: z.string().optional(),
				award_id: z.string().optional(),
			})
		)
		.optional(),
	datasets: z
		.array(
			z.object({
				id: z.string().optional(),
				display_name: z.string().optional(),
			})
		)
		.optional(),
	versions: z
		.array(
			z.object({
				version: z.string().optional(),
				type: z.string().optional(),
			})
		)
		.optional(),
	is_retracted: z.boolean().optional(),
	is_paratext: z.boolean().optional(),
	abstract_inverted_index: z.record(z.string(), z.array(z.number().int())).optional(),
	biblio: z
		.object({
			volume: z.string().optional(),
			issue: z.string().optional(),
			first_page: z.string().optional(),
			last_page: z.string().optional(),
		})
		.optional(),
	language: z.string().optional(),
	topics: z.array(z.any()).optional(), // TopicItem schema would be complex
	keywords: z.array(z.string()).optional(),
	is_xpac: z.boolean().optional(),
})

// Concept schema
export const conceptSchema = baseEntitySchema.extend({
	wikidata: z.string().optional(),
	level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
	description: z.string().optional(),
	works_count: z.number().int().min(0),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.optional(),
	ids: z.object({
		openalex: openAlexIdSchema,
		wikidata: z.string().optional(),
		mag: z.string().optional(),
		wikipedia: z.string().optional(),
		umls_cui: z.array(z.string()).optional(),
	}),
	image_url: z.string().optional(),
	image_thumbnail_url: z.string().optional(),
	international: z
		.object({
			display_name: z.record(z.string(), z.string()),
			description: z.record(z.string(), z.string()).optional(),
		})
		.optional(),
	ancestors: z
		.array(
			z.object({
				id: openAlexIdSchema,
				wikidata: z.string().optional(),
				display_name: z.string(),
				level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
			})
		)
		.optional(),
	related_concepts: z
		.array(
			z.object({
				id: openAlexIdSchema,
				wikidata: z.string().optional(),
				display_name: z.string(),
				level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
				score: z.number().min(0),
			})
		)
		.optional(),
	works_api_url: z.string(),
})

// Author schema
export const authorSchema = baseEntitySchema.extend({
	works_count: z.number().int().min(0),
	orcid: z.string().optional(),
	display_name_alternatives: z.array(z.string()).optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			orcid: z.string().optional(),
		})
		.optional(),
	last_known_institutions: z.array(z.any()).optional(), // Institution schema would be complex
	affiliations: z
		.array(
			z.object({
				institution: z.any(), // Institution schema would be complex
				years: z.array(z.number().int()),
			})
		)
		.optional(),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.optional(),
	x_concepts: z.array(z.any()).optional(), // ConceptItem schema would be complex
	topics: z.array(z.any()).optional(), // TopicItem schema would be complex
})

// Institution schema
export const institutionSchema = baseEntitySchema.extend({
	works_count: z.number().int().min(0),
	ror: z.string().optional(),
	country_code: z.string(),
	type: z.string(),
	homepage_url: z.string().optional(),
	image_url: z.string().optional(),
	image_thumbnail_url: z.string().optional(),
	display_name_acronyms: z.array(z.string()).optional(),
	display_name_alternatives: z.array(z.string()).optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().optional(),
			grid: z.string().optional(),
		})
		.optional(),
	geo: z.object({
		city: z.string().optional(),
		geonames_city_id: z.string().optional(),
		region: z.string().optional(),
		country_code: z.string(),
		country: z.string(),
		latitude: z.number().optional(),
		longitude: z.number().optional(),
	}),
	international: z.object({
		display_name: z.record(z.string(), z.string()),
	}),
	associated_institutions: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
				ror: z.string().optional(),
				country_code: z.string(),
				type: z.string(),
				relationship: z.string(),
			})
		)
		.optional(),
	x_concepts: z.array(z.any()).optional(), // ConceptItem schema would be complex
	topics: z.array(z.any()).optional(), // TopicItem schema would be complex
	lineage: z.array(openAlexIdSchema).optional(),
})

// Generic OpenAlex response schema
export const openAlexResponseSchema = <T extends z.ZodType>(resultSchema: T) =>
	z.object({
		results: z.array(resultSchema),
		meta: metaSchema,
		group_by: z.array(groupBySchema).optional(),
	})

// Schema for basic API validation (non-null, object structure)
export const apiResponseSchema = z.unknown().refine((data) => {
	if (data === null || data === undefined) {
		throw new Error("Received null or undefined response from API")
	}
	return true
})

// Schema for static data validation
export const staticDataSchema = z.unknown()

// Source schema
export const sourceSchema = entityWithWorksSchema.extend({
	issn_l: z.string().optional(),
	issn: z.array(z.string()).optional(),
	publisher: z.string().optional(),
	host_organization: openAlexIdSchema.optional(),
	host_organization_name: z.string().optional(),
	host_organization_lineage: z.array(openAlexIdSchema).optional(),
	is_oa: z.boolean(),
	is_in_doaj: z.boolean(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			issn_l: z.string().optional(),
			issn: z.array(z.string()).optional(),
			mag: z.string().optional(),
			wikidata: z.string().optional(),
		})
		.optional(),
	homepage_url: z.string().optional(),
	apc_prices: z
		.array(
			z.object({
				price: z.number().optional(),
				currency: z.string().optional(),
			})
		)
		.optional(),
	apc_usd: z.number().optional(),
	country_code: z.string().optional(),
	societies: z.array(z.string()).optional(),
	alternate_titles: z.array(z.string()).optional(),
	abbreviated_title: z.string().optional(),
	type: z.string(),
	x_concepts: z.array(z.any()).optional(), // ConceptItem schema would be complex
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.optional(),
	topics: z.array(z.any()).optional(), // TopicItem schema would be complex
})

// Publisher schema
export const publisherSchema = entityWithWorksSchema.extend({
	alternate_titles: z.array(z.string()).optional(),
	country_codes: z.array(z.string()).optional(),
	hierarchy_level: z.number().int(),
	parent_publisher: openAlexIdSchema.optional(),
	lineage: z.array(openAlexIdSchema),
	sources_count: z.number().int().min(0),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().optional(),
			wikidata: z.string().optional(),
		})
		.optional(),
	sources_api_url: z.string(),
})

// Funder schema
export const funderSchema = entityWithWorksSchema.extend({
	alternate_titles: z.array(z.string()).optional(),
	country_code: z.string().optional(),
	description: z.string().optional(),
	homepage_url: z.string().optional(),
	image_url: z.string().optional(),
	image_thumbnail_url: z.string().optional(),
	grants_count: z.number().int().min(0),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().optional(),
			wikidata: z.string().optional(),
			crossref: z.string().optional(),
		})
		.optional(),
	roles: z
		.array(
			z.object({
				role: z.string(),
				id: openAlexIdSchema,
				works_count: z.number().int().min(0),
			})
		)
		.optional(),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.optional(),
	topics: z.array(z.any()).optional(), // TopicItem schema would be complex
})

// Topic schema (replacing Concepts)
export const topicSchema = entityWithWorksSchema.extend({
	description: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().optional(),
		})
		.optional(),
	subfield: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	field: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	domain: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
})

// Domain schema (top level of taxonomy hierarchy)
export const domainSchema = entityWithWorksSchema.extend({
	description: z.string().optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().optional(),
			wikipedia: z.string().optional(),
		})
		.optional(),
	display_name_alternatives: z.array(z.string()).optional(),
	fields: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
})

// Field schema (middle level of taxonomy hierarchy)
export const fieldSchema = entityWithWorksSchema.extend({
	description: z.string().optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().optional(),
			wikipedia: z.string().optional(),
		})
		.optional(),
	display_name_alternatives: z.array(z.string()).optional(),
	domain: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	subfields: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
})

// Subfield schema (below field, above topic in taxonomy hierarchy)
export const subfieldSchema = entityWithWorksSchema.extend({
	description: z.string().optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().optional(),
			wikipedia: z.string().optional(),
		})
		.optional(),
	display_name_alternatives: z.array(z.string()).optional(),
	field: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	domain: z.object({
		id: openAlexIdSchema,
		display_name: z.string(),
	}),
	topics: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.optional(),
})

// Keyword schema
export const keywordSchema = baseEntitySchema.extend({
	description: z.string().optional(),
	keywords: z.array(z.string()).optional(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().optional(),
		})
		.optional(),
})

// Specific response schemas
export const workResponseSchema = openAlexResponseSchema(workSchema)
export const authorResponseSchema = openAlexResponseSchema(authorSchema)
export const institutionResponseSchema = openAlexResponseSchema(institutionSchema)
export const sourceResponseSchema = openAlexResponseSchema(sourceSchema)
export const publisherResponseSchema = openAlexResponseSchema(publisherSchema)
export const funderResponseSchema = openAlexResponseSchema(funderSchema)
export const topicResponseSchema = openAlexResponseSchema(topicSchema)
export const domainResponseSchema = openAlexResponseSchema(domainSchema)
export const fieldResponseSchema = openAlexResponseSchema(fieldSchema)
export const subfieldResponseSchema = openAlexResponseSchema(subfieldSchema)
export const keywordResponseSchema = openAlexResponseSchema(keywordSchema)
