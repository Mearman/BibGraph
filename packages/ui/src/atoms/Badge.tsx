/**
 * Badge Component
 *
 * Reusable badge component for displaying metadata improvements and status indicators
 *
 * Related:
 * - T012: Create Badge component for metadata improvement indicators
 * - 012-history-catalogue-tracking
 */

import { Badge as MantineBadge, type MantineColor, type MantineSize } from "@mantine/core";

export interface BadgeProps {
	/**
	 * Badge variant - determines visual style
	 */
	variant?: "success" | "info" | "warning" | "error" | "default";

	/**
	 * Badge content
	 */
	children: React.ReactNode;

	/**
	 * Badge size
	 */
	size?: MantineSize;

	/**
	 * Badge style variant (filled, light, outline, etc.)
	 */
	style?: "filled" | "light" | "outline" | "dot";

	/**
	 * Custom color override (takes precedence over variant)
	 */
	color?: MantineColor;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Maps badge variants to their corresponding Mantine colors
 */
const VARIANT_COLORS: Record<NonNullable<BadgeProps["variant"]>, MantineColor> = {
	success: "green",
	info: "blue",
	warning: "yellow",
	error: "red",
	default: "gray",
};

/**
 * Badge Component
 *
 * A reusable badge component built on Mantine Badge for displaying
 * metadata improvements, status indicators, and other categorical information.
 *
 * Features:
 * - Semantic variants (success, info, warning, error, default)
 * - Customizable size and style
 * - Color override capability
 * - Consistent styling with Mantine theme
 * @example
 * ```tsx
 * // Success badge for improvements
 * <Badge variant="success">New: 5 more references</Badge>
 *
 * // Info badge for metadata
 * <Badge variant="info">Updated</Badge>
 *
 * // Warning badge
 * <Badge variant="warning">Incomplete data</Badge>
 *
 * // Custom color
 * <Badge color="violet" size="lg">Custom</Badge>
 * ```
 */
export const Badge = ({
	variant = "default",
	children,
	size = "sm",
	style = "light",
	color,
	"data-testid": dataTestId = "badge",
}: BadgeProps) => {
	const badgeColor = color ?? VARIANT_COLORS[variant];

	return (
		<MantineBadge
			color={badgeColor}
			size={size}
			variant={style}
			data-testid={dataTestId}
		>
			{children}
		</MantineBadge>
	);
};
