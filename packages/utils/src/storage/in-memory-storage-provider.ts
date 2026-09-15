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
	AddBookmarkParams as AddBookmarkParameters,
	AddEntityParams as AddEntityParameters,
	AddToHistoryParams as AddToHistoryParameters,
	BatchAddResult,
	CreateListParams as CreateListParameters,
	ListStats,
	ShareAccessResult,
} from './storage-provider-types.js';

/**
 * In-memory storage provider for E2E and unit testing
 * Provides fast, isolated storage without IndexedDB overhead
 */
export class InMemoryStorageProvider implements CatalogueStorageProvider {
	private readonly storage: InMemoryStorage;

	constructor() {
		this.storage = createEmptyStorage();
	}

	/**
	 * Clear all storage for test isolation Call this in afterEach() to ensure clean state between tests
	 */
	clear(): void {
		clearStorage(this.storage);
	}

	// ========== List Operations ==========

	async createList(parameters: CreateListParameters): Promise<string> {
		await Promise.resolve();
		return listOps.createList(this.storage, parameters);
	}

	async getList(listId: string): Promise<CatalogueList | null> {
		await Promise.resolve();
		return listOps.getList(this.storage, listId);
	}

	async getAllLists(): Promise<CatalogueList[]> {
		await Promise.resolve();
		return listOps.getAllLists(this.storage);
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		listOps.updateList(this.storage, listId, updates);
		await Promise.resolve();
	}

	async deleteList(listId: string): Promise<void> {
		listOps.deleteList(this.storage, listId);
		await Promise.resolve();
	}

	// ========== Entity Operations ==========

	async addEntityToList(parameters: Readonly<AddEntityParameters>): Promise<string> {
		await Promise.resolve();
		return entityOps.addEntityToList(this.storage, parameters);
	}

	async getListEntities(listId: string): Promise<CatalogueEntity[]> {
		await Promise.resolve();
		return entityOps.getListEntities(this.storage, listId);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		entityOps.removeEntityFromList(this.storage, listId, entityRecordId);
		await Promise.resolve();
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		entityOps.updateEntityNotes(this.storage, entityRecordId, notes);
		await Promise.resolve();
	}

	async updateEntityData(
		entityRecordId: string,
		data: Readonly<{ entityType: EntityType; entityId: string; notes?: string }>
	): Promise<void> {
		entityOps.updateEntityData(this.storage, entityRecordId, data);
		await Promise.resolve();
	}

	async reorderEntities(listId: string, orderedEntityIds: readonly string[]): Promise<void> {
		entityOps.reorderEntities(this.storage, listId, orderedEntityIds);
		await Promise.resolve();
	}

	async addEntitiesToList(
		listId: string,
		entities: readonly {
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}[]
	): Promise<BatchAddResult> {
		await Promise.resolve();
		return entityOps.addEntitiesToList(this.storage, listId, entities);
	}

	// ========== Search & Stats ==========

	async searchLists(query: string): Promise<CatalogueList[]> {
		await Promise.resolve();
		return listOps.searchLists(this.storage, query);
	}

	async getListStats(listId: string): Promise<ListStats> {
		await Promise.resolve();
		return listOps.getListStats(this.storage, listId);
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		await Promise.resolve();
		return specialListOps.generateShareToken(this.storage, listId);
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		await Promise.resolve();
		return specialListOps.getListByShareToken(this.storage, shareToken);
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async initializeSpecialLists(): Promise<void> {
		specialListOps.initializeSpecialLists(this.storage);
		await Promise.resolve();
	}

	isSpecialList(listId: string): boolean {
		return listOps.isSpecialList(listId);
	}

	async addBookmark(parameters: Readonly<AddBookmarkParameters>): Promise<string> {
		await Promise.resolve();
		return specialListOps.addBookmark(this.storage, parameters);
	}

	async removeBookmark(entityRecordId: string): Promise<void> {
		specialListOps.removeBookmark(this.storage, entityRecordId);
		await Promise.resolve();
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		await Promise.resolve();
		return specialListOps.getBookmarks(this.storage);
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		await Promise.resolve();
		return specialListOps.isBookmarked(this.storage, entityType, entityId);
	}

	async addToHistory(parameters: AddToHistoryParameters): Promise<string> {
		await Promise.resolve();
		return specialListOps.addToHistory(this.storage, parameters);
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		await Promise.resolve();
		return specialListOps.getHistory(this.storage);
	}

	async clearHistory(): Promise<void> {
		specialListOps.clearHistory(this.storage);
		await Promise.resolve();
	}

	async getNonSystemLists(): Promise<CatalogueList[]> {
		await Promise.resolve();
		return listOps.getNonSystemLists(this.storage);
	}

	// ========== Graph List Operations (Feature 038-graph-list) ==========

	async getGraphList(): Promise<GraphListNode[]> {
		await Promise.resolve();
		return graphListOps.getGraphList(this.storage);
	}

	async addToGraphList(parameters: Readonly<AddToGraphListParams>): Promise<string> {
		await Promise.resolve();
		return graphListOps.addToGraphList(this.storage, parameters);
	}

	async removeFromGraphList(entityId: string): Promise<void> {
		graphListOps.removeFromGraphList(this.storage, entityId);
		await Promise.resolve();
	}

	async clearGraphList(): Promise<void> {
		graphListOps.clearGraphList(this.storage);
		await Promise.resolve();
	}

	async getGraphListSize(): Promise<number> {
		await Promise.resolve();
		return graphListOps.getGraphListSize(this.storage);
	}

	async pruneGraphList(): Promise<PruneGraphListResult> {
		await Promise.resolve();
		return graphListOps.pruneGraphList(this.storage);
	}

	async isInGraphList(entityId: string): Promise<boolean> {
		await Promise.resolve();
		return graphListOps.isInGraphList(this.storage, entityId);
	}

	async batchAddToGraphList(nodes: readonly AddToGraphListParams[]): Promise<string[]> {
		await Promise.resolve();
		return graphListOps.batchAddToGraphList(this.storage, nodes);
	}

	// ========== Annotation Operations ==========

	async addAnnotation(
		annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>
	): Promise<string> {
		await Promise.resolve();
		return annotationOps.addAnnotation(this.storage, annotation);
	}

	async getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]> {
		await Promise.resolve();
		return annotationOps.getAnnotations(this.storage, graphId);
	}

