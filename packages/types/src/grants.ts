/**
 * Grant relationship type definitions for OpenAlex funding relationships
 * Work → Funder relationships via work.grants[] array
 */

import { RelationType } from "./relationships"

/**
 * Grant relationship from OpenAlex work.grants[] array
 * Links a work to its funding sources
 */
export interface GrantRelationship {
	/**
	Funder OpenAlex ID (e.g., "https://openalex.org/F4320332161")
	 */
	funder: string
	/**
	Funder display name (e.g., "National Institutes of Health")
	 */
	funder_display_name: string
	/**
	Award ID from the grant (may be null)
	 */
	award_id: string | null
}

/**
 * Graph edge representation of grant relationship
 * Direction: Work → Funder (outbound, stored on work)
 */
export interface GrantGraphEdge {
	id: string // Format: `${workId}-funded_by-${funderId}`
	source: string // Work ID
	target: string // Funder ID
	type: RelationType.FUNDED_BY
	direction: 'outbound'
	label: string // "funded by"
	funderDisplayName: string // For display in UI
	awardId?: string // Optional award ID for display
}

/**
 * Helper function to create grant relationship edges
 */
export const createGrantGraphEdge = (workId: string, grant: Readonly<GrantRelationship>): GrantGraphEdge => {
	const funderId = grant.funder
	return {
		id: `${workId}-funded_by-${funderId.replace('https://openalex.org/', '')}`,
		source: workId,
		target: funderId,
		type: RelationType.FUNDED_BY,
		direction: 'outbound',
		label: 'funded by',
		funderDisplayName: grant.funder_display_name,
		awardId: grant.award_id ?? undefined
	}
};

/**
 * Type guard for grant relationship data
 */
export const isGrantRelationship = (data: unknown): data is GrantRelationship => typeof data === 'object' && data !== null &&
		'funder' in data &&
		'funder_display_name' in data &&
		(typeof data.funder === 'string') &&
		(typeof data.funder_display_name === 'string') &&
		('award_id' in data ? data.award_id === null || typeof data.award_id === 'string' : true);