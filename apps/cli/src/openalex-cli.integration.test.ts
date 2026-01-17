/**
 * Integration tests for OpenAlex CLI using real static data
 */

import { beforeEach, describe, expect, it, vi } from "vitest"

import { detectEntityType, toStaticEntityType } from "./entity-detection.js"
import { OpenAlexCLI } from "./openalex-cli-class.js"

// Mock fetch to prevent actual API calls
globalThis.fetch = vi.fn()

// Constants for repeated strings
const SKIP_NO_STATIC_DATA =
	"Skipping test: No static data available. Run 'pnpm cli static:generate' to generate static data."
const SKIP_NO_AUTHOR_DATA = "Skipping test: No static author data available."
const SKIP_NO_AUTHOR_DATA_CACHE = "Skipping test: No static author data available for cache test."

describe("OpenAlexCLI Integration Tests", () => {
	let cli: OpenAlexCLI

	beforeEach(() => {
		cli = new OpenAlexCLI()
		vi.clearAllMocks()
	})

	describe("Static Data Operations", () => {
		it("should detect available static data types", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			const hasWorks = await cli.hasStaticData("works")
			const hasInstitutions = await cli.hasStaticData("institutions")

			// If no static data is available, skip the test
			if (!hasAuthors && !hasWorks && !hasInstitutions) {
				console.log(SKIP_NO_STATIC_DATA)
				return
			}

			// Test that at least authors and works are available (institutions may not be generated)
			expect(hasAuthors || hasWorks).toBe(true)
			// Note: institutions static data may not be available in all configurations
		})

		it("should load author index successfully", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const index = await cli.getEntityTypeOverview("authors")

			expect(index).toBeTruthy()
			expect(index?.entityType).toBe("authors")
			expect(index?.count).toBeGreaterThan(0)
			expect(Array.isArray(index?.entities)).toBe(true)
			expect(index?.entities.length).toBeGreaterThan(0)
		})

		it("should load specific author entity", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			// First get the list of available authors
			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			// Load the first author
			const authorId = entities[0]
			const author = await cli.loadEntity("authors", authorId)

			expect(author).toBeTruthy()
			expect(author?.id).toContain(authorId)
			expect(author?.display_name).toBeTruthy()
			expect(typeof author?.display_name).toBe("string")
		})

		it("should search authors by name", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			// Get available authors first to find a searchable name
			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			// Load the first author to get their name for searching
			const firstAuthor = await cli.loadEntity("authors", entities[0])
			expect(firstAuthor).toBeTruthy()

			const searchTerm = firstAuthor!.display_name.split(" ")[0] // Use first name
			const results = await cli.searchEntities("authors", searchTerm)

			expect(Array.isArray(results)).toBe(true)
			// Expecting at least one result for the search term
			expect(results.length).toBeGreaterThan(0)

			const author = results[0]
			expect(author.display_name.toLowerCase()).toContain(searchTerm.toLowerCase())
		})

		it("should get statistics for all entity types", async () => {
			const hasAnyData =
				(await cli.hasStaticData("authors")) ||
				(await cli.hasStaticData("works")) ||
				(await cli.hasStaticData("institutions"))
			if (!hasAnyData) {
				console.log("Skipping test: No static data available for statistics.")
				return
			}

			const stats = await cli.getStatistics()

			expect(typeof stats).toBe("object")
			expect(Object.keys(stats).length).toBeGreaterThan(0)

			// At least one entity type should have stats (validated by hasAnyData check)
			const hasAnyStats = stats.authors || stats.works || stats.institutions
			expect(hasAnyStats).toBeTruthy()

			// Validate structure of returned stats (whichever entity types are present)
			// Note: At least one entity type has stats (validated by hasAnyStats check above)

			// For each present entity type, validate its structure
			const validEntityStats = Object.values(stats).filter(
				(entityStats) => entityStats !== null && entityStats !== undefined
			)

			// At least one entity type should have valid stats
			expect(validEntityStats.length).toBeGreaterThan(0)

			// Extract values that need validation
			const countsToValidate = validEntityStats
				.filter((entityStats) => "count" in entityStats && entityStats.count !== undefined)
				.map((entityStats) => entityStats.count)

			const lastModifiedToValidate = validEntityStats
				.filter((entityStats) => "lastModified" in entityStats && entityStats.lastModified !== undefined)
				.map((entityStats) => entityStats.lastModified)

			// Validate all counts are non-negative (0 is valid for empty caches)
			for (const count of countsToValidate) {
				expect(count).toBeGreaterThanOrEqual(0)
			}

			// Validate all lastModified values
			for (const lastModified of lastModifiedToValidate) {
				expect(typeof lastModified).toBe("string")
			}
		})

		it("should return null for non-existent entity", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const entity = await cli.loadEntity("authors", "A9999999999")
			expect(entity).toBeNull()
		})

		it("should return empty array for non-existent entity type search", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const results = await cli.searchEntities("authors", "NonExistentNameXYZ123")
			expect(Array.isArray(results)).toBe(true)
			expect(results.length).toBe(0)
		})
	})

	describe("Cache Control", () => {
		it("should handle cache-only mode for existing entity", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA_CACHE)
				return
			}

			const entities = await cli.listEntities("authors")
			const authorId = entities[0]

			const consoleSpy = vi.spyOn(console, "debug").mockImplementation(() => {})

			const result = await cli.getEntityWithCache("authors", authorId, {
				useCache: true,
				saveToCache: false,
				cacheOnly: true,
			})

			expect(result).toBeTruthy()
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[general] Cache hit for authors/" + authorId),
				""
			)

			consoleSpy.mockRestore()
		})

		it("should handle cache-only mode for non-existing entity", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA_CACHE)
				return
			}

			const consoleSpy = vi.spyOn(console, "warn").mockImplementation(() => {})

			const result = await cli.getEntityWithCache("authors", "A9999999999", {
				useCache: true,
				saveToCache: false,
				cacheOnly: true,
			})

			expect(result).toBeNull()
			expect(consoleSpy).toHaveBeenCalledWith(
				expect.stringContaining("[general] Cache-only mode: entity A9999999999 not found in cache"),
				""
			)

			consoleSpy.mockRestore()
		})

		it("should skip cache when no-cache enabled", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA_CACHE)
				return
			}

			const entities = await cli.listEntities("authors")
			const authorId = entities[0]

			// Mock successful API response
			const mockEntity = {
				id: `https://openalex.org/${authorId}`,
				display_name: "Mock Author",
				works_count: 5,
			}

			vi.mocked(fetch).mockResolvedValue({
				ok: true,
				json: () => Promise.resolve({ results: [mockEntity] }),
			} as unknown as Response)

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			const result = await cli.getEntityWithCache("authors", authorId, {
				useCache: false,
				saveToCache: false,
				cacheOnly: false,
			})

			expect(result).toEqual(mockEntity)
			expect(fetch).toHaveBeenCalledWith(expect.stringContaining("filter=id%3A" + authorId))

			consoleSpy.mockRestore()
		})
	})

	describe("Query Building", () => {
		it("should build correct query URLs", () => {
			const url1 = cli.buildQueryUrl("authors", {})
			expect(url1).toBe("https://api.openalex.org/authors?per_page=50")

			const url2 = cli.buildQueryUrl("works", {
				filter: "author.id:A123",
				select: ["id", "display_name"],
				per_page: 25,
			})

			expect(url2).toContain("https://api.openalex.org/works?")
			expect(url2).toContain("filter=author.id%3AA123")
			expect(url2).toContain("select=id%2Cdisplay_name")
			expect(url2).toContain("per_page=25")
		})
	})

	describe("Error Handling", () => {
		it("should handle API fetch errors gracefully", async () => {
			vi.mocked(fetch).mockRejectedValue(new Error("Network error"))

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			await expect(cli.fetchFromAPI("authors", {})).rejects.toThrow("Network error")

			consoleSpy.mockRestore()
		})

		it("should handle API response errors", async () => {
			vi.mocked(fetch).mockResolvedValue({
				ok: false,
				status: 404,
				statusText: "Not Found",
			} as Response)

			const consoleSpy = vi.spyOn(console, "error").mockImplementation(() => {})

			await expect(cli.fetchFromAPI("authors", {})).rejects.toThrow(
				"API request failed: 404 Not Found"
			)

			consoleSpy.mockRestore()
		})
	})

	describe("Real Data Validation", () => {
		it("should have consistent data structure in author entities", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log(SKIP_NO_AUTHOR_DATA)
				return
			}

			const entities = await cli.listEntities("authors")
			const authorId = entities[0]
			const author = await cli.loadEntity("authors", authorId)

			expect(author).toBeTruthy()
			expect(typeof author?.id).toBe("string")
			expect(author?.id).toContain("https://openalex.org/")
			expect(typeof author?.display_name).toBe("string")
			expect(author?.display_name.length).toBeGreaterThan(0)
		})

		it("should have searchable authors in the static data", async () => {
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log("Skipping test: No static author data available for author search.")
				return
			}

			// Get available authors and test searching for one of them
			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			const firstAuthor = await cli.loadEntity("authors", entities[0])
			expect(firstAuthor).toBeTruthy()

			// Search for this author's name
			const results = await cli.searchEntities("authors", firstAuthor!.display_name)

			expect(results.length).toBeGreaterThan(0)
			const foundAuthor = results.find((author) => author.id === firstAuthor!.id)

			expect(foundAuthor).toBeTruthy()
			expect(foundAuthor?.display_name).toBe(firstAuthor!.display_name)
		})

		it("should have works data available", async () => {
			const hasWorks = await cli.hasStaticData("works")
			if (!hasWorks) {
				console.log("Skipping test: No static works data available.")
				return
			}

			const works = await cli.listEntities("works")
			expect(works.length).toBeGreaterThan(0)

			const firstWork = await cli.loadEntity("works", works[0])
			expect(firstWork).toBeTruthy()
			expect(typeof firstWork?.display_name).toBe("string")
		})
	})

	describe("Entity Auto-Detection", () => {
		it("should detect author entity type from bare ID", () => {
			const entityType = detectEntityType("A5017898742")
			expect(entityType).toBe("authors")
		})

		it("should detect works entity type from bare ID", () => {
			const entityType = detectEntityType("W2241997964")
			expect(entityType).toBe("works")
		})

		it("should detect entity type from full OpenAlex URL", () => {
			const entityType = detectEntityType("https://openalex.org/A5017898742")
			expect(entityType).toBe("authors")
		})

		it("should detect all supported entity types", () => {
			expect(detectEntityType("W2241997964")).toBe("works")
			expect(detectEntityType("A5017898742")).toBe("authors")
			expect(detectEntityType("S123")).toBe("sources")
			expect(detectEntityType("I123")).toBe("institutions")
			expect(detectEntityType("T123")).toBe("topics")
			expect(detectEntityType("P123")).toBe("publishers")
		})

		it("should throw error for invalid entity ID format", () => {
			expect(() => detectEntityType("invalid123")).toThrow(
				"Cannot detect entity type from ID: invalid123"
			)
			expect(() => detectEntityType("123")).toThrow("Cannot detect entity type from ID: 123")
			expect(() => detectEntityType("")).toThrow("Cannot detect entity type from ID: ")
		})

		it("should work with auto-detection in CLI workflow", async () => {
			// Test the integration of auto-detection with actual CLI functionality
			const hasAuthors = await cli.hasStaticData("authors")
			if (!hasAuthors) {
				console.log("Skipping test: No static author data available for auto-detection workflow test.")
				return
			}

			// Get an available author ID from the static data
			const entities = await cli.listEntities("authors")
			expect(entities.length).toBeGreaterThan(0)

			const entityId = entities[0] // Use the first available author ID
			const detectedType = detectEntityType(entityId)

			const entity = await cli.getEntityWithCache(toStaticEntityType(detectedType), entityId, {
				useCache: true,
				saveToCache: false,
				cacheOnly: true,
			})

			expect(entity).toBeTruthy()
			expect(entity?.id).toContain(entityId)
			expect(detectedType).toBe("authors")
		})
	})
})