	async updateAnnotation(
		annotationId: string,
		updates: Readonly<{
			visible?: boolean;
			x?: number;
			y?: number;
			content?: string;
		}>
	): Promise<void> {
		annotationOps.updateAnnotation(this.storage, annotationId, updates);
		await Promise.resolve();
	}

	async deleteAnnotation(annotationId: string): Promise<void> {
		annotationOps.deleteAnnotation(this.storage, annotationId);
		await Promise.resolve();
	}

	async toggleAnnotationVisibility(annotationId: string, visible: boolean): Promise<void> {
		annotationOps.toggleAnnotationVisibility(this.storage, annotationId, visible);
		await Promise.resolve();
	}

	async deleteAnnotationsByGraph(graphId: string): Promise<void> {
		annotationOps.deleteAnnotationsByGraph(this.storage, graphId);
		await Promise.resolve();
	}

	// ========== Snapshot Operations ==========

	async saveSnapshot(snapshot: Readonly<{
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
	}>): Promise<string> {
		await Promise.resolve();
		return snapshotOps.saveSnapshot(this.storage, snapshot);
	}

	async getSnapshots(): Promise<GraphSnapshotStorage[]> {
		await Promise.resolve();
		return snapshotOps.getSnapshots(this.storage);
	}

	async getSnapshot(snapshotId: string): Promise<GraphSnapshotStorage | null> {
		await Promise.resolve();
		return snapshotOps.getSnapshot(this.storage, snapshotId);
	}

	async deleteSnapshot(snapshotId: string): Promise<void> {
		snapshotOps.deleteSnapshot(this.storage, snapshotId);
		await Promise.resolve();
	}

	async updateSnapshot(
		snapshotId: string,
		updates: Readonly<{
			name?: string;
			nodes?: string;
			edges?: string;
			zoom?: number;
			panX?: number;
			panY?: number;
			layoutType?: string;
			nodePositions?: string;
			annotations?: string;
		}>
	): Promise<void> {
		snapshotOps.updateSnapshot(this.storage, snapshotId, updates);
		await Promise.resolve();
	}

	async pruneAutoSaveSnapshots(maxCount: number): Promise<void> {
		snapshotOps.pruneAutoSaveSnapshots(this.storage, maxCount);
		await Promise.resolve();
	}

	async addSnapshot(
		snapshot: Readonly<Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>>
	): Promise<string> {
		await Promise.resolve();
		return snapshotOps.addSnapshot(this.storage, snapshot);
	}

	// ========== Search History Operations ==========

	async addSearchQuery(query: string, maxHistory = 50): Promise<void> {
		searchHistoryOps.addSearchQuery(this.storage, query, maxHistory);
		await Promise.resolve();
	}

	async getSearchHistory(): Promise<{ query: string; timestamp: Date }[]> {
		await Promise.resolve();
		return searchHistoryOps.getSearchHistory(this.storage);
	}

	async removeSearchQuery(queryId: string): Promise<void> {
		searchHistoryOps.removeSearchQuery(this.storage, queryId);
		await Promise.resolve();
	}

	async clearSearchHistory(): Promise<void> {
		searchHistoryOps.clearSearchHistory(this.storage);
		await Promise.resolve();
	}
}
