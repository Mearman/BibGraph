/**
 * Graph List Operations
 * Feature 038-graph-list: Special list for graph working set
 */

import type { AddToGraphListParams, GraphListNode, PruneGraphListResult } from "@bibgraph/types";
import { GRAPH_LIST_CONFIG } from "@bibgraph/types";

import type { GenericLogger } from "../../logger.js";
import { catalogueEventEmitter,LOG_CATEGORY, SPECIAL_LIST_IDS } from "./index.js";
import type { CatalogueDB } from "./schema.js";

/**
 * Add a node to the graph list
 * @param db Database instance
 * @param params Node data
 * @param logger Optional logger
 * @returns Entity record ID
 */
export const addToGraphList = async (
  db: CatalogueDB,
  params: AddToGraphListParams,
  logger?: GenericLogger
): Promise<string> => {
  // Check size limit
  const currentSize = await db.catalogueEntities
    .where("listId")
    .equals(SPECIAL_LIST_IDS.GRAPH)
    .count();

  if (currentSize >= GRAPH_LIST_CONFIG.MAX_SIZE) {
    throw new Error(`Graph list is full (${GRAPH_LIST_CONFIG.MAX_SIZE} nodes). Remove some nodes to add more.`);
  }

  // Check if node already exists
  const existing = await db.catalogueEntities
    .where("[listId+entityType+entityId]")
    .equals([SPECIAL_LIST_IDS.GRAPH, params.entityType, params.entityId])
    .first();

  if (existing && existing.id !== undefined) {
    // Update provenance
    await db.catalogueEntities.update(existing.id, {
      notes: serializeProvenanceWithLabel(params.provenance, params.label),
      addedAt: new Date(),
    });
    logger?.debug(LOG_CATEGORY, `Updated graph list node: ${params.entityId}`);
    return existing.id;
  }

  // Add new node
  const id = crypto.randomUUID();
  const entity = {
    id,
    listId: SPECIAL_LIST_IDS.GRAPH,
    entityType: params.entityType,
    entityId: params.entityId,
    addedAt: new Date(),
    notes: serializeProvenanceWithLabel(params.provenance, params.label),
    position: currentSize + 1,
  };

  await db.catalogueEntities.add(entity);
  logger?.debug(LOG_CATEGORY, `Added node to graph list: ${params.entityId}`);
  catalogueEventEmitter.emit({
    type: 'entity-added',
    listId: SPECIAL_LIST_IDS.GRAPH,
    entityIds: [params.entityId]
  });

  return id;
};

/**
 * Remove a node from the graph list
 * @param db Database instance
 * @param entityId Entity ID to remove
 * @param logger Optional logger
 */
export const removeFromGraphList = async (
  db: CatalogueDB,
  entityId: string,
  logger?: GenericLogger
): Promise<void> => {
  const entity = await db.catalogueEntities
    .where("listId")
    .equals(SPECIAL_LIST_IDS.GRAPH)
    .filter(e => e.entityId === entityId)
    .first();

  if (entity && entity.id) {
    await db.catalogueEntities.delete(entity.id);
    logger?.debug(LOG_CATEGORY, `Removed node from graph list: ${entityId}`);
    catalogueEventEmitter.emit({
      type: 'entity-removed',
      listId: SPECIAL_LIST_IDS.GRAPH,
      entityIds: [entityId]
    });
  }
};

/**
 * Clear all nodes from the graph list
 * @param db Database instance
 * @param logger Optional logger
 */
export const clearGraphList = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<void> => {
  await db.catalogueEntities.where("listId").equals(SPECIAL_LIST_IDS.GRAPH).delete();
  // Update list timestamp
  await db.catalogueLists.update(SPECIAL_LIST_IDS.GRAPH, { updatedAt: new Date() });
  logger?.debug(LOG_CATEGORY, "Graph list cleared");
  catalogueEventEmitter.emit({ type: 'list-updated', listId: SPECIAL_LIST_IDS.GRAPH });
};

/**
 * Get current size of graph list
 * @param db Database instance
 */
export const getGraphListSize = async (db: CatalogueDB): Promise<number> => {
  return await db.catalogueEntities
    .where("listId")
    .equals(SPECIAL_LIST_IDS.GRAPH)
    .count();
};

