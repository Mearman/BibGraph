/**
 * In-memory list operations
 * CRUD operations for catalogue lists stored in Maps
 */

import type { EntityType } from '@bibgraph/types';

import type { CatalogueList } from './catalogue-db/index.js';
import { SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';
import type { CreateListParams, ListStats } from './storage-provider-types.js';

/**
 * Create a new catalogue list
 * @param storage
 * @param params
 */
export const createList = (storage: InMemoryStorage, params: CreateListParams): string => {
	const id = crypto.randomUUID();
	const list: CatalogueList = {
		id,
		title: params.title,
		description: params.description,
		type: params.type,
		tags: params.tags,
		createdAt: new Date(),
		updatedAt: new Date(),
		isPublic: params.isPublic ?? false,
	};

	storage.lists.set(id, list);
	return id;
};

/**
 * Get a list by ID
 * @param storage
 * @param listId
 */
export const getList = (storage: InMemoryStorage, listId: string): CatalogueList | null => storage.lists.get(listId) ?? null;

/**
 * Get all lists sorted by updatedAt descending
 * @param storage
 */
export const getAllLists = (storage: InMemoryStorage): CatalogueList[] => {
	const allLists = [...storage.lists.values()];
	return allLists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
};

/**
 * Update list properties
 * @param storage
 * @param listId
 * @param updates
 */
export const updateList = (storage: InMemoryStorage, listId: string, updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>): void => {
	const list = storage.lists.get(listId);
	if (!list) {
		throw new Error('List not found');
	}

	const updatedList: CatalogueList = {
		...list,
		...updates,
		updatedAt: new Date(),
	};

	storage.lists.set(listId, updatedList);
};

/**
 * Check if a list is a special system list
 * @param listId
 */
export const isSpecialList = (listId: string): boolean => {
	const specialIds: string[] = Object.values(SPECIAL_LIST_IDS);
	return specialIds.includes(listId);
};

/**
 * Delete a list and all associated entities and shares
 * @param storage
 * @param listId
 */
export const deleteList = (storage: InMemoryStorage, listId: string): void => {
	if (isSpecialList(listId)) {
		throw new Error(`Cannot delete special system list: ${listId}`);
	}

	if (!storage.lists.has(listId)) {
		throw new Error('List not found');
	}

	// Delete list
	storage.lists.delete(listId);

	// Delete all entities in the list
	for (const [entityId, entity] of storage.entities.entries()) {
		if (entity.listId === listId) {
			storage.entities.delete(entityId);
		}
	}

	// Delete all share records for the list
	for (const [shareId, share] of storage.shares.entries()) {
		if (share.listId === listId) {
			storage.shares.delete(shareId);
		}
	}
};

/**
 * Search lists by title, description, or tags
 * @param storage
 * @param query
 */
export const searchLists = (storage: InMemoryStorage, query: string): CatalogueList[] => {
	const lowercaseQuery = query.toLowerCase();
	const results: CatalogueList[] = [];

	for (const list of storage.lists.values()) {
		if (
			list.title.toLowerCase().includes(lowercaseQuery) ||
			(list.description && list.description.toLowerCase().includes(lowercaseQuery)) ||
			(list.tags && list.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)))
		) {
			results.push(list);
		}
	}

	return results;
};

/**
 * Get list statistics
 * @param storage
 * @param listId
 */
export const getListStats = (storage: InMemoryStorage, listId: string): ListStats => {
	const entityCounts: Record<EntityType, number> = {
		works: 0,
		authors: 0,
		sources: 0,
		institutions: 0,
		topics: 0,
		concepts: 0,
		publishers: 0,
		funders: 0,
		keywords: 0,
		domains: 0,
		fields: 0,
		subfields: 0,
	};

	let totalEntities = 0;

	for (const entity of storage.entities.values()) {
		if (entity.listId === listId) {
			entityCounts[entity.entityType]++;
			totalEntities++;
		}
	}

	return {
		totalEntities,
		entityCounts,
	};
};

/**
 * Get non-system lists (user-created lists only)
 * @param storage
 */
export const getNonSystemLists = (storage: InMemoryStorage): CatalogueList[] => {
	const allLists = getAllLists(storage);
	return allLists.filter(
		(list) => list.id && !isSpecialList(list.id) && !list.tags?.includes('system')
	);
};
