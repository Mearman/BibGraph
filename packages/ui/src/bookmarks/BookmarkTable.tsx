import type { Bookmark, EntityType } from "@bibgraph/types";
import { ActionIcon, Badge, Text, Tooltip } from "@mantine/core";
import { IconTrash } from "@tabler/icons-react";
import { useCallback, useMemo, useState } from "react";

import type { DataTableColumnDef, DataTableRow } from "../components/data-display/DataTable";
import { DataTable } from "../components/data-display/DataTable";
import { TagList } from "./TagBadge";

export interface BookmarkTableProps {
	/**
	 * Array of bookmarks to display
	 */
	bookmarks: Bookmark[];

	/**
	 * Callback fired when a bookmark should be deleted. Can be async for remote operations.
	 */
	onDeleteBookmark: (bookmarkId: string) => void | Promise<void>;

	/**
	 * Callback fired when navigating to a bookmark
	 */
	onNavigate: (url: string) => void;

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
}

/**
 * Get a display-friendly label for entity type
 */
const getEntityTypeLabel = (entityType: EntityType): string => entityType.charAt(0).toUpperCase() + entityType.slice(1);

/**
 * Get a color for entity type badges
 */
const getEntityTypeColor = (entityType: EntityType): string => {
	const colorMap: Record<EntityType, string> = {
		works: "blue",
		authors: "green",
		sources: "orange",
		institutions: "purple",
		topics: "pink",
		concepts: "cyan",
		publishers: "grape",
		funders: "yellow",
		keywords: "teal",
		domains: "indigo",
		fields: "lime",
		subfields: "violet",
	};
	return colorMap[entityType] || "gray";
};

/**
 * Format a date as relative time
 */
const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const DAYS_PER_WEEK = 7;
const DAYS_PER_MONTH = 30;
const DAYS_PER_YEAR = 365;
const JUST_NOW_THRESHOLD_SECONDS = 10;

const formatRelativeTime = (date: Readonly<Date>): string => {
	if (Number.isNaN(date.getTime())) {
		return "Invalid date";
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	if (diffMs < 0) {
		return "in the future";
	}

	const SECOND = 1000;
	const MINUTE = SECONDS_PER_MINUTE * SECOND;
	const HOUR = MINUTES_PER_HOUR * MINUTE;
	const DAY = HOURS_PER_DAY * HOUR;
	const WEEK = DAYS_PER_WEEK * DAY;
	const MONTH = DAYS_PER_MONTH * DAY;
	const YEAR = DAYS_PER_YEAR * DAY;

	if (diffMs < JUST_NOW_THRESHOLD_SECONDS * SECOND) return "just now";
	if (diffMs < MINUTE) {
		const seconds = Math.floor(diffMs / SECOND);
		return `${String(seconds)}s ago`;
	}
	if (diffMs < HOUR) {
		const minutes = Math.floor(diffMs / MINUTE);
		return `${String(minutes)}m ago`;
	}
	if (diffMs < DAY) {
		const hours = Math.floor(diffMs / HOUR);
		return `${String(hours)}h ago`;
	}
	if (diffMs < WEEK) {
		const days = Math.floor(diffMs / DAY);
		return `${String(days)}d ago`;
	}
	if (diffMs < MONTH) {
		const weeks = Math.floor(diffMs / WEEK);
		return `${String(weeks)}w ago`;
	}
	if (diffMs < YEAR) {
		const months = Math.floor(diffMs / MONTH);
		return `${String(months)}mo ago`;
	}
	const years = Math.floor(diffMs / YEAR);
	return `${String(years)}y ago`;
};

/**
 * Table view for displaying bookmarks with sortable columns, search, and pagination
 */
export const BookmarkTable = ({
	bookmarks,
	onDeleteBookmark,
	onNavigate,
	loading = false,
	emptyMessage = "No bookmarks yet",
	...restProps
}: BookmarkTableProps) => {
	const [deletingId, setDeletingId] = useState<string | null>(null);

	const handleDelete = useCallback(async (event: React.MouseEvent, bookmarkId: string) => {
		event.stopPropagation();
		setDeletingId(bookmarkId);
		try {
			await onDeleteBookmark(bookmarkId);
		} finally {
			setDeletingId(null);
		}
	}, [onDeleteBookmark]);

	const columns = useMemo<DataTableColumnDef<Bookmark>[]>(
		() => [
			{
				accessorKey: "entityType",
				header: "Type",
				size: 100,
				cell: ({ row }) => (
					<Badge color={getEntityTypeColor(row.original.entityType)} variant="light" size="sm">
						{getEntityTypeLabel(row.original.entityType)}
					</Badge>
				),
			},
			{
				accessorKey: "metadata.title",
				header: "Title",
				size: 300,
				cell: ({ row }) => (
					<Text size="sm" lineClamp={2} style={{ maxWidth: 300 }}>
						{row.original.metadata.title}
					</Text>
				),
			},
			{
				accessorKey: "metadata.tags",
				header: "Tags",
				size: 200,
				enableSorting: false,
				cell: ({ row }) =>
					row.original.metadata.tags && row.original.metadata.tags.length > 0 ? (
						<TagList tags={row.original.metadata.tags} size="xs" variant="light" maxVisible={3} />
					) : (
						<Text size="xs" c="dimmed">-</Text>
					),
			},
			{
				accessorKey: "addedAt",
				header: "Added",
				size: 100,
				cell: ({ row }) => (
					<Tooltip label={row.original.addedAt.toLocaleString()}>
						<span>{formatRelativeTime(row.original.addedAt)}</span>
					</Tooltip>
				),
				sortingFn: (rowA: DataTableRow<Bookmark>, rowB: DataTableRow<Bookmark>) => rowA.original.addedAt.getTime() - rowB.original.addedAt.getTime(),
			},
			{
				id: "actions",
				header: "",
				size: 50,
				enableSorting: false,
				cell: ({ row }) => {
					const bookmarkId = row.original.id;
					if (bookmarkId === undefined) return null;
					return (
						<Tooltip label="Delete bookmark" withinPortal>
							<ActionIcon
								variant="subtle"
								color="red"
								size="sm"
								onClick={(e) => { void handleDelete(e, bookmarkId); }}
								loading={deletingId === bookmarkId}
								disabled={deletingId === bookmarkId}
								aria-label="Delete bookmark"
							>
								<IconTrash size={16} />
							</ActionIcon>
						</Tooltip>
					);
				},
			},
		],
		[deletingId, handleDelete],
	);

	const navigateToBookmark = (bookmark: Bookmark) => {
		onNavigate(bookmark.metadata.url);
	};

	return (
		<div data-testid={restProps["data-testid"]}>
			<DataTable
				data={bookmarks}
				columns={columns}
				isLoading={loading}
				searchable={false}
				onRowClick={navigateToBookmark}
				initialSorting={[{ id: "addedAt", desc: true }]}
				emptyState={<span>{emptyMessage}</span>}
			/>
		</div>
	);
};
