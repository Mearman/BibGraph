/**
 * Concept relationship type definitions for OpenAlex concept relationships
 * Work → Concept relationships via work.concepts[] array (legacy)
 */

import { RelationType } from "./relationships"

/**
 * Concept relationship from OpenAlex work.concepts[] array
 * Legacy concept system (deprecated but still present in API responses)
 */
export interface ConceptRelationship {
	/**
	Concept OpenAlex ID (e.g., "https://openalex.org/C2778686605")
	 */
	id: string
	/**
	Concept display name (e.g., "Machine learning")
	 */
	display_name: string
	/**
	Relevance score (0-1, higher = more relevant)
	 */
	score: number
	/**
	Concept level in hierarchy (0 = most general)
	 */
	level: number
	/**
	Wikidata ID for concept
	 */
	wikidata?: string
}

/**
 * Graph edge representation of concept relationship
 * Direction: Work → Concept (outbound, stored on work)
 */
export interface ConceptGraphEdge {
	id: string // Format: `${workId}-concept-${conceptId}`
	source: string // Work ID
	target: string // Concept ID
	type: RelationType.CONCEPT
	direction: 'outbound'
	label: string // "has concept"
	conceptDisplayName: string // For display in UI
	score: number // Relevance score for styling/filtering
	level: number // Hierarchical level for visualization
	wikidata?: string // Wikidata ID for external links
}

/**
 * Helper function to create concept relationship edges
 */
export const createConceptGraphEdge = (
	workId: string,
	concept: Readonly<ConceptRelationship>
): ConceptGraphEdge => {
	const conceptId = concept.id
	return {
		id: `${workId}-concept-${conceptId.replace('https://openalex.org/', '')}`,
		source: workId,
		target: conceptId,
		type: RelationType.CONCEPT,
		direction: 'outbound',
		label: 'has concept',
		conceptDisplayName: concept.display_name,
		score: concept.score,
		level: concept.level,
		wikidata: concept.wikidata
	}
};

/**
 * Type guard for concept relationship data
 */
export const isConceptRelationship = (data: unknown): data is ConceptRelationship => typeof data === 'object' && data !== null &&
		'id' in data &&
		'display_name' in data &&
		'score' in data &&
		'level' in data &&
		(typeof data.id === 'string') &&
		(typeof data.display_name === 'string') &&
		(typeof data.score === 'number') &&
		(typeof data.level === 'number') &&
		data.score >= 0 && data.score <= 1 &&
		data.level >= 0 &&
		('wikidata' in data ? data.wikidata === undefined || typeof data.wikidata === 'string' : true);