/**
 * Field Summary Utilities
 *
 * Generates human-readable summaries of select parameter field selections
 * for bookmark display and preview purposes.
 *
 * Related:
 * - T029: Add field summary generation from select parameter
 * - User Story 2: Bookmark Custom Field Views
 */

/**
 * Generates a human-readable summary of selected fields
 * @param selectFields - Array of field names from select parameter
 * @returns Summary string describing the field selection
 * @example
 * ```typescript
 * generateFieldSummary(['id', 'display_name']) // "2 fields"
 * generateFieldSummary(['id']) // "1 field"
 * generateFieldSummary([]) // "default fields"
 * generateFieldSummary(['id', 'title', 'doi', 'cited_by_count', 'publication_year']) // "5 fields"
 * ```
 */
export const generateFieldSummary = (selectFields: readonly string[]): string => {
	if (selectFields.length === 0) {
		return "default fields"
	}

	const count = selectFields.length
	return count === 1 ? "1 field" : `${String(count)} fields`
};

/**
 * Generates a detailed field summary with field names
 * @param selectFields - Array of field names from select parameter
 * @param maxFieldsToShow - Maximum number of field names to show before truncating (default: 3)
 * @returns Detailed summary string with field names
 * @example
 * ```typescript
 * generateDetailedFieldSummary(['id', 'display_name']) // "2 fields: id, display_name"
 * generateDetailedFieldSummary(['id', 'title', 'doi', 'cited_by_count']) // "4 fields: id, title, doi, +1 more"
 * generateDetailedFieldSummary([]) // "default fields"
 * ```
 */
export const generateDetailedFieldSummary = (selectFields: readonly string[], maxFieldsToShow = 3): string => {
	if (selectFields.length === 0) {
		return "default fields"
	}

	const count = selectFields.length
	const countLabel = count === 1 ? "1 field" : `${String(count)} fields`

	if (count <= maxFieldsToShow) {
		// Show all fields
		return `${countLabel}: ${selectFields.join(", ")}`
	}

	// Show first N fields and indicate how many more
	const shownFields = selectFields.slice(0, maxFieldsToShow).join(", ")
	const remainingCount = count - maxFieldsToShow
	const remainingLabel = remainingCount === 1 ? "1 more" : `${String(remainingCount)} more`

	return `${countLabel}: ${shownFields}, +${remainingLabel}`
};

/**
 * Generates a compact field summary suitable for badges or chips
 * @param selectFields - Array of field names from select parameter
 * @returns Compact summary string
 * @example
 * ```typescript
 * generateCompactFieldSummary(['id', 'display_name']) // "2 fields"
 * generateCompactFieldSummary(['id']) // "1 field"
 * generateCompactFieldSummary([]) // "default"
 * generateCompactFieldSummary(['id', 'title', 'doi', 'cited_by_count', 'publication_year']) // "5 fields"
 * ```
 */
export const generateCompactFieldSummary = (selectFields: readonly string[]): string => {
	if (selectFields.length === 0) {
		return "default"
	}

	const count = selectFields.length
	return count === 1 ? "1 field" : `${String(count)} fields`
};

/**
 * Generates a field list preview with ellipsis
 * @param selectFields - Array of field names from select parameter
 * @param maxLength - Maximum character length before truncating (default: 50)
 * @returns Field list preview string
 * @example
 * ```typescript
 * generateFieldListPreview(['id', 'display_name']) // "id, display_name"
 * generateFieldListPreview(['id', 'title', 'doi', 'cited_by_count']) // "id, title, doi, cited_by_count"
 * generateFieldListPreview(['id', 'display_name', 'works_count', 'cited_by_count', 'h_index'], 30) // "id, display_name, works_co..."
 * ```
 */
const ELLIPSIS_LENGTH = 3

export const generateFieldListPreview = (selectFields: readonly string[], maxLength = 50): string => {
	if (selectFields.length === 0) {
		return "default fields"
	}

	const fieldList = selectFields.join(", ")

	if (fieldList.length <= maxLength) {
		return fieldList
	}

	// Truncate and add ellipsis
	return fieldList.slice(0, Math.max(0, maxLength - ELLIPSIS_LENGTH)) + "..."
};

/**
 * Categorizes fields into common groups
 * @param selectFields - Array of field names from select parameter
 * @returns Object with categorized field groups
 * @example
 * ```typescript
 * categorizeFields(['id', 'display_name', 'works_count', 'cited_by_count'])
 * // {
 * //   identifiers: ['id'],
 * //   basic: ['display_name'],
 * //   metrics: ['works_count', 'cited_by_count'],
 * //   relationships: [],
 * //   dates: [],
 * //   other: []
 * // }
 * ```
 */
