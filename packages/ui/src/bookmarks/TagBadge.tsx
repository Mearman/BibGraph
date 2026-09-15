/**
 * Tag Badge Component
 *
 * Display component for bookmark tags with remove functionality
 *
 * Related:
 * - T037: Create tag badge component
 * - User Story 3: Organize and Search Bookmarks
 */

import { ActionIcon, Badge, Group, type MantineColor, type MantineSize } from "@mantine/core";
import { IconX } from "@tabler/icons-react";

export interface TagBadgeProps {
	/**
	 * Tag text to display
	 */
	tag: string;

	/**
	 * Callback fired when remove button is clicked
	 */
	onRemove?: () => void;

	/**
	 * Callback fired when the badge is clicked
	 */
	onClick?: () => void;

	/**
	 * Badge color
	 */
	color?: MantineColor;

	/**
	 * Badge size
	 */
	size?: MantineSize;

	/**
	 * Badge variant
	 */
	variant?: "filled" | "light" | "outline" | "dot";

	/**
	 * Whether the badge is clickable
	 */
	clickable?: boolean;

	/**
	 * Whether the badge is removable
	 */
	removable?: boolean;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Tag Badge Component
 *
 * Features:
 * - Display tags as styled badges
 * - Optional remove button
 * - Optional click handler for filtering
 * - Customizable color, size, and variant
 * - Hover effects for interactivity
 * @example
 * ```tsx
 * // Basic tag badge
 * <TagBadge tag="machine-learning" />
 *
 * // Removable tag
 * <TagBadge
 *   tag="ai"
 *   removable
 *   onRemove={() => handleRemove("ai")}
 * />
 *
 * // Clickable filter tag
 * <TagBadge
 *   tag="research"
 *   clickable
 *   onClick={() => filterByTag("research")}
 * />
 * ```
 */
export const TagBadge = ({
	tag,
	onRemove,
	onClick,
	color = "blue",
	size = "sm",
	variant = "light",
	clickable = false,
	removable = false,
	"data-testid": dataTestId = `tag-badge`,
}: TagBadgeProps) => {
	const handleClick = (event: React.MouseEvent) => {
		if (!(clickable && onClick)) {
			return;
		}

		event.stopPropagation();
		onClick();
	};

	const handleRemove = (event: React.MouseEvent) => {
		event.stopPropagation();
		if (onRemove) {
			onRemove();
		}
	};

	// If removable, render with remove button
	if (removable && onRemove) {
		return (
			<Group gap={4} wrap="nowrap" data-testid={dataTestId}>
				<Badge
					color={color}
					size={size}
					variant={variant}
					style={{
						cursor: clickable ? "pointer" : "default",
					}}
					onClick={handleClick}
					data-testid={`${dataTestId}-text`}
				>
					{tag}
				</Badge>
				<ActionIcon
					size="xs"
					variant="subtle"
					color={color}
					onClick={handleRemove}
					aria-label={`Remove ${tag} tag`}
					data-testid={`${dataTestId}-remove`}
				>
					<IconX size={12} />
				</ActionIcon>
			</Group>
		);
	}

	// Default badge without remove button
	return (
		<Badge
			color={color}
			size={size}
			variant={variant}
			style={{
				cursor: clickable ? "pointer" : "default",
			}}
			onClick={handleClick}
			data-testid={dataTestId}
		>
			{tag}
		</Badge>
	);
};

/**
 * Tag List Component
 *
 * Display a list of tags with optional remove functionality
 * @example
 * ```tsx
 * <TagList
 *   tags={["ai", "ml", "research"]}
 *   removable
 *   onRemove={(tag) => handleRemove(tag)}
 * />
 * ```
 */
export interface TagListProps {
	/**
	 * Array of tags to display
	 */
	tags: string[];

	/**
	 * Callback fired when a tag remove button is clicked
	 */
	onRemove?: (tag: string) => void;

	/**
	 * Callback fired when a tag is clicked
	 */
	onClick?: (tag: string) => void;

	/**
	 * Badge color
	 */
	color?: MantineColor;

	/**
	 * Badge size
	 */
	size?: MantineSize;

	/**
	 * Badge variant
	 */
	variant?: "filled" | "light" | "outline" | "dot";

	/**
	 * Whether tags are clickable
	 */
	clickable?: boolean;

	/**
	 * Whether tags are removable
	 */
	removable?: boolean;

	/**
	 * Maximum number of tags to display (rest will be hidden)
	 */
	maxVisible?: number;

	/**
	 * Gap between tags
	 */
	gap?: MantineSize;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

export const TagList = ({
	tags,
	onRemove,
	onClick,
	color = "blue",
	size = "sm",
	variant = "light",
	clickable = false,
	removable = false,
	maxVisible,
	gap = "xs",
	"data-testid": dataTestId = "tag-list",
}: TagListProps) => {
	// Determine which tags to display
	const visibleTags = maxVisible !== undefined ? tags.slice(0, maxVisible) : tags;
	const hiddenCount = maxVisible !== undefined ? Math.max(0, tags.length - maxVisible) : 0;

	return (
		<Group gap={gap} wrap="wrap" data-testid={dataTestId}>
			{visibleTags.map((tag) => (
				<TagBadge
					key={tag}
					tag={tag}
					color={color}
					size={size}
					variant={variant}
					clickable={clickable}
					removable={removable}
					onClick={onClick ? () => { onClick(tag); } : undefined}
					onRemove={onRemove ? () => { onRemove(tag); } : undefined}
					data-testid={`${dataTestId}-item-${tag}`}
				/>
			))}
			{hiddenCount > 0 && (
				<Badge color="gray" size={size} variant="light" data-testid={`${dataTestId}-more`}>
					+{hiddenCount} more
				</Badge>
			)}
		</Group>
	);
};
