/**
 * In-memory entity operations
 * Entity CRUD operations for catalogue entities stored in Maps
 */

import type { EntityType } from '@bibgraph/types';

import type { CatalogueEntity, CatalogueList } from './catalogue-db/index.js';
import { getList, updateList } from './in-memory-list-operations.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';
import type { AddEntityParams as AddEntityParameters, BatchAddResult } from './storage-provider-types.js';

/**
 * Get the maximum position in a list
 */
const getMaxPosition = (storage: InMemoryStorage, listId: string): number => {
	let maxPosition = 0;
	for (const entity of storage.entities.values()) {
		if (entity.listId === listId) {
			maxPosition = Math.max(maxPosition, entity.position);
		}
	}
	return maxPosition;
};

/**
 * Check if entity already exists in list
 */
const entityExistsInList = (storage: InMemoryStorage, listId: string, entityType: EntityType, entityId: string): boolean => {
	for (const entity of storage.entities.values()) {
		if (
			entity.listId === listId &&
			entity.entityType === entityType &&
			entity.entityId === entityId
		) {
			return true;
		}
	}
	return false;
};

/**
 * Validate list exists and entity type matches list type
 */
const validateListForEntity = (storage: InMemoryStorage, listId: string, entityType: EntityType): CatalogueList => {
	const list = getList(storage, listId);
	if (!list) {
		throw new Error('List not found');
	}

	if (list.type === 'bibliography' && entityType !== 'works') {
		throw new Error('Bibliographies can only contain works');
	}

	return list;
};

/**
 * Add an entity to a list
 */
export const addEntityToList = (storage: InMemoryStorage, params: Readonly<AddEntityParameters>): string => {
	validateListForEntity(storage, params.listId, params.entityType);

	if (entityExistsInList(storage, params.listId, params.entityType, params.entityId)) {
		throw new Error('Entity already exists in list');
	}

	const position = params.position ?? getMaxPosition(storage, params.listId) + 1;

	const id = crypto.randomUUID();
	const entity: CatalogueEntity = {
		id,
		listId: params.listId,
		entityType: params.entityType,
		entityId: params.entityId,
		addedAt: new Date(),
		notes: params.notes,
		position,
	};

	storage.entities.set(id, entity);

	// Update list's updated timestamp
	updateList(storage, params.listId, {});

	return id;
};

/**
 * Get all entities in a list sorted by position
 */
export const getListEntities = (storage: InMemoryStorage, listId: string): CatalogueEntity[] => {
	const listEntities: CatalogueEntity[] = [];
	for (const entity of storage.entities.values()) {
		if (entity.listId === listId) {
			listEntities.push(entity);
		}
	}
	return listEntities.sort((a, b) => a.position - b.position);
};

/**
 * Remove an entity from a list
 */
export const removeEntityFromList = (storage: InMemoryStorage, listId: string, entityRecordId: string): void => {
	const entity = storage.entities.get(entityRecordId);
	if (!entity) {
		throw new Error('Entity not found');
	}

	storage.entities.delete(entityRecordId);

	// Update list's updated timestamp
	updateList(storage, listId, {});
};

/**
 * Update entity notes
 */
export const updateEntityNotes = (storage: InMemoryStorage, entityRecordId: string, notes: string): void => {
	const entity = storage.entities.get(entityRecordId);
	if (!entity) {
		throw new Error('Entity not found');
	}

	const updatedEntity: CatalogueEntity = {
		...entity,
		notes,
	};

	storage.entities.set(entityRecordId, updatedEntity);

	// Update list's updated timestamp
	updateList(storage, entity.listId, {});
};

/**
 * Update entity data (entityType, entityId, and optionally notes)
 * Used primarily for migration scenarios where entity identification changes
 */
export const updateEntityData = (
	storage: InMemoryStorage,
	entityRecordId: string,
	data: Readonly<{ entityType: EntityType; entityId: string; notes?: string }>
): void => {
	const entity = storage.entities.get(entityRecordId);
	if (!entity) {
		throw new Error('Entity not found');
	}

	const updatedEntity: CatalogueEntity = {
		...entity,
		entityType: data.entityType,
		entityId: data.entityId,
		...(data.notes !== undefined && { notes: data.notes }),
	};

	storage.entities.set(entityRecordId, updatedEntity);

	// Update list's updated timestamp
	updateList(storage, entity.listId, {});
};

/**
 * Reorder entities in a list
 */
export const reorderEntities = (storage: InMemoryStorage, listId: string, orderedEntityIds: readonly string[]): void => {
	const list = getList(storage, listId);
	if (!list) {
		throw new Error('List not found');
	}

	// Get all entities for the list to validate IDs
	const listEntities = getListEntities(storage, listId);
	const entityIdSet = new Set(listEntities.map((e) => e.id));

	// Validate that all provided IDs exist in the list
	for (const entityId of orderedEntityIds) {
		if (!entityIdSet.has(entityId)) {
			throw new Error(`Entity ${entityId} not found in list ${listId}`);
		}
	}

	// Update positions
	for (const [index, orderedEntityId] of orderedEntityIds.entries()) {
		const entity = storage.entities.get(orderedEntityId);
		if (entity) {
			storage.entities.set(orderedEntityId, {
				...entity,
				position: index + 1,
			});
		}
	}

	// Update list's updated timestamp
	updateList(storage, listId, {});
};

/**
 * Add multiple entities to a list
 */
export const addEntitiesToList = (storage: InMemoryStorage, listId: string, entities: readonly {
		entityType: EntityType;
		entityId: string;
		notes?: string;
	}[]): BatchAddResult => {
	let success = 0;
	let failed = 0;

	const list = getList(storage, listId);
	if (!list) {
		throw new Error('List not found');
	}

	let nextPosition = getMaxPosition(storage, listId) + 1;

	for (const entityData of entities) {
		try {
			// Validate entity type for bibliographies
			if (list.type === 'bibliography' && entityData.entityType !== 'works') {
				failed++;
				continue;
			}

			// Check for duplicates
			if (entityExistsInList(storage, listId, entityData.entityType, entityData.entityId)) {
				failed++;
				continue;
			}

			const id = crypto.randomUUID();
			const entity: CatalogueEntity = {
				id,
				listId,
				entityType: entityData.entityType,
				entityId: entityData.entityId,
				addedAt: new Date(),
				notes: entityData.notes,
				position: nextPosition++,
			};

			storage.entities.set(id, entity);
			success++;
		} catch {
			failed++;
		}
	}

	// Update list's updated timestamp
	updateList(storage, listId, {});

	return { success, failed };
};
