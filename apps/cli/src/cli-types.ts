/**
 * TypeScript interfaces and types for CLI
 */

/**
 * Entity summary interface for display
 */
export interface EntitySummary {
	display_name?: string
	id?: string
	works_count?: number
	cited_by_count?: number
	publication_year?: number
	country_code?: string
}

/**
 * Query result output parameters
 */
export interface QueryResultOutputParams {
	result: unknown
	staticEntityType: string
	format?: string
}

/**
 * Entity output parameters
 */
export interface EntityOutputParams {
	entity: EntitySummary
	staticEntityType: string
	format?: string
	pretty?: boolean
}

/**
 * Entity summary print parameters
 */
export interface EntitySummaryPrintParams {
	entity: EntitySummary
	entityType: string
}
