/**
 * US-30: CLI Entity Search Integration Tests
 *
 * Tests CLI search, entity retrieval, output formatting, and rate limiting behavior.
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { OpenAlexCLI } from "../openalex-cli-class.js"

// Mock fetch to prevent actual API calls
globalThis.fetch = vi.fn()

// Constants for skip messages
const SKIP_NO_STATIC_DATA =
	"Skipping test: No static data available. Run 'pnpm cli static:generate' to generate static data."
const SKIP_NO_AUTHOR_DATA = "Skipping test: No static author data available for search test."
const SKIP_NO_WORKS_DATA = "Skipping test: No static works data available for search test."

describe("US-30: CLI Entity Search", () => {
	let cli: OpenAlexCLI

	beforeEach(() => {
		cli = new OpenAlexCLI()
		vi.clearAllMocks()
	})

	describe("search entities by type and term", () => {
		it("should search entities by type and term via CLI search", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			// Get an author name to use as a search term
			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			const firstAuthor = await cli.loadEntity("authors", entities[0])
			expect(firstAuthor).toBeTruthy()

			// Search using a partial name (first name)
			const searchTerm = firstAuthor!.display_name.split(" ")[0]
			const results = await cli.searchEntities("authors", searchTerm)

			expect(Array.isArray(results)).toBe(true)
			expect(results.length).toBeGreaterThan(0)

			// Verify results contain the search term (case-insensitive)
			for (const result of results) {
				expect(result.display_name.toLowerCase()).toContain(searchTerm.toLowerCase())
			}

			// Verify result structure
			const firstResult = results[0]
			expect(typeof firstResult.id).toBe("string")
			expect(typeof firstResult.display_name).toBe("string")
		})

		it("should search works entities when works data is available", async () => {
			const hasWorks = await cli.hasStaticData("works")
			if (!hasWorks) {
				console.log(SKIP_NO_WORKS_DATA)
				return
			}

			const entities = await cli.listEntities("works")
			expect(entities.length).toBeGreaterThan(0)

			const firstWork = await cli.loadEntity("works", entities[0])
			expect(firstWork).toBeTruthy()

			// Search using a word from the title
			const titleWords = firstWork!.display_name.split(" ").filter((w: string) => w.length > 3)
			if (titleWords.length === 0) {
				console.log("Skipping: work title too short for meaningful search")
				return
			}

			const searchTerm = titleWords[0]
			const results = await cli.searchEntities("works", searchTerm)

			expect(Array.isArray(results)).toBe(true)
			expect(results.length).toBeGreaterThan(0)
		})
	})

	describe("fetch specific entity by ID", () => {
		it("should fetch specific entity by ID via CLI get", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			const entityId = entities[0]
			const entity = await cli.loadEntity("authors", entityId)

			expect(entity).toBeTruthy()
			expect(entity?.id).toContain(entityId)
			expect(typeof entity?.display_name).toBe("string")
			expect(entity?.display_name.length).toBeGreaterThan(0)
		})

		it("should return null for non-existent entity ID", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const result = await cli.loadEntity("authors", "A0000000000")
			expect(result).toBeNull()
		})
	})

	describe("output results in JSON and table formats", () => {
		it("should output results in JSON and table formats", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			const entity = await cli.loadEntity("authors", entities[0])
			expect(entity).toBeTruthy()

			// JSON format: entity should be serializable to valid JSON
			const jsonString = JSON.stringify(entity)
			const parsed = JSON.parse(jsonString)
			expect(parsed.id).toBe(entity?.id)
			expect(parsed.display_name).toBe(entity?.display_name)

			// Table format: entity should have consistent field keys
			const keys = Object.keys(entity!)
			expect(keys).toContain("id")
			expect(keys).toContain("display_name")

			// Verify overview output structure (used for table rendering)
			const overview = await cli.getEntityTypeOverview("authors")
			expect(overview).toBeTruthy()
			expect(typeof overview?.entityType).toBe("string")
			expect(typeof overview?.count).toBe("number")
			expect(Array.isArray(overview?.entities)).toBe(true)
		})
	})

	describe("rate limiting", () => {
		it("should respect rate limiting", async () => {
			const hasAnyData =
				(await cli.hasStaticData("authors")) ||
				(await cli.hasStaticData("works")) ||
				(await cli.hasStaticData("institutions"))

			if (!hasAnyData) {
				console.log(SKIP_NO_STATIC_DATA)
				return
			}

			// Mock fetch to simulate rate limiting (HTTP 429)
			const rateLimitResponse = {
				ok: false,
				status: 429,
				statusText: "Too Many Requests",
			} as Response

			vi.mocked(fetch).mockResolvedValue(rateLimitResponse)

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			// Attempting to fetch from API should throw with rate limit status
			await expect(cli.fetchFromAPI("authors", { search: "test" })).rejects.toThrow(
				"API request failed: 429 Too Many Requests"
			)

			// Verify fetch was called (the request was attempted)
			expect(fetch).toHaveBeenCalledTimes(1)

			// Verify the URL was correctly formed
			const calledUrl = vi.mocked(fetch).mock.calls[0][0] as string
			expect(calledUrl).toContain("https://api.openalex.org/authors")
			expect(calledUrl).toContain("search=test")

			consoleSpy.mockRestore()
		})
	})
})
