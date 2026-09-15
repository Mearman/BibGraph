/**
 * Repository relationship type definitions for OpenAlex repository relationships
 * Institution → Source relationships via institution.repositories[] array
 */

import { RelationType } from "./relationships"

/**
 * Repository relationship from OpenAlex institution.repositories[] array
 * Links an institution to its repository sources
 */
export interface RepositoryRelationship {
	/**
	Source OpenAlex ID (e.g., "https://openalex.org/S4306400393")
	 */
	id: string
	/**
	Repository display name (e.g., "Deep Blue (University of Michigan)")
	 */
	display_name: string
	/**
	Host institution OpenAlex ID
	 */
	host_organization: string
}

/**
 * Graph edge representation of repository relationship
 * Direction: Institution → Source (outbound, stored on institution)
 */
export interface RepositoryGraphEdge {
	id: string // Format: `${institutionId}-institution_has_repository-${sourceId}`
	source: string // Institution ID
	target: string // Source ID (repository)
	type: RelationType.INSTITUTION_HAS_REPOSITORY
	direction: 'outbound'
	label: string // "has repository"
	repositoryDisplayName: string // For display in UI
	hostOrganizationId: string // Institution ID that hosts the repository
}

/**
 * Helper function to create repository relationship edges
 */
export const createRepositoryGraphEdge = (
	institutionId: string,
	repository: Readonly<RepositoryRelationship>
): RepositoryGraphEdge => {
	const sourceId = repository.id
	return {
		id: `${institutionId}-institution_has_repository-${sourceId.replace('https://openalex.org/', '')}`,
		source: institutionId,
		target: sourceId,
		type: RelationType.INSTITUTION_HAS_REPOSITORY,
		direction: 'outbound',
		label: 'has repository',
		repositoryDisplayName: repository.display_name,
		hostOrganizationId: repository.host_organization
	}
};

/**
 * Type guard for repository relationship data
 */
export const isRepositoryRelationship = (data: unknown): data is RepositoryRelationship => typeof data === 'object' && data !== null &&
		'id' in data &&
		'display_name' in data &&
		'host_organization' in data &&
		(typeof data.id === 'string') &&
		(typeof data.display_name === 'string') &&
		(typeof data.host_organization === 'string');