import type { Bookmark, EntityType } from "@bibgraph/types";
import { ActionIcon, Badge, Button,Card, Group, Stack, Text, Tooltip } from "@mantine/core";
import { IconCheck, IconEdit, IconTrash, IconX } from "@tabler/icons-react";
import { useState } from "react";

import { FieldSelectionPreview } from "./FieldSelectionPreview";
import { TagList } from "./TagBadge";
import { TagInput } from "./TagInput";

/**
 * Props for the BookmarkListItem component
 */
export interface BookmarkListItemProps {
	/**
	 * The bookmark to display
	 */
	bookmark: Bookmark;

	/**
	 * Callback fired when the delete button is clicked
	 * @param bookmarkId - ID of the bookmark to delete
	 */
	onDelete: (bookmarkId: string) => void | Promise<void>;

	/**
	 * Callback fired when the bookmark is clicked
	 * @param url - URL to navigate to
	 */
	onNavigate: (url: string) => void;

	/**
	 * Callback fired when bookmark tags are updated
	 * @param bookmarkId - ID of the bookmark to update
	 * @param tags - New tags array
	 */
	onUpdateTags?: (bookmarkId: string, tags: string[]) => void | Promise<void>;

	/**
	 * Optional test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Get a display-friendly label for entity type
 * @param entityType
 */
const getEntityTypeLabel = (entityType: EntityType): string => entityType.charAt(0).toUpperCase() + entityType.slice(1);

/**
 * Technical prefixes that should be filtered from notes display
 * These are used internally for storing navigation/metadata but aren't user-facing
 */
const TECHNICAL_NOTE_PREFIXES = ["URL:", "Title:", "Tags:"] as const;

/**
 * Filter out technical metadata lines from notes for user-friendly display
 * @param notes - Raw notes string
 * @returns Cleaned notes without technical metadata
 */
const filterNotesForDisplay = (notes: string | undefined): string | undefined => {
	if (!notes) return undefined;
	const filteredLines = notes
		.split("\n")
		.filter(line => !TECHNICAL_NOTE_PREFIXES.some(prefix => line.startsWith(prefix)))
		.map(line => line.trim())
		.filter(Boolean);
	return filteredLines.length > 0 ? filteredLines.join("\n") : undefined;
};

/**
 * Get a color for entity type badges
 * @param entityType
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
 * Format a date as relative time (e.g., "2 hours ago", "3 days ago")
 * @param date
 */
const formatRelativeTime = (date: Date): string => {
	// Handle invalid dates
	if (!date || Number.isNaN(date.getTime())) {
		return "Invalid date";
	}

	const now = Date.now();
	const timestamp = date.getTime();
	const diffMs = now - timestamp;

	// Handle future dates
	if (diffMs < 0) {
		return "in the future";
	}

	const SECOND = 1000;
	const MINUTE = 60 * SECOND;
	const HOUR = 60 * MINUTE;
	const DAY = 24 * HOUR;
	const WEEK = 7 * DAY;
	const MONTH = 30 * DAY;
	const YEAR = 365 * DAY;

	// Just now (< 10 seconds)
	if (diffMs < 10 * SECOND) {
		return "just now";
	}

	// Seconds (< 1 minute)
	if (diffMs < MINUTE) {
		const seconds = Math.floor(diffMs / SECOND);
		return `${seconds} ${seconds === 1 ? "second" : "seconds"} ago`;
	}

	// Minutes (< 1 hour)
	if (diffMs < HOUR) {
		const minutes = Math.floor(diffMs / MINUTE);
		return `${minutes} ${minutes === 1 ? "minute" : "minutes"} ago`;
	}

	// Hours (< 1 day)
	if (diffMs < DAY) {
		const hours = Math.floor(diffMs / HOUR);
		return `${hours} ${hours === 1 ? "hour" : "hours"} ago`;
	}

	// Days (< 1 week)
	if (diffMs < WEEK) {
		const days = Math.floor(diffMs / DAY);
		return `${days} ${days === 1 ? "day" : "days"} ago`;
	}

	// Weeks (< 1 month)
	if (diffMs < MONTH) {
		const weeks = Math.floor(diffMs / WEEK);
		return `${weeks} ${weeks === 1 ? "week" : "weeks"} ago`;
	}

	// Months (< 1 year)
	if (diffMs < YEAR) {
		const months = Math.floor(diffMs / MONTH);
		return `${months} ${months === 1 ? "month" : "months"} ago`;
	}

	// Years
	const years = Math.floor(diffMs / YEAR);
	return `${years} ${years === 1 ? "year" : "years"} ago`;
};

/**
 * Component for displaying individual bookmarks in a list
 *
 * Features:
 * - Entity type badge with color coding
 * - Bookmark title and timestamp
 * - Optional notes display (truncated)
 * - Delete button with confirmation tooltip
 * - Clickable card to navigate to bookmarked page
 * - Hover effects for interactivity
 * @param root0
 * @param root0.bookmark
 * @param root0.onDelete
 * @param root0.onNavigate
 * @param root0.onUpdateTags
 * @example
 * ```tsx
 * <BookmarkListItem
 *   bookmark={bookmark}
 *   onDelete={(id) => handleDelete(id)}
 *   onNavigate={(url) => navigate(url)}
 * />
 * ```
 */
export const BookmarkListItem = ({
	bookmark,
	onDelete,
	onNavigate,
	onUpdateTags,
	...restProps
}: BookmarkListItemProps) => {
	const [isDeleting, setIsDeleting] = useState(false);
	const [isEditingTags, setIsEditingTags] = useState(false);
	const [editedTags, setEditedTags] = useState<string[]>(bookmark.metadata.tags || []);

	// Handle card click (navigate to bookmark)
	const handleCardClick = () => {
		onNavigate(bookmark.metadata.url);
	};

	// Handle delete button click (prevent card click propagation)
	const handleDeleteClick = async (event: React.MouseEvent) => {
		event.stopPropagation();

		if (!bookmark.id) {
			return;
		}

		setIsDeleting(true);
		try {
			await onDelete(bookmark.id);
		} finally {
			setIsDeleting(false);
		}
	};

	// Handle edit tags button click
	const handleEditTagsClick = (event: React.MouseEvent) => {
		event.stopPropagation();
		setIsEditingTags(true);
		setEditedTags(bookmark.metadata.tags || []);
	};

	// Handle save tags
	const handleSaveTags = async (event: React.MouseEvent) => {
		event.stopPropagation();
		if (onUpdateTags && bookmark.id) {
			try {
				await onUpdateTags(bookmark.id, editedTags);
				setIsEditingTags(false);
			} catch {
				// Keep editing mode open on error
			}
		}
	};

	// Handle cancel tag editing
	const handleCancelTagEdit = (event: React.MouseEvent) => {
		event.stopPropagation();
		setIsEditingTags(false);
		setEditedTags(bookmark.metadata.tags || []);
	};

	// Format timestamp
	const timestampText = formatRelativeTime(bookmark.metadata.timestamp);

	// Filter and truncate notes for display (remove technical metadata lines)
	const maxNotesLength = 150;
	const cleanedNotes = filterNotesForDisplay(bookmark.notes);
	const truncatedNotes =
		cleanedNotes && cleanedNotes.length > maxNotesLength
			? `${cleanedNotes.slice(0, maxNotesLength)}...`
			: cleanedNotes;

	return (
		<Card
			shadow="sm"
			padding="md"
			radius="md"
			withBorder
			style={{
				cursor: "pointer",
				transition: "transform 0.1s ease, box-shadow 0.1s ease",
			}}
			onClick={handleCardClick}
			{...restProps}
			__vars={{
				"--card-hover-transform": "translateY(-2px)",
				"--card-hover-shadow": "md",
			}}
			styles={{
				root: {
					"&:hover": {
						transform: "var(--card-hover-transform)",
						boxShadow: "var(--mantine-shadow-md)",
					},
				},
			}}
		>
			<Stack gap="xs">
				{/* Header: Entity type badge and delete button */}
				<Group justify="space-between" align="flex-start">
					<Badge
						color={getEntityTypeColor(bookmark.entityType)}
						variant="light"
						size="sm"
					>
						{getEntityTypeLabel(bookmark.entityType)}
					</Badge>

					<Tooltip label="Delete bookmark" withinPortal>
						<ActionIcon
							variant="subtle"
							color="red"
							size="sm"
							onClick={handleDeleteClick}
							disabled={isDeleting}
							loading={isDeleting}
							aria-label="Delete bookmark"
						>
							<IconTrash size={16} />
						</ActionIcon>
					</Tooltip>
				</Group>

				{/* Title */}
				<Text fw={500} size="md" lineClamp={2}>
					{bookmark.metadata.title}
				</Text>

				{/* Notes (if available) */}
				{truncatedNotes && (
					<Text size="sm" c="dimmed" lineClamp={3} fs="italic">
						{truncatedNotes}
					</Text>
				)}

				{/* Tags Section */}
				{isEditingTags ? (
					<Stack gap="xs" onClick={(e) => e.stopPropagation()}>
						<TagInput
							value={editedTags}
							onChange={setEditedTags}
							placeholder="Add tags..."
							data-testid="bookmark-tag-input"
						/>
						<Group gap="xs">
							<Button size="xs" variant="filled" leftSection={<IconCheck size={14} />} onClick={handleSaveTags}>
								Save
							</Button>
							<Button
								size="xs"
								variant="subtle"
								color="gray"
								leftSection={<IconX size={14} />}
								onClick={handleCancelTagEdit}
							>
								Cancel
							</Button>
						</Group>
					</Stack>
				) : (
					<Group gap="xs" wrap="wrap">
						{bookmark.metadata.tags && bookmark.metadata.tags.length > 0 && (
							<TagList
								tags={bookmark.metadata.tags}
								size="xs"
								variant="light"
								maxVisible={5}
								data-testid="bookmark-tags"
							/>
						)}
						{onUpdateTags && (
							<Tooltip label="Edit tags">
								<ActionIcon
									size="xs"
									variant="subtle"
									color="gray"
									onClick={handleEditTagsClick}
									aria-label="Edit tags"
									data-testid="edit-tags-button"
								>
									<IconEdit size={12} />
								</ActionIcon>
							</Tooltip>
						)}
					</Group>
				)}


				{/* Footer: Timestamp and field selection preview */}
				<Group gap="xs" mt="xs" justify="space-between" wrap="wrap">
					<Text size="xs" c="dimmed">
						{timestampText}
					</Text>

					{/* Field selection preview - only show if custom fields are selected */}
					{bookmark.metadata.selectFields && bookmark.metadata.selectFields.length > 0 && (
						<FieldSelectionPreview
							selectFields={bookmark.metadata.selectFields}
							variant="badge"
							size="xs"
						/>
					)}
				</Group>
			</Stack>
		</Card>
	);
};
