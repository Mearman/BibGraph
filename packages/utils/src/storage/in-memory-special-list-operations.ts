/**
 * In-memory special list operations
 * Bookmarks, History, and sharing operations
 */

import type { EntityType } from '@bibgraph/types';

import type { CatalogueEntity, CatalogueList, CatalogueShareRecord } from './catalogue-db/index.js';
import { SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import { addEntityToList, getListEntities, removeEntityFromList } from './in-memory-entity-operations.js';
import { updateList } from './in-memory-list-operations.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';
import type { AddBookmarkParams, AddToHistoryParams, ShareAccessResult } from './storage-provider-types.js';

/**
 * Initialize special system lists (Bookmarks, History, Graph)
 * @param storage
 */
export const initializeSpecialLists = (storage: InMemoryStorage): void => {
	const bookmarksList = storage.lists.get(SPECIAL_LIST_IDS.BOOKMARKS);
	const historyList = storage.lists.get(SPECIAL_LIST_IDS.HISTORY);
	const graphList = storage.lists.get(SPECIAL_LIST_IDS.GRAPH);

	if (!bookmarksList) {
		const list: CatalogueList = {
			id: SPECIAL_LIST_IDS.BOOKMARKS,
			title: 'Bookmarks',
			description: 'System-managed bookmarks list',
			type: 'list',
			tags: ['system'],
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
		};
		storage.lists.set(SPECIAL_LIST_IDS.BOOKMARKS, list);
	}

	if (!historyList) {
		const list: CatalogueList = {
			id: SPECIAL_LIST_IDS.HISTORY,
			title: 'History',
			description: 'System-managed browsing history',
			type: 'list',
			tags: ['system'],
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
		};
		storage.lists.set(SPECIAL_LIST_IDS.HISTORY, list);
	}

	if (!graphList) {
		const list: CatalogueList = {
			id: SPECIAL_LIST_IDS.GRAPH,
			title: 'Graph',
			description: 'System-managed graph working set',
			type: 'list',
			tags: ['system'],
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: false,
		};
		storage.lists.set(SPECIAL_LIST_IDS.GRAPH, list);
	}
};

// ========== Bookmark Operations ==========

/**
 * Add a bookmark
 * @param storage
 * @param params
 */
export const addBookmark = (storage: InMemoryStorage, params: AddBookmarkParams): string => {
	initializeSpecialLists(storage);

	return addEntityToList(storage, {
		listId: SPECIAL_LIST_IDS.BOOKMARKS,
		entityType: params.entityType,
		entityId: params.entityId,
		notes: params.notes,
	});
};

/**
 * Remove a bookmark
 * @param storage
 * @param entityRecordId
 */
export const removeBookmark = (storage: InMemoryStorage, entityRecordId: string): void => {
	removeEntityFromList(storage, SPECIAL_LIST_IDS.BOOKMARKS, entityRecordId);
};

/**
 * Get all bookmarks
 * @param storage
 */
export const getBookmarks = (storage: InMemoryStorage): CatalogueEntity[] => {
	initializeSpecialLists(storage);
	return getListEntities(storage, SPECIAL_LIST_IDS.BOOKMARKS);
};

/**
 * Check if an entity is bookmarked
 * @param storage
 * @param entityType
 * @param entityId
 */
export const isBookmarked = (storage: InMemoryStorage, entityType: EntityType, entityId: string): boolean => {
	for (const entity of storage.entities.values()) {
		if (
			entity.listId === SPECIAL_LIST_IDS.BOOKMARKS &&
			entity.entityType === entityType &&
			entity.entityId === entityId
		) {
			return true;
		}
	}
	return false;
};

// ========== History Operations ==========

/**
 * Add to history
 * @param storage
 * @param params
 */
export const addToHistory = (storage: InMemoryStorage, params: AddToHistoryParams): string => {
	initializeSpecialLists(storage);

	// Check if this entity/page already exists in history
	let existingEntity: CatalogueEntity | null = null;
	for (const entity of storage.entities.values()) {
		if (
			entity.listId === SPECIAL_LIST_IDS.HISTORY &&
			entity.entityType === params.entityType &&
			entity.entityId === params.entityId
		) {
			existingEntity = entity;
			break;
		}
	}

	if (existingEntity) {
		// Update existing record with new timestamp
		const updatedEntity: CatalogueEntity = {
			...existingEntity,
			addedAt: params.timestamp ?? new Date(),
			notes: `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`,
		};
		if (existingEntity.id) {
			storage.entities.set(existingEntity.id, updatedEntity);
			updateList(storage, SPECIAL_LIST_IDS.HISTORY, {});
			return existingEntity.id;
		}
	}

	// Add new history entry
	const notes = `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`;

	return addEntityToList(storage, {
		listId: SPECIAL_LIST_IDS.HISTORY,
		entityType: params.entityType,
		entityId: params.entityId,
		notes,
	});
};

/**
 * Get all history entries
 * @param storage
 */
export const getHistory = (storage: InMemoryStorage): CatalogueEntity[] => {
	initializeSpecialLists(storage);
	return getListEntities(storage, SPECIAL_LIST_IDS.HISTORY);
};

/**
 * Clear all history
 * @param storage
 */
export const clearHistory = (storage: InMemoryStorage): void => {
	const entitiesToDelete: string[] = [];
	for (const [entityId, entity] of storage.entities.entries()) {
		if (entity.listId === SPECIAL_LIST_IDS.HISTORY) {
			entitiesToDelete.push(entityId);
		}
	}

	for (const entityId of entitiesToDelete) {
		storage.entities.delete(entityId);
	}

	updateList(storage, SPECIAL_LIST_IDS.HISTORY, {});
};

// ========== Sharing Operations ==========

const SHARE_EXPIRY_YEARS = 1;

/**
 * Generate a share token for a list
 * @param storage
 * @param listId
 */
export const generateShareToken = (storage: InMemoryStorage, listId: string): string => {
	const list = storage.lists.get(listId);
	if (!list) {
		throw new Error('List not found');
	}

	const shareToken = crypto.randomUUID();
	const expiresAt = new Date();
	expiresAt.setFullYear(expiresAt.getFullYear() + SHARE_EXPIRY_YEARS);

	const shareRecord: CatalogueShareRecord = {
		id: crypto.randomUUID(),
		listId,
		shareToken,
		createdAt: new Date(),
		expiresAt,
		accessCount: 0,
	};

	if (shareRecord.id) {
		storage.shares.set(shareRecord.id, shareRecord);
	}

	// Update list with share token
	const updatedList: CatalogueList = {
		...list,
		shareToken,
		isPublic: true,
	};
	storage.lists.set(listId, updatedList);

	return shareToken;
};

/**
 * Get a list by share token
 * @param storage
 * @param shareToken
 */
export const getListByShareToken = (storage: InMemoryStorage, shareToken: string): ShareAccessResult => {
	// Find share record
	let shareRecord: CatalogueShareRecord | null = null;
	for (const share of storage.shares.values()) {
		if (share.shareToken === shareToken) {
			shareRecord = share;
			break;
		}
	}

	if (!shareRecord) {
		return { list: null, valid: false };
	}

	// Check if share has expired
	if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
		return { list: null, valid: false };
	}

	// Update access count
	const updatedShareRecord: CatalogueShareRecord = {
		...shareRecord,
		accessCount: shareRecord.accessCount + 1,
		lastAccessedAt: new Date(),
	};
	if (shareRecord.id) {
		storage.shares.set(shareRecord.id, updatedShareRecord);
	}

	const list = storage.lists.get(shareRecord.listId) ?? null;
	return { list, valid: true };
};
