/**
 * Zod schemas for OpenAlex API response validation
 * Provides type-safe validation of API responses
 */

import { z } from "zod"

// Base schemas for common structures
export const openAlexIdSchema = z.string().regex(/^https:\/\/openalex\.org\/[A-Z]\d+$/)

// OpenAlex returns full ISO timestamps for updated_date/created_date on most entities and plain YYYY-MM-DD dates elsewhere (for example work publication_date); both formats are accepted.
export const dateStringSchema = z.string().regex(/^\d{4}-\d{2}-\d{2}(?:[T ].+)?$/)

const MAX_META_PER_PAGE = 200
const MAX_CONCEPT_LEVEL = 5

// Works and topics attach keywords as scored references rather than bare display-name strings.
const keywordReferenceSchema = z.object({
	id: z.string(),
	display_name: z.string(),
	score: z.number().nullish(),
})

// Counts by year for a work: OpenAlex reports only cited_by_count per year here, so both work counts are optional.
export const countsByYearSchema = z.object({
	year: z.number().int(),
	cited_by_count: z.number().int().min(0),
	works_count: z.number().int().min(0).nullish(),
	oa_works_count: z.number().int().min(0).nullish(),
})

// Counts by year for an entity that has works (authors, sources, institutions, keywords and the rest): works_count is always reported, so it stays required for consumers that chart it.
export const entityCountsByYearSchema = countsByYearSchema.extend({
	works_count: z.number().int().min(0),
})

// Meta schema for API responses
export const metaSchema = z.object({
	count: z.number().int().min(0),
	db_response_time_ms: z.number().min(0),
	page: z.number().int().min(1),
	per_page: z.number().int().min(1).max(MAX_META_PER_PAGE),
	groups_count: z.number().int().min(0).nullable().nullish(),
})

// Group by schema for aggregated responses
export const groupBySchema = z.object({
	key: z.string(),
	key_display_name: z.string(),
	count: z.number().int().min(0),
	cited_by_count: z.number().int().min(0).nullish(),
	works_count: z.number().int().min(0).nullish(),
	h_index: z.number().int().min(0).nullish(),
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
	counts_by_year: z.array(entityCountsByYearSchema),
	works_count: z.number().int().min(0),
	works_api_url: z.string(),
})

