/**
 * Graph Index Tier
 *
 * Provides CRUD operations for graph nodes and edges stored in IndexedDB.
 * This is the low-level persistence layer - the PersistentGraph class
 * wraps this with in-memory caching for fast traversal.
 */

import type {
  CompletenessStatus,
  EdgePropertyFilter,
  GraphEdgeInput,
  GraphEdgeRecord,
  GraphNodeInput,
  GraphNodeRecord,
  RelationType,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import { getEmptyNodesByCompleteness } from './completeness-utils';
import * as edgeOps from './edge-operations';
import { getGraphIndexDB, isIndexedDBAvailableForGraph } from './graph-index-db';
import * as nodeOps from './node-operations';

const LOG_PREFIX = 'graph-index-tier';

/**
 * Statistics for graph index operations
 */
export interface GraphIndexStats {
  nodeCount: number;
  edgeCount: number;
  nodesByCompleteness: Record<CompletenessStatus, number>;
}

/**
 * Graph Index Tier - Dexie-based persistence for graph data
 */
export class GraphIndexTier {
  private initialized = false;
  private initializationPromise: Promise<void> | null = null;

  /**
   * Ensure the tier is initialized before operations
   */
  private async ensureInitialized(): Promise<boolean> {
    if (this.initialized) {
      return true;
    }

    if (this.initializationPromise) {
      await this.initializationPromise;
      return this.initialized;
    }

    this.initializationPromise = this.initialize();
    await this.initializationPromise;
    return this.initialized;
  }

  private async initialize(): Promise<void> {
    if (!isIndexedDBAvailableForGraph()) {
      logger.debug(
        LOG_PREFIX,
        'IndexedDB not available, graph index tier disabled'
      );
      this.initialized = false;
      return;
    }

    try {
      const db = getGraphIndexDB();
      if (!db) {
        this.initialized = false;
        return;
      }

      // Test database connectivity
      await db.nodes.count();
      this.initialized = true;

      logger.debug(LOG_PREFIX, 'Graph index tier initialized');
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Failed to initialize graph index tier', {
        error,
      });
      this.initialized = false;
    }
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  async addNode(input: GraphNodeInput): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return nodeOps.addNode(input);
  }

  async getNode(id: string): Promise<GraphNodeRecord | undefined> {
    if (!(await this.ensureInitialized())) {
      return undefined;
    }
    return nodeOps.getNode(id);
  }

  async hasNode(id: string): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }
    return nodeOps.hasNode(id);
  }

  async updateNodeCompleteness(
    id: string,
    completeness: CompletenessStatus,
    label?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return nodeOps.updateNodeCompleteness(id, completeness, label, metadata);
  }

  async markNodeExpanded(id: string): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return nodeOps.markNodeExpanded(id);
  }

  async getAllNodes(): Promise<GraphNodeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }
    return nodeOps.getAllNodes();
  }

  async getNodesByCompleteness(
    status: CompletenessStatus
  ): Promise<GraphNodeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }
    return nodeOps.getNodesByCompleteness(status);
  }

  async getNodeCount(): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }
    return nodeOps.getNodeCount();
  }

  async deleteNode(id: string): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return nodeOps.deleteNode(id);
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  async addEdge(input: GraphEdgeInput): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }
    return edgeOps.addEdge(input);
  }

  async hasEdge(
    source: string,
    target: string,
    type: RelationType
  ): Promise<boolean> {
    if (!(await this.ensureInitialized())) {
      return false;
    }
    return edgeOps.hasEdge(source, target, type);
  }

  async getEdgesFrom(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }
    return edgeOps.getEdgesFrom(nodeId, type, filter);
  }

  async getEdgesTo(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }
    return edgeOps.getEdgesTo(nodeId, type, filter);
  }

  async getAllEdges(): Promise<GraphEdgeRecord[]> {
    if (!(await this.ensureInitialized())) {
      return [];
    }
    return edgeOps.getAllEdges();
  }

  async getEdgeCount(): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }
    return edgeOps.getEdgeCount();
  }

  async deleteEdge(
    source: string,
    target: string,
    type: RelationType
  ): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return edgeOps.deleteEdge(source, target, type);
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  async addNodes(inputs: GraphNodeInput[]): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }
    return nodeOps.addNodes(inputs);
  }

  async addEdges(inputs: GraphEdgeInput[]): Promise<number> {
    if (!(await this.ensureInitialized())) {
      return 0;
    }
    return edgeOps.addEdges(inputs);
  }

  // ===========================================================================
  // Clear Operations
  // ===========================================================================

  async clear(): Promise<void> {
    if (!(await this.ensureInitialized())) {
      return;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return;
    }

    try {
      await db.transaction('rw', [db.nodes, db.edges], async () => {
        await db.nodes.clear();
        await db.edges.clear();
      });
      logger.debug(LOG_PREFIX, 'Graph index cleared');
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error clearing graph index', { error });
    }
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  async getStats(): Promise<GraphIndexStats> {
    const emptyStats: GraphIndexStats = {
      nodeCount: 0,
      edgeCount: 0,
      nodesByCompleteness: getEmptyNodesByCompleteness(),
    };

    if (!(await this.ensureInitialized())) {
      return emptyStats;
    }

    const db = getGraphIndexDB();
    if (!db) {
      return emptyStats;
    }

    try {
      const [nodeCount, edgeCount, fullCount, partialCount, stubCount] =
        await Promise.all([
          db.nodes.count(),
          db.edges.count(),
          db.nodes.where('completeness').equals('full').count(),
          db.nodes.where('completeness').equals('partial').count(),
          db.nodes.where('completeness').equals('stub').count(),
        ]);

      return {
        nodeCount,
        edgeCount,
        nodesByCompleteness: {
          full: fullCount,
          partial: partialCount,
          stub: stubCount,
        },
      };
    } catch (error) {
      logger.warn(LOG_PREFIX, 'Error getting graph stats', { error });
      return emptyStats;
    }
  }

  // ===========================================================================
  // Availability
  // ===========================================================================

  isAvailable(): boolean {
    return isIndexedDBAvailableForGraph();
  }
}

// Singleton instance
let graphIndexTierInstance: GraphIndexTier | null = null;

/**
 * Get the graph index tier singleton
 */
export const getGraphIndexTier = (): GraphIndexTier => {
  if (!graphIndexTierInstance) {
    graphIndexTierInstance = new GraphIndexTier();
  }
  return graphIndexTierInstance;
};

/**
 * Reset the singleton instance (for testing)
 */
export const resetGraphIndexTier = (): void => {
  graphIndexTierInstance = null;
};
