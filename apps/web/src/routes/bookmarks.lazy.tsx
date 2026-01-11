import type { Bookmark, EntityType } from "@bibgraph/types";
import { BookmarkGrid, BookmarkList, BookmarkSearchFilters, BookmarkTable } from "@bibgraph/ui";
import type { CatalogueEntity, ExportFormat, ExportOptions } from "@bibgraph/utils";
import { applyFilters, downloadExport, exportBookmarks, logger, SPECIAL_LIST_IDS } from "@bibgraph/utils";
import {
	Alert,
	Badge,
	Button,
	Checkbox,
	Container,
	Group,
	Menu,
	Modal,
	Paper,
	SegmentedControl,
	Select,
	Stack,
	Text,
	Title,
} from "@mantine/core";
import { useDebouncedValue } from "@mantine/hooks";
import {
	IconAlertCircle,
	IconBookmark,
	IconFileExport,
	IconLayoutGrid,
	IconList,
	IconSortAscending,
	IconSortDescending,
	IconTable,
} from "@tabler/icons-react";
import { createLazyFileRoute, useNavigate, useSearch } from "@tanstack/react-router";
import { useCallback,useEffect, useMemo, useState } from "react";

import { RATE_LIMIT_CONFIG } from "@/config/rate-limit";
import { ICON_SIZE } from "@/config/style-constants";
import { useStorageProvider } from "@/contexts/storage-provider-context";
import { useEnrichedBookmarks } from "@/hooks/use-enriched-bookmarks";
import { useBookmarks } from "@/hooks/useBookmarks";

import type { BookmarksSearch, BookmarkViewMode } from "./bookmarks";

/**
 * Convert CatalogueEntity to Bookmark type
 * @param entity
 */
const convertToBookmark = (entity: CatalogueEntity): Bookmark => {
	// Extract metadata from notes field (legacy format)
	const notesLines = (entity.notes || "").split("\n");
	const urlLine = notesLines.find((line) => line.startsWith("URL: "));
	const titleLine = notesLines.find((line) => line.startsWith("Title: "));
	const tagsLine = notesLines.find((line) => line.startsWith("Tags: "));

	const url = urlLine?.replace("URL: ", "") || "";
	const title = titleLine?.replace("Title: ", "") || entity.entityId;
	const tags = tagsLine?.replace("Tags: ", "").split(",").map(t => t.trim()).filter(Boolean) || [];

	return {
		id: entity.id || entity.entityId,
		listId: SPECIAL_LIST_IDS.BOOKMARKS,
		entityType: entity.entityType,
		entityId: entity.entityId,
		addedAt: new Date(entity.addedAt),
		notes: entity.notes,
		position: entity.position || 0,
		metadata: {
			url,
			title,
			entityType: entity.entityType,
			entityId: entity.entityId,
			timestamp: new Date(entity.addedAt),
			tags,
		},
	};
};

/**
 * Bookmarks Index Route Component
 *
 * Displays all bookmarked entities in a list view with search, filters, and export functionality.
 * Uses the useBookmarks hook for reactive bookmark state.
 * Synchronizes filter state with URL parameters for shareable links.
 */
