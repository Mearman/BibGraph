/**
 * Regression test for OpenAlex response schema drift, verified against the live API and the deployed app on 2026-10-13 (every entity page failed validation with "Error Loading Work/Author/..."): the live API now returns full ISO timestamps for updated_date/created_date, null for absent country_code and biblio fields, and keywords as scored reference objects rather than bare strings. The response schemas must accept the live shapes alongside the historical ones.
 */

import { describe, expect, it } from "vitest"

import {
	authorSchema,
	institutionSchema,
	keywordSchema,
	sourceSchema,
	topicSchema,
	workSchema,
} from "../entities/schemas"

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

	it("accepts an author response with null orcid, null ids.orcid and null last_known_institutions (2026-10-15: live A5017898742 failed on all three, so most author pages failed to load)", () => {
		const result = authorSchema.safeParse({
			id: "https://openalex.org/A5017898742",
			display_name: "William Teahan",
			orcid: null,
			ids: { orcid: null, openalex: "https://openalex.org/A5017898742" },
			last_known_institutions: null,
			cited_by_count: 100,
			works_count: 3,
			works_api_url: "https://api.openalex.org/works?filter=author.id:A5017898742",
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			updated_date: "2025-09-21T07:40:09.928040",
			created_date: "2023-07-21",
		})
		expect(result.success).toBe(true)
	})

	it("accepts a work response with null open_access.oa_url and null authorship orcid (2026-10-15: live W4234556776 and 10.1038/nature12373 failed on these, so most work pages failed to load)", () => {
		const result = workSchema.safeParse({
			...BASE_WORK_FIELDS,
			updated_date: "2026-10-12T09:40:04.860316",
			created_date: "2025-10-10T00:00:00",
			counts_by_year: [{ year: 2025, cited_by_count: 82 }],
			open_access: { is_oa: false, oa_status: "closed", oa_url: null },
			authorships: [
				{
					author_position: "first",
					author: { display_name: "An Author Without Orcid", orcid: null },
				},
			],
		})
		expect(result.success).toBe(true)
	})

	it("accepts an institution whose international.display_name is null (2026-10-15: live I4210126615 failed safeParse on international.display_name, so every institution page of a non-internationalised institution failed to load)", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I4210126615",
			display_name: "A Consortium Without Translated Names",
			type: "other",
			international: { display_name: null },
		})
		expect(result.success).toBe(true)
	})

	it("accepts a work row trimmed to the relationship registry's works select list (2026-10-15: the relationships panel failed with \"[{expected:array, path:[results,0,counts_by_year]}...]\" because select-parameterised rows omit every unselected field)", () => {
		const result = workSchema.safeParse({
			id: "https://openalex.org/W2741809807",
			display_name: "The state of OA",
			publication_year: 2025,
			type: "article",
			cited_by_count: 82,
		})
		expect(result.success).toBe(true)
	})

	it("accepts an author row trimmed to the relationship registry's authors select list (id, display_name, orcid, works_count, cited_by_count only)", () => {
		const result = authorSchema.safeParse({
			id: "https://openalex.org/A5017898742",
			display_name: "William Teahan",
			orcid: null,
			works_count: 3,
			cited_by_count: 100,
		})
		expect(result.success).toBe(true)
	})

	it("accepts an institution row trimmed to the relationship registry's institutions select list (id, display_name, country_code, type, works_count only)", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I4387153203",
			display_name: "Public Knowledge Project",
			country_code: "CA",
			type: "other",
			works_count: 12,
		})
		expect(result.success).toBe(true)
	})

	it("accepts an institution row trimmed to the lineage resolution select list (id, display_name, country_code, type only; no works_count)", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I4387153203",
			display_name: "Public Knowledge Project",
			country_code: "CA",
			type: "other",
		})
		expect(result.success).toBe(true)
	})

	it("accepts a source row trimmed to the relationship registry's sources select list (id, display_name, issn_l, type, works_count only)", () => {
		const result = sourceSchema.safeParse({
			id: "https://openalex.org/S13775139",
			display_name: "PLoS ONE",
			issn_l: "1932-6203",
			type: "journal",
			works_count: 250000,
		})
		expect(result.success).toBe(true)
	})

	it("accepts an institution row trimmed to the institutions select list whose country_code is null (2026-10-15: live lineage:I4387153203 rows failed on a null country_code, countryless consortia report null even when country_code is selected)", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I136199715",
			display_name: "OurResearch",
			country_code: null,
			type: "other",
			works_count: 30,
		})
		expect(result.success).toBe(true)
	})

	it("still accepts a full institution response, so loosening the select-trimmable fields keeps full-response validation intact", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I4387153203",
			display_name: "Public Knowledge Project",
			cited_by_count: 204,
			works_count: 12,
			country_code: "CA",
			type: "other",
			counts_by_year: [{ year: 2025, works_count: 3, cited_by_count: 82 }],
			updated_date: "2026-10-13T03:00:44",
			created_date: "2016-11-02",
			geo: { country_code: "CA", country: "Canada" },
			international: { display_name: {} },
		})
		expect(result.success).toBe(true)
	})

	it("still accepts a full source response, so loosening the select-trimmable fields keeps full-response validation intact", () => {
		const result = sourceSchema.safeParse({
			id: "https://openalex.org/S13775139",
			display_name: "PLoS ONE",
			cited_by_count: 3000000,
			works_count: 250000,
			works_api_url: "https://api.openalex.org/works?filter=primary_location.source.id:S13775139",
			counts_by_year: [{ year: 2025, works_count: 30000, cited_by_count: 200000 }],
			updated_date: "2026-10-13T03:00:44",
			created_date: "2013-01-01",
			is_oa: true,
			is_in_doaj: true,
			type: "journal",
		})
		expect(result.success).toBe(true)
	})

	it("accepts the UN SDG id shape (2026-10-15: works lists failed wholesale because real rows carry https://metadata.un.org/sdg/N, the form the OpenAlex work-object docs themselves show)", () => {
		const result = workSchema.safeParse({
			...BASE_WORK_FIELDS,
			updated_date: "2026-10-12T09:40:04.860316",
			created_date: "2025-10-10T00:00:00",
			counts_by_year: [{ year: 2025, cited_by_count: 82 }],
			sustainable_development_goals: [
				{
					id: "https://metadata.un.org/sdg/3",
					display_name: "Good health and well-being",
					score: 0.95,
				},
			],
		})
		expect(result.success).toBe(true)
	})

	it("accepts an institution whose associated_institutions report null country_code (2026-10-15: live i19820366 (CAS) and i1294671590 (CNRS) failed safeParse on null country codes inside associated_institutions, so those institution pages did not load; countryless consortia report null, matching the top-level institution field)", () => {
		const result = institutionSchema.safeParse({
			id: "https://openalex.org/I1294671590",
			display_name: "French National Centre for Scientific Research",
			type: "government",
			cited_by_count: 100,
			works_count: 1000,
			associated_institutions: [
				{
					id: "https://openalex.org/I19820366",
					display_name: "Chinese Academy of Sciences",
					ror: "https://ror.org/034t30j35",
					country_code: null,
					type: "government",
					relationship: "related",
				},
			],
		})
		expect(result.success).toBe(true)
	})
})
