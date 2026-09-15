/**
 * URL Parser Tests
 *
 * Demonstrates functionality of parseURL, extractSelectFields, and reconstructURL
 */

import { describe, expect,it } from "vitest"

import { extractSelectFields, parseURL, reconstructURL } from "./url-parser"

describe("extractSelectFields", () => {
	it("should extract fields from comma-separated string", () => {
		const result = extractSelectFields("id,display_name,cited_by_count")
		expect(result).toEqual(["id", "display_name", "cited_by_count"])
	})

	it("should extract fields from URL with select parameter", () => {
		const result = extractSelectFields("https://api.openalex.org/works?select=id,title,doi")
		expect(result).toEqual(["id", "title", "doi"])
	})

	it("should handle whitespace around field names", () => {
		const result = extractSelectFields(" id , display_name , cited_by_count ")
		expect(result).toEqual(["id", "display_name", "cited_by_count"])
	})

	it("should return empty array for URL without select parameter", () => {
		const result = extractSelectFields("https://api.openalex.org/works")
		expect(result).toEqual([])
	})

	it("should return empty array for empty string", () => {
		const result = extractSelectFields("")
		expect(result).toEqual([])
	})

	it("should handle relative URLs with select parameter", () => {
		const result = extractSelectFields("/authors?select=id,orcid,display_name")
		expect(result).toEqual(["id", "orcid", "display_name"])
	})
})

describe("parseURL", () => {
	it("should parse complete OpenAlex URL with entity ID and select", () => {
		const result = parseURL(
			"https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true"
		)

		expect(result).toEqual({
			url: "https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true",
			basePath: "/works/W123456",
			queryParams: {
				select: "id,title,doi",
				filter: "is_oa:true",
			},
			selectFields: ["id", "title", "doi"],
			entityType: "works",
			entityId: "W123456",
		})
	})

	it("should parse relative URL with entity type", () => {
		const result = parseURL("/authors?filter=last_known_institution.id:I123")

		expect(result).toEqual({
			url: "/authors?filter=last_known_institution.id:I123",
			basePath: "/authors",
			queryParams: {
				filter: "last_known_institution.id:I123",
			},
			selectFields: [],
			entityType: "authors",
			entityId: null,
		})
	})

	it("should extract entity type and ID from path", () => {
		const result = parseURL("https://api.openalex.org/sources/S987654321")

		expect(result).toEqual({
			url: "https://api.openalex.org/sources/S987654321",
			basePath: "/sources/S987654321",
			queryParams: {},
			selectFields: [],
			entityType: "sources",
			entityId: "S987654321",
		})
	})

	it("should detect entity type from ID pattern when not in path", () => {
		const result = parseURL("/api/A123456789?select=id,display_name")

		expect(result.entityType).toBe("authors")
		expect(result.entityId).toBe("A123456789")
	})

	it("should handle URL without query parameters", () => {
		const result = parseURL("/works")

		expect(result).toEqual({
			url: "/works",
			basePath: "/works",
			queryParams: {},
			selectFields: [],
			entityType: "works",
			entityId: null,
		})
	})

	it("should handle invalid URLs gracefully", () => {
		const result = parseURL("")

		expect(result).toEqual({
			url: "",
			basePath: "",
			queryParams: {},
			selectFields: [],
			entityType: null,
			entityId: null,
		})
	})

	it("should parse publisher URLs", () => {
		const result = parseURL("https://api.openalex.org/publishers/P123456")

		expect(result.entityType).toBe("publishers")
		expect(result.entityId).toBe("P123456")
	})

	it("should parse topic URLs", () => {
		const result = parseURL("/topics/T123456?select=id,display_name")

		expect(result.entityType).toBe("topics")
		expect(result.entityId).toBe("T123456")
		expect(result.selectFields).toEqual(["id", "display_name"])
	})
})

