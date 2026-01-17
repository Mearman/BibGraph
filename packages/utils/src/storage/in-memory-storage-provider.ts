/**
 * In-memory storage provider implementation for testing
 * Uses JavaScript Maps for fast, isolated test execution
 *
 * This class delegates to helper modules for each operation group:
 * - in-memory-list-operations.ts: List CRUD
 * - in-memory-entity-operations.ts: Entity operations
 * - in-memory-special-list-operations.ts: Bookmarks, History, Sharing
 * - in-memory-graph-list-operations.ts: Graph working set
 * - in-memory-annotation-operations.ts: Graph annotations
 * - in-memory-snapshot-operations.ts: Graph snapshots
 * - in-memory-search-history-operations.ts: Search history
 */

import type {
	AddToGraphListParams,
	EntityType,
	GraphListNode,
	PruneGraphListResult,
} from '@bibgraph/types';

import type { CatalogueEntity, CatalogueList, GraphAnnotationStorage, GraphSnapshotStorage } from './catalogue-db/index.js';
import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
// Import operation modules
import * as annotationOps from './in-memory-annotation-operations.js';
import * as entityOps from './in-memory-entity-operations.js';
import * as graphListOps from './in-memory-graph-list-operations.js';
import * as listOps from './in-memory-list-operations.js';
import * as searchHistoryOps from './in-memory-search-history-operations.js';
import * as snapshotOps from './in-memory-snapshot-operations.js';
import * as specialListOps from './in-memory-special-list-operations.js';
import { clearStorage, createEmptyStorage, type InMemoryStorage } from './in-memory-storage-types.js';
import type {
	AddBookmarkParams,
	AddEntityParams,
	AddToHistoryParams,
	BatchAddResult,
	CreateListParams,
	ListStats,
	ShareAccessResult,
} from './storage-provider-types.js';

/**
 * In-memory storage provider for E2E and unit testing
 * Provides fast, isolated storage without IndexedDB overhead
 */
export class InMemoryStorageProvider implements CatalogueStorageProvider {
	private storage: InMemoryStorage;

	constructor() {
		this.storage = createEmptyStorage();
	}

	/**
	 * Clear all storage for test isolation
	 * Call this in afterEach() to ensure clean state between tests
	 */
	clear(): void {
		clearStorage(this.storage);
	}

	// ========== List Operations ==========

	async createList(params: CreateListParams): Promise<string> {
		return listOps.createList(this.storage, params);
	}

	async getList(listId: string): Promise<CatalogueList | null> {
		return listOps.getList(this.storage, listId);
	}

	async getAllLists(): Promise<CatalogueList[]> {
		return listOps.getAllLists(this.storage);
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		listOps.updateList(this.storage, listId, updates);
	}

	async deleteList(listId: string): Promise<void> {
		listOps.deleteList(this.storage, listId);
	}

	// ========== Entity Operations ==========

	async addEntityToList(params: AddEntityParams): Promise<string> {
		return entityOps.addEntityToList(this.storage, params);
	}

	async getListEntities(listId: string): Promise<CatalogueEntity[]> {
		return entityOps.getListEntities(this.storage, listId);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		entityOps.removeEntityFromList(this.storage, listId, entityRecordId);
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		entityOps.updateEntityNotes(this.storage, entityRecordId, notes);
	}

	async updateEntityData(
		entityRecordId: string,
		data: { entityType: EntityType; entityId: string; notes?: string }
	): Promise<void> {
		entityOps.updateEntityData(this.storage, entityRecordId, data);
	}

