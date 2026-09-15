/**
 * Bookmark Search and Filter Component
 *
 * Combined search input and filter controls for bookmarks catalogue
 *
 * Related:
 * - T040: Create search input for bookmarks catalogue
 * - T041: Add entity type filter dropdown
 * - T042: Add tag filter chips
 * - User Story 3: Organize and Search Bookmarks
 */

import { ENTITY_TYPES, type EntityType } from "@bibgraph/types";
import { ActionIcon, Group, Select, Stack, TextInput, Tooltip } from "@mantine/core";
import { IconFilter, IconSearch, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { TagBadge } from "./TagBadge";

export interface BookmarkSearchFiltersProps {
	/**
	 * Current search query
	 */
	searchQuery: string;

	/**
	 * Callback when search query changes
	 */
	onSearchChange: (query: string) => void;

	/**
	 * Current entity type filter (null = all types)
	 */
	entityTypeFilter: EntityType | null;

	/**
	 * Callback when entity type filter changes
	 */
	onEntityTypeChange: (entityType: EntityType | null) => void;

	/**
	 * Current tag filters
	 */
	tagFilters: string[];

	/**
	 * Callback when tag filters change
	 */
	onTagFiltersChange: (tags: readonly string[]) => void;

	/**
	 * Available tags for filtering
	 */
	availableTags: string[];

	/**
	 * Number of bookmarks matching current filters
	 */
	resultCount?: number;

	/**
	 * Total number of bookmarks
	 */
	totalCount?: number;

	/**
	 * Whether to use AND logic for tag filters (true = ALL tags, false = ANY tag)
	 */
	matchAllTags: boolean;

	/**
	 * Callback when tag match logic changes
	 */
	onMatchAllTagsChange: (matchAll: boolean) => void;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Entity type options for the filter dropdown
 */
const ENTITY_TYPE_OPTIONS: { value: EntityType | "all"; label: string }[] = [
	{ value: "all", label: "All Types" },
	{ value: "works", label: "Works" },
	{ value: "authors", label: "Authors" },
	{ value: "sources", label: "Sources" },
	{ value: "institutions", label: "Institutions" },
	{ value: "topics", label: "Topics" },
	{ value: "concepts", label: "Concepts" },
	{ value: "publishers", label: "Publishers" },
	{ value: "funders", label: "Funders" },
	{ value: "keywords", label: "Keywords" },
];

const ENTITY_TYPE_SET = new Set<string>(ENTITY_TYPES);
const isEntityType = (value: string): value is EntityType => ENTITY_TYPE_SET.has(value);

/**
 * Bookmark Search and Filter Component
 *
 * Features:
 * - Search input with debouncing
 * - Entity type dropdown filter
 * - Tag filter chips
 * - Clear all filters button
 * - Result count display
 * - AND/OR logic toggle for tags
 * @example
 * ```tsx
 * <BookmarkSearchFilters
 *   searchQuery={searchQuery}
 *   onSearchChange={setSearchQuery}
 *   entityTypeFilter={entityType}
 *   onEntityTypeChange={setEntityType}
 *   tagFilters={selectedTags}
 *   onTagFiltersChange={setSelectedTags}
 *   availableTags={allTags}
 *   resultCount={filteredBookmarks.length}
 *   totalCount={totalBookmarks}
 *   matchAllTags={matchAll}
 *   onMatchAllTagsChange={setMatchAll}
 * />
 * ```
 */
export const BookmarkSearchFilters = ({
	searchQuery,
	onSearchChange,
	entityTypeFilter,
	onEntityTypeChange,
	tagFilters,
	onTagFiltersChange,
	availableTags,
	resultCount,
	totalCount,
	matchAllTags,
	onMatchAllTagsChange,
	"data-testid": dataTestId = "bookmark-search-filters",
}: BookmarkSearchFiltersProps) => {
	const [showFilters, setShowFilters] = useState(false);

	// Handle clear all filters
	const handleClearAll = () => {
		onSearchChange("");
		onEntityTypeChange(null);
		onTagFiltersChange([]);
	};

	// Check if any filters are active
	const hasActiveFilters =
		searchQuery.trim() !== "" || entityTypeFilter !== null || tagFilters.length > 0;

	// Handle entity type change
	const handleEntityTypeChange = (value: string | null) => {
		if (value === null || value === "all") {
			onEntityTypeChange(null);
		} else if (isEntityType(value)) {
			onEntityTypeChange(value);
		}
	};

	// Handle tag click (toggle tag filter)
	const handleTagClick = (tag: string) => {
		if (tagFilters.includes(tag)) {
			// Remove tag
			onTagFiltersChange(tagFilters.filter((t) => t !== tag));
		} else {
			// Add tag
			onTagFiltersChange([...tagFilters, tag]);
		}
	};

	// Handle tag remove
	const handleTagRemove = (tag: string) => {
		onTagFiltersChange(tagFilters.filter((t) => t !== tag));
	};

	return (
		<Stack gap="sm" data-testid={dataTestId}>
			{/* Search bar with entity type filter */}
			<Group gap="xs" align="flex-end" wrap="nowrap">
				{/* Search input */}
				<TextInput
					placeholder="Search bookmarks..."
					value={searchQuery}
					onChange={(event) => { onSearchChange(event.currentTarget.value); }}
					leftSection={<IconSearch size={16} />}
					rightSection={
						searchQuery && (
							<ActionIcon
								variant="subtle"
								color="gray"
								onClick={() => { onSearchChange(""); }}
								size="sm"
								aria-label="Clear search"
							>
								<IconX size={14} />
							</ActionIcon>
						)
					}
					style={{ flex: 1 }}
					data-testid="bookmark-search-input"
				/>

				{/* Entity type filter */}
				<Select
					placeholder="Entity Type"
					data={ENTITY_TYPE_OPTIONS}
					value={entityTypeFilter ?? "all"}
					onChange={handleEntityTypeChange}
					clearable
					style={{ minWidth: 150 }}
					data-testid="entity-type-filter"
				/>

				{/* Toggle filters button */}
				<Tooltip label={showFilters ? "Hide filters" : "Show filters"}>
					<ActionIcon
						variant={showFilters ? "filled" : "light"}
						color={tagFilters.length > 0 ? "blue" : "gray"}
						onClick={() => { setShowFilters(!showFilters); }}
						size="lg"
						aria-label="Toggle filters"
						data-testid="toggle-filters-button"
					>
						<IconFilter size={18} />
					</ActionIcon>
				</Tooltip>

				{/* Clear all filters button */}
				{hasActiveFilters && (
					<Tooltip label="Clear all filters">
						<ActionIcon
							variant="light"
							color="red"
							onClick={handleClearAll}
							size="lg"
							aria-label="Clear all filters"
							data-testid="clear-filters-button"
						>
							<IconX size={18} />
						</ActionIcon>
					</Tooltip>
				)}
			</Group>

			{/* Tag filters section */}
			{showFilters && availableTags.length > 0 && (
				<Stack gap="xs">
					{/* Active tag filters */}
					{tagFilters.length > 0 && (
						<Group gap="xs">
							<span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Active filters:</span>
							{tagFilters.map((tag) => (
								<TagBadge
									key={tag}
									tag={tag}
									variant="filled"
									size="sm"
									removable
									onRemove={() => { handleTagRemove(tag); }}
									data-testid={`active-tag-${tag}`}
								/>
							))}
							<ActionIcon
								variant="subtle"
								size="xs"
								onClick={() => { onMatchAllTagsChange(!matchAllTags); }}
								aria-label={matchAllTags ? "Switch to ANY tag" : "Switch to ALL tags"}
								data-testid="tag-logic-toggle"
							>
								<span style={{ fontSize: "0.75rem", fontWeight: 600 }}>
									{matchAllTags ? "AND" : "OR"}
								</span>
							</ActionIcon>
						</Group>
					)}

					{/* Available tags */}
					<Group gap="xs">
						<span style={{ fontSize: "0.875rem", fontWeight: 500 }}>Filter by tag:</span>
						{availableTags
							.filter((tag) => !tagFilters.includes(tag))
							.map((tag) => (
								<TagBadge
									key={tag}
									tag={tag}
									variant="light"
									size="sm"
									clickable
									onClick={() => { handleTagClick(tag); }}
									data-testid={`filter-tag-chip-${tag}`}
								/>
							))}
					</Group>
				</Stack>
			)}

			{/* Result count */}
			{resultCount !== undefined && totalCount !== undefined && (
				<Group gap="xs" justify="space-between">
					<span style={{ fontSize: "0.875rem", color: "var(--mantine-color-dimmed)" }}>
						{hasActiveFilters
							? `Showing ${String(resultCount)} of ${String(totalCount)} bookmarks`
							: `${String(totalCount)} bookmarks`}
					</span>
				</Group>
			)}
		</Stack>
	);
};
