import type { Bookmark, EntityType } from "@bibgraph/types";
import { ActionIcon, Badge, Card, Center, Group, Loader,SimpleGrid, Stack, Text, Tooltip } from "@mantine/core";
import { IconBookmarkOff,IconTrash } from "@tabler/icons-react";
import { useState } from "react";

import { TagList } from "./TagBadge";

export interface BookmarkGridProps {
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
	 * Number of columns in the grid. Defaults to 3.
	 */
	cols?: number;

	/**
	 * Grid spacing. Defaults to "md".
	 */
	spacing?: "xs" | "sm" | "md" | "lg" | "xl";

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
		return `${String(seconds)} ${seconds === 1 ? "second" : "seconds"} ago`;
	}
	if (diffMs < HOUR) {
		const minutes = Math.floor(diffMs / MINUTE);
		return `${String(minutes)} ${minutes === 1 ? "minute" : "minutes"} ago`;
	}
	if (diffMs < DAY) {
		const hours = Math.floor(diffMs / HOUR);
		return `${String(hours)} ${hours === 1 ? "hour" : "hours"} ago`;
	}
	if (diffMs < WEEK) {
		const days = Math.floor(diffMs / DAY);
		return `${String(days)} ${days === 1 ? "day" : "days"} ago`;
	}
	if (diffMs < MONTH) {
		const weeks = Math.floor(diffMs / WEEK);
		return `${String(weeks)} ${weeks === 1 ? "week" : "weeks"} ago`;
	}
	if (diffMs < YEAR) {
		const months = Math.floor(diffMs / MONTH);
		return `${String(months)} ${months === 1 ? "month" : "months"} ago`;
	}
	const years = Math.floor(diffMs / YEAR);
	return `${String(years)} ${years === 1 ? "year" : "years"} ago`;
};

interface BookmarkCardProperties {
	bookmark: Bookmark;
	onDelete: (bookmarkId: string) => void | Promise<void>;
	onNavigate: (url: string) => void;
}

const BookmarkCard = ({ bookmark, onDelete, onNavigate }: BookmarkCardProperties) => {
	const [isDeleting, setIsDeleting] = useState(false);

	const handleDelete = async (event: React.MouseEvent) => {
		event.stopPropagation();
		if (bookmark.id === undefined) return;

		setIsDeleting(true);
		try {
			await onDelete(bookmark.id);
		} finally {
			setIsDeleting(false);
		}
	};

	const handleClick = () => {
		onNavigate(bookmark.metadata.url);
	};

	return (
		<Card
			shadow="sm"
			padding="md"
			radius="md"
			withBorder
			style={{
				cursor: "pointer",
				transition: "transform 0.1s ease, box-shadow 0.1s ease",
				height: "100%",
				display: "flex",
				flexDirection: "column",
			}}
			onClick={handleClick}
			styles={{
				root: {
					"&:hover": {
						transform: "translateY(-2px)",
						boxShadow: "var(--mantine-shadow-md)",
					},
				},
			}}
		>
			<Stack gap="xs" style={{ flex: 1 }}>
				{/* Header: Entity type badge and delete button */}
				<Group justify="space-between" align="flex-start">
					<Badge color={getEntityTypeColor(bookmark.entityType)} variant="light" size="sm">
						{getEntityTypeLabel(bookmark.entityType)}
					</Badge>

					<Tooltip label="Delete bookmark" withinPortal>
						<ActionIcon
							variant="subtle"
							color="red"
							size="sm"
							onClick={(event) => { void handleDelete(event); }}
							disabled={isDeleting}
							loading={isDeleting}
							aria-label="Delete bookmark"
						>
							<IconTrash size={16} />
						</ActionIcon>
					</Tooltip>
				</Group>

				{/* Title */}
				<Text fw={500} size="sm" lineClamp={2} style={{ flex: 1 }}>
					{bookmark.metadata.title}
				</Text>

				{/* Tags */}
				{bookmark.metadata.tags && bookmark.metadata.tags.length > 0 && (
					<Group gap="xs" wrap="wrap">
						<TagList tags={bookmark.metadata.tags} size="xs" variant="light" maxVisible={3} />
					</Group>
				)}

				{/* Footer: Timestamp */}
				<Text size="xs" c="dimmed">
					{formatRelativeTime(bookmark.metadata.timestamp)}
				</Text>
			</Stack>
		</Card>
	);
};

/**
 * Grid view for displaying bookmarks as cards in a responsive grid layout
 */
export const BookmarkGrid = ({
	bookmarks,
	onDeleteBookmark,
	onNavigate,
	cols = 3,
	spacing = "md",
	loading = false,
	emptyMessage = "No bookmarks yet",
	...restProps
}: BookmarkGridProps) => {
	// Loading state
	if (loading) {
		return (
			<Center p="xl" {...restProps}>
				<Loader size="md" />
			</Center>
		);
	}

	// Empty state
	if (bookmarks.length === 0) {
		return (
			<Center p="xl" {...restProps}>
				<Stack align="center" gap="md">
					<IconBookmarkOff size={48} stroke={1.5} opacity={0.3} />
					<Text size="sm" c="dimmed" ta="center">
						{emptyMessage}
					</Text>
				</Stack>
			</Center>
		);
	}

	return (
		<SimpleGrid
			cols={{ base: 1, sm: 2, md: cols }}
			spacing={spacing}
			{...restProps}
		>
			{bookmarks.map((bookmark) => (
				<BookmarkCard
					key={bookmark.id}
					bookmark={bookmark}
					onDelete={onDeleteBookmark}
					onNavigate={onNavigate}
				/>
			))}
		</SimpleGrid>
	);
};
