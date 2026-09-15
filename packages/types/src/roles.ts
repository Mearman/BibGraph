/**
 * Role relationship type definitions for OpenAlex role relationships
 * Cross-entity mappings via entity.roles[] array
 */

import type { EntityType } from "./entities"
import { RelationType } from "./relationships"

/**
 * Role relationship from OpenAlex entity.roles[] array
 * Maps entities to different roles (funder, institution, publisher)
 */
export interface RoleRelationship {
	/**
	Role type (e.g., "funder", "institution", "publisher")
	 */
	role: string
	/**
	Entity OpenAlex ID for the role
	 */
	id: string
	/**
	Number of works associated with this role
	 */
	works_count: number
}

/**
 * Graph edge representation of role relationship
 * Direction: Entity → Entity (outbound, stored on source entity)
 */
export interface RoleGraphEdge {
	id: string // Format: `${sourceId}-has_role-${targetId}-${role}`
	source: string // Source entity ID
	target: string // Target entity ID (entity in role)
	type: RelationType.HAS_ROLE
	direction: 'outbound'
	label: string // Format: "has role: {role}"
	role: string // Role type for styling/filtering
	worksCount: number // Number of works for this role
	sourceEntityType: EntityType // Type of source entity
	targetEntityType: EntityType // Type of target entity
}

/**
 * Infer target entity type from role name
 */
const inferEntityTypeFromRole = (role: string): EntityType => {
	switch (role) {
		case 'funder':
			return 'funders'
		case 'institution':
			return 'institutions'
		case 'publisher':
			return 'publishers'
		default:
			// Default to works for unknown roles
			return 'works'
	}
};

/**
 * Helper function to create role relationship edges
 */
export const createRoleGraphEdge = (
	sourceId: string,
	sourceEntityType: EntityType,
	role: Readonly<RoleRelationship>
): RoleGraphEdge => {
	const targetId = role.id
	return {
		id: `${sourceId}-has_role-${targetId.replace('https://openalex.org/', '')}-${role.role}`,
		source: sourceId,
		target: targetId,
		type: RelationType.HAS_ROLE,
		direction: 'outbound',
		label: `has role: ${role.role}`,
		role: role.role,
		worksCount: role.works_count,
		sourceEntityType,
		targetEntityType: inferEntityTypeFromRole(role.role)
	}
};

/**
 * Type guard for role relationship data
 */
export const isRoleRelationship = (data: unknown): data is RoleRelationship => typeof data === 'object' && data !== null &&
		'role' in data &&
		'id' in data &&
		'works_count' in data &&
		(typeof data.role === 'string') &&
		(typeof data.id === 'string') &&
		(typeof data.works_count === 'number') &&
		data.works_count >= 0;