// Work schema
// Rows trimmed by the relationship registry's select lists (see relationship-queries-registry) carry only the fields their list names, so every field those lists omit is nullish on the schemas that validate relationship rows (work, author, institution, source); full responses still carry all of them.
export const workSchema = baseEntitySchema.extend({
	counts_by_year: z.array(countsByYearSchema).nullish(),
	updated_date: dateStringSchema.nullish(),
	created_date: dateStringSchema.nullish(),
	doi: z.string().nullish(),
	title: z.string().nullish(),
	publication_year: z.number().int().nullish(),
	publication_date: dateStringSchema.nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			doi: z.string().nullish(),
			pmid: z.string().nullish(),
			pmcid: z.string().nullish(),
		})
		.nullish(),
	primary_location: z.any().nullish(), // Location schema would be complex
	best_oa_location: z.any().nullish(), // Location schema would be complex
	locations: z.array(z.any()).nullish(), // Location schema would be complex
	locations_count: z.number().int().nullish(),
	authorships: z
		.array(
			z.object({
				author_position: z.string(),
				author: z.object({
					id: openAlexIdSchema.nullish(),
					display_name: z.string(),
					orcid: z.string().nullish(),
				}),
				institutions: z
					.array(
						z.object({
							id: openAlexIdSchema.nullish(),
							display_name: z.string(),
							ror: z.string().nullish(),
							// Institutions without a country (for example consortia) report null
							country_code: z.string().nullable().nullish(),
							type: z.string().nullish(),
						})
					)
					.nullish(),
			})
		)
		.nullish(),
	countries_distinct_count: z.number().int().nullish(),
	institutions_distinct_count: z.number().int().nullish(),
	corresponding_author_ids: z.array(openAlexIdSchema).nullish(),
	corresponding_institution_ids: z.array(openAlexIdSchema).nullish(),
	apc_list: z.any().nullish(), // APCInfo schema would be complex
	apc_paid: z.any().nullish(), // APCInfo schema would be complex
	fwci: z.number().nullish(),
	has_fulltext: z.boolean().nullish(),
	fulltext_origin: z.string().nullish(),
	cited_by_api_url: z.string().nullish(),
	type: z.string().nullish(),
	type_crossref: z.string().nullish(),
	indexed_in: z.array(z.string()).nullish(),
	open_access: z
		.object({
			is_oa: z.boolean().nullish(),
			oa_status: z.string().nullish(),
			oa_url: z.string().nullish(),
			any_repository_has_fulltext: z.boolean().nullish(),
		})
		.nullish(),
	cited_by_percentile_year: z
		.object({
			min: z.number().nullish(),
			max: z.number().nullish(),
		})
		.nullish(),
	concepts: z.array(z.any()).nullish(), // ConceptItem schema would be complex
	mesh: z
		.array(
			z.object({
				descriptor_ui: z.string().nullish(),
				descriptor_name: z.string().nullish(),
				qualifier_ui: z.string().nullish(),
				qualifier_name: z.string().nullish(),
				is_major_topic: z.boolean().nullish(),
			})
		)
		.nullish(),
	alternate_host_venues: z
		.array(
			z.object({
				id: openAlexIdSchema.nullish(),
				display_name: z.string().nullish(),
				type: z.string().nullish(),
				url: z.string().nullish(),
				is_oa: z.boolean().nullish(),
				version: z.string().nullish(),
				license: z.string().nullish(),
			})
		)
		.nullish(),
	referenced_works: z.array(openAlexIdSchema).nullish(),
	referenced_works_count: z.number().int().nullish(),
	related_works: z.array(openAlexIdSchema).nullish(),
	sustainable_development_goals: z
		.array(
			z.object({
				id: openAlexIdSchema.nullish(),
				display_name: z.string().nullish(),
				score: z.number().nullish(),
			})
		)
		.nullish(),
	grants: z
		.array(
			z.object({
				funder: z.string().nullish(),
				funder_display_name: z.string().nullish(),
				award_id: z.string().nullish(),
			})
		)
		.nullish(),
	datasets: z
		.array(
			z.object({
				id: z.string().nullish(),
				display_name: z.string().nullish(),
			})
		)
		.nullish(),
	versions: z
		.array(
			z.object({
				version: z.string().nullish(),
				type: z.string().nullish(),
			})
		)
		.nullish(),
	is_retracted: z.boolean().nullish(),
	is_paratext: z.boolean().nullish(),
	abstract_inverted_index: z.record(z.string(), z.array(z.number().int())).nullish(),
	biblio: z
		.object({
			// OpenAlex reports absent bibliographic fields as null
			volume: z.string().nullable().nullish(),
			issue: z.string().nullable().nullish(),
			first_page: z.string().nullable().nullish(),
			last_page: z.string().nullable().nullish(),
		})
		.nullish(),
	language: z.string().nullish(),
	topics: z.array(z.any()).nullish(), // TopicItem schema would be complex
	keywords: z.array(keywordReferenceSchema).nullish(),
	is_xpac: z.boolean().nullish(),
})

// Concept schema
export const conceptSchema = baseEntitySchema.extend({
	wikidata: z.string().nullish(),
	level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
	description: z.string().nullish(),
	works_count: z.number().int().min(0),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.nullish(),
	ids: z.object({
		openalex: openAlexIdSchema,
		wikidata: z.string().nullish(),
		mag: z.string().nullish(),
		wikipedia: z.string().nullish(),
		umls_cui: z.array(z.string()).nullish(),
	}),
	image_url: z.string().nullish(),
	image_thumbnail_url: z.string().nullish(),
	international: z
		.object({
			display_name: z.record(z.string(), z.string()).nullish(), // institutions without internationalised names report null here
			description: z.record(z.string(), z.string()).nullish(),
		})
		.nullish(),
	ancestors: z
		.array(
			z.object({
				id: openAlexIdSchema,
				wikidata: z.string().nullish(),
				display_name: z.string(),
				level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
			})
		)
		.nullish(),
	related_concepts: z
		.array(
			z.object({
				id: openAlexIdSchema,
				wikidata: z.string().nullish(),
				display_name: z.string(),
				level: z.number().int().min(0).max(MAX_CONCEPT_LEVEL),
				score: z.number().min(0),
			})
		)
		.nullish(),
	works_api_url: z.string(),
})