export const categorizeFields = (selectFields: readonly string[]): {
	identifiers: string[]
	basic: string[]
	metrics: string[]
	relationships: string[]
	dates: string[]
	other: string[]
} => {
	const categories: {
		identifiers: string[]
		basic: string[]
		metrics: string[]
		relationships: string[]
		dates: string[]
		other: string[]
	} = {
		identifiers: [],
		basic: [],
		metrics: [],
		relationships: [],
		dates: [],
		other: [],
	}

	const isCategoryKey = (key: string): key is keyof typeof categories => key in categories

	// Field name patterns for categorization
	const patterns = {
		identifiers: /^(doi|id|isbn|issn|mag|openalex|orcid|ror)$/i,
		basic: /^(abstract|description|display_name|name|summary|title)$/i,
		metrics: /_(count|impact|index|percentile|rank|score)$/i,
		relationships: /^(author|concept|funder|institution|publisher|related|source|topic)/i,
		dates: /_(created|date|published|time|updated|year)$/i,
	}

	for (const field of selectFields) {
		let isCategorized = false

		for (const [category, pattern] of Object.entries(patterns)) {
			if (pattern.test(field) && isCategoryKey(category)) {
				categories[category].push(field)
				isCategorized = true
				break
			}
		}

		if (!isCategorized) {
			categories.other.push(field)
		}
	}

	return categories
};

/**
 * Generates a smart summary that highlights important field categories
 * @param selectFields - Array of field names from select parameter
 * @returns Smart summary string with category highlights
 * @example
 * ```typescript
 * generateSmartFieldSummary(['id', 'display_name', 'works_count', 'cited_by_count'])
 * // "4 fields (2 metrics)"
 *
 * generateSmartFieldSummary(['id', 'title', 'doi', 'publication_year'])
 * // "4 fields (2 identifiers, 1 date)"
 *
 * generateSmartFieldSummary(['display_name'])
 * // "1 field"
 * ```
 */
export const generateSmartFieldSummary = (selectFields: readonly string[]): string => {
	if (selectFields.length === 0) {
		return "default fields"
	}

	const categories = categorizeFields(selectFields)
	const totalCount = selectFields.length
	const countLabel = totalCount === 1 ? "1 field" : `${String(totalCount)} fields`

	// Build highlights for non-zero categories (excluding 'basic' and 'other')
	const highlights: string[] = []

	if (categories.identifiers.length > 0) {
		const label =
			categories.identifiers.length === 1 ? "identifier" : "identifiers"
		highlights.push(`${String(categories.identifiers.length)} ${label}`)
	}

	if (categories.metrics.length > 0) {
		const label = categories.metrics.length === 1 ? "metric" : "metrics"
		highlights.push(`${String(categories.metrics.length)} ${label}`)
	}

	if (categories.relationships.length > 0) {
		const label =
			categories.relationships.length === 1 ? "relationship" : "relationships"
		highlights.push(`${String(categories.relationships.length)} ${label}`)
	}

	if (categories.dates.length > 0) {
		const label = categories.dates.length === 1 ? "date" : "dates"
		highlights.push(`${String(categories.dates.length)} ${label}`)
	}

	if (highlights.length === 0) {
		return countLabel
	}

	return `${countLabel} (${highlights.join(", ")})`
};

/**
 * Compares two field selections and returns the difference
 * @param fieldsA - First field selection
 * @param fieldsB - Second field selection
 * @returns Object describing the differences
 * @example
 * ```typescript
 * compareFieldSelections(
 *   ['id', 'display_name'],
 *   ['id', 'display_name', 'works_count']
 * )
 * // {
 * //   added: ['works_count'],
 * //   removed: [],
 * //   common: ['id', 'display_name'],
 * //   countChange: 1
 * // }
 * ```
 */
export const compareFieldSelections = (fieldsA: readonly string[], fieldsB: readonly string[]): {
	added: string[]
	removed: string[]
	common: string[]
	countChange: number
} => {
	const setA = new Set(fieldsA)
	const setB = new Set(fieldsB)

	const added = fieldsB.filter((field) => !setA.has(field))
	const removed = fieldsA.filter((field) => !setB.has(field))
	const common = fieldsA.filter((field) => setB.has(field))

	return {
		added,
		removed,
		common,
		countChange: fieldsB.length - fieldsA.length,
	}
};

/**
 * Checks if two field selections are equivalent (order-independent)
 * @param fieldsA - First field selection
 * @param fieldsB - Second field selection
 * @returns True if selections contain the same fields (order doesn't matter)
 * @example
 * ```typescript
 * areFieldSelectionsEquivalent(['id', 'title'], ['title', 'id']) // true
 * areFieldSelectionsEquivalent(['id', 'title'], ['id', 'display_name']) // false
 * ```
 */
export const areFieldSelectionsEquivalent = (fieldsA: readonly string[], fieldsB: readonly string[]): boolean => {
	if (fieldsA.length !== fieldsB.length) {
		return false
	}

	const setB = new Set(fieldsB)

	return fieldsA.every((field) => setB.has(field))
};

/**
 * Validates that field names conform to OpenAlex field naming conventions
 * @param selectFields - Array of field names to validate
 * @returns Object with validation result and any invalid fields
 * @example
 * ```typescript
 * validateFieldNames(['id', 'display_name', 'works_count']) // { valid: true, invalidFields: [] }
 * validateFieldNames(['id', 'invalid field!', 'display_name']) // { valid: false, invalidFields: ['invalid field!'] }
 * ```
 */
export const validateFieldNames = (selectFields: readonly string[]): {
	valid: boolean
	invalidFields: string[]
} => {
	// OpenAlex field naming pattern: alphanumeric, underscores, dots (for nested fields)
	const validFieldPattern = /^[\w.]+$/

	const invalidFields = selectFields.filter(
		(field) => !validFieldPattern.test(field)
	)

	return {
		valid: invalidFields.length === 0,
		invalidFields,
	}
};
