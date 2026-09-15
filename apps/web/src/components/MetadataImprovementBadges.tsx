/**
 * MetadataImprovementBadges Component
 *
 * Displays badge indicators for works with improved metadata in OpenAlex Data Version 2.
 * Shows badges for improvements in references, locations, and other metadata fields.
 *
 * Related:
 * - T014: Badge Integration
 * - T015: Visual Styling
 * - 013-metadata-improvement-badges
 */

import {
	detectMetadataImprovements,
	type MetadataImprovement,
	type WorkMetadata,
} from "@bibgraph/utils";
import { Badge,Group } from "@mantine/core";

export interface MetadataImprovementBadgesProps {
	/**
	 * Work data containing metadata fields for improvement detection
	 */
	work: WorkMetadata;

	/**
	 * Test ID for E2E testing
	 */
	"data-testid"?: string;
}

/**
 * Maps improvement types to badge colors
 * Uses semantic colors for different improvement types
 */
const IMPROVEMENT_COLOR_MAP: Record<
	MetadataImprovement["type"],
	string
> = {
	references: "blue", // Blue for references
	locations: "green", // Green for locations
	language: "blue",
	topics: "blue",
	keywords: "blue",
	license: "blue",
};

/**
 * MetadataImprovementBadges Component
 *
 * Displays badges for detected metadata improvements in academic works.
 * Returns null if no improvements are detected or if the work is an XPAC work.
 *
 * Features:
 * - Automatic improvement detection using utility function
 * - Semantic color coding based on improvement type
 * - Horizontal layout with consistent spacing
 * - Returns null for cleaner rendering when no improvements exist
 * @example
 * ```tsx
 * // In a work detail page
 * <MetadataImprovementBadges
 *   work={{
 *     referenced_works_count: 15,
 *     locations_count: 3,
 *     is_xpac: false
 *   }}
 * />
 * // Renders: [Improved references data] [Improved locations data]
 *
 * // For XPAC works (returns null)
 * <MetadataImprovementBadges
 *   work={{ is_xpac: true }}
 * />
 * // Renders: null
 * ```
 */
export const MetadataImprovementBadges = ({
	work,
	"data-testid": dataTestId = "metadata-improvement-badges",
}: MetadataImprovementBadgesProps) => {
	// Detect improvements using utility function
	const improvements = detectMetadataImprovements(work);

	// Return null if no improvements detected
	if (improvements.length === 0) {
		return null;
	}

	return (
		<Group gap="xs" data-testid={dataTestId}>
			{improvements.map((improvement, index) => (
				<Badge
					key={`${improvement.type}-${String(index)}`}
					color={IMPROVEMENT_COLOR_MAP[improvement.type]}
					size="sm"
					variant="light"
					data-testid={`improvement-badge-${improvement.type}`}
				>
					{improvement.description}
				</Badge>
			))}
		</Group>
	);
};
