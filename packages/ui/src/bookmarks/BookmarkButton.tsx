import { ActionIcon, Loader, Tooltip } from "@mantine/core"
import { IconBookmark, IconBookmarkFilled } from "@tabler/icons-react"

export interface BookmarkButtonProps {
	/**
	 * Whether the entity is currently bookmarked
	 */
	isBookmarked: boolean

	/**
	 * Whether the bookmark operation is in progress
	 */
	loading?: boolean

	/**
	 * Callback fired when the bookmark state should be toggled
	 * Can be async for remote operations
	 */
	onToggle: () => void | Promise<void>

	/**
	 * Size of the button. Defaults to "md".
	 */
	size?: "xs" | "sm" | "md" | "lg" | "xl"

	/**
	 * Visual variant of the button. Defaults to "subtle".
	 */
	variant?: "filled" | "light" | "outline" | "subtle"

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string

	/**
	 * Additional CSS class name
	 */
	className?: string
}

/**
 * A button component for toggling bookmark state on entities.
 * Uses Mantine ActionIcon with visual feedback for bookmark state.
 * @example
 * ```tsx
 * <BookmarkButton
 *   isBookmarked={true}
 *   loading={false}
 *   onToggle={() => toggleBookmark()}
 *   size="md"
 *   variant="subtle"
 * />
 * ```
 */
export const BookmarkButton = ({
	isBookmarked,
	loading = false,
	onToggle,
	size = "md",
	variant = "subtle",
	className,
	...restProps
}: BookmarkButtonProps) => {
	// Determine icon size based on button size
	const iconSize = {
		xs: 14,
		sm: 16,
		md: 18,
		lg: 20,
		xl: 24,
	}[size]

	// Determine tooltip label
	const tooltipLabel = isBookmarked ? "Remove bookmark" : "Bookmark"

	// Determine color based on state
	const color = isBookmarked ? "yellow" : "gray"

	return (
		<Tooltip label={tooltipLabel} withinPortal>
			<ActionIcon
				variant={variant}
				color={color}
				size={size}
				onClick={() => { void onToggle(); }}
				disabled={loading}
				aria-label={tooltipLabel}
				aria-pressed={isBookmarked}
				className={className}
				{...restProps}
			>
				{loading ? (
					<Loader size={iconSize} />
				) : (isBookmarked ? (
					<IconBookmarkFilled size={iconSize} />
				) : (
					<IconBookmark size={iconSize} />
				))}
			</ActionIcon>
		</Tooltip>
	)
};
