/**
 * Enhanced topic relationship type definitions for OpenAlex topic relationships
 * Entity → Topic relationships with count and score metadata
 */

import { RelationType } from "./relationships"

/**
 * Enhanced topic relationship from OpenAlex entity.topics[] array
 * Includes count and score metadata for authors, sources, and institutions
 */
export interface EnhancedTopicRelationship {
	/**
	Topic OpenAlex ID (e.g., "https://openalex.org/T10102")
	 */
	id: string
	/**
	Topic display name (e.g., "scientometrics and bibliometrics research")
	 */
	display_name: string
	/**
	Number of works entity has in this topic
	 */
	count: number
	/**
	Relevance score (0-1, higher = more relevant)
	 */
	score: number
	/**
	Subfield information
	 */
	subfield: {
		id: string
		display_name: string
	}
	/**
	Field information
	 */
	field: {
		id: string
		display_name: string
	}
	/**
	Domain information
	 */
	domain: {
		id: string
		display_name: string
	}
}

/**
 * Graph edge representation of enhanced topic relationship
 * Direction: Entity → Topic (outbound, stored on entity)
 */
export interface EnhancedTopicGraphEdge {
	id: string // Format: `${entityId}-topic-${topicId}`
	source: string // Entity ID (author, source, or institution)
	target: string // Topic ID
	type: RelationType.TOPIC
	direction: 'outbound'
	label: string // "researches" for authors, "publishes on" for sources/institutions
	topicDisplayName: string // For display in UI
	count: number // Number of works in this topic
	score: number // Relevance score for styling/filtering
	subfieldDisplayName: string // For hierarchical display
	fieldDisplayName: string // For hierarchical display
	domainDisplayName: string // For hierarchical display
}

/**
 * Helper function to create enhanced topic relationship edges
 */
export const createEnhancedTopicGraphEdge = (entityId: string, entityType: 'author' | 'source' | 'institution', topic: EnhancedTopicRelationship): EnhancedTopicGraphEdge => {
	const topicId = topic.id
	const label = entityType === 'author' ? 'researches' : 'publishes on'

	return {
		id: `${entityId}-topic-${topicId.replace('https://openalex.org/', '')}`,
		source: entityId,
		target: topicId,
		type: RelationType.TOPIC,
		direction: 'outbound',
		label,
		topicDisplayName: topic.display_name,
		count: topic.count,
		score: topic.score,
		subfieldDisplayName: topic.subfield.display_name,
		fieldDisplayName: topic.field.display_name,
		domainDisplayName: topic.domain.display_name
	}
};

/**
 * Type guard for enhanced topic relationship data
 */
export const isEnhancedTopicRelationship = (data: unknown): data is EnhancedTopicRelationship => typeof data === 'object' && data !== null &&
		'id' in data &&
		'display_name' in data &&
		'count' in data &&
		'score' in data &&
		'subfield' in data &&
		'field' in data &&
		'domain' in data &&
		(typeof data.id === 'string') &&
		(typeof data.display_name === 'string') &&
		(typeof data.count === 'number') &&
		(typeof data.score === 'number') &&
		data.count >= 0 &&
		data.score >= 0 && data.score <= 1 &&
		typeof data.subfield === 'object' && data.subfield !== null &&
		'id' in data.subfield && 'display_name' in data.subfield &&
		typeof data.subfield.id === 'string' && typeof data.subfield.display_name === 'string' &&
		typeof data.field === 'object' && data.field !== null &&
		'id' in data.field && 'display_name' in data.field &&
		typeof data.field.id === 'string' && typeof data.field.display_name === 'string' &&
		typeof data.domain === 'object' && data.domain !== null &&
		'id' in data.domain && 'display_name' in data.domain &&
		typeof data.domain.id === 'string' && typeof data.domain.display_name === 'string';