/**
 * In-memory graph list operations
 * Graph working set operations (Feature 038-graph-list)
 */

import type { AddToGraphListParams, GraphListNode, PruneGraphListResult } from '@bibgraph/types';
import { GRAPH_LIST_CONFIG } from '@bibgraph/types';

import type { CatalogueEntity } from './catalogue-db/index.js';
import { SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import { addEntityToList, getListEntities, removeEntityFromList } from './in-memory-entity-operations.js';
import { updateList } from './in-memory-list-operations.js';
import { initializeSpecialLists } from './in-memory-special-list-operations.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';

// ========== Provenance Helpers ==========

/**
 * Parse provenance from notes field
 * Format: "provenance:TYPE|label:LABEL"
 */
const parseProvenance = (notes: string | undefined): GraphListNode['provenance'] => {
	if (notes === undefined || notes === '') return 'user';
	const match = /^provenance:([^|]+)/.exec(notes);
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
};

/**
 * Serialize provenance and label into notes field
 * Format: "provenance:TYPE|label:LABEL"
 */
const serializeProvenanceWithLabel = (provenance: string, label: string): string => `provenance:${provenance}|label:${label}`;

/**
 * Extract label from notes field
 */
const extractLabel = (notes: string | undefined): string => {
	if (notes === undefined || notes === '') return '';
	const labelMatch = /\|label:(.+)$/.exec(notes);
	if (labelMatch) {
		return labelMatch[1];
	}
	return '';
};

// ========== Graph List Operations ==========

/**
 * Get all nodes in the graph list
 */
export const getGraphList = (storage: InMemoryStorage): GraphListNode[] => {
	initializeSpecialLists(storage);
	const entities = getListEntities(storage, SPECIAL_LIST_IDS.GRAPH);

	return entities
		.filter((entity): entity is CatalogueEntity & { id: string } => entity.id !== undefined)
		.map((entity) => ({
			id: entity.id,
			entityId: entity.entityId,
			entityType: entity.entityType,
			label: extractLabel(entity.notes),
			addedAt: entity.addedAt,
			provenance: parseProvenance(entity.notes),
		}));
};

/**
 * Get the current size of the graph list
 */
export const getGraphListSize = (storage: InMemoryStorage): number => {
	initializeSpecialLists(storage);
	const entities = getListEntities(storage, SPECIAL_LIST_IDS.GRAPH);
	return entities.length;
};

/**
 * Add a node to the graph list
 */
export const addToGraphList = (storage: InMemoryStorage, params: Readonly<AddToGraphListParams>): string => {
	initializeSpecialLists(storage);

	// Check size limit
	const currentSize = getGraphListSize(storage);
	if (currentSize >= GRAPH_LIST_CONFIG.MAX_SIZE) {
		throw new Error(`Graph list size limit reached (${String(GRAPH_LIST_CONFIG.MAX_SIZE)} nodes)`);
	}

	// Check if entity already exists in graph list
	for (const entity of storage.entities.values()) {
		if (
			entity.listId === SPECIAL_LIST_IDS.GRAPH &&
			entity.entityType === params.entityType &&
			entity.entityId === params.entityId
		) {
			// Update provenance and timestamp if exists
			if (entity.id === undefined) {
				continue;
			}
			const updatedEntity: CatalogueEntity = {
				...entity,
				addedAt: new Date(),
				notes: serializeProvenanceWithLabel(params.provenance, params.label),
			};
			storage.entities.set(entity.id, updatedEntity);
			return entity.id;
		}
	}

	// Add new node
	const notes = serializeProvenanceWithLabel(params.provenance, params.label);
	return addEntityToList(storage, {
		listId: SPECIAL_LIST_IDS.GRAPH,
		entityType: params.entityType,
		entityId: params.entityId,
		notes,
	});
};

/**
 * Remove a node from the graph list by entityId
 */
export const removeFromGraphList = (storage: InMemoryStorage, entityId: string): void => {
	initializeSpecialLists(storage);

	// Find entity by entityId (not record id)
	let entityRecordId: string | null = null;
	for (const [id, entity] of storage.entities) {
		if (entity.listId === SPECIAL_LIST_IDS.GRAPH && entity.entityId === entityId) {
			entityRecordId = id;
			break;
		}
	}

	if (entityRecordId === null) {
		throw new Error(`Entity ${entityId} not found in graph list`);
	}

	removeEntityFromList(storage, SPECIAL_LIST_IDS.GRAPH, entityRecordId);
};

/**
 * Clear all nodes from the graph list
 */
export const clearGraphList = (storage: InMemoryStorage): void => {
	initializeSpecialLists(storage);

	const entitiesToDelete: string[] = [];
	for (const [entityId, entity] of storage.entities) {
		if (entity.listId === SPECIAL_LIST_IDS.GRAPH) {
			entitiesToDelete.push(entityId);
		}
	}

	for (const entityId of entitiesToDelete) {
		storage.entities.delete(entityId);
	}

	updateList(storage, SPECIAL_LIST_IDS.GRAPH, {});
};

/**
 * Prune old auto-populated nodes
 */
export const pruneGraphList = (storage: InMemoryStorage): PruneGraphListResult => {
	initializeSpecialLists(storage);
	const entities = getListEntities(storage, SPECIAL_LIST_IDS.GRAPH);

	const now = new Date();
	const pruneThreshold = new Date(now.getTime() - GRAPH_LIST_CONFIG.PRUNE_AGE_MS);

	const entitiesToRemove: CatalogueEntity[] = [];
	for (const entity of entities) {
		const provenance = parseProvenance(entity.notes);
		if (provenance === 'auto-population' && entity.addedAt < pruneThreshold) {
			entitiesToRemove.push(entity);
		}
	}

	// Remove entities
	for (const entity of entitiesToRemove) {
		if (entity.id !== undefined) {
			storage.entities.delete(entity.id);
		}
	}

	// Update list's updated timestamp
	if (entitiesToRemove.length > 0) {
		updateList(storage, SPECIAL_LIST_IDS.GRAPH, {});
	}

	return {
		removedCount: entitiesToRemove.length,
		removedNodeIds: entitiesToRemove.map((e) => e.entityId),
	};
};

/**
 * Check if an entity is in the graph list
 */
export const isInGraphList = (storage: InMemoryStorage, entityId: string): boolean => {
	for (const entity of storage.entities.values()) {
		if (entity.listId === SPECIAL_LIST_IDS.GRAPH && entity.entityId === entityId) {
			return true;
		}
	}
	return false;
};

/**
 * Batch add nodes to graph list
 */
export const batchAddToGraphList = (storage: InMemoryStorage, nodes: readonly AddToGraphListParams[]): string[] => {
	initializeSpecialLists(storage);

	const addedIds: string[] = [];
	const currentSize = getGraphListSize(storage);
	let newNodesCount = 0;

	for (const node of nodes) {
		// Stop if we reach size limit
		if (currentSize + newNodesCount >= GRAPH_LIST_CONFIG.MAX_SIZE) {
			break;
		}

		// Check if node already exists
		let isExists = false;
		for (const entity of storage.entities.values()) {
			if (
				entity.listId === SPECIAL_LIST_IDS.GRAPH &&
				entity.entityType === node.entityType &&
				entity.entityId === node.entityId
			) {
				isExists = true;
				// Update provenance and timestamp
				if (entity.id !== undefined) {
					const updatedEntity: CatalogueEntity = {
						...entity,
						addedAt: new Date(),
						notes: serializeProvenanceWithLabel(node.provenance, node.label),
					};
					storage.entities.set(entity.id, updatedEntity);
					addedIds.push(entity.id);
				}
				break;
			}
		}

		if (!isExists) {
			// Add new node
			const notes = serializeProvenanceWithLabel(node.provenance, node.label);
			const id = addEntityToList(storage, {
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
};
