/**
 * Persistent Graph
 *
 * Combines in-memory graph operations with Dexie persistence for fast
 * traversal and durable storage. Implements write-through caching:
 * all mutations immediately persist to IndexedDB.
 * @module cache/dexie/persistent-graph
 */

import {
  type CompletenessStatus,
  type EdgeDirectionFilter,
  type EdgePropertyFilter,
  type EntityType,
  type GraphEdgeInput,
  type GraphEdgeRecord,
  type GraphNodeInput,
  type GraphNodeRecord,
  type GraphStatistics,
  type NeighborQueryOptions,
  type RelationType,
  type SubgraphResult,
} from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import { generateEdgeId } from './graph-index-db';
import { getGraphIndexTier, type GraphIndexTier } from './graph-index-tier';
import {
  addEdgeToCache,
  applyEdgeFilter,
  createEdgeRecord,
} from './persistent-graph-edges';
import {
  addNodeToCache,
  createNodeRecord,
  createUpdatedNodeRecord,
  shouldUpgradeCompleteness,
} from './persistent-graph-nodes';
import {
  clearCache,
  type GraphCache,
  type HydrationState,
  LOG_PREFIX,
} from './persistent-graph-types';

/**
 * PersistentGraph - In-memory graph with IndexedDB persistence
 *
 * The graph hydrates from IndexedDB on first access, then maintains
 * an in-memory copy for fast queries. All mutations write through
 * to IndexedDB immediately.
 */
export class PersistentGraph {
  private tier: GraphIndexTier;
  private hydrationState: HydrationState = 'not_started';
  private hydrationPromise: Promise<void> | null = null;
  private cache: GraphCache = {
    nodes: new Map(),
    edges: new Map(),
    outboundEdges: new Map(),
    inboundEdges: new Map(),
  };

  constructor(tier?: GraphIndexTier) {
    this.tier = tier ?? getGraphIndexTier();
  }

  // ===========================================================================
  // Lifecycle
  // ===========================================================================

  async initialize(): Promise<void> {
    await this.ensureHydrated();
  }

  async hydrate(): Promise<void> {
    if (this.hydrationState === 'hydrated') {
      return;
    }

    if (this.hydrationPromise) {
      await this.hydrationPromise;
      return;
    }

    this.hydrationState = 'hydrating';
    this.hydrationPromise = this.doHydrate();

    try {
      await this.hydrationPromise;
      this.hydrationState = 'hydrated';
      logger.debug(LOG_PREFIX, 'Graph hydrated', {
        nodes: this.cache.nodes.size,
        edges: this.cache.edges.size,
      });
    } catch (error) {
      this.hydrationState = 'error';
      logger.warn(LOG_PREFIX, 'Graph hydration failed', { error });
      throw error;
    } finally {
      this.hydrationPromise = null;
    }
  }

  private async doHydrate(): Promise<void> {
    const startTime = Date.now();
    const [nodes, edges] = await Promise.all([
      this.tier.getAllNodes(),
      this.tier.getAllEdges(),
    ]);

    // Populate node cache
    this.cache.nodes.clear();
    for (const node of nodes) {
      this.cache.nodes.set(node.id, node);
      this.cache.outboundEdges.set(node.id, new Set());
      this.cache.inboundEdges.set(node.id, new Set());
    }

    // Populate edge cache and adjacency lists
    this.cache.edges.clear();
    for (const edge of edges) {
      addEdgeToCache(this.cache, edge);
    }

    logger.debug(LOG_PREFIX, 'Hydration complete', {
      nodes: nodes.length,
      edges: edges.length,
      elapsed: Date.now() - startTime,
    });
  }

  async clear(): Promise<void> {
    clearCache(this.cache);
    await this.tier.clear();
    logger.debug(LOG_PREFIX, 'Graph cleared');
  }

  isReady(): boolean {
    return this.hydrationState === 'hydrated';
  }

  getHydrationState(): HydrationState {
    return this.hydrationState;
  }

  // ===========================================================================
  // Node Operations
  // ===========================================================================

  async addNode(input: GraphNodeInput): Promise<void> {
    await this.ensureHydrated();

    if (this.cache.nodes.has(input.id)) {
      await this.updateNodeCompleteness(input.id, input.completeness, input.label, input.metadata);
      return;
    }

    const record = createNodeRecord(input, Date.now());
    await this.tier.addNode(input);
    addNodeToCache(this.cache, record);
    logger.debug(LOG_PREFIX, 'Node added', { id: input.id, completeness: input.completeness });
  }

  getNode(id: string): GraphNodeRecord | undefined {
    return this.cache.nodes.get(id);
  }

  hasNode(id: string): boolean {
    return this.cache.nodes.has(id);
  }