// Author schema
// Nullish per the relationship registry's authors select list; works_count and cited_by_count stay required because that list selects them
export const authorSchema = baseEntitySchema.extend({
	counts_by_year: z.array(entityCountsByYearSchema).nullish(),
	updated_date: dateStringSchema.nullish(),
	created_date: dateStringSchema.nullish(),
	works_count: z.number().int().min(0),
	orcid: z.string().nullish(),
	display_name_alternatives: z.array(z.string()).nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			orcid: z.string().nullish(),
		})
		.nullish(),
	last_known_institutions: z.array(z.any()).nullish(), // Institution schema would be complex
	affiliations: z
		.array(
			z.object({
				institution: z.any(), // Institution schema would be complex
				years: z.array(z.number().int()),
			})
		)
		.nullish(),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.nullish(),
	x_concepts: z.array(z.any()).nullish(), // ConceptItem schema would be complex
	topics: z.array(z.any()).nullish(), // TopicItem schema would be complex
})

// Institution schema
// Nullish per the relationship registry's institutions select list (which omits cited_by_count) and the sparser lineage resolution list (which also omits works_count, geo and international); country_code and type stay required because both lists select them
export const institutionSchema = baseEntitySchema.extend({
	cited_by_count: z.number().int().min(0).nullish(),
	counts_by_year: z.array(entityCountsByYearSchema).nullish(),
	updated_date: dateStringSchema.nullish(),
	created_date: dateStringSchema.nullish(),
	works_count: z.number().int().min(0).nullish(),
	ror: z.string().nullish(),
	// Countryless institutions (consortia and the like) report null here, including in select-trimmed rows
	country_code: z.string().nullish(),
	type: z.string(),
	homepage_url: z.string().nullish(),
	image_url: z.string().nullish(),
	image_thumbnail_url: z.string().nullish(),
	display_name_acronyms: z.array(z.string()).nullish(),
	display_name_alternatives: z.array(z.string()).nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().nullish(),
			grid: z.string().nullish(),
		})
		.nullish(),
	geo: z
		.object({
			city: z.string().nullish(),
			geonames_city_id: z.string().nullish(),
			region: z.string().nullish(),
			country_code: z.string(),
			country: z.string(),
			latitude: z.number().nullish(),
			longitude: z.number().nullish(),
		})
		.nullish(),
	international: z
		.object({
			display_name: z.record(z.string(), z.string()).nullish(), // institutions without internationalised names report null here
		})
		.nullish(),
	associated_institutions: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
				ror: z.string().nullish(),
				country_code: z.string(),
				type: z.string(),
				relationship: z.string(),
			})
		)
		.nullish(),
	x_concepts: z.array(z.any()).nullish(), // ConceptItem schema would be complex
	topics: z.array(z.any()).nullish(), // TopicItem schema would be complex
	lineage: z.array(openAlexIdSchema).nullish(),
})

// Generic OpenAlex response schema
export const openAlexResponseSchema = <T extends z.ZodType>(resultSchema: T) =>
	z.object({
		results: z.array(resultSchema),
		meta: metaSchema,
		group_by: z.array(groupBySchema).nullish(),
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
// Nullish per the relationship registry's sources select list; works_count and type stay required because that list selects them
export const sourceSchema = entityWithWorksSchema.extend({
	cited_by_count: z.number().int().min(0).nullish(),
	counts_by_year: z.array(entityCountsByYearSchema).nullish(),
	updated_date: dateStringSchema.nullish(),
	created_date: dateStringSchema.nullish(),
	works_api_url: z.string().nullish(),
	issn_l: z.string().nullish(),
	issn: z.array(z.string()).nullish(),
	publisher: z.string().nullish(),
	host_organization: openAlexIdSchema.nullish(),
	host_organization_name: z.string().nullish(),
	host_organization_lineage: z.array(openAlexIdSchema).nullish(),
	is_oa: z.boolean().nullish(),
	is_in_doaj: z.boolean().nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			issn_l: z.string().nullish(),
			issn: z.array(z.string()).nullish(),
			mag: z.string().nullish(),
			wikidata: z.string().nullish(),
		})
		.nullish(),
	homepage_url: z.string().nullish(),
	apc_prices: z
		.array(
			z.object({
				price: z.number().nullish(),
				currency: z.string().nullish(),
			})
		)
		.nullish(),
	apc_usd: z.number().nullish(),
	country_code: z.string().nullish(),
	societies: z.array(z.string()).nullish(),
	alternate_titles: z.array(z.string()).nullish(),
	abbreviated_title: z.string().nullish(),
	type: z.string(),
	x_concepts: z.array(z.any()).nullish(), // ConceptItem schema would be complex
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.nullish(),
	topics: z.array(z.any()).nullish(), // TopicItem schema would be complex
})

