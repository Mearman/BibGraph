/**
 * Bookmark Filter Functions
 *
 * Provides filtering utilities for bookmarks by search query, entity type, and tags.
 *
 * Related:
 * - T035: Unit test for bookmark filtering logic
 * - User Story 3: Organize and Search Bookmarks
 */

import type { Bookmark, EntityType } from "@bibgraph/types";

/**
 * Filter bookmarks by search query across multiple fields
 *
 * Searches in:
 * - Title (bookmark.metadata.title)
 * - Notes (bookmark.notes)
 * - Tags (bookmark.metadata.tags)
 * - Entity type (bookmark.entityType)
 *
 * Search is case-insensitive and supports partial word matching.
 * @param bookmarks - Array of bookmarks to filter
 * @param searchQuery - Search query string
 * @returns Filtered array of bookmarks matching the search query
 * @example
 * ```typescript
 * const results = filterBySearch(bookmarks, "machine learning");
 * // Returns bookmarks with "machine learning" in title, notes, tags, or entity type
 * ```
 */
export const filterBySearch = (bookmarks: readonly Bookmark[], searchQuery: string): Bookmark[] => {
	if (!searchQuery || searchQuery.trim() === "") {
		return [...bookmarks];
	}

	const query = searchQuery.toLowerCase().trim();

	return bookmarks.filter((bookmark) => {
		// Search in title
		if (bookmark.metadata.title.toLowerCase().includes(query)) {
			return true;
		}

		// Search in notes
		if (bookmark.notes?.toLowerCase().includes(query) === true) {
			return true;
		}

		// Search in tags
		if (bookmark.metadata.tags?.some((tag) => tag.toLowerCase().includes(query)) === true) {
			return true;
		}

		// Search in entity type
		if (bookmark.entityType.toLowerCase().includes(query)) {
			return true;
		}

		return false;
	});
};

/**
 * Filter bookmarks by entity type
 * @param bookmarks - Array of bookmarks to filter
 * @param entityType - Entity type to filter by (null returns all bookmarks)
 * @returns Filtered array of bookmarks of the specified entity type
 * @example
 * ```typescript
 * const authors = filterByEntityType(bookmarks, "authors");
 * // Returns only author bookmarks
 * ```
 */
export const filterByEntityType = (bookmarks: readonly Bookmark[], entityType: EntityType | null): Bookmark[] => {
	if (!entityType) {
		return [...bookmarks];
	}

	return bookmarks.filter((bookmark) => bookmark.entityType === entityType);
};

/**
 * Filter bookmarks by tags with AND or OR logic
 * @param bookmarks - Array of bookmarks to filter
 * @param tags - Array of tag names to filter by (empty array returns all bookmarks)
 * @param matchAll - If true, uses AND logic (bookmark must have ALL tags).
 *                   If false, uses OR logic (bookmark must have AT LEAST ONE tag).
 *                   Defaults to false (OR logic).
 * @returns Filtered array of bookmarks matching the tag criteria
 * @example
 * ```typescript
 * // OR logic: bookmarks with "ai" OR "ml"
 * const results = filterByTags(bookmarks, ["ai", "ml"], false);
 *
 * // AND logic: bookmarks with "ai" AND "research"
 * const results = filterByTags(bookmarks, ["ai", "research"], true);
 * ```
 */
export const filterByTags = (
	bookmarks: readonly Bookmark[],
	tags: readonly string[],
	matchAll = false
): Bookmark[] => {
	if (tags.length === 0) {
		return [...bookmarks];
	}

	return bookmarks.filter((bookmark) => {
		const bookmarkTags = bookmark.metadata.tags ?? [];

		if (matchAll) {
			// AND logic: bookmark must have ALL specified tags
			return tags.every((tag) =>
				bookmarkTags.some((bookmarkTag) => bookmarkTag.toLowerCase() === tag.toLowerCase())
			);
		}
		// OR logic: bookmark must have AT LEAST ONE specified tag
		return tags.some((tag) =>
			bookmarkTags.some((bookmarkTag) => bookmarkTag.toLowerCase() === tag.toLowerCase())
		);
	});
};

/**
 * Options controlling how {@link applyFilters} narrows a bookmark list
 */
export interface ApplyFiltersOptions {
	/**
	 * Search query string to filter by
	 */
	searchQuery?: string;

	/**
	 * Entity type to filter by (null or omitted matches all)
	 */
	entityType?: EntityType | null;

	/**
	 * Array of tag names to filter by
	 */
	tags?: string[];

	/**
	 * If true, requires ALL tags to match (AND logic); otherwise ANY tag matches (OR logic)
	 */
	matchAllTags?: boolean;
}

/**
 * Apply multiple filters to bookmarks in sequence
 *
 * Filters are applied in order:
 * 1. Search query filter
 * 2. Entity type filter
 * 3. Tag filter
 * @param bookmarks - Array of bookmarks to filter
 * @param options - Filter options
 * @returns Filtered array of bookmarks
 * @example
 * ```typescript
 * const results = applyFilters(bookmarks, {
 *   searchQuery: "machine learning",
 *   entityType: "authors",
 *   tags: ["ai", "research"],
 *   matchAllTags: true
 * });
 * ```
 */
export const applyFilters = (
	bookmarks: readonly Bookmark[],
	options: Readonly<ApplyFiltersOptions>
): Bookmark[] => {
	let result: Bookmark[] = [...bookmarks];

	// Apply search filter
	if (options.searchQuery !== undefined && options.searchQuery !== "") {
		result = filterBySearch(result, options.searchQuery);
	}

	// Apply entity type filter
	if (options.entityType) {
		result = filterByEntityType(result, options.entityType);
	}

	// Apply tag filter
	if (options.tags && options.tags.length > 0) {
		result = filterByTags(result, options.tags, options.matchAllTags);
	}

	return result;
};
