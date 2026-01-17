/**
 * Edge Operations
 *
 * Provides CRUD operations for graph edges in the IndexedDB storage tier.
 */

import type {
  EdgePropertyFilter,
  GraphEdgeInput,
  GraphEdgeRecord,
  RelationType,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import { applyEdgeFilter } from './edge-filter';
import { generateEdgeId, getGraphIndexDB } from './graph-index-db';

const LOG_PREFIX = 'graph-index-tier';

/**
 * Create a GraphEdgeRecord from input data
 * @param input
 * @param edgeId
 * @param discoveredAt
 */
const createEdgeRecord = (
  input: GraphEdgeInput,
  edgeId: string,
  discoveredAt: number
): GraphEdgeRecord => ({
  id: edgeId,
  source: input.source,
  target: input.target,
  type: input.type,
  direction: input.direction,
  discoveredAt,
  // Copy indexed properties
  authorPosition: input.authorPosition,
  isCorresponding: input.isCorresponding,
  isOpenAccess: input.isOpenAccess,
  version: input.version,
  score: input.score,
  years: input.years,
  awardId: input.awardId,
  role: input.role,
  metadata: input.metadata,
});

/**
 * Add an edge to the graph index
 * Returns false if edge already exists (deduplication)
 * @param input
 */
export const addEdge = async (input: GraphEdgeInput): Promise<boolean> => {
  const db = getGraphIndexDB();
  if (!db) {
    return false;
  }

  const edgeId = generateEdgeId(input.source, input.target, input.type);

  try {
    // Check for existing edge (deduplication)
    const existing = await db.edges.get(edgeId);
    if (existing) {
      logger.debug(LOG_PREFIX, 'Edge already exists, skipping', { edgeId });
      return false;
    }

    const record = createEdgeRecord(input, edgeId, Date.now());
    await db.edges.put(record);
    logger.debug(LOG_PREFIX, 'Edge added', { edgeId, type: input.type });
    return true;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error adding edge', { edgeId, error });
    return false;
  }
};

/**
 * Check if an edge exists
 * @param source
 * @param target
 * @param type
 */
export const hasEdge = async (
  source: string,
  target: string,
  type: RelationType
): Promise<boolean> => {
  const db = getGraphIndexDB();
  if (!db) {
    return false;
  }

  const edgeId = generateEdgeId(source, target, type);

  try {
    const edge = await db.edges.get(edgeId);
    return edge !== undefined;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error checking edge existence', { edgeId, error });
    return false;
  }
};

/**
 * Get all edges from a source node
 * @param nodeId
 * @param type
 * @param filter
 */
export const getEdgesFrom = async (
  nodeId: string,
  type?: RelationType,
  filter?: EdgePropertyFilter
): Promise<GraphEdgeRecord[]> => {
  const db = getGraphIndexDB();
  if (!db) {
    return [];
  }

  try {
    let edges: GraphEdgeRecord[];

    edges = await (type
      ? db.edges.where('[source+type]').equals([nodeId, type]).toArray()
      : db.edges.where('source').equals(nodeId).toArray());

    if (filter) {
      edges = applyEdgeFilter(edges, filter);
    }

    return edges;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting edges from node', {
      nodeId,
      type,
      error,
    });
    return [];
  }
};

/**
 * Get all edges to a target node
 * @param nodeId
 * @param type
 * @param filter
 */
export const getEdgesTo = async (
  nodeId: string,
  type?: RelationType,
  filter?: EdgePropertyFilter
): Promise<GraphEdgeRecord[]> => {
  const db = getGraphIndexDB();
  if (!db) {
    return [];
  }

  try {
    let edges: GraphEdgeRecord[];

    edges = await (type
      ? db.edges.where('[target+type]').equals([nodeId, type]).toArray()
      : db.edges.where('target').equals(nodeId).toArray());

    if (filter) {
      edges = applyEdgeFilter(edges, filter);
    }

    return edges;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting edges to node', {
      nodeId,
      type,
      error,
    });
    return [];
  }
};

/**
 * Get all edges
 */
export const getAllEdges = async (): Promise<GraphEdgeRecord[]> => {
  const db = getGraphIndexDB();
  if (!db) {
    return [];
  }

  try {
    return await db.edges.toArray();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error getting all edges', { error });
    return [];
  }
};

/**
 * Get edge count
 */
export const getEdgeCount = async (): Promise<number> => {
  const db = getGraphIndexDB();
  if (!db) {
    return 0;
  }

  try {
    return await db.edges.count();
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error counting edges', { error });
    return 0;
  }
};

/**
 * Delete an edge
 * @param source
 * @param target
 * @param type
 */
export const deleteEdge = async (
  source: string,
  target: string,
  type: RelationType
): Promise<void> => {
  const db = getGraphIndexDB();
  if (!db) {
    return;
  }

  const edgeId = generateEdgeId(source, target, type);

  try {
    await db.edges.delete(edgeId);
    logger.debug(LOG_PREFIX, 'Edge deleted', { edgeId });
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error deleting edge', { edgeId, error });
  }
};

/**
 * Add multiple edges in a batch (with deduplication)
 * @param inputs
 */
export const addEdges = async (inputs: GraphEdgeInput[]): Promise<number> => {
  const db = getGraphIndexDB();
  if (!db) {
    return 0;
  }

  const now = Date.now();
  const records: GraphEdgeRecord[] = inputs.map((input) =>
    createEdgeRecord(
      input,
      generateEdgeId(input.source, input.target, input.type),
      now
    )
  );

  try {
    // Use bulkPut to handle duplicates (will update existing)
    await db.edges.bulkPut(records);
    logger.debug(LOG_PREFIX, 'Bulk edges added', { count: records.length });
    return records.length;
  } catch (error) {
    logger.warn(LOG_PREFIX, 'Error adding bulk edges', { error });
    return 0;
  }
};