describe("reconstructURL", () => {
	it("should reconstruct URL with query parameters and select fields", () => {
		const result = reconstructURL(
			"/works",
			{ filter: "is_oa:true", page: "2" },
			["id", "title", "cited_by_count"]
		)

		// Note: Order may vary, so we check for presence of components
		expect(result).toContain("/works?")
		expect(result).toContain("filter=is_oa%3Atrue")
		expect(result).toContain("page=2")
		expect(result).toContain("select=id,title,cited_by_count")
	})

	it("should NOT URL-encode commas in select parameter", () => {
		const result = reconstructURL("/works", {}, ["id", "display_name", "cited_by_count"])

		expect(result).toContain("select=id,display_name,cited_by_count")
		expect(result).not.toContain("%2C") // No encoded commas
	})

	it("should properly encode other query parameters", () => {
		const result = reconstructURL("/works", { filter: "publication_year:>2020" })

		expect(result).toContain("filter=publication_year%3A%3E2020")
	})

	it("should handle select in queryParams", () => {
		const result = reconstructURL("/authors", { select: "id,orcid", filter: "x:y" })

		expect(result).toContain("select=id,orcid")
		expect(result).toContain("filter=x%3Ay")
	})

	it("should prioritize selectFields array over queryParams select", () => {
		const result = reconstructURL(
			"/works",
			{ select: "id,title" },
			["id", "display_name", "doi"]
		)

		expect(result).toContain("select=id,display_name,doi")
		expect(result).not.toContain("select=id,title")
	})

	it("should handle base path without query parameters", () => {
		const result = reconstructURL("/works")

		expect(result).toBe("/works")
	})

	it("should handle absolute URLs", () => {
		const result = reconstructURL("https://api.openalex.org/works", { page: "1" }, ["id"])

		expect(result).toContain("https://api.openalex.org/works?")
		expect(result).toContain("page=1")
		expect(result).toContain("select=id")
	})

	it("should append to existing query string correctly", () => {
		const result = reconstructURL("/works?existing=param", { filter: "x:y" })

		expect(result).toContain("/works?existing=param&")
		expect(result).toContain("filter=x%3Ay")
	})

	it("should handle empty selectFields array", () => {
		const result = reconstructURL("/works", { filter: "is_oa:true" }, [])

		expect(result).toBe("/works?filter=is_oa%3Atrue")
	})

	it("should encode field names with special characters", () => {
		const result = reconstructURL("/works", {}, ["id", "display name", "cited-by-count"])

		expect(result).toContain("select=id,display%20name,cited-by-count")
	})

	it("should handle null/undefined queryParams", () => {
		const result = reconstructURL("/works", undefined, ["id"])

		expect(result).toBe("/works?select=id")
	})

	it("should filter out null/undefined query param values", () => {
		const result = reconstructURL(
			"/works",
			{ filter: "x:y", page: undefined as unknown as string, sort: null as unknown as string },
			["id"]
		)

		expect(result).toContain("filter=x%3Ay")
		expect(result).not.toContain("page")
		expect(result).not.toContain("sort")
	})
})

describe("integration: parse and reconstruct", () => {
	it("should round-trip URL parsing and reconstruction", () => {
		const originalUrl =
			"https://api.openalex.org/works/W123456?select=id,title,doi&filter=is_oa:true&page=1"
		const parsed = parseURL(originalUrl)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Parse the reconstructed URL to compare components
		const parsedReconstructed = parseURL(`https://api.openalex.org${reconstructed}`)

		expect(parsedReconstructed.basePath).toBe(parsed.basePath)
		expect(parsedReconstructed.selectFields).toEqual(parsed.selectFields)
		expect(parsedReconstructed.queryParams.filter).toBe(parsed.queryParams.filter)
		expect(parsedReconstructed.queryParams.page).toBe(parsed.queryParams.page)
	})

	it("should preserve select parameter comma encoding", () => {
		const originalUrl = "/works?select=id,title,authors,cited_by_count"
		const parsed = parseURL(originalUrl)
		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify commas are NOT encoded
		expect(reconstructed).toContain("select=id,title,authors,cited_by_count")
		expect(reconstructed).not.toContain("%2C")
	})
})

