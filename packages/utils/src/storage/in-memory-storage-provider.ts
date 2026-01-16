/**
 * In-memory storage provider implementation for testing
 * Uses JavaScript Maps for fast, isolated test execution
 */

import type {
	AddToGraphListParams,
	EntityType,
	GraphListNode,
	PruneGraphListResult,
} from '@bibgraph/types';
import { GRAPH_LIST_CONFIG } from '@bibgraph/types';

import type { CatalogueEntity, CatalogueList, CatalogueShareRecord } from './catalogue-db/index.js';
import { SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import type {
	AddBookmarkParams,
	AddEntityParams,
	AddToHistoryParams,
	BatchAddResult,
	CatalogueStorageProvider,
	CreateListParams,
	GraphAnnotationStorage,
	GraphSnapshotStorage,
	ListStats,
	ShareAccessResult,
} from './catalogue-storage-provider.js';


/**
 * In-memory storage provider for E2E and unit testing
 * Provides fast, isolated storage without IndexedDB overhead
 */
export class InMemoryStorageProvider implements CatalogueStorageProvider {
	private lists: Map<string, CatalogueList>;
	private entities: Map<string, CatalogueEntity>;
	private shares: Map<string, CatalogueShareRecord>;
	private annotations: Map<string, GraphAnnotationStorage>;
	private snapshots: Map<string, GraphSnapshotStorage>;
	private searchHistory: Map<string, { query: string; timestamp: Date }>;

	constructor() {
		this.lists = new Map();
		this.entities = new Map();
		this.shares = new Map();
		this.annotations = new Map();
		this.snapshots = new Map();
		this.searchHistory = new Map();
	}

	/**
	 * Clear all storage for test isolation
	 * Call this in afterEach() to ensure clean state between tests
	 */
	clear(): void {
		this.lists.clear();
		this.entities.clear();
		this.shares.clear();
		this.annotations.clear();
		this.snapshots.clear();
		this.searchHistory.clear();
	}

	// ========== List Operations ==========

	async createList(params: CreateListParams): Promise<string> {
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

		this.lists.set(id, list);
		return id;
	}

	async getList(listId: string): Promise<CatalogueList | null> {
		return this.lists.get(listId) ?? null;
	}

	async getAllLists(): Promise<CatalogueList[]> {
		const allLists = [...this.lists.values()];
		// Sort by updatedAt descending (most recent first)
		return allLists.sort((a, b) => b.updatedAt.getTime() - a.updatedAt.getTime());
	}

	async updateList(
		listId: string,
		updates: Partial<Pick<CatalogueList, 'title' | 'description' | 'tags' | 'isPublic'>>
	): Promise<void> {
		const list = this.lists.get(listId);
		if (!list) {
			throw new Error('List not found');
		}

		const updatedList: CatalogueList = {
			...list,
			...updates,
			updatedAt: new Date(),
		};

		this.lists.set(listId, updatedList);
	}

	async deleteList(listId: string): Promise<void> {
		if (this.isSpecialList(listId)) {
			throw new Error(`Cannot delete special system list: ${listId}`);
		}

		if (!this.lists.has(listId)) {
			throw new Error('List not found');
		}

		// Delete list
		this.lists.delete(listId);

		// Delete all entities in the list
		for (const [entityId, entity] of this.entities.entries()) {
			if (entity.listId === listId) {
				this.entities.delete(entityId);
			}
		}

		// Delete all share records for the list
		for (const [shareId, share] of this.shares.entries()) {
			if (share.listId === listId) {
				this.shares.delete(shareId);
			}
		}
	}

	// ========== Entity Operations ==========

	async addEntityToList(params: AddEntityParams): Promise<string> {
		// Validate that the entity type matches the list type
		const list = await this.getList(params.listId);
		if (!list) {
			throw new Error('List not found');
		}

		if (list.type === 'bibliography' && params.entityType !== 'works') {
			throw new Error('Bibliographies can only contain works');
		}

		// Check if entity already exists in list
		for (const entity of this.entities.values()) {
			if (
				entity.listId === params.listId &&
				entity.entityType === params.entityType &&
				entity.entityId === params.entityId
			) {
				throw new Error('Entity already exists in list');
			}
		}

		// Get next position
		let maxPosition = 0;
		for (const entity of this.entities.values()) {
			if (entity.listId === params.listId) {
				maxPosition = Math.max(maxPosition, entity.position);
			}
		}
		const position = params.position ?? maxPosition + 1;

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

		this.entities.set(id, entity);

		// Update list's updated timestamp
		await this.updateList(params.listId, {});

		return id;
	}

	async getListEntities(listId: string): Promise<CatalogueEntity[]> {
		const listEntities: CatalogueEntity[] = [];
		for (const entity of this.entities.values()) {
			if (entity.listId === listId) {
				listEntities.push(entity);
			}
		}
		// Sort by position
		return listEntities.sort((a, b) => a.position - b.position);
	}

	async removeEntityFromList(listId: string, entityRecordId: string): Promise<void> {
		const entity = this.entities.get(entityRecordId);
		if (!entity) {
			throw new Error('Entity not found');
		}

		this.entities.delete(entityRecordId);

		// Update list's updated timestamp
		await this.updateList(listId, {});
	}

	async updateEntityNotes(entityRecordId: string, notes: string): Promise<void> {
		const entity = this.entities.get(entityRecordId);
		if (!entity) {
			throw new Error('Entity not found');
		}

		const updatedEntity: CatalogueEntity = {
			...entity,
			notes,
		};

		this.entities.set(entityRecordId, updatedEntity);

		// Update list's updated timestamp
		await this.updateList(entity.listId, {});
	}

	async reorderEntities(listId: string, orderedEntityIds: string[]): Promise<void> {
		// Validate that the list exists
		const list = await this.getList(listId);
		if (!list) {
			throw new Error('List not found');
		}

		// Get all entities for the list to validate IDs
		const listEntities = await this.getListEntities(listId);
		const entityIdSet = new Set(listEntities.map(e => e.id));

		// Validate that all provided IDs exist in the list
		for (const entityId of orderedEntityIds) {
			if (!entityIdSet.has(entityId)) {
				throw new Error(`Entity ${entityId} not found in list ${listId}`);
			}
		}

		// Update positions
		for (const [i, orderedEntityId] of orderedEntityIds.entries()) {
			const entity = this.entities.get(orderedEntityId);
			if (entity) {
				this.entities.set(orderedEntityId, {
					...entity,
					position: i + 1
				});
			}
		}

		// Update list's updated timestamp
		await this.updateList(listId, {});
	}

	async addEntitiesToList(
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<BatchAddResult> {
		let success = 0;
		let failed = 0;

		// Validate list type
		const list = await this.getList(listId);
		if (!list) {
			throw new Error('List not found');
		}

		// Get next position
		let maxPosition = 0;
		for (const entity of this.entities.values()) {
			if (entity.listId === listId) {
				maxPosition = Math.max(maxPosition, entity.position);
			}
		}
		let nextPosition = maxPosition + 1;

		for (const entityData of entities) {
			try {
				// Validate entity type for bibliographies
				if (list.type === 'bibliography' && entityData.entityType !== 'works') {
					failed++;
					continue;
				}

				// Check for duplicates
				let exists = false;
				for (const existingEntity of this.entities.values()) {
					if (
						existingEntity.listId === listId &&
						existingEntity.entityType === entityData.entityType &&
						existingEntity.entityId === entityData.entityId
					) {
						exists = true;
						break;
					}
				}

				if (exists) {
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

				this.entities.set(id, entity);
				success++;
			} catch {
				failed++;
			}
		}

		// Update list's updated timestamp
		await this.updateList(listId, {});

		return { success, failed };
	}

	// ========== Search & Stats ==========

	async searchLists(query: string): Promise<CatalogueList[]> {
		const lowercaseQuery = query.toLowerCase();
		const results: CatalogueList[] = [];

		for (const list of this.lists.values()) {
			if (
				list.title.toLowerCase().includes(lowercaseQuery) ||
				(list.description && list.description.toLowerCase().includes(lowercaseQuery)) ||
				(list.tags && list.tags.some((tag) => tag.toLowerCase().includes(lowercaseQuery)))
			) {
				results.push(list);
			}
		}

		return results;
	}

	async getListStats(listId: string): Promise<ListStats> {
		const entities = await this.getListEntities(listId);

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

		for (const entity of entities) {
			entityCounts[entity.entityType]++;
		}

		return {
			totalEntities: entities.length,
			entityCounts,
		};
	}

	// ========== Sharing ==========

	async generateShareToken(listId: string): Promise<string> {
		const list = this.lists.get(listId);
		if (!list) {
			throw new Error('List not found');
		}

		const shareToken = crypto.randomUUID();
		const expiresAt = new Date();
		expiresAt.setFullYear(expiresAt.getFullYear() + 1); // Expires in 1 year

		const shareRecord: CatalogueShareRecord = {
			id: crypto.randomUUID(),
			listId,
			shareToken,
			createdAt: new Date(),
			expiresAt,
			accessCount: 0,
		};

		if (shareRecord.id) {
			this.shares.set(shareRecord.id, shareRecord);
		}

		// Update list with share token
		const updatedList: CatalogueList = {
			...list,
			shareToken,
			isPublic: true,
		};
		this.lists.set(listId, updatedList);

		return shareToken;
	}

	async getListByShareToken(shareToken: string): Promise<ShareAccessResult> {
		// Find share record
		let shareRecord: CatalogueShareRecord | null = null;
		for (const share of this.shares.values()) {
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
			this.shares.set(shareRecord.id, updatedShareRecord);
		}

		const list = await this.getList(shareRecord.listId);
		return { list, valid: true };
	}

	// ========== Special Lists (Bookmarks & History) ==========

	async initializeSpecialLists(): Promise<void> {
		const bookmarksList = await this.getList(SPECIAL_LIST_IDS.BOOKMARKS);
		const historyList = await this.getList(SPECIAL_LIST_IDS.HISTORY);
		const graphList = await this.getList(SPECIAL_LIST_IDS.GRAPH);

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
			this.lists.set(SPECIAL_LIST_IDS.BOOKMARKS, list);
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
			this.lists.set(SPECIAL_LIST_IDS.HISTORY, list);
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
			this.lists.set(SPECIAL_LIST_IDS.GRAPH, list);
		}
	}

	isSpecialList(listId: string): boolean {
		const specialIds: string[] = Object.values(SPECIAL_LIST_IDS);
		return specialIds.includes(listId);
	}

	async addBookmark(params: AddBookmarkParams): Promise<string> {
		await this.initializeSpecialLists();

		// Add to bookmarks list with entity data in proper fields, user notes only in notes field
		return await this.addEntityToList({
			listId: SPECIAL_LIST_IDS.BOOKMARKS,
			entityType: params.entityType,
			entityId: params.entityId,
			notes: params.notes,
		});
	}

	async removeBookmark(entityRecordId: string): Promise<void> {
		await this.removeEntityFromList(SPECIAL_LIST_IDS.BOOKMARKS, entityRecordId);
	}

	async getBookmarks(): Promise<CatalogueEntity[]> {
		await this.initializeSpecialLists();
		return await this.getListEntities(SPECIAL_LIST_IDS.BOOKMARKS);
	}

	async isBookmarked(entityType: EntityType, entityId: string): Promise<boolean> {
		for (const entity of this.entities.values()) {
			if (
				entity.listId === SPECIAL_LIST_IDS.BOOKMARKS &&
				entity.entityType === entityType &&
				entity.entityId === entityId
			) {
				return true;
			}
		}
		return false;
	}

	async addToHistory(params: AddToHistoryParams): Promise<string> {
		await this.initializeSpecialLists();

		// Check if this entity/page already exists in history
		let existingEntity: CatalogueEntity | null = null;
		for (const entity of this.entities.values()) {
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
				addedAt: params.timestamp || new Date(),
				notes: `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`,
			};
			if (existingEntity.id) {
				this.entities.set(existingEntity.id, updatedEntity);

				// Update list's updated timestamp
				await this.updateList(SPECIAL_LIST_IDS.HISTORY, {});

				return existingEntity.id;
			}
		}

		// Add new history entry
		const notes = `URL: ${params.url}${params.title ? `\nTitle: ${params.title}` : ''}`;

		return await this.addEntityToList({
			listId: SPECIAL_LIST_IDS.HISTORY,
			entityType: params.entityType,
			entityId: params.entityId,
			notes,
		});
	}

	async getHistory(): Promise<CatalogueEntity[]> {
		await this.initializeSpecialLists();
		return await this.getListEntities(SPECIAL_LIST_IDS.HISTORY);
	}

	async clearHistory(): Promise<void> {
		// Delete all entities in history list
		const entitiesToDelete: string[] = [];
		for (const [entityId, entity] of this.entities.entries()) {
			if (entity.listId === SPECIAL_LIST_IDS.HISTORY) {
				entitiesToDelete.push(entityId);
			}
		}

		for (const entityId of entitiesToDelete) {
			this.entities.delete(entityId);
		}

		// Update list's updated timestamp
		await this.updateList(SPECIAL_LIST_IDS.HISTORY, {});
	}

	async getNonSystemLists(): Promise<CatalogueList[]> {
		const allLists = await this.getAllLists();
		return allLists.filter(
			(list) => list.id && !this.isSpecialList(list.id) && !list.tags?.includes('system')
		);
	}

	// ========== Graph List Operations (Feature 038-graph-list) ==========

	/**
	 * Parse provenance from notes field
	 * Format: "provenance:TYPE|label:LABEL"
	 * @param notes
	 */
	private parseProvenance(notes: string | undefined): GraphListNode['provenance'] {
		if (!notes) return 'user';
		const match = notes.match(/^provenance:([^|]+)/);
		if (match) {
			const prov = match[1];
			if (
				prov === 'user' ||
				prov === 'collection-load' ||
				prov === 'expansion' ||
				prov === 'auto-population'
			) {
				return prov;
			}
		}
		return 'user';
	}

	/**
	 * Serialize provenance and label into notes field
	 * Format: "provenance:TYPE|label:LABEL"
	 * @param provenance
	 * @param label
	 */
	private serializeProvenanceWithLabel(provenance: string, label: string): string {
		return `provenance:${provenance}|label:${label}`;
	}

	async getGraphList(): Promise<GraphListNode[]> {
		await this.initializeSpecialLists();
		const entities = await this.getListEntities(SPECIAL_LIST_IDS.GRAPH);

		return entities
			.filter((entity) => entity.id !== undefined)
			.map((entity) => {
				const provenance = this.parseProvenance(entity.notes);

				// Extract label from notes (format: "provenance:TYPE|label:LABEL")
				let label = '';
				if (entity.notes) {
					const labelMatch = entity.notes.match(/\|label:(.+)$/);
					if (labelMatch) {
						label = labelMatch[1];
					}
				}

				return {
					id: entity.id as string, // Filtered above
					entityId: entity.entityId,
					entityType: entity.entityType,
					label,
					addedAt: entity.addedAt,
					provenance,
				};
			});
	}

	async addToGraphList(params: AddToGraphListParams): Promise<string> {
		await this.initializeSpecialLists();

		// Check size limit
		const currentSize = await this.getGraphListSize();
		if (currentSize >= GRAPH_LIST_CONFIG.MAX_SIZE) {
			throw new Error(
				`Graph list size limit reached (${GRAPH_LIST_CONFIG.MAX_SIZE} nodes)`
			);
		}

		// Check if entity already exists in graph list
		for (const entity of this.entities.values()) {
			if (
				entity.listId === SPECIAL_LIST_IDS.GRAPH &&
				entity.entityType === params.entityType &&
				entity.entityId === params.entityId
			) {
				// Update provenance and timestamp if exists
				if (!entity.id) {
					continue; // Skip entities without id (should never happen)
				}
				const updatedEntity: CatalogueEntity = {
					...entity,
					addedAt: new Date(),
					notes: this.serializeProvenanceWithLabel(params.provenance, params.label),
				};
				this.entities.set(entity.id, updatedEntity);
				return entity.id;
			}
		}

		// Add new node
		const notes = this.serializeProvenanceWithLabel(params.provenance, params.label);
		return await this.addEntityToList({
			listId: SPECIAL_LIST_IDS.GRAPH,
			entityType: params.entityType,
			entityId: params.entityId,
			notes,
		});
	}

	async removeFromGraphList(entityId: string): Promise<void> {
		await this.initializeSpecialLists();

		// Find entity by entityId (not record id)
		let entityRecordId: string | null = null;
		for (const [id, entity] of this.entities.entries()) {
			if (entity.listId === SPECIAL_LIST_IDS.GRAPH && entity.entityId === entityId) {
				entityRecordId = id;
				break;
			}
		}

		if (!entityRecordId) {
			throw new Error(`Entity ${entityId} not found in graph list`);
		}

		await this.removeEntityFromList(SPECIAL_LIST_IDS.GRAPH, entityRecordId);
	}

	async clearGraphList(): Promise<void> {
		await this.initializeSpecialLists();

		// Delete all entities in graph list
		const entitiesToDelete: string[] = [];
		for (const [entityId, entity] of this.entities.entries()) {
			if (entity.listId === SPECIAL_LIST_IDS.GRAPH) {
				entitiesToDelete.push(entityId);
			}
		}

		for (const entityId of entitiesToDelete) {
			this.entities.delete(entityId);
		}

		// Update list's updated timestamp
		await this.updateList(SPECIAL_LIST_IDS.GRAPH, {});
	}

	async getGraphListSize(): Promise<number> {
		await this.initializeSpecialLists();
		const entities = await this.getListEntities(SPECIAL_LIST_IDS.GRAPH);
		return entities.length;
	}

	async pruneGraphList(): Promise<PruneGraphListResult> {
		await this.initializeSpecialLists();
		const entities = await this.getListEntities(SPECIAL_LIST_IDS.GRAPH);

		const now = new Date();
		const pruneThreshold = new Date(now.getTime() - GRAPH_LIST_CONFIG.PRUNE_AGE_MS);

		const entitiesToRemove: CatalogueEntity[] = [];
		for (const entity of entities) {
			const provenance = this.parseProvenance(entity.notes);
			if (provenance === 'auto-population' && entity.addedAt < pruneThreshold) {
				entitiesToRemove.push(entity);
			}
		}

		// Remove entities
		for (const entity of entitiesToRemove) {
			if (entity.id) {
				this.entities.delete(entity.id);
			}
		}

		// Update list's updated timestamp
		if (entitiesToRemove.length > 0) {
			await this.updateList(SPECIAL_LIST_IDS.GRAPH, {});
		}

		return {
			removedCount: entitiesToRemove.length,
			removedNodeIds: entitiesToRemove.map((e) => e.entityId),
		};
	}

	async isInGraphList(entityId: string): Promise<boolean> {
		for (const entity of this.entities.values()) {
			if (entity.listId === SPECIAL_LIST_IDS.GRAPH && entity.entityId === entityId) {
				return true;
			}
		}
		return false;
	}

	async batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]> {
		await this.initializeSpecialLists();

		const addedIds: string[] = [];
		const currentSize = await this.getGraphListSize();
		let newNodesCount = 0;

		for (const node of nodes) {
			// Stop if we reach size limit
			if (currentSize + newNodesCount >= GRAPH_LIST_CONFIG.MAX_SIZE) {
				break;
			}

			// Check if node already exists
			let exists = false;
			for (const entity of this.entities.values()) {
				if (
					entity.listId === SPECIAL_LIST_IDS.GRAPH &&
					entity.entityType === node.entityType &&
					entity.entityId === node.entityId
				) {
					exists = true;
					// Update provenance and timestamp
					if (entity.id) {
						const updatedEntity: CatalogueEntity = {
							...entity,
							addedAt: new Date(),
							notes: this.serializeProvenanceWithLabel(node.provenance, node.label),
						};
						this.entities.set(entity.id, updatedEntity);
						addedIds.push(entity.id);
					}
					break;
				}
			}

			if (!exists) {
				// Add new node
				const notes = this.serializeProvenanceWithLabel(node.provenance, node.label);
				const id = await this.addEntityToList({
					listId: SPECIAL_LIST_IDS.GRAPH,
					entityType: node.entityType,
					entityId: node.entityId,
					notes,
				});
				addedIds.push(id);
				newNodesCount++;
			}
		}

		return addedIds;
	}

	// ========== Annotation Operations ==========

	async addAnnotation(annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		const id = crypto.randomUUID();
		const timestamp = new Date();
		const storedAnnotation: GraphAnnotationStorage = {
			id,
			type: annotation.type,
			visible: annotation.visible ?? true,
			x: annotation.x,
			y: annotation.y,
			content: annotation.content,
			width: annotation.width,
			height: annotation.height,
			radius: annotation.radius,
			borderColor: annotation.borderColor,
			fillColor: annotation.fillColor,
			borderWidth: annotation.borderWidth,
			points: annotation.points,
			strokeColor: annotation.strokeColor,
			strokeWidth: annotation.strokeWidth,
			closed: annotation.closed,
			fontSize: annotation.fontSize,
			backgroundColor: annotation.backgroundColor,
			nodeId: annotation.nodeId,
			graphId: annotation.graphId,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		this.annotations.set(id, storedAnnotation);
		return id;
	}

	async getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]> {
		const allAnnotations = Array.from(this.annotations.values());
		if (!graphId) {
			return allAnnotations;
		}
		return allAnnotations.filter(ann => ann.graphId === graphId);
	}

	async updateAnnotation(annotationId: string, updates: {
		visible?: boolean;
		x?: number;
		y?: number;
		content?: string;
	}): Promise<void> {
		const annotation = this.annotations.get(annotationId);
		if (!annotation) {
			throw new Error('Annotation not found');
		}
		const updatedAnnotation: GraphAnnotationStorage = {
			...annotation,
			...updates,
			updatedAt: new Date(),
		};
		this.annotations.set(annotationId, updatedAnnotation);
	}

	async deleteAnnotation(annotationId: string): Promise<void> {
		this.annotations.delete(annotationId);
	}

	async toggleAnnotationVisibility(annotationId: string, visible: boolean): Promise<void> {
		const annotation = this.annotations.get(annotationId);
		if (!annotation) {
			throw new Error('Annotation not found');
		}
		const updatedAnnotation: GraphAnnotationStorage = {
			...annotation,
			visible,
			updatedAt: new Date(),
		};
		this.annotations.set(annotationId, updatedAnnotation);
	}

	async deleteAnnotationsByGraph(graphId: string): Promise<void> {
		for (const [id, annotation] of this.annotations.entries()) {
			if (annotation.graphId === graphId) {
				this.annotations.delete(id);
			}
		}
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
		const id = crypto.randomUUID();
		const timestamp = new Date();
		const storedSnapshot: GraphSnapshotStorage = {
			id,
			name: snapshot.name,
			nodes: snapshot.nodes,
			edges: snapshot.edges,
			zoom: snapshot.zoom,
			panX: snapshot.panX,
			panY: snapshot.panY,
			layoutType: snapshot.layoutType,
			nodePositions: snapshot.nodePositions,
			annotations: snapshot.annotations,
			isAutoSave: snapshot.isAutoSave ?? false,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		this.snapshots.set(id, storedSnapshot);
		return id;
	}

	async getSnapshots(): Promise<GraphSnapshotStorage[]> {
		return Array.from(this.snapshots.values());
	}

	async getSnapshot(snapshotId: string): Promise<GraphSnapshotStorage | null> {
		return this.snapshots.get(snapshotId) ?? null;
	}

	async deleteSnapshot(snapshotId: string): Promise<void> {
		this.snapshots.delete(snapshotId);
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
		const snapshot = this.snapshots.get(snapshotId);
		if (!snapshot) {
			throw new Error('Snapshot not found');
		}
		const updatedSnapshot: GraphSnapshotStorage = {
			...snapshot,
			...updates,
			updatedAt: new Date(),
		};
		this.snapshots.set(snapshotId, updatedSnapshot);
	}

	async pruneAutoSaveSnapshots(maxCount: number): Promise<void> {
		const autoSnapshots = Array.from(this.snapshots.values())
			.filter(snap => snap.isAutoSave)
			.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

		if (autoSnapshots.length > maxCount) {
			const toDelete = autoSnapshots.slice(0, autoSnapshots.length - maxCount);
			for (const snap of toDelete) {
				if (snap.id) {
					this.snapshots.delete(snap.id);
				}
			}
		}
	}

	async addSnapshot(snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string> {
		const id = crypto.randomUUID();
		const timestamp = new Date();
		const storedSnapshot: GraphSnapshotStorage = {
			id,
			name: snapshot.name,
			nodes: snapshot.nodes,
			edges: snapshot.edges,
			zoom: snapshot.zoom,
			panX: snapshot.panX,
			panY: snapshot.panY,
			layoutType: snapshot.layoutType,
			nodePositions: snapshot.nodePositions,
			annotations: snapshot.annotations,
			isAutoSave: snapshot.isAutoSave ?? false,
			createdAt: timestamp,
			updatedAt: timestamp,
		};
		this.snapshots.set(id, storedSnapshot);
		return id;
	}

	// ========== Search History Operations ==========

	async addSearchQuery(query: string, maxHistory: number = 50): Promise<void> {
		const timestamp = new Date();
		const id = crypto.randomUUID();
		this.searchHistory.set(id, { query, timestamp });

		// Prune old entries if exceeds max
		const entries = Array.from(this.searchHistory.entries())
			.sort(([, a], [, b]) => b.timestamp.getTime() - a.timestamp.getTime());

		if (entries.length > maxHistory) {
			for (const [idToDelete] of entries.slice(maxHistory)) {
				this.searchHistory.delete(idToDelete);
			}
		}
	}

	async getSearchHistory(): Promise<Array<{ query: string; timestamp: Date }>> {
		return Array.from(this.searchHistory.values())
			.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime());
	}

	async removeSearchQuery(queryId: string): Promise<void> {
		this.searchHistory.delete(queryId);
	}

	async clearSearchHistory(): Promise<void> {
		this.searchHistory.clear();
	}
}
