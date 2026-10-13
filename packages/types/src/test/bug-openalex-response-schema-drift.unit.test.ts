/**
 * Regression test for OpenAlex response schema drift, verified against the live API and the deployed app on 2026-10-13 (every entity page failed validation with "Error Loading Work/Author/..."): the live API now returns full ISO timestamps for updated_date/created_date, null for absent country_code and biblio fields, and keywords as scored reference objects rather than bare strings. The response schemas must accept the live shapes alongside the historical ones.
 */

import { describe, expect, it } from "vitest"

import { authorSchema, keywordSchema, topicSchema, workSchema } from "../entities/schemas"

const BASE_WORK_FIELDS = {
	id: "https://openalex.org/W2741809807",
	display_name: "The state of OA",
	cited_by_count: 82,
} as const

const BASE_TOPIC_FIELDS = {
	id: "https://openalex.org/T10031",
	display_name: "Regulatory T cells",
	cited_by_count: 100,
	works_count: 500,
	works_api_url: "https://api.openalex.org/works?filter=topics.id:T10031",
	subfield: { id: "https://openalex.org/subfields/2403", display_name: "Immunology" },
	field: { id: "https://openalex.org/fields/24", display_name: "Immunology" },
	domain: { id: "https://openalex.org/domains/1", display_name: "Health Sciences" },
} as const

describe("OpenAlex response schema drift", () => {
	it("accepts a work response with timestamp dates, null biblio fields, null country codes and keyword objects", () => {
		const result = workSchema.safeParse({
			...BASE_WORK_FIELDS,
			updated_date: "2026-10-12T09:40:04.860316",
			created_date: "2025-10-10T00:00:00",
			counts_by_year: [
				{ year: 2026, cited_by_count: 127 },
				{ year: 2025, cited_by_count: 134, oa_works_count: 3 },
			],
			biblio: { volume: "6", issue: null, first_page: "e4375", last_page: "e4375" },
			keywords: [
				{ id: "https://openalex.org/keywords/open-access", display_name: "open access", score: 0.98 },
			],
			authorships: [
				{
					author_position: "first",
					author: { display_name: "Caroline S. Wagner" },
					institutions: [
						{
							id: "https://openalex.org/I4387153203",
							display_name: "Public Knowledge Project",
							country_code: null,
							type: "other",
						},
					],
				},
			],
		})
		expect(result.success).toBe(true)
	})

	it("still accepts the historical work shape with plain dates, string biblio fields and works_count", () => {
		const result = workSchema.safeParse({
			...BASE_WORK_FIELDS,
			updated_date: "2026-10-01",
			created_date: "2014-08-14",
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			biblio: { volume: "6", issue: "3", first_page: "e4375", last_page: "e4375" },
		})
		expect(result.success).toBe(true)
	})

	it("accepts an author response with a timestamp updated_date", () => {
		const result = authorSchema.safeParse({
			id: "https://openalex.org/A5017898742",
			display_name: "William Teahan",
			cited_by_count: 100,
			works_count: 3,
			works_api_url: "https://api.openalex.org/works?filter=author.id:A5017898742",
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			updated_date: "2025-09-21T07:40:09.928040",
			created_date: "2023-07-21",
		})
		expect(result.success).toBe(true)
	})

	it("accepts a topic response with keyword reference objects and a timestamp updated_date", () => {
		const result = topicSchema.safeParse({
			...BASE_TOPIC_FIELDS,
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			updated_date: "2026-10-13T03:00:44",
			created_date: "2022-01-01",
			keywords: [
				{ id: "https://openalex.org/keywords/regulatory-t-cells", display_name: "regulatory T cells", score: 0.27 },
			],
		})
		expect(result.success).toBe(true)
	})

	it("accepts a keyword entity response whose keywords field is null", () => {
		const result = keywordSchema.safeParse({
			id: "https://openalex.org/keywords/mental-health",
			display_name: "mental health",
			cited_by_count: 100,
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			updated_date: "2026-10-13T04:05:50",
			created_date: "2022-01-01",
			keywords: null,
		})
		expect(result.success).toBe(true)
	})
})
