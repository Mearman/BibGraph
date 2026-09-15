import { describe, expect,it } from "vitest"

import {
	type FieldQuery,
	getFieldQueries,
	getQueryFields,
	hasWildcards,
	isFieldQuery,
	type ParsedQuery,
	parseSearchQuery,
	type QueryTerm,
} from "./query-parser.js"

// Test constants for common patterns
const UNQUOTED_TERM = { isWildcard: false, isQuoted: false }
const QUOTED_TERM = { isWildcard: false, isQuoted: true }
const WILDCARD_TERM = { isWildcard: true, isQuoted: false }

// Test constants for common test strings
const MACHINE_LEARNING = "machine learning"
const DEEP_NEURAL_NETWORKS = "deep neural networks"
const NEURAL_NETWORKS = "neural networks"
const DEEP_LEARNING = "deep learning"
const AI = "AI"
const JOHN_SMITH = "John Smith"
const SMITH = "smith"
const NATURE = "nature"
const NATURE_REVIEWS = "Nature Reviews"

describe("parseSearchQuery", () => {
	describe("basic functionality", () => {
		it("parses simple terms", () => {
			const result = parseSearchQuery(`${MACHINE_LEARNING} ${AI}`)

			expect(result.fieldQueries).toEqual([])
			expect(result.generalTerms).toEqual([
				{ value: "machine", ...UNQUOTED_TERM },
				{ value: "learning", ...UNQUOTED_TERM },
				{ value: AI, ...UNQUOTED_TERM },
			])
		})

		it("parses quoted phrases", () => {
			const result = parseSearchQuery(`"${MACHINE_LEARNING}" ${AI} "${DEEP_NEURAL_NETWORKS}"`)

			expect(result.generalTerms).toEqual([
				{ value: MACHINE_LEARNING, ...QUOTED_TERM },
				{ value: AI, ...UNQUOTED_TERM },
				{ value: DEEP_NEURAL_NETWORKS, ...QUOTED_TERM },
			])
		})

		it("parses wildcards in various positions", () => {
			const result = parseSearchQuery("*machine* learn* *ing suffix*")

			expect(result.generalTerms).toEqual([
				{ value: "*machine*", ...WILDCARD_TERM },
				{ value: "learn*", ...WILDCARD_TERM },
				{ value: "*ing", ...WILDCARD_TERM },
				{ value: "suffix*", ...WILDCARD_TERM },
			])
		})

		it("handles quoted wildcards", () => {
			const result = parseSearchQuery('"*machine learning*" "*AI*"')

			expect(result.generalTerms).toEqual([
				{ value: "*machine learning*", isWildcard: true, isQuoted: true },
				{ value: "*AI*", isWildcard: true, isQuoted: true },
			])
		})
	})

	describe("field queries", () => {
		it("parses field queries without spaces", () => {
			const result = parseSearchQuery(`title:machine author:${SMITH} journal:${NATURE}`)

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: "machine",
					isWildcard: false,
					isQuoted: false,
				},
				{ field: "author", value: SMITH, ...UNQUOTED_TERM },
				{
					field: "journal",
					value: NATURE,
					isWildcard: false,
					isQuoted: false,
				},
			])
			expect(result.generalTerms).toEqual([])
		})

		it("parses field queries with quoted values", () => {
			const result = parseSearchQuery(`title:"${MACHINE_LEARNING}" author:"${JOHN_SMITH}"`)

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: MACHINE_LEARNING,
					isWildcard: false,
					isQuoted: true,
				},
				{
					field: "author",
					value: JOHN_SMITH,
					isWildcard: false,
					isQuoted: true,
				},
			])
		})

		it("parses field queries with space after colon", () => {
			const result = parseSearchQuery(
				`title: "${MACHINE_LEARNING}" author: ${SMITH} journal: "${NATURE_REVIEWS}"`
			)

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: MACHINE_LEARNING,
					isWildcard: false,
					isQuoted: true,
				},
				{ field: "author", value: SMITH, ...UNQUOTED_TERM },
				{
					field: "journal",
					value: NATURE_REVIEWS,
					isWildcard: false,
					isQuoted: true,
				},
			])
		})

		it("parses field queries with wildcards", () => {
			const result = parseSearchQuery("title:*machine* author:smith* journal:*nature")

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: "*machine*",
					isWildcard: true,
					isQuoted: false,
				},
				{ field: "author", value: "smith*", ...WILDCARD_TERM },
				{
					field: "journal",
					value: "*nature",
					isWildcard: true,
					isQuoted: false,
				},
			])
		})

		it("parses field queries with quoted wildcards", () => {
			const result = parseSearchQuery('title:"*machine learning*" author:"*smith"')

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: "*machine learning*",
					isWildcard: true,
					isQuoted: true,
				},
				{ field: "author", value: "*smith", isWildcard: true, isQuoted: true },
			])
		})

		it("handles multiple field queries for the same field", () => {
			const result = parseSearchQuery('author:smith author:"John Doe" author:*johnson')

			expect(result.fieldQueries).toEqual([
				{ field: "author", value: "smith", ...UNQUOTED_TERM },
				{
					field: "author",
					value: "John Doe",
					isWildcard: false,
					isQuoted: true,
				},
				{
					field: "author",
					value: "*johnson",
					isWildcard: true,
					isQuoted: false,
				},
			])
		})

		it("validates field names and treats invalid ones as general terms", () => {
			const result = parseSearchQuery("123invalid:value -field:value valid_field:value")

			expect(result.fieldQueries).toEqual([
				{
					field: "valid_field",
					value: "value",
					isWildcard: false,
					isQuoted: false,
				},
			])
			expect(result.generalTerms).toEqual([
				{ value: "123invalid:value", ...UNQUOTED_TERM },
				{ value: "-field:value", ...UNQUOTED_TERM },
			])
		})
	})

	describe("mixed queries", () => {
		it("parses complex mixed query", () => {
			const result = parseSearchQuery(
				`title:"${NEURAL_NETWORKS}" author:${SMITH} *${AI}* "${DEEP_LEARNING}" year:2023`
			)

			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: NEURAL_NETWORKS,
					isWildcard: false,
					isQuoted: true,
				},
				{ field: "author", value: SMITH, ...UNQUOTED_TERM },
				{ field: "year", value: "2023", ...UNQUOTED_TERM },
			])
			expect(result.generalTerms).toEqual([
				{ value: `*${AI}*`, ...WILDCARD_TERM },
				{ value: DEEP_LEARNING, ...QUOTED_TERM },
			])
		})

		it("handles field queries mixed with general terms", () => {
			const result = parseSearchQuery(
				`${MACHINE_LEARNING} title:${AI} author:"${JOHN_SMITH}" ${NEURAL_NETWORKS}`
			)

			expect(result.fieldQueries).toEqual([
				{ field: "title", value: AI, ...UNQUOTED_TERM },
				{
					field: "author",
					value: JOHN_SMITH,
					isWildcard: false,
					isQuoted: true,
				},
			])
			expect(result.generalTerms).toEqual([
				{ value: "machine", ...UNQUOTED_TERM },
				{ value: "learning", ...UNQUOTED_TERM },
				{ value: "neural", ...UNQUOTED_TERM },
				{ value: "networks", ...UNQUOTED_TERM },
			])
		})
	})

	describe("edge cases", () => {
		it("handles empty query", () => {
			const result = parseSearchQuery("")

			expect(result.fieldQueries).toEqual([])
			expect(result.generalTerms).toEqual([])
		})

		it("handles whitespace-only query", () => {
			const result = parseSearchQuery("   \t\n  ")

			expect(result.fieldQueries).toEqual([])
			expect(result.generalTerms).toEqual([])
		})

		it("handles single colon without field name", () => {
			const result = parseSearchQuery(":value")

			expect(result.fieldQueries).toEqual([])
			expect(result.generalTerms).toEqual([{ value: ":value", ...UNQUOTED_TERM }])
		})

		it("handles trailing colon without value", () => {
			const result = parseSearchQuery("title: author")

			expect(result.fieldQueries).toEqual([{ field: "title", value: "author", ...UNQUOTED_TERM }])
			expect(result.generalTerms).toEqual([])
		})

		it("handles empty quoted strings", () => {
			const result = parseSearchQuery('title:"" ""')

			expect(result.fieldQueries).toEqual([{ field: "title", value: "", ...QUOTED_TERM }])
			expect(result.generalTerms).toEqual([{ value: "", ...QUOTED_TERM }])
		})

		it("handles unmatched quotes", () => {
			const result = parseSearchQuery(`title:"unclosed quote ${MACHINE_LEARNING}`)

			// Parser handles malformed input by treating unclosed quotes as partial field queries
			expect(result.fieldQueries).toEqual([
				{
					field: "title",
					value: '"unclosed',
					isWildcard: false,
					isQuoted: false,
				},
			])
			expect(result.generalTerms).toEqual([
				{ value: "quote", ...UNQUOTED_TERM },
				{ value: "machine", ...UNQUOTED_TERM },
				{ value: "learning", ...UNQUOTED_TERM },
			])
		})

		it("handles field names with underscores and numbers", () => {
			const result = parseSearchQuery("field_1:value field_name_123:value _field:value field123:value")

			expect(result.fieldQueries).toEqual([
				{
					field: "field_1",
					value: "value",
					isWildcard: false,
					isQuoted: false,
				},
				{
					field: "field_name_123",
					value: "value",
					isWildcard: false,
					isQuoted: false,
				},
				{ field: "_field", value: "value", ...UNQUOTED_TERM },
				{
					field: "field123",
					value: "value",
					isWildcard: false,
					isQuoted: false,
				},
			])
		})

		it("preserves multiple spaces in quoted strings", () => {
			const EXTRA_SPACES_COUNT = 4
			const result = parseSearchQuery(`"${MACHINE_LEARNING.replace(" ", ' '.repeat(EXTRA_SPACES_COUNT))}"`)

			expect(result.generalTerms).toEqual([{ value: "machine    learning", ...QUOTED_TERM }])
		})
	})
})

