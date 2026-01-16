/**
 * IndexedDB storage provider implementation using Dexie
 * Wraps existing CatalogueService to implement the storage provider interface
 */

import type {
  AddToGraphListParams,
  EntityType,
  GraphListNode,
  PruneGraphListResult,
} from '@bibgraph/types';

import type { GenericLogger } from '../logger.js';
import type { CatalogueEntity, CatalogueList } from './catalogue-db/index.js';
import { CatalogueService } from './catalogue-db/service.js';
import type { AddBookmarkParams, AddEntityParams, AddToHistoryParams, BatchAddResult, CatalogueStorageProvider, CreateListParams, ListStats, ShareAccessResult } from './catalogue-storage-provider.js';
import {
	convertIndexedDBError,
	ValidationError,
} from './errors.js';

/**
 * Production storage provider using IndexedDB via Dexie
 * Delegates all operations to the existing CatalogueService
 * Enhanced with comprehensive error handling and logging
 */
export class DexieStorageProvider implements CatalogueStorageProvider {
	private catalogueService: CatalogueService;
	private logger?: GenericLogger;

	constructor(logger?: GenericLogger) {
		this.logger = logger;
		this.catalogueService = new CatalogueService(logger);
	}

	// ========== List Operations ==========

	async createList(params: CreateListParams): Promise<string> {
		try {
			// Validate input parameters
			if (!params.title || params.title.trim().length === 0) {
				throw new ValidationError('title', params.title, 'Title cannot be empty');
			}

			const result = await this.catalogueService.createList(params);

			this.logger?.info('storage', 'List created successfully', { listId: result, title: params.title });
			return result;
		} catch (error) {
			const storageError = convertIndexedDBError('createList', error);
			this.logger?.error('storage', 'Failed to create list', {
				error: storageError.message,
				title: params.title,
				originalError: error,
			});
			throw storageError;
		}
	}

	async getList(listId: string): Promise<CatalogueList | null> {
		return await this.catalogueService.getList(listId);
	}

	async getAllLists(): Promise<CatalogueList[]> {
		return await this.catalogueService.getAllLists();
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		return await this.catalogueService.updateList(listId, updates);
	}

	async deleteList(listId: string): Promise<void> {
		return await this.catalogueService.deleteList(listId);
	}

	// ========== Entity Operations ==========

	async addEntityToList(params: AddEntityParams): Promise<string> {
		try {
			// Validate input parameters
			if (!params.listId || params.listId.trim().length === 0) {
				throw new ValidationError('listId', params.listId, 'List ID cannot be empty');
			}
			if (!params.entityId || params.entityId.trim().length === 0) {
				throw new ValidationError('entityId', params.entityId, 'Entity ID cannot be empty');
			}
			if (!params.entityType) {
				throw new ValidationError('entityType', params.entityType, 'Entity type is required');
			}

			const result = await this.catalogueService.addEntityToList({
				listId: params.listId,
				entityType: params.entityType,
				entityId: params.entityId,
				notes: params.notes,
				position: params.position,
			});

			this.logger?.info('storage', 'Entity added to list successfully', {
				entityId: params.entityId,
				entityType: params.entityType,
				listId: params.listId,
				recordId: result,
			});
			return result;
		} catch (error) {
			const storageError = convertIndexedDBError('addEntityToList', error);
			this.logger?.error('storage', 'Failed to add entity to list', {
				error: storageError.message,
				entityId: params.entityId,
				entityType: params.entityType,
				listId: params.listId,
				originalError: error,
			});
			throw storageError;
		}
	}

	async getListEntities(listId: string): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getListEntities(listId);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		return await this.catalogueService.removeEntityFromList(listId, entityRecordId);
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		return await this.catalogueService.updateEntityNotes(entityRecordId, notes);
	}

	async addEntitiesToList(
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<BatchAddResult> {
		const result = await this.catalogueService.addEntitiesToList(listId, entities);
		return {
			success: result.success,
			failed: result.failed,
		};
	}

	async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
		return await this.catalogueService.reorderEntities(listId, orderedEntityIds);
	}

	// ========== Search & Stats ==========

	async searchLists(query: string): Promise<CatalogueList[]> {
		return await this.catalogueService.searchLists(query);
	}

	async getListStats(listId: string): Promise<ListStats> {
		const stats = await this.catalogueService.getListStats(listId);
		return {
			totalEntities: stats.totalEntities,
			entityCounts: stats.entityCounts,
		};
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		return await this.catalogueService.generateShareToken(listId);
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		const result = await this.catalogueService.getListByShareToken(shareToken);
		return {
			list: result.list,
			valid: result.valid,
		};
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async initializeSpecialLists(): Promise<void> {
		return await this.catalogueService.initializeSpecialLists();
	}

	isSpecialList(listId: string): boolean {
		return this.catalogueService.isSpecialList(listId);
	}

	async addBookmark(params: AddBookmarkParams): Promise<string> {
		try {
			// Validate input parameters
			if (!params.entityId || params.entityId.trim().length === 0) {
				throw new ValidationError('entityId', params.entityId, 'Entity ID cannot be empty');
			}
			if (!params.entityType) {
				throw new ValidationError('entityType', params.entityType, 'Entity type is required');
			}

			const result = await this.catalogueService.addBookmark({
				entityType: params.entityType,
				entityId: params.entityId,
				notes: params.notes,
			});

			this.logger?.info('storage', 'Bookmark added successfully', {
				entityId: params.entityId,
				entityType: params.entityType,
				recordId: result,
			});
			return result;
		} catch (error) {
			const storageError = convertIndexedDBError('addBookmark', error);
			this.logger?.error('storage', 'Failed to add bookmark', {
				error: storageError.message,
				entityId: params.entityId,
				entityType: params.entityType,
				originalError: error,
			});
			throw storageError;
		}
	}

	async removeBookmark(entityRecordId: string): Promise<void> {
		return await this.catalogueService.removeBookmark(entityRecordId);
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getBookmarks();
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		return await this.catalogueService.isBookmarked(entityType, entityId);
	}

	async addToHistory(params: AddToHistoryParams): Promise<string> {
		return await this.catalogueService.addToHistory({
			entityType: params.entityType,
			entityId: params.entityId,
			url: params.url,
			title: params.title,
			timestamp: params.timestamp,
		});
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		return await this.catalogueService.getHistory();
	}

	async clearHistory(): Promise<void> {
		return await this.catalogueService.clearHistory();
	}

	// ========== Additional Utilities ==========

	async getNonSystemLists(): Promise<CatalogueList[]> {
		return await this.catalogueService.getNonSystemLists();
	}

	// ========== Graph List Operations (Feature 038-graph-list) ==========

	async getGraphList(): Promise<GraphListNode[]> {
		return await this.catalogueService.getGraphList();
	}

	async addToGraphList(params: AddToGraphListParams): Promise<string> {
		return await this.catalogueService.addToGraphList(params);
	}

	async removeFromGraphList(entityId: string): Promise<void> {
		return await this.catalogueService.removeFromGraphList(entityId);
	}

	async clearGraphList(): Promise<void> {
		return await this.catalogueService.clearGraphList();
	}

	async getGraphListSize(): Promise<number> {
		return await this.catalogueService.getGraphListSize();
	}

	async pruneGraphList(): Promise<PruneGraphListResult> {
		return await this.catalogueService.pruneGraphList();
	}

	async isInGraphList(entityId: string): Promise<boolean> {
		return await this.catalogueService.isInGraphList(entityId);
	}

	async batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]> {
		return await this.catalogueService.batchAddToGraphList(nodes);
	}
}
