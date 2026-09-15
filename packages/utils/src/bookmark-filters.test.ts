/**
 * Bookmark Filter Tests
 *
 * Tests for filtering and searching bookmarks by various criteria
 *
 * Related:
 * - T035: Unit test for bookmark filtering logic
 * - User Story 3: Organize and Search Bookmarks
 */

import type { Bookmark, EntityType } from "@bibgraph/types";
import { describe, expect,it } from "vitest";

import { filterByEntityType, filterBySearch, filterByTags } from "./bookmark-filters.js";

// Mock bookmark data for testing
const createMockBookmark = (
	id: string,
	entityType: EntityType,
	title: string,
	tags: readonly string[] = [],
	notes = ""
): Bookmark => ({
	id,
	listId: "bookmarks-list",
	entityType,
	entityId: `${entityType.charAt(0).toUpperCase()}${id}`,
	addedAt: new Date(),
	position: 0,
	notes,
	metadata: {
		url: `/${entityType}/${id}`,
		title,
		entityType,
		entityId: `${entityType.charAt(0).toUpperCase()}${id}`,
		tags: [...tags],
		timestamp: new Date(),
	},
});

const WHITESPACE_ONLY_QUERY_LENGTH = 3;

describe("filterBySearch", () => {
	it("should return all bookmarks when search query is empty", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "works", "Research Paper"),
		];

		expect(filterBySearch(bookmarks, "")).toEqual(bookmarks);
		expect(filterBySearch(bookmarks, ' '.repeat(WHITESPACE_ONLY_QUERY_LENGTH))).toEqual(bookmarks);
	});

	it("should filter by title (case-insensitive)", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "authors", "Jane Smith"),
			createMockBookmark("3", "works", "Machine Learning Paper"),
		];

		const result = filterBySearch(bookmarks, "john");
		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("John Doe");
	});

	it("should filter by notes", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe", [], "Important researcher"),
			createMockBookmark("2", "works", "Paper Title", [], "Seminal work on AI"),
		];

		const result = filterBySearch(bookmarks, "seminal");
		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("Paper Title");
	});

	it("should filter by tags", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe", ["ai", "research"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
		];

		const result = filterBySearch(bookmarks, "ai");
		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("John Doe");
	});

	it("should filter by entity type", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "works", "Paper"),
		];

		const result = filterBySearch(bookmarks, "authors");
		expect(result).toHaveLength(1);
		expect(result[0].entityType).toBe("authors");
	});

	it("should match partial words", () => {
		const bookmarks = [createMockBookmark("1", "authors", "Machine Learning Expert")];

		expect(filterBySearch(bookmarks, "learn")).toHaveLength(1);
		expect(filterBySearch(bookmarks, "mach")).toHaveLength(1);
	});

	it("should be case-insensitive", () => {
		const bookmarks = [createMockBookmark("1", "authors", "John Doe")];

		expect(filterBySearch(bookmarks, "JOHN")).toHaveLength(1);
		expect(filterBySearch(bookmarks, "john")).toHaveLength(1);
		expect(filterBySearch(bookmarks, "JoHn")).toHaveLength(1);
	});

	it("should return empty array when no matches", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "works", "Paper"),
		];

		expect(filterBySearch(bookmarks, "nonexistent")).toEqual([]);
	});

	it("should handle special characters in search", () => {
		const bookmarks = [createMockBookmark("1", "works", "C++ Programming Guide")];

		expect(filterBySearch(bookmarks, "C++")).toHaveLength(1);
	});

	it("should search across multiple fields", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe", ["ai"], "Machine learning expert"),
		];

		// Should match in any field
		expect(filterBySearch(bookmarks, "john")).toHaveLength(1); // title
		expect(filterBySearch(bookmarks, "ai")).toHaveLength(1); // tags
		expect(filterBySearch(bookmarks, "machine")).toHaveLength(1); // notes
	});
});

describe("filterByEntityType", () => {
	it("should return all bookmarks when entity type is null", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "works", "Paper"),
		];

		expect(filterByEntityType(bookmarks, null)).toEqual(bookmarks);
	});

	it("should filter by specific entity type", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John Doe"),
			createMockBookmark("2", "works", "Paper"),
			createMockBookmark("3", "authors", "Jane Smith"),
		];

		const result = filterByEntityType(bookmarks, "authors");
		expect(result).toHaveLength(2);
		expect(result.every((b) => b.entityType === "authors")).toBe(true);
	});

	it("should return empty array when no matches", () => {
		const bookmarks = [createMockBookmark("1", "authors", "John Doe")];

		expect(filterByEntityType(bookmarks, "works")).toEqual([]);
	});

	it("should handle all entity types", () => {
		const entityTypes: EntityType[] = [
			"works",
			"authors",
			"sources",
			"institutions",
			"topics",
			"concepts",
			"publishers",
			"funders",
			"keywords",
		];

		const bookmarks = entityTypes.map((type, index) =>
			createMockBookmark(String(index), type, `${type} entity`)
		);

		for (const type of entityTypes) {
			const result = filterByEntityType(bookmarks, type);
			expect(result).toHaveLength(1);
			expect(result[0].entityType).toBe(type);
		}
	});
});

