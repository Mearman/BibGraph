/**
 * IndexedDB storage provider implementation using Dexie
 * Direct integration with operation modules (no service wrapper)
 */

import type {
	AddToGraphListParams,
	EntityType,
	GraphListNode,
	PruneGraphListResult,
} from '@bibgraph/types';
import Dexie from 'dexie';

import type { GenericLogger } from '../logger.js';
import * as AnnotationOps from './catalogue-db/annotation-operations.js';
import * as BookmarkOps from './catalogue-db/bookmark-operations.js';
import * as EntityOps from './catalogue-db/entity-operations.js';
import * as GraphListOps from './catalogue-db/graph-list-operations.js';
import type { CatalogueEntity, CatalogueList, GraphAnnotationStorage, GraphSnapshotStorage } from './catalogue-db/index.js';
import { CORRUPTED_ENTITY_ID_PATTERN, LOG_CATEGORY, SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import * as ListOps from './catalogue-db/list-operations.js';
import type { CatalogueDB } from './catalogue-db/schema.js';
import { getDB } from './catalogue-db/schema.js';
import * as SearchHistoryOps from './catalogue-db/search-history-operations.js';
import * as SnapshotOps from './catalogue-db/snapshot-operations.js';
import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
import {
	convertIndexedDBError,
	ValidationError,
} from './errors.js';
import type { AddBookmarkParams, AddEntityParams, AddToHistoryParams, BatchAddResult, CreateListParams, ListStats, ShareAccessResult } from './storage-provider-types.js';

/**
 * Production storage provider using IndexedDB via Dexie
 * Direct integration with operation modules
 * Enhanced with comprehensive error handling and logging
 */
export class DexieStorageProvider implements CatalogueStorageProvider {
	private db: CatalogueDB;
	private logger?: GenericLogger;

	constructor(logger?: GenericLogger) {
		this.logger = logger;
		this.db = getDB();
	}

	// ========== Helper Methods for Operation Modules ==========

	private async fetchList(listId: string): Promise<CatalogueList | null> {
		return await ListOps.getList(this.db, listId, this.logger);
	}

	private async modifyList(listId: string, updates: Record<string, unknown>): Promise<void> {
		await ListOps.updateList(this.db, listId, updates, this.logger);
	}

	private async addEntity(params: {
		listId: string;
		entityType: EntityType;
		entityId: string;
		notes?: string;
		position?: number;
	}): Promise<string> {
		return await EntityOps.addEntityToList(
			this.db,
			this.fetchList.bind(this),
			this.modifyList.bind(this),
			params,
			this.logger
		);
	}

	private async removeEntity(listId: string, entityRecordId: string): Promise<void> {
		await EntityOps.removeEntityFromList(this.db, this.modifyList.bind(this), listId, entityRecordId, this.logger);
	}

	private async fetchListEntities(listId: string): Promise<CatalogueEntity[]> {
		return await EntityOps.getListEntities(this.db, listId, this.logger);
	}

	isSpecialList(listId: string): boolean {
		return ListOps.isSpecialList(listId);
	}

	async initializeSpecialLists(): Promise<void> {
		// Initialize bookmarks and history lists
		await ListOps.initializeSpecialLists(this.db, this.fetchList.bind(this), this.logger);

		// Also initialize graph list
		const graphList = await this.fetchList(SPECIAL_LIST_IDS.GRAPH);
		if (!graphList) {
			try {
				await this.db.catalogueLists.add({
					id: SPECIAL_LIST_IDS.GRAPH,
					title: "Graph",
					description: "System-managed graph working set",
					type: "list",
					tags: ["system"],
					createdAt: new Date(),
					updatedAt: new Date(),
					isPublic: false,
				});
				this.logger?.debug(LOG_CATEGORY, "Graph list initialized");
			} catch (addError) {
				if (!(addError instanceof Dexie.ConstraintError)) {
					throw addError;
				}
			}
		}
	}

	// ========== List Operations ==========

	async createList(params: CreateListParams): Promise<string> {
		try {
			// Validate input parameters
			if (!params.title || params.title.trim().length === 0) {
				throw new ValidationError('title', params.title, 'Title cannot be empty');
			}

			const result = await ListOps.createList(this.db, params, this.logger);

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
		return await this.fetchList(listId);
	}

	async getAllLists(): Promise<CatalogueList[]> {
		return await ListOps.getAllLists(this.db, this.logger);
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		return await ListOps.updateList(this.db, listId, updates, this.logger);
	}

	async deleteList(listId: string): Promise<void> {
		return await ListOps.deleteList(this.db, listId, this.isSpecialList.bind(this), this.logger);
	}

	async searchLists(query: string): Promise<CatalogueList[]> {
		return await ListOps.searchLists(this.db, query, this.logger);
	}

	async getListStats(listId: string): Promise<ListStats> {
		const stats = await ListOps.getListStats(this.db, listId, this.getListEntities.bind(this), this.logger);
		return {
			totalEntities: stats.totalEntities,
			entityCounts: stats.entityCounts,
		};
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

			const result = await this.addEntityToList({
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
		return await this.getListEntities(listId);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		return await this.removeEntityFromList(listId, entityRecordId);
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		return await EntityOps.updateEntityNotes(this.db, this.updateList.bind(this), entityRecordId, notes, this.logger);
	}

	async updateEntityData(
		entityRecordId: string,
		data: { entityType: EntityType; entityId: string; notes?: string }
	): Promise<void> {
		return await EntityOps.updateEntityData(this.db, this.updateList.bind(this), entityRecordId, data, this.logger);
	}

	async addEntitiesToList(
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<BatchAddResult> {
		const result = await EntityOps.addEntitiesToList(this.db, this.getList.bind(this), this.updateList.bind(this), listId, entities, this.logger);
		return {
			success: result.success,
			failed: result.failed,
		};
	}

	async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
		return await EntityOps.reorderEntities(this.db, this.getList.bind(this), this.getListEntities.bind(this), this.updateList.bind(this), listId, orderedEntityIds, this.logger);
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		try {
			const shareToken = crypto.randomUUID();
			const expiresAt = new Date();
			expiresAt.setFullYear(expiresAt.getFullYear() + 1);

			const shareRecord = {
				id: crypto.randomUUID(),
				listId,
				shareToken,
				createdAt: new Date(),
				expiresAt,
				accessCount: 0,
			};

			await this.db.catalogueShares.add(shareRecord);

			// Update list with share token
			await this.db.catalogueLists.update(listId, { shareToken, isPublic: true });

			this.logger?.debug(LOG_CATEGORY, "Share token generated", { listId, shareToken });

			return shareToken;
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to generate share token", { listId, error });
			throw error;
		}
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		try {
			const shareRecord = await this.db.catalogueShares.where("shareToken").equals(shareToken).first();

			if (!shareRecord) {
				return { list: null, valid: false };
			}

			// Check if share has expired
			if (shareRecord.expiresAt && shareRecord.expiresAt < new Date()) {
				return { list: null, valid: false };
			}

			// Update access count
			if (shareRecord.id) {
				await this.db.catalogueShares.update(shareRecord.id, {
					accessCount: shareRecord.accessCount + 1,
					lastAccessedAt: new Date(),
				});
			}

			const list = await this.db.catalogueLists.get(shareRecord.listId);
			return { list: list ?? null, valid: !!list };
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get list by share token", { shareToken, error });
			throw error;
		}
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async addBookmark(params: AddBookmarkParams): Promise<string> {
		try {
			// Validate input parameters
			if (!params.entityId || params.entityId.trim().length === 0) {
				throw new ValidationError('entityId', params.entityId, 'Entity ID cannot be empty');
			}
			if (!params.entityType) {
				throw new ValidationError('entityType', params.entityType, 'Entity type is required');
			}

			const result = await BookmarkOps.addBookmark(
				this.db,
				this.initializeSpecialLists.bind(this),
				this.addEntityToList.bind(this),
				params,
				this.logger
			);

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
		return await BookmarkOps.removeBookmark(this.removeEntityFromList.bind(this), entityRecordId);
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		return await BookmarkOps.getBookmarks(this.db, this.initializeSpecialLists.bind(this), this.getListEntities.bind(this), this.logger);
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		return await BookmarkOps.isBookmarked(this.db, entityType, entityId, this.logger);
	}

	async addToHistory(params: AddToHistoryParams): Promise<string> {
		try {
			// Validate URL
			if (!params.url || params.url.trim().length === 0) {
				throw new ValidationError('url', params.url, 'URL cannot be empty');
			}

			return await BookmarkOps.addBookmark(
				this.db,
				this.initializeSpecialLists.bind(this),
				this.addEntityToList.bind(this),
				params,
				this.logger
			);
		} catch (error) {
			const storageError = convertIndexedDBError('addToHistory', error);
			this.logger?.error('storage', 'Failed to add to history', {
				error: storageError.message,
				entityId: params.entityId,
				originalError: error,
			});
			throw storageError;
		}
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		// Runtime cleanup: filter out corrupted entries that may have been created after migration
		// Check both entityId and notes (which contains URL) for corruption patterns
		const urlEncodedPattern = "[object%20Object]";

		// Entity ID prefix to URL path mapping for validation
		const entityPrefixToPath: Record<string, string> = {
			W: "/works/",
			A: "/authors/",
			I: "/institutions/",
			S: "/sources/",
			P: "/publishers/",
			F: "/funders/",
			T: "/topics/",
			C: "/concepts/",
		};

		// Non-entity pages that shouldn't be validated against entity patterns
		const nonEntityPatterns = ["/about", "/settings", "/history", "/bookmarks", "/catalogue", "/search"];

		await this.initializeSpecialLists();
		const entities = await this.getListEntities(SPECIAL_LIST_IDS.HISTORY);

		const validEntities = entities.filter((entity) => {
			if (entity.entityId.length === 0) return false;
			if (entity.entityId.includes(CORRUPTED_ENTITY_ID_PATTERN)) return false;
			if (entity.entityId.includes(urlEncodedPattern)) return false;
			// Also check notes for corrupted URLs
			if (entity.notes?.includes(CORRUPTED_ENTITY_ID_PATTERN)) return false;
			if (entity.notes?.includes(urlEncodedPattern)) return false;

			// Validate entityId/entityType matches URL path (detect race condition mismatches)
			const urlMatch = entity.notes?.match(/URL: ([^\n]+)/);
			if (urlMatch) {
				const url = urlMatch[1];

				// Skip validation for non-entity pages
				const isNonEntityUrl = nonEntityPatterns.some(pattern => url.includes(pattern));
				if (isNonEntityUrl) {
					return true;
				}

				// Validate entityType matches URL path
				// This catches race conditions where entity A's props were recorded with entity B's URL
				const entityTypeUrlPath = `/${entity.entityType}/`;
				if (!url.includes(entityTypeUrlPath)) {
					return false;
				}

				// Also validate entityId matches URL path for prefixed IDs
				const entityPrefix = entity.entityId.charAt(0).toUpperCase();
				const expectedPath = entityPrefixToPath[entityPrefix];
				if (expectedPath && !url.includes(expectedPath)) {
					return false;
				}
			}

			return true;
		});

		// Deduplicate: keep only the most recent entry per unique entityType+entityId
		const seen = new Map<string, CatalogueEntity>();
		for (const entity of validEntities) {
			const key = `${entity.entityType}:${entity.entityId}`;
			const existing = seen.get(key);
			// Keep the entry with the most recent addedAt timestamp
			if (!existing || entity.addedAt > existing.addedAt) {
				seen.set(key, entity);
			}
		}

		return [...seen.values()];
	}

	async clearHistory(): Promise<void> {
		try {
			await this.db.catalogueEntities.where("listId").equals(SPECIAL_LIST_IDS.HISTORY).delete();

			// Update list's updated timestamp
			await this.updateList(SPECIAL_LIST_IDS.HISTORY, {});

			this.logger?.debug(LOG_CATEGORY, "History cleared");
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to clear history", { error });
			throw error;
		}
	}

	// ========== Additional Utilities ==========

	async getNonSystemLists(): Promise<CatalogueList[]> {
		return await ListOps.getNonSystemLists(this.db, this.isSpecialList.bind(this), this.logger);
	}

	// ========== Graph List Operations (Feature 038-graph-list) ==========

	async getGraphList(): Promise<GraphListNode[]> {
		return await GraphListOps.getGraphList(this.db, this.logger);
	}

	async addToGraphList(params: AddToGraphListParams): Promise<string> {
		return await GraphListOps.addToGraphList(this.db, params, this.logger);
	}

	async removeFromGraphList(entityId: string): Promise<void> {
		await GraphListOps.removeFromGraphList(this.db, entityId, this.logger);
	}

	async clearGraphList(): Promise<void> {
		await GraphListOps.clearGraphList(this.db, this.logger);
	}

	async getGraphListSize(): Promise<number> {
		await this.initializeSpecialLists();
		return await this.db.catalogueEntities.where("listId").equals(SPECIAL_LIST_IDS.GRAPH).count();
	}

	async pruneGraphList(): Promise<PruneGraphListResult> {
		return await GraphListOps.pruneGraphList(this.db, this.logger);
	}

	async isInGraphList(entityId: string): Promise<boolean> {
		return await GraphListOps.isInGraphList(this.db, entityId);
	}

	async batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]> {
		const results: string[] = [];
		for (const node of nodes) {
			const id = await this.addToGraphList(node);
			results.push(id);
		}
		return results;
	}

	// ========== Annotation Operations ==========

	async saveAnnotation(annotation: {
		type: 'text' | 'rectangle' | 'circle' | 'drawing';
		visible?: boolean;
		x?: number;
		y?: number;
		content?: string;
		width?: number;
		height?: number;
		radius?: number;
		borderColor?: string;
		fillColor?: string;
		borderWidth?: number;
		points?: Array<{ x: number; y: number }>;
		strokeColor?: string;
		strokeWidth?: number;
		closed?: boolean;
		fontSize?: number;
		backgroundColor?: string;
		nodeId?: string;
	}): Promise<string> {
		return await AnnotationOps.addAnnotation(this.db, { ...annotation, visible: annotation.visible ?? true }, this.logger);
	}

	async getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]> {
		const annotations = await AnnotationOps.getAnnotations(this.db, graphId, this.logger);
		// Filter to ensure only annotations with IDs are returned (persisted records always have IDs)
		return annotations.filter((ann): ann is GraphAnnotationStorage & { id: string } => ann.id !== undefined);
	}

	async deleteAnnotation(annotationId: string): Promise<void> {
		await AnnotationOps.deleteAnnotation(this.db, annotationId, this.logger);
	}

	async updateAnnotation(annotationId: string, updates: {
		visible?: boolean;
		x?: number;
		y?: number;
		content?: string;
	}): Promise<void> {
		await AnnotationOps.updateAnnotation(this.db, annotationId, updates, this.logger);
	}

	async toggleAnnotationVisibility(annotationId: string, visible: boolean): Promise<void> {
		await AnnotationOps.toggleAnnotationVisibility(this.db, annotationId, visible, this.logger);
	}

	async deleteAnnotationsByGraph(graphId: string): Promise<void> {
		await AnnotationOps.deleteAnnotationsByGraph(this.db, graphId, this.logger);
	}

	async addAnnotation(annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		return await AnnotationOps.addAnnotation(this.db, { ...annotation, visible: annotation.visible ?? true }, this.logger);
	}

	// ========== Snapshot Operations ==========

	async saveSnapshot(snapshot: {
		name: string;
		nodes: string;
		edges: string;
		zoom: number;
		panX: number;
		panY: number;
		layoutType: string;
		nodePositions?: string;
		annotations?: string;
		isAutoSave?: boolean;
	}): Promise<string> {
		return await SnapshotOps.addSnapshot(this.db, { ...snapshot, isAutoSave: snapshot.isAutoSave ?? false }, this.logger);
	}

	async getSnapshots(): Promise<GraphSnapshotStorage[]> {
		const snapshots = await SnapshotOps.getSnapshots(this.db, this.logger);
		// Filter to ensure only snapshots with IDs are returned (persisted records always have IDs)
		return snapshots.filter((snap): snap is GraphSnapshotStorage & { id: string } => snap.id !== undefined);
	}

	async getSnapshot(snapshotId: string): Promise<GraphSnapshotStorage | null> {
		return await SnapshotOps.getSnapshot(this.db, snapshotId, this.logger);
	}

	async deleteSnapshot(snapshotId: string): Promise<void> {
		await SnapshotOps.deleteSnapshot(this.db, snapshotId, this.logger);
	}

	async updateSnapshot(snapshotId: string, updates: {
		name?: string;
		nodes?: string;
		edges?: string;
		zoom?: number;
		panX?: number;
		panY?: number;
		layoutType?: string;
		nodePositions?: string;
		annotations?: string;
	}): Promise<void> {
		await SnapshotOps.updateSnapshot(this.db, snapshotId, updates, this.logger);
	}

	async pruneAutoSaveSnapshots(maxCount: number): Promise<void> {
		await SnapshotOps.pruneAutoSaveSnapshots(this.db, maxCount, this.logger);
	}

	async addSnapshot(snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		return await this.saveSnapshot(snapshot);
	}

	// ========== Search History Operations ==========

	async addSearchQuery(query: string, maxHistory = 50): Promise<void> {
		await SearchHistoryOps.addSearchQuery(this.db, query, maxHistory, this.logger);
	}

	async getSearchHistory(): Promise<Array<{ query: string; timestamp: Date }>> {
		return await SearchHistoryOps.getSearchHistory(this.db, this.logger);
	}

	async clearSearchHistory(): Promise<void> {
		await SearchHistoryOps.clearSearchHistory(this.db, this.logger);
	}

	async removeSearchQuery(queryId: string): Promise<void> {
		await SearchHistoryOps.removeSearchQuery(this.db, queryId, this.logger);
	}
}