// Publisher schema
export const publisherSchema = entityWithWorksSchema.extend({
	alternate_titles: z.array(z.string()).nullish(),
	country_codes: z.array(z.string()).nullish(),
	hierarchy_level: z.number().int(),
	parent_publisher: openAlexIdSchema.nullish(),
	lineage: z.array(openAlexIdSchema),
	sources_count: z.number().int().min(0),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().nullish(),
			wikidata: z.string().nullish(),
		})
		.nullish(),
	sources_api_url: z.string(),
})

// Funder schema
export const funderSchema = entityWithWorksSchema.extend({
	alternate_titles: z.array(z.string()).nullish(),
	country_code: z.string().nullish(),
	description: z.string().nullish(),
	homepage_url: z.string().nullish(),
	image_url: z.string().nullish(),
	image_thumbnail_url: z.string().nullish(),
	grants_count: z.number().int().min(0),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			ror: z.string().nullish(),
			wikidata: z.string().nullish(),
			crossref: z.string().nullish(),
		})
		.nullish(),
	roles: z
		.array(
			z.object({
				role: z.string(),
				id: openAlexIdSchema,
				works_count: z.number().int().min(0),
			})
		)
		.nullish(),
	summary_stats: z
		.object({
			"2yr_mean_citedness": z.number().min(0),
			h_index: z.number().int().min(0),
			i10_index: z.number().int().min(0),
		})
		.nullish(),
	topics: z.array(z.any()).nullish(), // TopicItem schema would be complex
})

// Topic schema (replacing Concepts)
export const topicSchema = entityWithWorksSchema.extend({
	description: z.string().nullish(),
	keywords: z.array(keywordReferenceSchema).nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().nullish(),
		})
		.nullish(),
	// Topic classification ids use lowercase collection prefixes (subfields/, fields/, domains/), unlike the entity ids openAlexIdSchema matches
	subfield: z.object({
		id: z.string(),
		display_name: z.string(),
	}),
	field: z.object({
		id: z.string(),
		display_name: z.string(),
	}),
	domain: z.object({
		id: z.string(),
		display_name: z.string(),
	}),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.nullish(),
})

// Domain schema (top level of taxonomy hierarchy)
export const domainSchema = entityWithWorksSchema.extend({
	description: z.string().nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().nullish(),
			wikipedia: z.string().nullish(),
		})
		.nullish(),
	display_name_alternatives: z.array(z.string()).nullish(),
	fields: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.nullish(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.nullish(),
})

// Field schema (middle level of taxonomy hierarchy)
export const fieldSchema = entityWithWorksSchema.extend({
	description: z.string().nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().nullish(),
			wikipedia: z.string().nullish(),
		})
		.nullish(),
	display_name_alternatives: z.array(z.string()).nullish(),
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
		.nullish(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.nullish(),
})

// Subfield schema (below field, above topic in taxonomy hierarchy)
export const subfieldSchema = entityWithWorksSchema.extend({
	description: z.string().nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().nullish(),
			wikipedia: z.string().nullish(),
		})
		.nullish(),
	display_name_alternatives: z.array(z.string()).nullish(),
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
		.nullish(),
	siblings: z
		.array(
			z.object({
				id: openAlexIdSchema,
				display_name: z.string(),
			})
		)
		.nullish(),
})

// Keyword schema
export const keywordSchema = baseEntitySchema.extend({
	counts_by_year: z.array(entityCountsByYearSchema),
	// Keyword ids are slugs (keywords/mental-health), not the [A-Z]\d+ entity form
	id: z.string().regex(/^https:\/\/openalex\.org\/keywords\/[\w-]+$/),
	description: z.string().nullish(),
	// Keyword entities expose their related keywords as null or scored references
	keywords: z.array(keywordReferenceSchema).nullable().nullish(),
	ids: z
		.object({
			openalex: openAlexIdSchema,
			wikidata: z.string().nullish(),
		})
		.nullish(),
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