const BookmarksIndexPage = () => {
	const navigate = useNavigate();
	const storage = useStorageProvider();
	const { bookmarks: catalogueBookmarks, removeBookmark, loading, error } = useBookmarks();

	// Get URL search parameters
	const search = useSearch({ from: "/bookmarks" });

	// Convert CatalogueEntity[] to Bookmark[]
	const rawBookmarks = useMemo(
		() => catalogueBookmarks.map((entity) => convertToBookmark(entity)),
		[catalogueBookmarks]
	);

	// Enrich bookmarks with display names from OpenAlex
	const { bookmarks } = useEnrichedBookmarks(rawBookmarks);

	// Initialize filter state from URL parameters
	const [searchQuery, setSearchQuery] = useState(search.search || "");
	const [entityTypeFilter, setEntityTypeFilter] = useState<EntityType | null>(
		(search.entityType as EntityType) || null
	);
	const [tagFilters, setTagFilters] = useState<string[]>(search.tags || []);
	const [matchAllTags, setMatchAllTags] = useState(search.matchAll || false);

	// View options state from URL
	const [viewMode, setViewMode] = useState<BookmarkViewMode>(search.viewMode || "list");
	const [groupByType, setGroupByType] = useState(search.groupByType ?? true);
	const [sortBy, setSortBy] = useState<"date" | "title" | "type">(search.sortBy || "date");
	const [sortOrder, setSortOrder] = useState<"asc" | "desc">(search.sortOrder || "desc");

	// Debounce search query to avoid too many URL updates
	const [debouncedSearchQuery] = useDebouncedValue(searchQuery, RATE_LIMIT_CONFIG.search.debounceMs);

	// Export modal state
	const [exportModalOpen, setExportModalOpen] = useState(false);
	const [exportFormat, setExportFormat] = useState<ExportFormat>("json");
	const [exportOptions, setExportOptions] = useState<Omit<ExportOptions, "format">>({
		includeNotes: true,
		includeTags: true,
		includeTimestamps: true,
		includeFieldSelections: true,
	});

	// Sync state with URL parameters
	useEffect(() => {
		const newSearch: BookmarksSearch = {};

		if (debouncedSearchQuery) newSearch.search = debouncedSearchQuery;
		if (entityTypeFilter) newSearch.entityType = entityTypeFilter;
		if (tagFilters.length > 0) newSearch.tags = tagFilters;
		if (matchAllTags) newSearch.matchAll = matchAllTags;
		if (sortBy !== "date") newSearch.sortBy = sortBy;
		if (sortOrder !== "desc") newSearch.sortOrder = sortOrder;
		if (!groupByType) newSearch.groupByType = groupByType;
		if (viewMode !== "list") newSearch.viewMode = viewMode;

		navigate({
			to: "/bookmarks",
			search: newSearch,
			replace: true,
		});
	}, [debouncedSearchQuery, entityTypeFilter, tagFilters, matchAllTags, sortBy, sortOrder, groupByType, viewMode, navigate]);

	logger.debug("bookmarks", "Bookmarks index page rendering", {
		bookmarksCount: bookmarks.length,
		searchQuery,
		entityTypeFilter,
		tagFilters,
		viewMode,
		groupByType,
		sortBy,
		sortOrder,
	});

	// Extract all unique tags from bookmarks
	const availableTags = useMemo(() => {
		const tagsSet = new Set<string>();
		bookmarks.forEach((bookmark) => {
			bookmark.metadata.tags?.forEach((tag) => tagsSet.add(tag));
		});
		return [...tagsSet].sort();
	}, [bookmarks]);

	// Apply filters to bookmarks
	const filteredBookmarks = useMemo(() => {
		return applyFilters(bookmarks, {
			searchQuery,
			entityType: entityTypeFilter,
			tags: tagFilters,
			matchAllTags,
		});
	}, [bookmarks, searchQuery, entityTypeFilter, tagFilters, matchAllTags]);

	// Handle navigation to bookmarked entity
	const handleNavigate = (url: string) => {
		logger.debug("bookmarks", "Navigating to bookmarked entity", { url });
		// Convert full URL to relative path for router navigation
		try {
			const urlObj = new URL(url, window.location.origin);
			const path = urlObj.pathname + urlObj.search + urlObj.hash;
			// Use window.location for navigation to avoid type issues with dynamic paths
			window.location.href = path;
		} catch (err) {
			logger.error("bookmarks", "Failed to navigate to bookmark", { url, error: err });
		}
	};

	// Handle bookmark deletion
	const handleDelete = async (bookmarkId: string) => {
		try {
			logger.debug("bookmarks", "Deleting bookmark", { bookmarkId });
			await removeBookmark(bookmarkId);
			logger.debug("bookmarks", "Bookmark deleted successfully", { bookmarkId });
		} catch (err) {
			logger.error("bookmarks", "Failed to delete bookmark", { bookmarkId, error: err });
		}
	};

	// Handle tag updates
	const handleUpdateTags = useCallback(
		async (bookmarkId: string, tags: string[]) => {
			try {
				logger.debug("bookmarks", "Updating bookmark tags", { bookmarkId, tags });

				// Find the bookmark to get its current data
				const bookmark = catalogueBookmarks.find((b) => b.id === bookmarkId);
				if (!bookmark) {
					logger.error("bookmarks", "Bookmark not found for tag update", { bookmarkId });
					return;
				}

				// Parse existing notes to preserve URL and Title
				const notesLines = (bookmark.notes || "").split("\n");
				const urlLine = notesLines.find((line) => line.startsWith("URL: "));
				const titleLine = notesLines.find((line) => line.startsWith("Title: "));

				// Build new notes with updated tags
				const newNotesLines: string[] = [];
				if (urlLine) newNotesLines.push(urlLine);
				if (titleLine) newNotesLines.push(titleLine);
				if (tags.length > 0) newNotesLines.push(`Tags: ${tags.join(", ")}`);

				// Add any other notes that aren't URL, Title, or Tags
				const otherNotes = notesLines.filter(
					(line) =>
						!line.startsWith("URL: ") && !line.startsWith("Title: ") && !line.startsWith("Tags: ")
				);
				if (otherNotes.length > 0) {
					newNotesLines.push(...otherNotes);
				}

				const newNotes = newNotesLines.join("\n");

				// Update via storage provider
				await storage.updateEntityNotes(bookmarkId, newNotes);

				logger.debug("bookmarks", "Bookmark tags updated successfully", { bookmarkId, tags });
			} catch (err) {
				logger.error("bookmarks", "Failed to update bookmark tags", { bookmarkId, tags, error: err });
			}
		},
		[catalogueBookmarks, storage]
	);

	// Handle export
	const handleExport = () => {
		try {
			const options: ExportOptions = {
				format: exportFormat,
				...exportOptions,
			};

			const content = exportBookmarks(filteredBookmarks, options);
			downloadExport(content, exportFormat);

			setExportModalOpen(false);

			logger.debug("bookmarks", "Bookmarks exported successfully", {
				format: exportFormat,
				count: filteredBookmarks.length,
			});
		} catch (err) {
			logger.error("bookmarks", "Failed to export bookmarks", { error: err });
		}
	};

	return (
		<Container size="lg" p="xl" data-testid="bookmarks-page">
			<Stack gap="xl">
				{/* Header */}
				<Paper p="xl" radius="md">
					<Group justify="space-between" align="flex-start">
						<Stack gap="sm">
							<Group gap="md" align="center">
								<IconBookmark size={ICON_SIZE.EMPTY_STATE_SM} />
								<Title order={1}>Bookmarks</Title>
								<Badge size="lg" variant="light" color="blue">
									{filteredBookmarks.length} of {bookmarks.length}{" "}
									{bookmarks.length === 1 ? "item" : "items"}
								</Badge>
							</Group>
							<Text c="dimmed">Bookmarked entities and query pages for quick access</Text>
						</Stack>

						{/* View Controls */}
						<Group gap="sm">
							{/* View Mode Toggle */}
							<SegmentedControl
								size="sm"
								value={viewMode}
								onChange={(value) => setViewMode(value as BookmarkViewMode)}
								data={[
									{
										value: "list",
										label: (
											<Group gap={4} wrap="nowrap">
												<IconList size={ICON_SIZE.MD} />
												<Text size="sm">List</Text>
											</Group>
										),
									},
									{
										value: "table",
										label: (
											<Group gap={4} wrap="nowrap">
												<IconTable size={ICON_SIZE.MD} />
												<Text size="sm">Table</Text>
											</Group>
										),
									},
									{
										value: "card",
										label: (
											<Group gap={4} wrap="nowrap">
												<IconLayoutGrid size={ICON_SIZE.MD} />
												<Text size="sm">Card</Text>
											</Group>
										),
									},
								]}
							/>

							{/* Group toggle - only shown for list view */}
							{viewMode === "list" && (
								<Button
									variant={groupByType ? "filled" : "light"}
									size="sm"
									onClick={() => setGroupByType(!groupByType)}
								>
									{groupByType ? "Grouped" : "Flat"}
								</Button>
							)}

							<Menu shadow="md" width={200}>
								<Menu.Target>
									<Button variant="light" size="sm" leftSection={<IconSortDescending size={ICON_SIZE.MD} />}>
										Sort: {sortBy}
									</Button>
								</Menu.Target>

								<Menu.Dropdown>
									<Menu.Label>Sort by</Menu.Label>
									<Menu.Item onClick={() => setSortBy("date")}>Date Added</Menu.Item>
									<Menu.Item onClick={() => setSortBy("title")}>Title</Menu.Item>
									<Menu.Item onClick={() => setSortBy("type")}>Entity Type</Menu.Item>

									<Menu.Divider />

									<Menu.Label>Sort order</Menu.Label>
									<Menu.Item
										onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
										leftSection={
											sortOrder === "asc" ? (
												<IconSortAscending size={ICON_SIZE.MD} />
											) : (
												<IconSortDescending size={ICON_SIZE.MD} />
											)
										}
									>
										{sortOrder === "asc" ? "Ascending" : "Descending"}
									</Menu.Item>
								</Menu.Dropdown>
							</Menu>

							<Button
								variant="light"
								size="sm"
								color="green"
								leftSection={<IconFileExport size={ICON_SIZE.MD} />}
								onClick={() => setExportModalOpen(true)}
								disabled={filteredBookmarks.length === 0}
							>
								Export
							</Button>
						</Group>
					</Group>
				</Paper>

				{/* Search and Filters */}
				<BookmarkSearchFilters
					searchQuery={searchQuery}
					onSearchChange={setSearchQuery}
					entityTypeFilter={entityTypeFilter}
					onEntityTypeChange={setEntityTypeFilter}
					tagFilters={tagFilters}
					onTagFiltersChange={setTagFilters}
					availableTags={availableTags}
					resultCount={filteredBookmarks.length}
					totalCount={bookmarks.length}
					matchAllTags={matchAllTags}
					onMatchAllTagsChange={setMatchAllTags}
				/>

				{/* Error State */}
				{error && (
					<Alert icon={<IconAlertCircle size={ICON_SIZE.MD} />} title="Error loading bookmarks" color="red" variant="light">
						{error.message || "An error occurred while loading your bookmarks."}
					</Alert>
				)}

				{/* Bookmark Views */}
				{viewMode === "list" && (
					<BookmarkList
						bookmarks={filteredBookmarks}
						groupByType={groupByType}
						sortBy={sortBy}
						sortOrder={sortOrder}
						onDeleteBookmark={handleDelete}
						onNavigate={handleNavigate}
						onUpdateTags={handleUpdateTags}
						loading={loading}
						emptyMessage="No bookmarks match your filters. Try adjusting your search or filters."
						data-testid="bookmark-list"
					/>
				)}

				{viewMode === "table" && (
					<BookmarkTable
						bookmarks={filteredBookmarks}
						onDeleteBookmark={handleDelete}
						onNavigate={handleNavigate}
						loading={loading}
						emptyMessage="No bookmarks match your filters. Try adjusting your search or filters."
						data-testid="bookmark-table"
					/>
				)}

				{viewMode === "card" && (
					<BookmarkGrid
						bookmarks={filteredBookmarks}
						onDeleteBookmark={handleDelete}
						onNavigate={handleNavigate}
						loading={loading}
						emptyMessage="No bookmarks match your filters. Try adjusting your search or filters."
						data-testid="bookmark-grid"
					/>
				)}
			</Stack>

			{/* Export Modal */}
			<Modal
				opened={exportModalOpen}
				onClose={() => setExportModalOpen(false)}
				title="Export Bookmarks"
				size="md"
			>
				<Stack gap="md">
					<Text size="sm" c="dimmed">
						Export {filteredBookmarks.length} bookmark{filteredBookmarks.length === 1 ? "" : "s"} to a file
					</Text>

					<Select
						label="Export Format"
						value={exportFormat}
						onChange={(value) => setExportFormat(value as ExportFormat)}
						data={[
							{ value: "json", label: "JSON" },
							{ value: "csv", label: "CSV" },
							{ value: "markdown", label: "Markdown" },
							{ value: "html", label: "HTML" },
						]}
					/>

					<Stack gap="xs">
						<Text size="sm" fw={500}>
							Include in export:
						</Text>
						<Checkbox
							label="Notes"
							checked={exportOptions.includeNotes}
							onChange={(event) =>
								setExportOptions((prev) => ({ ...prev, includeNotes: event.currentTarget.checked }))
							}
						/>
						<Checkbox
							label="Tags"
							checked={exportOptions.includeTags}
							onChange={(event) =>
								setExportOptions((prev) => ({ ...prev, includeTags: event.currentTarget.checked }))
							}
						/>
						<Checkbox
							label="Timestamps"
							checked={exportOptions.includeTimestamps}
							onChange={(event) =>
								setExportOptions((prev) => ({
									...prev,
									includeTimestamps: event.currentTarget.checked,
								}))
							}
						/>
						<Checkbox
							label="Custom Field Selections"
							checked={exportOptions.includeFieldSelections}
							onChange={(event) =>
								setExportOptions((prev) => ({
									...prev,
									includeFieldSelections: event.currentTarget.checked,
								}))
							}
						/>
					</Stack>

					<Group justify="flex-end" mt="md">
						<Button variant="subtle" onClick={() => setExportModalOpen(false)}>
							Cancel
						</Button>
						<Button color="green" leftSection={<IconFileExport size={ICON_SIZE.MD} />} onClick={handleExport}>
							Export
						</Button>
					</Group>
				</Stack>
			</Modal>
		</Container>
	);
};

export const Route = createLazyFileRoute("/bookmarks")({
	component: BookmarksIndexPage,
});

export default BookmarksIndexPage;
