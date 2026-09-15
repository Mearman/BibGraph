/**
 * Metadata improvement detection utilities
 *
 * Detects when works have improved metadata in Data Version 2 compared to previous versions.
 * Data Version 2 provides 14% more references and locations for existing works.
 */

/**
 * Types of metadata improvements that can be detected
 */
export type MetadataImprovementType =
	| 'references'
	| 'locations'
	| 'language'
	| 'topics'
	| 'keywords'
	| 'license';

/**
 * Represents a detected metadata improvement
 */
export interface MetadataImprovement {
	/**
	 * Type of improvement detected
	 */
	type: MetadataImprovementType;

	/**
	 * Human-readable description for badge display
	 * @example "New: 5 more references"
	 * @example "New: 3 more locations"
	 */
	description: string;

	/**
	 * Quantitative delta (optional, for numeric improvements)
	 */
	delta?: number;
}

/**
 * Work metadata interface for improvement detection
 * Supports partial work objects with only the fields needed for detection
 */
export interface WorkMetadata {
	/**
	 * Number of works this work references
	 */
	referenced_works_count?: number;

	/**
	 * Number of locations where this work is available
	 */
	locations_count?: number;

	/**
	 * Language code (ISO 639-1)
	 */
	language?: string;

	/**
	 * Topics associated with the work
	 */
	topics?: unknown[];

	/**
	 * Keywords associated with the work
	 */
	keywords?: string[];

	/**
	 * License information
	 */
	license?: string;

	/**
	 * Whether this is an XPAC (crossref-only) work
	 * XPAC works are new to Data Version 2, not improvements
	 */
	is_xpac?: boolean;
}

/**
 * Heuristic thresholds for detecting improvements
 * These are conservative estimates based on Data Version 2 improvements
 */
const IMPROVEMENT_THRESHOLDS = {
	/**
	 * Minimum references count to consider as potentially improved
	 */
	MIN_REFERENCES: 1,

	/**
	 * Minimum locations count to consider as potentially improved
	 */
	MIN_LOCATIONS: 2,
} as const;

/**
 * Detect metadata improvements in a work
 *
 * Uses simple heuristics to identify works that may have improved metadata
 * in Data Version 2:
 * - Works with references likely have more references than before
 * - Works with multiple locations likely have more locations than before
 * - XPAC works are excluded (they are new, not improved)
 * @param work - Work metadata to analyze
 * @returns Array of detected improvements (empty if none detected or work is XPAC)
 * @example
 * ```typescript
 * const improvements = detectMetadataImprovements({
 *   referenced_works_count: 15,
 *   locations_count: 3,
 *   is_xpac: false
 * });
 * // Returns: [
 * //   { type: 'references', description: 'Improved references data' },
 * //   { type: 'locations', description: 'Improved locations data' }
 * // ]
 * ```
 */
export const detectMetadataImprovements = (work: WorkMetadata): MetadataImprovement[] => {
	const improvements: MetadataImprovement[] = [];

	// XPAC works are new to Data Version 2, not improved existing works
	if (work.is_xpac === true) {
		return improvements;
	}

	// Detect improved references
	if (work.referenced_works_count !== undefined &&
	    work.referenced_works_count >= IMPROVEMENT_THRESHOLDS.MIN_REFERENCES) {
		improvements.push({
			type: 'references',
			description: 'Improved references data',
			delta: work.referenced_works_count,
		});
	}

	// Detect improved locations
	if (work.locations_count !== undefined &&
	    work.locations_count >= IMPROVEMENT_THRESHOLDS.MIN_LOCATIONS) {
		improvements.push({
			type: 'locations',
			description: 'Improved locations data',
			delta: work.locations_count,
		});
	}

	// Future: Detect newly added language
	if (work.language !== undefined && work.language !== '') {
		// For now, we can't detect if language is NEW vs existing
		// This would require comparing to previous data version
		// Leaving as placeholder for future enhancement
	}

	// Future: Detect newly added topics
	if (work.topics !== undefined && work.topics.length > 0) {
		// Similar to language - need baseline comparison
		// Placeholder for future enhancement
	}

	// Future: Detect newly added keywords
	if (work.keywords !== undefined && work.keywords.length > 0) {
		// Similar to language - need baseline comparison
		// Placeholder for future enhancement
	}

	// Future: Detect newly added license
	if (work.license !== undefined && work.license !== '') {
		// Similar to language - need baseline comparison
		// Placeholder for future enhancement
	}

	return improvements;
};

/**
 * Check if a work has any metadata improvements
 * @param work - Work metadata to check
 * @returns True if improvements are detected
 * @example
 * ```typescript
 * if (hasMetadataImprovements(work)) {
 *   // Display improvement badge
 * }
 * ```
 */
export const hasMetadataImprovements = (work: WorkMetadata): boolean => detectMetadataImprovements(work).length > 0;

/**
 * Get improvement badge text for a work
 *
 * Combines multiple improvements into a single badge-friendly string.
 * @param work - Work metadata to analyze
 * @returns Badge text or null if no improvements
 * @example
 * ```typescript
 * const badgeText = getImprovementBadgeText(work);
 * if (badgeText) {
 *   console.log(badgeText); // "Improved: references, locations"
 * }
 * ```
 */
export const getImprovementBadgeText = (work: WorkMetadata): string | null => {
	const improvements = detectMetadataImprovements(work);

	if (improvements.length === 0) {
		return null;
	}

	// Single improvement: use its description
	if (improvements.length === 1) {
		return improvements[0].description;
	}

	// Multiple improvements: combine types
	const types = improvements.map(imp => imp.type).join(', ');
	return `Improved: ${types}`;
};

/**
 * Get improvement badge color based on improvement types
 * @param work - Work metadata to analyze
 * @returns Suggested badge color (Mantine color name)
 * @example
 * ```typescript
 * const color = getImprovementBadgeColor(work);
 * // Returns: 'blue' | 'green' | 'teal' | null
 * ```
 */
export const getImprovementBadgeColor = (work: WorkMetadata): string | null => {
	const improvements = detectMetadataImprovements(work);

	if (improvements.length === 0) {
		return null;
	}

	// Color coding based on improvement type priority
	const hasReferences = improvements.some(imp => imp.type === 'references');
	const hasLocations = improvements.some(imp => imp.type === 'locations');

	if (hasReferences && hasLocations) {
		return 'teal'; // Multiple improvements
	}
	if (hasReferences) {
		return 'blue'; // References improvement
	}
	if (hasLocations) {
		return 'green'; // Locations improvement
	}

	return 'blue'; // Default for other improvements
};
