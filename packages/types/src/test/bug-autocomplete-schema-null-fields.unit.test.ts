/**
 * Regression test for the false-empty search defect (verified 2026-10-15): the search page showed "No entities found" for queries with live matches because the autocomplete schemas declared hint/external_id/works_count as plain optionals while the live endpoints return null for absent values. The validation failure was swallowed by the client's error path, which returned an empty result array after a 200 response carrying real results. Payloads below are the observed live API shapes for /autocomplete?q=teahan and /autocomplete/works?q=machine learning.
 */

import { describe, expect, it } from "vitest"

import {
	AutocompleteBaseResponseSchema,
	AutocompleteResponseSchema,
} from "../entities/common"

const LIVE_GENERAL_ENDPOINT_PAYLOAD = {
	meta: { count: 73, db_response_time_ms: 81, page: 1, per_page: 10, cost_usd: 0 },
	results: [
		{
			id: "https://openalex.org/A5025875274",
			short_id: "authors/A5025875274",
			display_name: "William J. Teahan",
			hint: null,
			cited_by_count: 1327,
			works_count: 115,
			entity_type: "author",
			external_id: "https://orcid.org/0000-0003-3640-6750",
			filter_key: "authorships.author.id",
		},
		{
			id: "https://openalex.org/A5009945262",
			short_id: "authors/A5009945262",
			display_name: "Melanie Teahan",
			hint: null,
			cited_by_count: 213,
			works_count: 5,
			entity_type: "author",
			external_id: null,
			filter_key: "authorships.author.id",
		},
	],
}

const LIVE_WORKS_ENDPOINT_PAYLOAD = {
	meta: { count: 10, page: 1, per_page: 10 },
	results: [
		{
			id: "https://openalex.org/W4232533539",
			short_id: "works/W4232533539",
			display_name: "Machine Learning",
			hint: "Zhi‐Hua Zhou",
			cited_by_count: 820,
			works_count: null,
			entity_type: "work",
			external_id: "https://doi.org/10.1007/978-981-15-1967-3",
			filter_key: "id",
		},
	],
}

describe("autocomplete schemas accept live null fields", () => {
	it("accepts the general endpoint payload with null hint and null external_id", () => {
		const result = AutocompleteResponseSchema.safeParse(LIVE_GENERAL_ENDPOINT_PAYLOAD)
		expect(result.success).toBe(true)
	})

	it("still accepts the historical payload shape with absent optional fields", () => {
		const result = AutocompleteResponseSchema.safeParse({
			results: [
				{
					id: "https://openalex.org/A5055821986",
					display_name: "Carmel G. Teahan",
					cited_by_count: 1720,
					works_count: 14,
					entity_type: "author",
				},
			],
		})
		expect(result.success).toBe(true)
	})

	it("accepts the per-entity endpoint payload with null works_count", () => {
		const result = AutocompleteBaseResponseSchema.safeParse(LIVE_WORKS_ENDPOINT_PAYLOAD)
		expect(result.success).toBe(true)
	})
})
