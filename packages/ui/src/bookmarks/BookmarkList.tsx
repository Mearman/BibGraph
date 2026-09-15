import type { Bookmark, EntityType } from "@bibgraph/types";
import { Box, Center, Divider, Group, Loader,Stack, Text } from "@mantine/core";
import { IconBookmarkOff } from "@tabler/icons-react";
import { useMemo } from "react";

import { BookmarkListItem } from "./BookmarkListItem";
import { EntityTypeBadge } from "./EntityTypeBadge";

export interface BookmarkListProps {
	/**
	 * Array of bookmarks to display
	 */
	bookmarks: Bookmark[];

	/**
	 * Whether to group bookmarks by entity type. Defaults to false.
	 */
	groupByType?: boolean;

	/**
	 * Field to sort bookmarks by. Defaults to "date".
	 */
	sortBy?: "date" | "title" | "type";

	/**
	 * Sort order. Defaults to "desc".
	 */
	sortOrder?: "asc" | "desc";

	/**
	 * Callback fired when a bookmark should be deleted
	 */
	onDeleteBookmark: (bookmarkId: string) => void;

	/**
	 * Callback fired when navigating to a bookmark
	 */
	onNavigate: (url: string) => void;

	/**
	 * Callback fired when bookmark tags are updated
	 */
	onUpdateTags?: (bookmarkId: string, tags: readonly string[]) => void | Promise<void>;

	/**
	 * Whether the list is in a loading state. Defaults to false.
	 */
	loading?: boolean;

	/**
	 * Message to display when there are no bookmarks. Defaults to "No bookmarks yet".
	 */
	emptyMessage?: string;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;

	/**
	 * Additional CSS class name
	 */
	className?: string;
}


/**
 * Main bookmark list component for displaying all bookmarks.
 * Supports grouping by entity type, sorting, and empty states.
 * @example
 * ```tsx
 * <BookmarkList
 *   bookmarks={allBookmarks}
 *   groupByType={true}
 *   sortBy="date"
 *   sortOrder="desc"
 *   onDeleteBookmark={(id) => handleDelete(id)}
 *   onNavigate={(url) => navigate(url)}
 *   loading={isLoading}
 *   emptyMessage="Start bookmarking to save your favorite papers"
 * />
 * ```
 */
export const BookmarkList = ({
	bookmarks,
	groupByType = false,
	sortBy = "date",
	sortOrder = "desc",
	onDeleteBookmark,
	onNavigate,
	onUpdateTags,
	loading = false,
	emptyMessage = "No bookmarks yet",
	className,
	...restProps
}: BookmarkListProps) => {
	// Sort bookmarks based on sortBy and sortOrder
	const sortedBookmarks = useMemo(() => {
		const sorted = [...bookmarks];

		sorted.sort((a, b) => {
			let comparison = 0;

			switch (sortBy) {
				case "date":
					comparison = a.metadata.timestamp.getTime() - b.metadata.timestamp.getTime();
					break;
				case "title":
					comparison = a.metadata.title.localeCompare(b.metadata.title);
					break;
				case "type":
					comparison = a.entityType.localeCompare(b.entityType);
					break;
			}

			return sortOrder === "asc" ? comparison : -comparison;
		});

		return sorted;
	}, [bookmarks, sortBy, sortOrder]);

	// Group bookmarks by entity type if enabled
	const groupedBookmarks = useMemo(() => {
		if (!groupByType) {
			return null;
		}

		const groups = new Map<EntityType, Bookmark[]>();

		for (const bookmark of sortedBookmarks) {
			const existing = groups.get(bookmark.entityType) ?? [];
			groups.set(bookmark.entityType, [...existing, bookmark]);
		}

		// Sort groups by entity type name
		const sortedGroups = [...groups].sort(([typeA], [typeB]) =>
			typeA.localeCompare(typeB)
		);

		return sortedGroups;
	}, [sortedBookmarks, groupByType]);

	// Loading state
	if (loading) {
		return (
			<Center p="xl" className={className} {...restProps}>
				<Loader size="md" />
			</Center>
		);
	}

	// Empty state
	if (bookmarks.length === 0) {
		return (
			<Center p="xl" className={className} {...restProps}>
				<Stack align="center" gap="md">
					<IconBookmarkOff size={48} stroke={1.5} opacity={0.3} />
					<Text size="sm" c="dimmed" ta="center">
						{emptyMessage}
					</Text>
				</Stack>
			</Center>
		);
	}

	// Render grouped bookmarks
	if (groupedBookmarks) {
		return (
			<Stack gap="lg" className={className} {...restProps}>
				{groupedBookmarks.map(([entityType, groupBookmarks]) => (
					<Box key={entityType}>
						<Group gap="sm" mb="sm">
							<EntityTypeBadge entityType={entityType} variant="filled" />
							<Text size="sm" c="dimmed">
								{groupBookmarks.length} {groupBookmarks.length === 1 ? "item" : "items"}
							</Text>
						</Group>
						<Divider mb="sm" />
						<Stack gap="sm">
							{groupBookmarks.map((bookmark) => (
								<BookmarkListItem
									key={bookmark.id}
									bookmark={bookmark}
									onDelete={onDeleteBookmark}
									onNavigate={onNavigate}
									onUpdateTags={onUpdateTags}
								/>
							))}
						</Stack>
					</Box>
				))}
			</Stack>
		);
	}

	// Render flat list of bookmarks
	return (
		<Stack gap="sm" className={className} {...restProps}>
			{sortedBookmarks.map((bookmark) => (
				<BookmarkListItem
					key={bookmark.id}
					bookmark={bookmark}
					onDelete={onDeleteBookmark}
					onNavigate={onNavigate}
					onUpdateTags={onUpdateTags}
				/>
			))}
		</Stack>
	);
};