/**
 * Get all nodes in the graph list
 * @param db Database instance
 * @param logger Optional logger
 */
export const getGraphList = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<GraphListNode[]> => {
  try {
    const entities = await db.catalogueEntities
      .where("listId")
      .equals(SPECIAL_LIST_IDS.GRAPH)
      .sortBy("position");

    return entities
      .filter(entity => entity.id !== undefined)
      .map(entity => ({
        id: String(entity.id),
        entityId: entity.entityId,
        entityType: entity.entityType,
        label: entity.notes || entity.entityId,
        addedAt: entity.addedAt,
        provenance: parseProvenance(entity.notes),
      }));
  } catch (error) {
    logger?.error(LOG_CATEGORY, "Failed to get graph list", { error });
    throw error;
  }
};

/**
 * Check if a node exists in the graph list
 * @param db Database instance
 * @param entityId Entity ID
 */
export const isInGraphList = async (db: CatalogueDB, entityId: string): Promise<boolean> => {
  const count = await db.catalogueEntities
    .where("listId")
    .equals(SPECIAL_LIST_IDS.GRAPH)
    .filter(e => e.entityId === entityId)
    .count();
  return count > 0;
};

/**
 * Prune old auto-populated nodes
 * @param db Database instance
 * @param logger Optional logger
 */
export const pruneGraphList = async (
  db: CatalogueDB,
  logger?: GenericLogger
): Promise<PruneGraphListResult> => {
  const cutoffDate = new Date(Date.now() - GRAPH_LIST_CONFIG.PRUNE_AGE_MS);
  const entities = await db.catalogueEntities
    .where("listId")
    .equals(SPECIAL_LIST_IDS.GRAPH)
    .sortBy("position");

  const toPrune = entities.filter(entity => {
    const provenance = parseProvenance(entity.notes);
    return provenance === 'auto-population' && entity.addedAt < cutoffDate;
  });

  const removedNodeIds: string[] = [];
  for (const entity of toPrune) {
    if (entity.id) {
      await db.catalogueEntities.delete(entity.id);
      removedNodeIds.push(entity.entityId);
    }
  }

  logger?.debug(LOG_CATEGORY, `Pruned ${removedNodeIds.length} auto-populated nodes from graph list`);
  return {
    removedCount: removedNodeIds.length,
    removedNodeIds,
  };
};

/**
 * Batch add nodes to graph list
 * @param db Database instance
 * @param nodes Nodes to add
 * @param logger Optional logger
 */
export const batchAddToGraphList = async (
  db: CatalogueDB,
  nodes: AddToGraphListParams[],
  logger?: GenericLogger
): Promise<string[]> => {
  const addedIds: string[] = [];
  for (const node of nodes) {
    try {
      const currentSize = await getGraphListSize(db);
      if (currentSize >= GRAPH_LIST_CONFIG.MAX_SIZE) {
        logger?.warn(LOG_CATEGORY, `Graph list full, stopping batch add at ${addedIds.length} nodes`);
        break;
      }
      const id = await addToGraphList(db, node, logger);
      addedIds.push(id);
    } catch (error) {
      logger?.warn(LOG_CATEGORY, "Failed to add node in batch", { error, node });
      // Continue with next node
    }
  }
  return addedIds;
};

// ============================================================================
// HELPERS
// ============================================================================

/**
 * Helper: Parse provenance from notes field
 * @param notes
 */
const parseProvenance = (notes: string | undefined): GraphListNode['provenance'] => {
  if (!notes) return 'user';
  // Notes format: "provenance:TYPE|label:LABEL"
  const match = notes.match(/^provenance:([^|]+)/);
  if (match) {
    const prov = match[1];
    if (prov === 'user' || prov === 'collection-load' || prov === 'expansion' || prov === 'auto-population') {
      return prov;
    }
  }
  return 'user';
};

/**
 * Helper: Serialize provenance and label to notes field
 * @param provenance
 * @param label
 */
const serializeProvenanceWithLabel = (provenance: string, label: string): string => {
  return `provenance:${provenance}|label:${label}`;
};
