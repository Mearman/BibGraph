/**
 * Dexie-based graph index database
 * Provides persistent browser storage for graph nodes and edges
 */

import {
  EDGE_INDEXES,
  GRAPH_INDEX_DB_NAME,
  GRAPH_INDEX_DB_VERSION,
  type GraphEdgeRecord,
  type GraphNodeRecord,
  NODE_INDEXES,
} from '@bibgraph/types';
import Dexie from 'dexie';


/**
 * Dexie database class for graph index storage
 *
 * Stores nodes and edges separately with appropriate indexes
 * for efficient graph traversal queries.
 */
class GraphIndexDB extends Dexie {
  nodes!: Dexie.Table<GraphNodeRecord, string>;
  edges!: Dexie.Table<GraphEdgeRecord, string>;

  constructor() {
    super(GRAPH_INDEX_DB_NAME);

    this.version(GRAPH_INDEX_DB_VERSION).stores({
      // Nodes indexed by ID, type, completeness, and timestamps
      nodes: NODE_INDEXES,
      // Edges indexed by ID, source, target, type, direction, and compound indexes
      edges: EDGE_INDEXES,
    });
  }
}

// Singleton instance (lazily initialized)
let databaseInstance: GraphIndexDB | null = null;

/**
 * Check if IndexedDB is available in the current environment
 */
export const isIndexedDBAvailableForGraph = (): boolean => {
  try {
    // Check for browser environment and indexedDB availability
    return typeof globalThis !== 'undefined' && 'indexedDB' in globalThis;
  } catch {
    return false;
  }
};

/**
 * Get the graph index database instance (lazy initialization)
 */
export const getGraphIndexDB = (): GraphIndexDB | null => {
  if (!isIndexedDBAvailableForGraph()) {
    return null;
  }

  if (!databaseInstance) {
    try {
      databaseInstance = new GraphIndexDB();
    } catch (error) {
      console.error('Failed to initialize graph index database:', error);
      return null;
    }
  }

  return databaseInstance;
};

/**
 * Close the database connection
 */
export const closeGraphIndexDB = (): void => {
  if (!databaseInstance) {
  	return;
  }

  databaseInstance.close();
  databaseInstance = null;
};

/**
 * Delete the entire graph index database
 */
export const deleteGraphIndexDB = async (): Promise<void> => {
  closeGraphIndexDB();
  if (isIndexedDBAvailableForGraph()) {
    await Dexie.delete(GRAPH_INDEX_DB_NAME);
  }
};

/**
 * Generate a unique edge ID from source, target, and type
 *
 * Format: `${source}-${target}-${type}`
 * This ensures edge deduplication.
 */
export const generateEdgeId = (source: string, target: string, type: string): string => `${source}-${target}-${type}`;

export { GraphIndexDB };
