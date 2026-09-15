/**
 * Field Summary Tests
 *
 * Tests for field summary generation utilities
 */

import { describe, expect,it } from "vitest"

import {
	areFieldSelectionsEquivalent,
	categorizeFields,
	compareFieldSelections,
	generateCompactFieldSummary,
	generateDetailedFieldSummary,
	generateFieldListPreview,
	generateFieldSummary,
	generateSmartFieldSummary,
	validateFieldNames,
} from "./field-summary"

describe("generateFieldSummary", () => {
	it("should return 'default fields' for empty array", () => {
		expect(generateFieldSummary([])).toBe("default fields")
	})

	it("should return '1 field' for single field", () => {
		expect(generateFieldSummary(["id"])).toBe("1 field")
	})

	it("should return correct count for multiple fields", () => {
		expect(generateFieldSummary(["id", "display_name"])).toBe("2 fields")
		expect(generateFieldSummary(["id", "title", "doi"])).toBe("3 fields")
		expect(generateFieldSummary(["id", "title", "doi", "cited_by_count"])).toBe(
			"4 fields"
		)
	})
})

describe("generateDetailedFieldSummary", () => {
	it("should return 'default fields' for empty array", () => {
		expect(generateDetailedFieldSummary([])).toBe("default fields")
	})

	it("should show all fields when count is below threshold", () => {
		expect(generateDetailedFieldSummary(["id", "display_name"])).toBe(
			"2 fields: id, display_name"
		)
		expect(generateDetailedFieldSummary(["id", "title", "doi"])).toBe(
			"3 fields: id, title, doi"
		)
	})

	it("should truncate with +N more when count exceeds threshold", () => {
		expect(
			generateDetailedFieldSummary(["id", "title", "doi", "cited_by_count"])
		).toBe("4 fields: id, title, doi, +1 more")

		expect(
			generateDetailedFieldSummary([
				"id",
				"title",
				"doi",
				"cited_by_count",
				"publication_year",
			])
		).toBe("5 fields: id, title, doi, +2 more")
	})

	it("should respect custom max fields to show", () => {
		expect(
			generateDetailedFieldSummary(
				["id", "title", "doi", "cited_by_count"],
				2
			)
		).toBe("4 fields: id, title, +2 more")

		expect(generateDetailedFieldSummary(["id", "title", "doi"], 1)).toBe(
			"3 fields: id, +2 more"
		)
	})
})

describe("generateCompactFieldSummary", () => {
	it("should return 'default' for empty array", () => {
		expect(generateCompactFieldSummary([])).toBe("default")
	})

	it("should return compact format for fields", () => {
		expect(generateCompactFieldSummary(["id"])).toBe("1 field")
		expect(generateCompactFieldSummary(["id", "title"])).toBe("2 fields")
		expect(generateCompactFieldSummary(["id", "title", "doi"])).toBe(
			"3 fields"
		)
	})
})

describe("generateFieldListPreview", () => {
	it("should return 'default fields' for empty array", () => {
		expect(generateFieldListPreview([])).toBe("default fields")
	})

	it("should show full list when under max length", () => {
		expect(generateFieldListPreview(["id", "title"])).toBe("id, title")
		expect(generateFieldListPreview(["id", "title", "doi"])).toBe(
			"id, title, doi"
		)
	})

	it("should truncate with ellipsis when over max length", () => {
		const MAX_LENGTH = 30
		const longFieldList = [
			"id",
			"display_name",
			"works_count",
			"cited_by_count",
			"h_index",
		]
		const result = generateFieldListPreview(longFieldList, MAX_LENGTH)
		expect(result).toHaveLength(MAX_LENGTH)
		expect(result).toMatch(/\.\.\.$/)
	})

	it("should respect custom max length", () => {
		const MAX_LENGTH = 10
		const result = generateFieldListPreview(["id", "display_name"], MAX_LENGTH)
		expect(result).toHaveLength(MAX_LENGTH)
		expect(result).toBe("id, dis...")
	})
})