describe("filterByTags", () => {
	it("should return all bookmarks when no tags specified", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
		];

		expect(filterByTags(bookmarks, [])).toEqual(bookmarks);
	});

	it("should filter by single tag (OR logic)", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai", "research"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
			createMockBookmark("3", "authors", "Jane", ["ai"]),
		];

		const result = filterByTags(bookmarks, ["ai"]);
		expect(result).toHaveLength(2);
		expect(result.every((b) => b.metadata.tags?.includes("ai") === true)).toBe(true);
	});

	it("should filter by multiple tags with OR logic", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
			createMockBookmark("3", "authors", "Jane", ["research"]),
		];

		const result = filterByTags(bookmarks, ["ai", "nlp"]);
		expect(result).toHaveLength(2);
	});

	it("should filter by multiple tags with AND logic", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai", "research"]),
			createMockBookmark("2", "works", "Paper", ["ai"]),
			createMockBookmark("3", "authors", "Jane", ["research", "nlp"]),
		];

		const result = filterByTags(bookmarks, ["ai", "research"], true);
		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("John");
	});

	it("should be case-insensitive", () => {
		const bookmarks = [createMockBookmark("1", "authors", "John", ["AI", "Research"])];

		expect(filterByTags(bookmarks, ["ai"])).toHaveLength(1);
		expect(filterByTags(bookmarks, ["RESEARCH"])).toHaveLength(1);
	});

	it("should return empty array when no bookmarks have specified tags", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
		];

		expect(filterByTags(bookmarks, ["nonexistent"])).toEqual([]);
	});

	it("should handle bookmarks without tags", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "John", ["ai"]),
			createMockBookmark("2", "works", "Paper"), // No tags
		];

		const result = filterByTags(bookmarks, ["ai"]);
		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("John");
	});
});

describe("combined filters", () => {
	it("should combine search and entity type filters", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "Machine Learning Expert"),
			createMockBookmark("2", "works", "Machine Learning Paper"),
			createMockBookmark("3", "authors", "AI Researcher"),
		];

		let result = filterBySearch(bookmarks, "machine");
		result = filterByEntityType(result, "works");

		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("Machine Learning Paper");
	});

	it("should combine search and tag filters", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "AI Researcher", ["ai", "research"]),
			createMockBookmark("2", "works", "AI Paper", ["ai", "nlp"]),
			createMockBookmark("3", "authors", "NLP Expert", ["nlp"]),
		];

		let result = filterBySearch(bookmarks, "ai");
		result = filterByTags(result, ["research"]);

		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("AI Researcher");
	});

	it("should combine all three filters", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "Machine Learning Researcher", ["ai", "ml"]),
			createMockBookmark("2", "works", "Machine Learning Paper", ["ai", "ml"]),
			createMockBookmark("3", "authors", "Deep Learning Expert", ["dl", "ml"]),
		];

		let result = filterBySearch(bookmarks, "machine");
		result = filterByEntityType(result, "authors");
		result = filterByTags(result, ["ai"]);

		expect(result).toHaveLength(1);
		expect(result[0].metadata.title).toBe("Machine Learning Researcher");
	});

	it("should return empty array when combined filters match nothing", () => {
		const bookmarks = [
			createMockBookmark("1", "authors", "AI Researcher", ["ai"]),
			createMockBookmark("2", "works", "Paper", ["nlp"]),
		];

		let result = filterBySearch(bookmarks, "ai");
		result = filterByEntityType(result, "works");

		expect(result).toEqual([]);
	});
});

describe("edge cases", () => {
	it("should handle empty bookmark array", () => {
		expect(filterBySearch([], "query")).toEqual([]);
		expect(filterByEntityType([], "authors")).toEqual([]);
		expect(filterByTags([], ["tag"])).toEqual([]);
	});

	it("should handle undefined/null values gracefully", () => {
		const bookmarkWithoutOptionalFields = createMockBookmark("1", "authors", "John");
		delete bookmarkWithoutOptionalFields.notes;
		delete bookmarkWithoutOptionalFields.metadata.tags;

		const result = filterBySearch([bookmarkWithoutOptionalFields], "research");
		expect(result).toEqual([]);
	});

	it("should handle very long search queries", () => {
		const bookmarks = [createMockBookmark("1", "authors", "John Doe")];
		const LONG_QUERY_LENGTH = 1000;
		const longQuery = "a".repeat(LONG_QUERY_LENGTH);

		expect(filterBySearch(bookmarks, longQuery)).toEqual([]);
	});

	it("should handle bookmarks with empty tags array", () => {
		const bookmarks = [createMockBookmark("1", "authors", "John", [])];

		expect(filterByTags(bookmarks, ["ai"])).toEqual([]);
	});
});
