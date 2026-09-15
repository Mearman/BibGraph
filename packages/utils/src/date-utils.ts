/**
 * Date utilities for feature availability
 */

import { MS_PER_DAY } from "./date-helpers.js"

/**
 * Check if data version selector should be visible
 *
 * Version 1 is temporarily available during the November 2025 transition period. After December 1, 2025, only Version 2 will be available.
 * @param currentDate - Optional date for testing (defaults to now)
 * @returns true if before December 1, 2025, false otherwise
 */
export const isDataVersionSelectorVisible = (currentDate?: Date): boolean => {
	const now = currentDate ?? new Date()
	const cutoffDate = new Date('2025-12-01T00:00:00Z') // December 1, 2025 UTC

	return now < cutoffDate
};

/**
 * Get the cutoff date for version selector visibility
 * @returns Date object for December 1, 2025
 */
export const getVersionSelectorCutoffDate = (): Date => new Date('2025-12-01T00:00:00Z');

/**
 * Calculate days remaining until version selector is hidden
 * @param currentDate - Optional date for testing (defaults to now)
 * @returns Number of days remaining, or 0 if past cutoff
 */
export const getDaysUntilVersionSelectorHidden = (currentDate?: Date): number => {
	const now = currentDate ?? new Date()
	const cutoff = getVersionSelectorCutoffDate()

	if (now >= cutoff) {
		return 0
	}

	const diffMs = cutoff.getTime() - now.getTime()
	return Math.ceil(diffMs / MS_PER_DAY)
};