describe("categorizeFields", () => {
	it("should categorize identifiers", () => {
		const categories = categorizeFields(["id", "doi", "orcid"])
		expect(categories.identifiers).toEqual(["id", "doi", "orcid"])
	})

	it("should categorize basic fields", () => {
		const categories = categorizeFields(["display_name", "title"])
		expect(categories.basic).toEqual(["display_name", "title"])
	})

	it("should categorize metrics", () => {
		const categories = categorizeFields([
			"works_count",
			"cited_by_count",
			"h_index",
		])
		expect(categories.metrics).toEqual([
			"works_count",
			"cited_by_count",
			"h_index",
		])
	})

	it("should categorize relationships", () => {
		const categories = categorizeFields(["authorships", "institutions"])
		expect(categories.relationships).toEqual(["authorships", "institutions"])
	})

	it("should categorize dates", () => {
		const categories = categorizeFields([
			"publication_year",
			"created_date",
			"updated_date",
		])
		expect(categories.dates).toEqual([
			"publication_year",
			"created_date",
			"updated_date",
		])
	})

	it("should handle mixed field types", () => {
		const categories = categorizeFields([
			"id",
			"display_name",
			"works_count",
			"publication_year",
			"authorships",
		])
		expect(categories.identifiers).toContain("id")
		expect(categories.basic).toContain("display_name")
		expect(categories.metrics).toContain("works_count")
		expect(categories.dates).toContain("publication_year")
		expect(categories.relationships).toContain("authorships")
	})

	it("should put unrecognized fields in 'other' category", () => {
		const categories = categorizeFields(["id", "custom_field", "display_name"])
		expect(categories.other).toContain("custom_field")
	})
})

describe("generateSmartFieldSummary", () => {
	it("should return 'default fields' for empty array", () => {
		expect(generateSmartFieldSummary([])).toBe("default fields")
	})

	it("should return simple count when no special categories", () => {
		expect(generateSmartFieldSummary(["display_name"])).toBe("1 field")
		expect(generateSmartFieldSummary(["display_name", "title"])).toBe(
			"2 fields"
		)
	})

	it("should highlight metrics", () => {
		expect(
			generateSmartFieldSummary(["id", "works_count", "cited_by_count"])
		).toBe("3 fields (1 identifier, 2 metrics)")
	})

	it("should highlight identifiers", () => {
		expect(generateSmartFieldSummary(["id", "doi", "orcid"])).toBe(
			"3 fields (3 identifiers)"
		)
	})

	it("should highlight dates", () => {
		expect(
			generateSmartFieldSummary(["id", "publication_year", "updated_date"])
		).toBe("3 fields (1 identifier, 2 dates)")
	})

	it("should use singular labels for single items", () => {
		expect(generateSmartFieldSummary(["id", "works_count"])).toBe(
			"2 fields (1 identifier, 1 metric)"
		)
	})

	it("should handle complex field selections", () => {
		const result = generateSmartFieldSummary([
			"id",
			"doi",
			"display_name",
			"works_count",
			"cited_by_count",
			"publication_year",
			"authorships",
		])
		expect(result).toContain("7 fields")
		expect(result).toContain("2 identifiers")
		expect(result).toContain("2 metrics")
		expect(result).toContain("1 date")
		expect(result).toContain("1 relationship")
	})
})