describe("bookmark-specific URL parameter extraction", () => {
	it("should preserve all query parameters when parsing bookmark URL", () => {
		const bookmarkUrl =
			"/works?select=id,title,doi&filter=publication_year:>2020&sort=cited_by_count:desc&page=2"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams).toEqual({
			select: "id,title,doi",
			filter: "publication_year:>2020",
			sort: "cited_by_count:desc",
			page: "2",
		})
	})

	it("should extract select fields from bookmark URL with multiple parameters", () => {
		const bookmarkUrl = "/authors?select=id,display_name,orcid,works_count&filter=x.id:I123"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.selectFields).toEqual(["id", "display_name", "orcid", "works_count"])
		expect(parsed.queryParams.filter).toBe("x.id:I123")
	})

	it("should extract base path for bookmark without entity ID", () => {
		const bookmarkUrl = "/works?filter=is_oa:true&select=id,title"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.basePath).toBe("/works")
		expect(parsed.entityType).toBe("works")
		expect(parsed.entityId).toBeNull()
	})

	it("should extract base path for bookmark with entity ID", () => {
		const bookmarkUrl = "/authors/A123456789?select=id,display_name,cited_by_count"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.basePath).toBe("/authors/A123456789")
		expect(parsed.entityType).toBe("authors")
		expect(parsed.entityId).toBe("A123456789")
	})

	it("should reconstruct bookmark URL with all preserved parameters", () => {
		const originalUrl =
			"/works?select=id,title,doi&filter=is_oa:true&sort=publication_date:desc&page=3"
		const parsed = parseURL(originalUrl)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Parse reconstructed URL to verify all components
		const reparsed = parseURL(reconstructed)

		expect(reparsed.basePath).toBe("/works")
		expect(reparsed.selectFields).toEqual(["id", "title", "doi"])
		expect(reparsed.queryParams.filter).toBe("is_oa:true")
		expect(reparsed.queryParams.sort).toBe("publication_date:desc")
		expect(reparsed.queryParams.page).toBe("3")
	})

	it("should handle bookmark URL with special characters in filter", () => {
		const bookmarkUrl = "/works?filter=institutions.country_code:US|GB&select=id,title"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.filter).toBe("institutions.country_code:US|GB")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify special characters are properly encoded in reconstruction
		expect(reconstructed).toContain("filter=institutions.country_code%3AUS%7CGB")
	})

	it("should handle bookmark URL with encoded parameters", () => {
		const bookmarkUrl =
			"/works?filter=authorships.author.id%3AA123456&select=id%2Ctitle%2Cdoi"
		const parsed = parseURL(bookmarkUrl)

		// URL class automatically decodes parameters
		expect(parsed.queryParams.filter).toBe("authorships.author.id:A123456")
		expect(parsed.queryParams.select).toBe("id,title,doi")
		expect(parsed.selectFields).toEqual(["id", "title", "doi"])
	})

	it("should handle bookmark URL with missing select parameter", () => {
		const bookmarkUrl = "/authors?filter=last_known_institution.id:I123&page=1"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.selectFields).toEqual([])
		expect(parsed.queryParams.filter).toBe("last_known_institution.id:I123")
		expect(parsed.queryParams.page).toBe("1")

		const reconstructed = reconstructURL(parsed.basePath, parsed.queryParams)

		expect(reconstructed).not.toContain("select=")
		expect(reconstructed).toContain("filter=last_known_institution.id%3AI123")
	})

	it("should handle bookmark URL with empty select parameter", () => {
		const bookmarkUrl = "/works?select=&filter=is_oa:true"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.selectFields).toEqual([])
		expect(parsed.queryParams.select).toBe("")
		expect(parsed.queryParams.filter).toBe("is_oa:true")
	})

	it("should preserve complex filter expressions in bookmark URLs", () => {
		const bookmarkUrl =
			"/works?filter=publication_year:2020-2023,is_oa:true,type:journal-article&select=id,title"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.filter).toBe(
			"publication_year:2020-2023,is_oa:true,type:journal-article"
		)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify filter is properly encoded
		expect(reconstructed).toContain(
			"filter=publication_year%3A2020-2023%2Cis_oa%3Atrue%2Ctype%3Ajournal-article"
		)
	})

	it("should handle bookmark URL with search parameter", () => {
		const bookmarkUrl = "/works?search=machine learning&select=id,title,cited_by_count"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.search).toBe("machine learning")
		expect(parsed.selectFields).toEqual(["id", "title", "cited_by_count"])

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		expect(reconstructed).toContain("search=machine%20learning")
	})

	it("should handle bookmark URL with group_by parameter", () => {
		const bookmarkUrl = "/works?group_by=publication_year&select=id,title"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.group_by).toBe("publication_year")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		expect(reconstructed).toContain("group_by=publication_year")
	})

	it("should preserve per_page parameter in bookmark URL", () => {
		const bookmarkUrl = "/authors?per_page=100&select=id,display_name&page=5"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.per_page).toBe("100")
		expect(parsed.queryParams.page).toBe("5")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Underscore should be encoded
		expect(reconstructed).toContain("per_page=100")
		expect(reconstructed).toContain("page=5")
	})

	it("should handle absolute bookmark URLs", () => {
		const bookmarkUrl =
			"https://api.openalex.org/works?select=id,title&filter=is_oa:true"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.basePath).toBe("/works")
		expect(parsed.selectFields).toEqual(["id", "title"])

		const reconstructed = reconstructURL(
			"https://api.openalex.org/works",
			parsed.queryParams,
			parsed.selectFields
		)

		expect(reconstructed).toContain("https://api.openalex.org/works?")
		expect(reconstructed).toContain("select=id,title")
		expect(reconstructed).toContain("filter=is_oa%3Atrue")
	})

	it("should handle bookmark URL with multiple sort parameters", () => {
		const bookmarkUrl = "/works?sort=cited_by_count:desc,publication_date:desc&select=id"
		const parsed = parseURL(bookmarkUrl)

		expect(parsed.queryParams.sort).toBe("cited_by_count:desc,publication_date:desc")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify commas and colons in sort are encoded
		expect(reconstructed).toContain(
			"sort=cited_by_count%3Adesc%2Cpublication_date%3Adesc"
		)
	})

	it("should round-trip complex bookmark URL without data loss", () => {
		const originalUrl =
			"/works/W123456?select=id,title,doi,cited_by_count&filter=is_oa:true&sort=publication_date:desc&page=2&per_page=50"
		const parsed = parseURL(originalUrl)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)

		// Verify all components are preserved
		expect(reparsed.basePath).toBe(parsed.basePath)
		expect(reparsed.entityType).toBe(parsed.entityType)
		expect(reparsed.entityId).toBe(parsed.entityId)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
		expect(reparsed.queryParams.filter).toBe(parsed.queryParams.filter)
		expect(reparsed.queryParams.sort).toBe(parsed.queryParams.sort)
		expect(reparsed.queryParams.page).toBe(parsed.queryParams.page)
		expect(reparsed.queryParams.per_page).toBe(parsed.queryParams.per_page)
	})
})