  async updateNodeCompleteness(
    id: string,
    completeness: CompletenessStatus,
    label?: string,
    metadata?: Record<string, unknown>
  ): Promise<void> {
    await this.ensureHydrated();

    const existing = this.cache.nodes.get(id);
    if (!existing) {
      return;
    }

    const shouldUpgrade = shouldUpgradeCompleteness(existing.completeness, completeness);
    if (!shouldUpgrade && !label && !metadata) {
      return;
    }

    await this.tier.updateNodeCompleteness(id, completeness, label, metadata);
    const updated = createUpdatedNodeRecord(existing, completeness, label, metadata);
    this.cache.nodes.set(id, updated);
  }

  async updateNodeLabel(id: string, label: string): Promise<void> {
    await this.ensureHydrated();

    const existing = this.cache.nodes.get(id);
    if (!existing || existing.label === label) {
      return;
    }

    await this.updateNodeCompleteness(id, existing.completeness, label);
  }

  async markNodeExpanded(id: string): Promise<void> {
    await this.ensureHydrated();

    const existing = this.cache.nodes.get(id);
    if (!existing || existing.expandedAt !== undefined) {
      return;
    }

    await this.tier.markNodeExpanded(id);
    const updated: GraphNodeRecord = {
      ...existing,
      expandedAt: Date.now(),
      updatedAt: Date.now(),
    };
    this.cache.nodes.set(id, updated);
  }

  getNodeCount(): number {
    return this.cache.nodes.size;
  }

  getAllNodes(): GraphNodeRecord[] {
    return [...this.cache.nodes.values()];
  }

  getNodesByCompleteness(status: CompletenessStatus): GraphNodeRecord[] {
    return [...this.cache.nodes.values()].filter((n) => n.completeness === status);
  }

  getNodesByType(entityType: EntityType): GraphNodeRecord[] {
    return [...this.cache.nodes.values()].filter((n) => n.entityType === entityType);
  }

  // ===========================================================================
  // Edge Operations
  // ===========================================================================

  async addEdge(input: GraphEdgeInput): Promise<boolean> {
    await this.ensureHydrated();

    const edgeId = generateEdgeId(input.source, input.target, input.type);
    if (this.cache.edges.has(edgeId)) {
      return false;
    }

    const record = createEdgeRecord(input, Date.now());
    await this.tier.addEdge(input);
    addEdgeToCache(this.cache, record);
    logger.debug(LOG_PREFIX, 'Edge added', { edgeId, type: input.type });
    return true;
  }

  hasEdge(source: string, target: string, type: RelationType): boolean {
    const edgeId = generateEdgeId(source, target, type);
    return this.cache.edges.has(edgeId);
  }

  getEdgeCount(): number {
    return this.cache.edges.size;
  }

  getAllEdges(): GraphEdgeRecord[] {
    return [...this.cache.edges.values()];
  }

  getEdgesFrom(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    const edgeIds = this.cache.outboundEdges.get(nodeId);
    if (!edgeIds) {
      return [];
    }

    let edges = [...edgeIds]
      .map((id) => this.cache.edges.get(id))
      .filter((e): e is GraphEdgeRecord => e !== undefined);

    if (type) {
      edges = edges.filter((e) => e.type === type);
    }

    if (filter) {
      edges = applyEdgeFilter(edges, filter);
    }

    return edges;
  }

  getEdgesTo(
    nodeId: string,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    const edgeIds = this.cache.inboundEdges.get(nodeId);
    if (!edgeIds) {
      return [];
    }

    let edges = [...edgeIds]
      .map((id) => this.cache.edges.get(id))
      .filter((e): e is GraphEdgeRecord => e !== undefined);

    if (type) {
      edges = edges.filter((e) => e.type === type);
    }

    if (filter) {
      edges = applyEdgeFilter(edges, filter);
    }

    return edges;
  }

  // ===========================================================================
  // Query Operations
  // ===========================================================================

  getNeighbors(nodeId: string, options?: NeighborQueryOptions): string[] {
    const direction = options?.direction ?? 'both';
    const types = options?.types;
    const limit = options?.limit;

    const neighbors = new Set<string>();

    if (direction === 'outbound' || direction === 'both') {
      const outEdgeIds = this.cache.outboundEdges.get(nodeId);
      if (outEdgeIds) {
        for (const edgeId of outEdgeIds) {
          const edge = this.cache.edges.get(edgeId);
          if (edge && (!types || types.includes(edge.type))) {
            neighbors.add(edge.target);
          }
        }
      }
    }

    if (direction === 'inbound' || direction === 'both') {
      const inEdgeIds = this.cache.inboundEdges.get(nodeId);
      if (inEdgeIds) {
        for (const edgeId of inEdgeIds) {
          const edge = this.cache.edges.get(edgeId);
          if (edge && (!types || types.includes(edge.type))) {
            neighbors.add(edge.source);
          }
        }
      }
    }

    let result = [...neighbors];
    if (limit && limit > 0) {
      result = result.slice(0, limit);
    }

    return result;
  }