describe("helper functions", () => {
	describe("isFieldQuery", () => {
		it("identifies field queries correctly", () => {
			const fieldQuery: FieldQuery = {
				field: "title",
				value: "test",
				isWildcard: false,
				isQuoted: false,
			}
			const generalTerm: QueryTerm = {
				value: "test",
				isWildcard: false,
				isQuoted: false,
			}

			expect(isFieldQuery(fieldQuery)).toBe(true)
			expect(isFieldQuery(generalTerm)).toBe(false)
		})
	})

	describe("getQueryFields", () => {
		it("extracts unique field names", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [
					{
						field: "title",
						value: "test1",
						isWildcard: false,
						isQuoted: false,
					},
					{
						field: "author",
						value: "test2",
						isWildcard: false,
						isQuoted: false,
					},
					{
						field: "title",
						value: "test3",
						isWildcard: false,
						isQuoted: false,
					},
					{
						field: "journal",
						value: "test4",
						isWildcard: false,
						isQuoted: false,
					},
				],
				generalTerms: [],
			}

			const fields = getQueryFields(parsedQuery)
			expect(fields).toEqual(["title", "author", "journal"])
		})

		it("returns empty array for query without field queries", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [],
				generalTerms: [{ value: "test", ...UNQUOTED_TERM }],
			}

			const fields = getQueryFields(parsedQuery)
			expect(fields).toEqual([])
		})
	})

	describe("getFieldQueries", () => {
		it("filters field queries by field name", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [
					{
						field: "title",
						value: "test1",
						isWildcard: false,
						isQuoted: false,
					},
					{
						field: "author",
						value: "test2",
						isWildcard: false,
						isQuoted: false,
					},
					{ field: "title", value: "test3", ...WILDCARD_TERM },
				],
				generalTerms: [],
			}

			const titleQueries = getFieldQueries({ parsedQuery, field: "title" })
			expect(titleQueries).toEqual([
				{ field: "title", value: "test1", ...UNQUOTED_TERM },
				{ field: "title", value: "test3", ...WILDCARD_TERM },
			])

			const authorQueries = getFieldQueries({ parsedQuery, field: "author" })
			expect(authorQueries).toEqual([{ field: "author", value: "test2", ...UNQUOTED_TERM }])

			const nonExistentQueries = getFieldQueries({
				parsedQuery,
				field: "nonexistent",
			})
			expect(nonExistentQueries).toEqual([])
		})
	})

	describe("hasWildcards", () => {
		it("detects wildcards in field queries", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [
					{
						field: "title",
						value: "*test*",
						isWildcard: true,
						isQuoted: false,
					},
				],
				generalTerms: [],
			}

			expect(hasWildcards(parsedQuery)).toBe(true)
		})

		it("detects wildcards in general terms", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [],
				generalTerms: [{ value: "test*", ...WILDCARD_TERM }],
			}

			expect(hasWildcards(parsedQuery)).toBe(true)
		})

		it("returns false when no wildcards present", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [{ field: "title", value: "test", ...UNQUOTED_TERM }],
				generalTerms: [{ value: "term", ...UNQUOTED_TERM }],
			}

			expect(hasWildcards(parsedQuery)).toBe(false)
		})

		it("returns false for empty query", () => {
			const parsedQuery: ParsedQuery = {
				fieldQueries: [],
				generalTerms: [],
			}

			expect(hasWildcards(parsedQuery)).toBe(false)
		})
	})
})