describe("compareFieldSelections", () => {
	it("should detect added fields", () => {
		const result = compareFieldSelections(
			["id", "title"],
			["id", "title", "doi"]
		)
		expect(result.added).toEqual(["doi"])
		expect(result.removed).toEqual([])
		expect(result.common).toEqual(["id", "title"])
		expect(result.countChange).toBe(1)
	})

	it("should detect removed fields", () => {
		const result = compareFieldSelections(
			["id", "title", "doi"],
			["id", "title"]
		)
		expect(result.added).toEqual([])
		expect(result.removed).toEqual(["doi"])
		expect(result.common).toEqual(["id", "title"])
		expect(result.countChange).toBe(-1)
	})

	it("should detect both added and removed fields", () => {
		const result = compareFieldSelections(
			["id", "title", "doi"],
			["id", "title", "cited_by_count"]
		)
		expect(result.added).toEqual(["cited_by_count"])
		expect(result.removed).toEqual(["doi"])
		expect(result.common).toEqual(["id", "title"])
		expect(result.countChange).toBe(0)
	})

	it("should handle empty field lists", () => {
		const result = compareFieldSelections([], ["id", "title"])
		expect(result.added).toEqual(["id", "title"])
		expect(result.removed).toEqual([])
		expect(result.common).toEqual([])
		expect(result.countChange).toBe(2)
	})

	it("should handle identical field lists", () => {
		const result = compareFieldSelections(["id", "title"], ["id", "title"])
		expect(result.added).toEqual([])
		expect(result.removed).toEqual([])
		expect(result.common).toEqual(["id", "title"])
		expect(result.countChange).toBe(0)
	})
})

describe("areFieldSelectionsEquivalent", () => {
	it("should return true for identical selections", () => {
		expect(areFieldSelectionsEquivalent(["id", "title"], ["id", "title"])).toBe(
			true
		)
	})

	it("should return true for same fields in different order", () => {
		expect(areFieldSelectionsEquivalent(["id", "title"], ["title", "id"])).toBe(
			true
		)
	})

	it("should return false for different field sets", () => {
		expect(
			areFieldSelectionsEquivalent(["id", "title"], ["id", "display_name"])
		).toBe(false)
	})

	it("should return false for different field counts", () => {
		expect(areFieldSelectionsEquivalent(["id"], ["id", "title"])).toBe(false)
	})

	it("should return true for empty arrays", () => {
		expect(areFieldSelectionsEquivalent([], [])).toBe(true)
	})

	it("should handle complex field lists", () => {
		expect(
			areFieldSelectionsEquivalent(
				["id", "display_name", "works_count", "cited_by_count"],
				["cited_by_count", "id", "works_count", "display_name"]
			)
		).toBe(true)
	})
})

describe("validateFieldNames", () => {
	it("should validate standard field names", () => {
		const result = validateFieldNames(["id", "display_name", "works_count"])
		expect(result.valid).toBe(true)
		expect(result.invalidFields).toEqual([])
	})

	it("should validate nested field names with dots", () => {
		const result = validateFieldNames(["id", "geo.country_code", "geo.region"])
		expect(result.valid).toBe(true)
		expect(result.invalidFields).toEqual([])
	})

	it("should reject fields with spaces", () => {
		const result = validateFieldNames(["id", "invalid field", "display_name"])
		expect(result.valid).toBe(false)
		expect(result.invalidFields).toEqual(["invalid field"])
	})

	it("should reject fields with special characters", () => {
		const result = validateFieldNames([
			"id",
			"invalid!field",
			"another@field",
			"display_name",
		])
		expect(result.valid).toBe(false)
		expect(result.invalidFields).toEqual(["invalid!field", "another@field"])
	})

	it("should accept fields with numbers", () => {
		const result = validateFieldNames(["id", "field123", "display_name2"])
		expect(result.valid).toBe(true)
		expect(result.invalidFields).toEqual([])
	})

	it("should handle empty field list", () => {
		const result = validateFieldNames([])
		expect(result.valid).toBe(true)
		expect(result.invalidFields).toEqual([])
	})

	it("should accept complex nested paths", () => {
		const result = validateFieldNames([
			"id",
			"x_concepts.level",
			"counts_by_year.year",
			"last_known_institution.display_name",
		])
		expect(result.valid).toBe(true)
		expect(result.invalidFields).toEqual([])
	})
})
