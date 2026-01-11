/**
 * Context-aware number formatting utility
 *
 * Handles special cases like year values that should not have thousands separators,
 * while applying locale-specific formatting to other numeric values.
 */

/**
 * Range constants for year detection
 */
const MIN_REASONABLE_YEAR = 1000;
const MAX_REASONABLE_YEAR = 2100;

/**
 * Field names that typically contain year values
 */
const YEAR_FIELD_PATTERNS = ["year", "publication_year"] as const;

/**
 * Field names that contain decimal scores/shares requiring precision
 */
const DECIMAL_PRECISION_FIELD_PATTERNS = ["score", "share", "percentile", "fwci", "value"] as const;

/**
 * Maximum decimal places to show for score/share fields
 */
const DECIMAL_PRECISION_DIGITS = 4;

/**
 * Check if a field name indicates a year value
 * @param fieldName - The field name to check
 */
const isYearField = (fieldName: string): boolean => {
	const lowerName = fieldName.toLowerCase();
	return YEAR_FIELD_PATTERNS.some((pattern) => lowerName.includes(pattern));
};

/**
 * Check if a field name indicates a score/share value requiring decimal precision
 * @param fieldName - The field name to check
 */
const isDecimalPrecisionField = (fieldName: string): boolean => {
	const lowerName = fieldName.toLowerCase();
	return DECIMAL_PRECISION_FIELD_PATTERNS.some((pattern) => lowerName.includes(pattern));
};

/**
 * Check if a number is in a reasonable year range
 * @param value - The numeric value to check
 */
const isReasonableYear = (value: number): boolean => {
	return (
		Number.isInteger(value) &&
		value >= MIN_REASONABLE_YEAR &&
		value <= MAX_REASONABLE_YEAR
	);
};

/**
 * Format a number with context-aware formatting
 *
 * @param value - The numeric value to format
 * @param fieldName - Optional field name for context (e.g., "year", "publication_year")
 * @returns Formatted string representation
 *
 * @example
 * formatNumber(2014, 'year')        // "2014" (no separator for year fields)
 * formatNumber(2014)                 // "2014" (no separator for year-range values)
 * formatNumber(50000, 'cited_by_count') // "50,000" (with separator for counts)
 * formatNumber(1234567)              // "1,234,567" (with separator for large numbers)
 */
export const formatNumber = (value: number, fieldName?: string): string => {
	// If field name suggests a year, don't use thousands separator
	if (fieldName && isYearField(fieldName) && isReasonableYear(value)) {
		return value.toString();
	}

	// For values that look like years (even without field context)
	// Skip separator for 4-digit numbers in year range
	if (isReasonableYear(value)) {
		return value.toString();
	}

	// For score/share/percentile fields, preserve decimal precision
	if (fieldName && isDecimalPrecisionField(fieldName) && !Number.isInteger(value)) {
		return value.toLocaleString(undefined, {
			minimumFractionDigits: 0,
			maximumFractionDigits: DECIMAL_PRECISION_DIGITS,
		});
	}

	// Default: use locale formatting with thousands separator
	return value.toLocaleString();
};
