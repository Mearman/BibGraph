/**
 * Keyword relationship type definitions for OpenAlex keyword relationships
 * Work → Keyword relationships via work.keywords[] array
 */

import { RelationType } from "./relationships"

/**
 * Keyword relationship from OpenAlex work.keywords[] array
 * Links a work to its research keywords with relevance scores
 */
export interface KeywordRelationship {
	/**
	Keyword OpenAlex ID (e.g., "https://openalex.org/keywords/citation")
	 */
	id: string
	/**
	Keyword display name (e.g., "Citation")
	 */
	display_name: string
	/**
	Relevance score (0-1, higher = more relevant)
	 */
	score: number
}

/**
 * Graph edge representation of keyword relationship
 * Direction: Work → Keyword (outbound, stored on work)
 */
export interface KeywordGraphEdge {
	id: string // Format: `${workId}-work_has_keyword-${keywordId}`
	source: string // Work ID
	target: string // Keyword ID
	type: RelationType.WORK_HAS_KEYWORD
	direction: 'outbound'
	label: string // "has keyword"
	keywordDisplayName: string // For display in UI
	score: number // Relevance score for styling/filtering
}

/**
 * Helper function to create keyword relationship edges
 */
export const createKeywordGraphEdge = (
	workId: string,
	keyword: Readonly<KeywordRelationship>
): KeywordGraphEdge => {
	const keywordId = keyword.id
	return {
		id: `${workId}-work_has_keyword-${keywordId.replace('https://openalex.org/keywords/', '')}`,
		source: workId,
		target: keywordId,
		type: RelationType.WORK_HAS_KEYWORD,
		direction: 'outbound',
		label: 'has keyword',
		keywordDisplayName: keyword.display_name,
		score: keyword.score
	}
};

/**
 * Type guard for keyword relationship data
 */
export const isKeywordRelationship = (data: unknown): data is KeywordRelationship => typeof data === 'object' && data !== null &&
		'id' in data &&
		'display_name' in data &&
		'score' in data &&
		(typeof data.id === 'string') &&
		(typeof data.display_name === 'string') &&
		(typeof data.score === 'number') &&
		data.score >= 0 && data.score <= 1;