  getEdgesByDirection(
    nodeId: string,
    direction: EdgeDirectionFilter,
    type?: RelationType,
    filter?: EdgePropertyFilter
  ): GraphEdgeRecord[] {
    let edges: GraphEdgeRecord[] = [];

    if (direction === 'outbound' || direction === 'both') {
      edges = [...edges, ...this.getEdgesFrom(nodeId, type, filter)];
    }

    if (direction === 'inbound' || direction === 'both') {
      edges = [...edges, ...this.getEdgesTo(nodeId, type, filter)];
    }

    return edges;
  }

  getEdgesByProperty(filter: EdgePropertyFilter): GraphEdgeRecord[] {
    return applyEdgeFilter([...this.cache.edges.values()], filter);
  }

  getSubgraph(nodeIds: string[]): SubgraphResult {
    const nodeSet = new Set(nodeIds);
    const nodes: GraphNodeRecord[] = [];
    const edges: GraphEdgeRecord[] = [];

    for (const nodeId of nodeIds) {
      const node = this.cache.nodes.get(nodeId);
      if (node) {
        nodes.push(node);
      }
    }

    for (const edge of this.cache.edges.values()) {
      if (nodeSet.has(edge.source) && nodeSet.has(edge.target)) {
        edges.push(edge);
      }
    }

    return { nodes, edges };
  }

  // ===========================================================================
  // Statistics
  // ===========================================================================

  getStatistics(): GraphStatistics {
    const nodesByCompleteness: Record<CompletenessStatus, number> = {
      full: 0,
      partial: 0,
      stub: 0,
    };
    const nodesByType: Partial<Record<EntityType, number>> = {};
    const edgesByType: Partial<Record<RelationType, number>> = {};

    for (const node of this.cache.nodes.values()) {
      nodesByCompleteness[node.completeness]++;
      nodesByType[node.entityType] = (nodesByType[node.entityType] ?? 0) + 1;
    }

    for (const edge of this.cache.edges.values()) {
      edgesByType[edge.type] = (edgesByType[edge.type] ?? 0) + 1;
    }

    return {
      nodeCount: this.cache.nodes.size,
      edgeCount: this.cache.edges.size,
      nodesByCompleteness,
      nodesByType,
      edgesByType,
      lastUpdated: Date.now(),
    };
  }

  // ===========================================================================
  // Bulk Operations
  // ===========================================================================

  async addNodes(inputs: GraphNodeInput[]): Promise<void> {
    await this.ensureHydrated();

    const newInputs: GraphNodeInput[] = [];
    for (const input of inputs) {
      if (this.cache.nodes.has(input.id)) {
        await this.updateNodeCompleteness(input.id, input.completeness, input.label, input.metadata);
      } else {
        newInputs.push(input);
      }
    }

    if (newInputs.length === 0) {
      return;
    }

    await this.tier.addNodes(newInputs);

    const now = Date.now();
    for (const input of newInputs) {
      const record = createNodeRecord(input, now);
      addNodeToCache(this.cache, record);
    }

    logger.debug(LOG_PREFIX, 'Bulk nodes added', { count: newInputs.length });
  }

  async addEdges(inputs: GraphEdgeInput[]): Promise<number> {
    await this.ensureHydrated();

    const newInputs = inputs.filter((input) => {
      const edgeId = generateEdgeId(input.source, input.target, input.type);
      return !this.cache.edges.has(edgeId);
    });

    if (newInputs.length === 0) {
      return 0;
    }

    await this.tier.addEdges(newInputs);

    const now = Date.now();
    for (const input of newInputs) {
      const record = createEdgeRecord(input, now);
      addEdgeToCache(this.cache, record);
    }

    logger.debug(LOG_PREFIX, 'Bulk edges added', { count: newInputs.length });
    return newInputs.length;
  }

  // ===========================================================================
  // Helper Methods
  // ===========================================================================

  private async ensureHydrated(): Promise<void> {
    if (this.hydrationState === 'hydrated') {
      return;
    }
    await this.hydrate();
  }
}

// ===========================================================================
// Singleton Instance
// ===========================================================================

let persistentGraphInstance: PersistentGraph | null = null;

export const getPersistentGraph = (): PersistentGraph => {
  if (!persistentGraphInstance) {
    persistentGraphInstance = new PersistentGraph();
  }
  return persistentGraphInstance;
};

export const resetPersistentGraph = (): void => {
  persistentGraphInstance = null;
};