describe("custom field view preservation (User Story 2 - T026)", () => {
	it("should preserve minimal custom field selection", () => {
		const originalUrl = "/authors/A2208157607?select=id,display_name"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toEqual(["id", "display_name"])
		expect(parsed.queryParams.select).toBe("id,display_name")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify the reconstructed URL preserves the minimal field selection
		expect(reconstructed).toContain("select=id,display_name")
		expect(reconstructed).not.toContain("%2C")
	})

	it("should preserve extended custom field selection", () => {
		const originalUrl =
			"/authors/A2208157607?select=id,display_name,works_count,cited_by_count,h_index"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toEqual([
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"h_index",
		])

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
	})

	it("should differentiate between same entity with different field selections", () => {
		const minimalUrl = "/authors/A2208157607?select=id,display_name"
		const extendedUrl =
			"/authors/A2208157607?select=id,display_name,works_count,cited_by_count,h_index"

		const parsedMinimal = parseURL(minimalUrl)
		const parsedExtended = parseURL(extendedUrl)

		// Same entity but different field selections
		expect(parsedMinimal.entityType).toBe(parsedExtended.entityType)
		expect(parsedMinimal.entityId).toBe(parsedExtended.entityId)
		expect(parsedMinimal.selectFields).not.toEqual(parsedExtended.selectFields)

		// Verify field counts differ, derived from the URLs themselves rather than a hardcoded count
		const minimalFieldCount = minimalUrl.split("select=", 2)[1].split(",").length
		const extendedFieldCount = extendedUrl.split("select=", 2)[1].split(",").length
		expect(parsedMinimal.selectFields.length).toBe(minimalFieldCount)
		expect(parsedExtended.selectFields.length).toBe(extendedFieldCount)
	})

	it("should handle select parameter with nested object fields", () => {
		const originalUrl = "/authors/A2208157607?select=id,display_name,counts_by_year,x_concepts"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toEqual([
			"id",
			"display_name",
			"counts_by_year",
			"x_concepts",
		])

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
	})

	it("should preserve select parameter when other query params are present", () => {
		const originalUrl =
			"/works?select=id,title,publication_year&filter=is_oa:true&sort=cited_by_count:desc"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toEqual(["id", "title", "publication_year"])
		expect(parsed.queryParams.filter).toBe("is_oa:true")
		expect(parsed.queryParams.sort).toBe("cited_by_count:desc")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
		expect(reparsed.queryParams.filter).toBe(parsed.queryParams.filter)
		expect(reparsed.queryParams.sort).toBe(parsed.queryParams.sort)
	})

	it("should handle select parameter across bookmark delete/recreate cycle", () => {
		const originalUrl = "/authors/A2208157607?select=id,display_name,works_count"
		const parsed = parseURL(originalUrl)

		// Simulate bookmark creation
		const bookmarkData = {
			basePath: parsed.basePath,
			queryParams: parsed.queryParams,
			selectFields: parsed.selectFields,
		}

		// Simulate bookmark deletion (data persists)
		// Simulate bookmark recreation with same URL
		const reconstructed = reconstructURL(
			bookmarkData.basePath,
			bookmarkData.queryParams,
			bookmarkData.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
		expect(reparsed.queryParams.select).toBe(parsed.queryParams.select)
	})

	it("should preserve select parameter field order", () => {
		const originalUrl = "/authors/A2208157607?select=works_count,cited_by_count,id,display_name"
		const parsed = parseURL(originalUrl)

		// Order should be preserved
		expect(parsed.selectFields).toEqual([
			"works_count",
			"cited_by_count",
			"id",
			"display_name",
		])

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Verify order is preserved in reconstruction
		expect(reconstructed).toContain("select=works_count,cited_by_count,id,display_name")
	})

	it("should handle entity URL with select parameter and no other query params", () => {
		const originalUrl = "/works/W2741809807?select=id,title,publication_year,type"
		const parsed = parseURL(originalUrl)

		expect(parsed.basePath).toBe("/works/W2741809807")
		expect(parsed.entityType).toBe("works")
		expect(parsed.entityId).toBe("W2741809807")
		expect(parsed.selectFields).toEqual(["id", "title", "publication_year", "type"])
		expect(Object.keys(parsed.queryParams)).toEqual(["select"])

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		expect(reconstructed).toBe("/works/W2741809807?select=id,title,publication_year,type")
	})

	it("should handle select parameter with underscored field names", () => {
		const originalUrl =
			"/authors/A2208157607?select=id,display_name,works_count,cited_by_count,summary_stats"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toContain("works_count")
		expect(parsed.selectFields).toContain("cited_by_count")
		expect(parsed.selectFields).toContain("summary_stats")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Underscores should NOT be encoded in select parameter
		expect(reconstructed).toContain("works_count")
		expect(reconstructed).toContain("cited_by_count")
		expect(reconstructed).not.toContain("works%5Fcount")
	})

	it("should preserve select parameter with very long field list", () => {
		const fields = [
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"h_index",
			"i10_index",
			"orcid",
			"works_api_url",
			"updated_date",
			"created_date",
			"counts_by_year",
			"x_concepts",
			"last_known_institution",
			"last_known_institutions",
			"affiliations",
		]
		const selectParameter = fields.join(",")
		const originalUrl = `/authors/A2208157607?select=${selectParameter}`

		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toEqual(fields)
		expect(parsed.selectFields.length).toBe(fields.length)

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(fields)
	})

	it("should handle select parameter restoration with pagination params", () => {
		const originalUrl = "/works?select=id,title&page=2&per_page=50"
		const parsed = parseURL(originalUrl)

		// When restoring bookmark, pagination params should be preserved
		expect(parsed.selectFields).toEqual(["id", "title"])
		expect(parsed.queryParams.page).toBe("2")
		expect(parsed.queryParams.per_page).toBe("50")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		const reparsed = parseURL(reconstructed)
		expect(reparsed.selectFields).toEqual(parsed.selectFields)
		expect(reparsed.queryParams.page).toBe(parsed.queryParams.page)
		expect(reparsed.queryParams.per_page).toBe(parsed.queryParams.per_page)
	})

	it("should handle bookmarking same entity with default vs custom fields", () => {
		const defaultUrl = "/authors/A2208157607" // No select parameter
		const customUrl = "/authors/A2208157607?select=id,display_name"

		const parsedDefault = parseURL(defaultUrl)
		const parsedCustom = parseURL(customUrl)

		// Default should have no select fields
		expect(parsedDefault.selectFields).toEqual([])
		expect(parsedDefault.queryParams.select).toBeUndefined()

		// Custom should have select fields
		expect(parsedCustom.selectFields).toEqual(["id", "display_name"])
		expect(parsedCustom.queryParams.select).toBe("id,display_name")

		// Reconstruct both
		const reconstructedDefault = reconstructURL(
			parsedDefault.basePath,
			parsedDefault.queryParams,
			parsedDefault.selectFields
		)
		const reconstructedCustom = reconstructURL(
			parsedCustom.basePath,
			parsedCustom.queryParams,
			parsedCustom.selectFields
		)

		// Default should not have select parameter
		expect(reconstructedDefault).toBe("/authors/A2208157607")
		expect(reconstructedDefault).not.toContain("select=")

		// Custom should have select parameter
		expect(reconstructedCustom).toContain("select=id,display_name")
	})

	it("should handle select parameter with complex nested field paths", () => {
		const originalUrl =
			"/institutions/I33213144?select=id,display_name,geo.country_code,geo.region,associated_institutions"
		const parsed = parseURL(originalUrl)

		expect(parsed.selectFields).toContain("geo.country_code")
		expect(parsed.selectFields).toContain("geo.region")

		const reconstructed = reconstructURL(
			parsed.basePath,
			parsed.queryParams,
			parsed.selectFields
		)

		// Dots in field names should NOT be encoded in select parameter
		expect(reconstructed).toContain("geo.country_code")
		expect(reconstructed).not.toContain("geo%2Ecountry_code")
	})
})