	async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
		entityOps.reorderEntities(this.storage, listId, orderedEntityIds);
	}

	async addEntitiesToList(
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<BatchAddResult> {
		return entityOps.addEntitiesToList(this.storage, listId, entities);
	}

	// ========== Search & Stats ==========

	async searchLists(query: string): Promise<CatalogueList[]> {
		return listOps.searchLists(this.storage, query);
	}

	async getListStats(listId: string): Promise<ListStats> {
		return listOps.getListStats(this.storage, listId);
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		return specialListOps.generateShareToken(this.storage, listId);
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		return specialListOps.getListByShareToken(this.storage, shareToken);
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async initializeSpecialLists(): Promise<void> {
		specialListOps.initializeSpecialLists(this.storage);
	}

	isSpecialList(listId: string): boolean {
		return listOps.isSpecialList(listId);
	}

	async addBookmark(params: AddBookmarkParams): Promise<string> {
		return specialListOps.addBookmark(this.storage, params);
	}

	async removeBookmark(entityRecordId: string): Promise<void> {
		specialListOps.removeBookmark(this.storage, entityRecordId);
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		return specialListOps.getBookmarks(this.storage);
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		return specialListOps.isBookmarked(this.storage, entityType, entityId);
	}

	async addToHistory(params: AddToHistoryParams): Promise<string> {
		return specialListOps.addToHistory(this.storage, params);
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		return specialListOps.getHistory(this.storage);
	}

	async clearHistory(): Promise<void> {
		specialListOps.clearHistory(this.storage);
	}

	async getNonSystemLists(): Promise<CatalogueList[]> {
		return listOps.getNonSystemLists(this.storage);
	}

	// ========== Graph List Operations (Feature 038-graph-list) ==========

	async getGraphList(): Promise<GraphListNode[]> {
		return graphListOps.getGraphList(this.storage);
	}

	async addToGraphList(params: AddToGraphListParams): Promise<string> {
		return graphListOps.addToGraphList(this.storage, params);
	}

	async removeFromGraphList(entityId: string): Promise<void> {
		graphListOps.removeFromGraphList(this.storage, entityId);
	}

	async clearGraphList(): Promise<void> {
		graphListOps.clearGraphList(this.storage);
	}

	async getGraphListSize(): Promise<number> {
		return graphListOps.getGraphListSize(this.storage);
	}

	async pruneGraphList(): Promise<PruneGraphListResult> {
		return graphListOps.pruneGraphList(this.storage);
	}

	async isInGraphList(entityId: string): Promise<boolean> {
		return graphListOps.isInGraphList(this.storage, entityId);
	}

	async batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]> {
		return graphListOps.batchAddToGraphList(this.storage, nodes);
	}

	// ========== Annotation Operations ==========

	async addAnnotation(
		annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<string> {
		return annotationOps.addAnnotation(this.storage, annotation);
	}

	async getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]> {
		return annotationOps.getAnnotations(this.storage, graphId);
	}

	async updateAnnotation(
		annotationId: string,
		updates: {
			visible?: boolean;
			x?: number;
			y?: number;
			content?: string;
		}
	): Promise<void> {
		annotationOps.updateAnnotation(this.storage, annotationId, updates);
	}

	async deleteAnnotation(annotationId: string): Promise<void> {
		annotationOps.deleteAnnotation(this.storage, annotationId);
	}

	async toggleAnnotationVisibility(annotationId: string, visible: boolean): Promise<void> {
		annotationOps.toggleAnnotationVisibility(this.storage, annotationId, visible);
	}

	async deleteAnnotationsByGraph(graphId: string): Promise<void> {
		annotationOps.deleteAnnotationsByGraph(this.storage, graphId);
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
		return snapshotOps.saveSnapshot(this.storage, snapshot);
	}

	async getSnapshots(): Promise<GraphSnapshotStorage[]> {
		return snapshotOps.getSnapshots(this.storage);
	}

	async getSnapshot(snapshotId: string): Promise<GraphSnapshotStorage | null> {
		return snapshotOps.getSnapshot(this.storage, snapshotId);
	}

	async deleteSnapshot(snapshotId: string): Promise<void> {
		snapshotOps.deleteSnapshot(this.storage, snapshotId);
	}

	async updateSnapshot(
		snapshotId: string,
		updates: {
			name?: string;
			nodes?: string;
			edges?: string;
			zoom?: number;
			panX?: number;
			panY?: number;
			layoutType?: string;
			nodePositions?: string;
			annotations?: string;
		}
	): Promise<void> {
		snapshotOps.updateSnapshot(this.storage, snapshotId, updates);
	}

	async pruneAutoSaveSnapshots(maxCount: number): Promise<void> {
		snapshotOps.pruneAutoSaveSnapshots(this.storage, maxCount);
	}

	async addSnapshot(
		snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<string> {
		return snapshotOps.addSnapshot(this.storage, snapshot);
	}

	// ========== Search History Operations ==========

	async addSearchQuery(query: string, maxHistory: number = 50): Promise<void> {
		searchHistoryOps.addSearchQuery(this.storage, query, maxHistory);
	}

	async getSearchHistory(): Promise<Array<{ query: string; timestamp: Date }>> {
		return searchHistoryOps.getSearchHistory(this.storage);
	}

	async removeSearchQuery(queryId: string): Promise<void> {
		searchHistoryOps.removeSearchQuery(this.storage, queryId);
	}

	async clearSearchHistory(): Promise<void> {
		searchHistoryOps.clearSearchHistory(this.storage);
	}
}
