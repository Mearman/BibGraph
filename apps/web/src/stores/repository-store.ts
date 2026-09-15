/**
 * Repository store for managing nodes and edges that can be dragged into the graph
 * Pure Dexie implementation replacing Zustand + hybrid storage
 * Provides separate space for search results and filtered content before adding to main graph
 */

import type {
 EntityType,  GraphEdge,
  GraphNode } from "@bibgraph/types";
import { ENTITY_TYPES,RelationType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import Dexie, { type Table } from "dexie";

// Database schema
interface RepoConfigRecord {
  id?: number;
  key: string;
  value: string;
  updatedAt: Date;
}

interface RepoNodeRecord {
  id: string;
  node: GraphNode;
  addedAt: Date;
}

interface RepoEdgeRecord {
  id: string;
  edge: GraphEdge;
  addedAt: Date;
}

// Dexie database class
class RepoDB extends Dexie {
  config!: Table<RepoConfigRecord>;
  nodes!: Table<RepoNodeRecord>;
  edges!: Table<RepoEdgeRecord>;

  constructor() {
    super("bibgraph-repository");

    this.version(1).stores({
      config: "++id, key, updatedAt",
      nodes: "id, addedAt",
      edges: "id, addedAt",
    });
  }
}

// Singleton instance
let databaseInstance: RepoDB | null = null;

const getDB = (): RepoDB => {
  databaseInstance ??= new RepoDB();
  return databaseInstance;
};

// Repository state interface
export interface RepositoryState {
  // Repository mode toggle
  repositoryMode: boolean;

  // Repository nodes/edges (not in main graph yet)
  repositoryNodes: Record<string, GraphNode>;
  repositoryEdges: Record<string, GraphEdge>;

  // Search and filter state
  searchQuery: string;
  nodeTypeFilter: Record<EntityType, boolean>;
  edgeTypeFilter: Record<RelationType, boolean>;

  // Selection state for batch operations
  selectedRepositoryNodes: Record<string, boolean>;
  selectedRepositoryEdges: Record<string, boolean>;

  // Computed state (cached to avoid getSnapshot issues)
  filteredNodes: GraphNode[];
  filteredEdges: GraphEdge[];
  totalNodeCount: number;
  totalEdgeCount: number;
  selectedNodeCount: number;
  selectedEdgeCount: number;
}

// Default values and helpers

// Export helper functions for components - moved before DEFAULT_REPOSITORY_STATE
export const createInitialNodeTypeFilter = (): Record<EntityType, boolean> => ({
  works: true,
  authors: true,
  sources: true,
  institutions: true,
  topics: true,
  concepts: true,
  publishers: true,
  funders: true,
  keywords: true,
  domains: true,
  fields: true,
  subfields: true,
});

const createInitialEdgeTypeFilter = (): Record<RelationType, boolean> => ({
  [RelationType.AUTHORSHIP]: true,
  [RelationType.AFFILIATION]: true,
  [RelationType.PUBLICATION]: true,
  [RelationType.FUNDED_BY]: true,
  [RelationType.REFERENCE]: true,
  [RelationType.RELATED_TO]: true,
  [RelationType.HOST_ORGANIZATION]: true,
  [RelationType.LINEAGE]: true,
  [RelationType.PUBLISHER_CHILD_OF]: true,
  [RelationType.TOPIC]: true,
  [RelationType.WORK_HAS_KEYWORD]: true,
  [RelationType.AUTHOR_RESEARCHES]: true,
  [RelationType.INSTITUTION_LOCATED_IN]: true,
  [RelationType.FUNDER_LOCATED_IN]: true,
  [RelationType.TOPIC_PART_OF_FIELD]: true,
  [RelationType.FIELD_PART_OF_DOMAIN]: true,
  [RelationType.TOPIC_PART_OF_SUBFIELD]: true,
  [RelationType.TOPIC_SIBLING]: true,
  [RelationType.INSTITUTION_ASSOCIATED]: true,
  [RelationType.INSTITUTION_HAS_REPOSITORY]: true,
  [RelationType.CONCEPT]: true,
  [RelationType.HAS_ROLE]: true,
});

const DEFAULT_REPOSITORY_STATE: RepositoryState = {
  repositoryMode: false,
  repositoryNodes: {},
  repositoryEdges: {},
  searchQuery: "",
  nodeTypeFilter: createInitialNodeTypeFilter(),
  edgeTypeFilter: createInitialEdgeTypeFilter(),
  selectedRepositoryNodes: {},
  selectedRepositoryEdges: {},
  filteredNodes: [],
  filteredEdges: [],
  totalNodeCount: 0,
  totalEdgeCount: 0,
  selectedNodeCount: 0,
  selectedEdgeCount: 0,
};

// Config keys for storage
const CONFIG_KEYS = {
  REPOSITORY_MODE: "repositoryMode",
  SEARCH_QUERY: "searchQuery",
  NODE_TYPE_FILTER: "nodeTypeFilter",
  EDGE_TYPE_FILTER: "edgeTypeFilter",
  SELECTED_NODES: "selectedRepositoryNodes",
  SELECTED_EDGES: "selectedRepositoryEdges",
} as const;

const isRecordObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

// Returning a real function-boundary type here (rather than an inline variable annotation) is necessary: TypeScript's control-flow analysis narrows a `const` declaration's usable type to its initializer's inferred type, not a wider explicit annotation, so a bare `const node: GraphNode | undefined = nodes[id]` still reads as non-nullable at every subsequent use, whereas a function call's return type isn't narrowed that way by its caller. This genuinely matters here: an edge's source/target id can outlive its node (e.g. the node was removed from the repository but the edge wasn't).
const getGraphNodeById = (nodes: Record<string, GraphNode>, id: string): GraphNode | undefined => nodes[id];

const mergeBooleanFilterFromJson = <K extends string>(
  keys: readonly K[],
  initial: Readonly<Record<K, boolean>>,
  json: string,
): Record<K, boolean> => {
  const parsed: unknown = JSON.parse(json);
  const merged: Record<K, boolean> = { ...initial };
  if (!isRecordObject(parsed)) return merged;
  for (const key of keys) if (key in parsed) merged[key] = Boolean(parsed[key]);
  return merged;
};

const mergeNodeTypeFilterFromJson = (json: string): Record<EntityType, boolean> =>
  mergeBooleanFilterFromJson(ENTITY_TYPES, createInitialNodeTypeFilter(), json);

const mergeEdgeTypeFilterFromJson = (json: string): Record<RelationType, boolean> =>
  mergeBooleanFilterFromJson(Object.values(RelationType), createInitialEdgeTypeFilter(), json);

const parseBooleanRecordFromJson = (json: string): Record<string, boolean> => {
  const parsed: unknown = JSON.parse(json);
  if (!isRecordObject(parsed)) return {};
  const result: Record<string, boolean> = {};
  for (const [key, value] of Object.entries(parsed)) result[key] = Boolean(value);
  return result;
};

/**
 * Pure Dexie repository store service
 */
class RepoStore {
  private readonly db: RepoDB;
  private readonly logger = logger;

  constructor() {
    this.db = getDB();
  }

  /**
   * Get complete repository state
   */
  async getRepositoryState(): Promise<RepositoryState> {
    try {
      const [configRecords, nodeRecords, edgeRecords] = await Promise.all([
        this.db.config.toArray(),
        this.db.nodes.toArray(),
        this.db.edges.toArray(),
      ]);

      // Load config
      const config: RepositoryState = { ...DEFAULT_REPOSITORY_STATE };

      for (const record of configRecords) {
        switch (record.key) {
          case CONFIG_KEYS.REPOSITORY_MODE:
            config.repositoryMode = record.value === "true";
            break;
          case CONFIG_KEYS.SEARCH_QUERY:
            config.searchQuery = record.value;
            break;
          case CONFIG_KEYS.NODE_TYPE_FILTER:
            config.nodeTypeFilter = mergeNodeTypeFilterFromJson(record.value);
            break;
          case CONFIG_KEYS.EDGE_TYPE_FILTER:
            config.edgeTypeFilter = mergeEdgeTypeFilterFromJson(record.value);
            break;
          case CONFIG_KEYS.SELECTED_NODES:
            config.selectedRepositoryNodes = parseBooleanRecordFromJson(record.value);
            break;
          case CONFIG_KEYS.SELECTED_EDGES:
            config.selectedRepositoryEdges = parseBooleanRecordFromJson(record.value);
            break;
        }
      }

      // Load nodes and edges
      const repoNodes: Record<string, GraphNode> = {};
      const repoEdges: Record<string, GraphEdge> = {};

      for (const record of nodeRecords) {
        repoNodes[record.id] = record.node;
      }

      for (const record of edgeRecords) {
        repoEdges[record.id] = record.edge;
      }

      const state: RepositoryState = {
        ...config,
        repositoryNodes: repoNodes,
        repositoryEdges: repoEdges,
      };

      // Compute derived state
      state.filteredNodes = this.computeFilteredNodes(state);
      state.filteredEdges = this.computeFilteredEdges(state);
      state.totalNodeCount = Object.keys(state.repositoryNodes).length;
      state.totalEdgeCount = Object.keys(state.repositoryEdges).length;
      state.selectedNodeCount = Object.values(
        state.selectedRepositoryNodes,
      ).filter(Boolean).length;
      state.selectedEdgeCount = Object.values(
        state.selectedRepositoryEdges,
      ).filter(Boolean).length;

      return state;
    } catch (error) {
      this.logger.error("repository", "Failed to load repository state", {
        error,
      });
      return { ...DEFAULT_REPOSITORY_STATE };
    }
  }

  /**
   * Set repository mode
   */
  async setRepositoryMode(enabled: boolean): Promise<void> {
    try {
      await this.db.config.put({
        key: CONFIG_KEYS.REPOSITORY_MODE,
        value: enabled.toString(),
        updatedAt: new Date(),
      });

      this.logger.debug(
        "repository",
        `Repository mode ${enabled ? "enabled" : "disabled"}`,
        {
          nodeCount: await this.db.nodes.count(),
          edgeCount: await this.db.edges.count(),
        },
      );
    } catch (error) {
      this.logger.error("repository", "Failed to set repository mode", {
        enabled,
        error,
      });
      throw error;
    }
  }

  /**
   * Add nodes and edges to repository
   */
  async addToRepository(
    nodes: readonly GraphNode[],
    edges: readonly GraphEdge[] = [],
  ): Promise<void> {
    try {
      let addedNodes = 0;
      let addedEdges = 0;

      // Add nodes
      for (const node of nodes) {
        const exists = await this.db.nodes.get(node.id);
        if (!exists) {
          await this.db.nodes.put({
            id: node.id,
            node,
            addedAt: new Date(),
          });
          addedNodes++;
        }
      }

      // Add edges
      for (const edge of edges) {
        const exists = await this.db.edges.get(edge.id);
        if (!exists) {
          await this.db.edges.put({
            id: edge.id,
            edge,
            addedAt: new Date(),
          });
          addedEdges++;
        }
      }

      this.logger.debug("repository", "Added items to repository", {
        addedNodes,
        addedEdges,
        totalNodes: await this.db.nodes.count(),
        totalEdges: await this.db.edges.count(),
      });
    } catch (error) {
      this.logger.error("repository", "Failed to add to repository", {
        error,
      });
      throw error;
    }
  }

  /**
   * Remove nodes and edges from repository
   */
  async removeFromRepository(
    nodeIds: readonly string[],
    edgeIds: readonly string[] = [],
  ): Promise<void> {
    try {
      // Remove nodes
      for (const nodeId of nodeIds) {
        await this.db.nodes.delete(nodeId);
      }

      // Remove edges
      for (const edgeId of edgeIds) {
        await this.db.edges.delete(edgeId);
      }

      // Update selections (remove deleted items)
      const state = await this.getRepositoryState();
      const updatedSelectedNodes = Object.fromEntries(
        Object.entries(state.selectedRepositoryNodes).filter(([id]) => !nodeIds.includes(id)),
      );
      const updatedSelectedEdges = Object.fromEntries(
        Object.entries(state.selectedRepositoryEdges).filter(([id]) => !edgeIds.includes(id)),
      );

      await Promise.all([
        this.setSelectedRepositoryNodes(updatedSelectedNodes),
        this.setSelectedRepositoryEdges(updatedSelectedEdges),
      ]);

      this.logger.debug("repository", "Removed items from repository", {
        removedNodes: nodeIds.length,
        removedEdges: edgeIds.length,
      });
    } catch (error) {
      this.logger.error("repository", "Failed to remove from repository", {
        error,
      });
      throw error;
    }
  }

  /**
   * Clear entire repository
   */
  async clearRepository(): Promise<void> {
    try {
      await Promise.all([
        this.db.nodes.clear(),
        this.db.edges.clear(),
        this.setSelectedRepositoryNodes({}),
        this.setSelectedRepositoryEdges({}),
      ]);

      this.logger.debug("repository", "Cleared repository");
    } catch (error) {
      this.logger.error("repository", "Failed to clear repository", { error });
      throw error;
    }
  }

  /**
   * Set search query
   */
  async setSearchQuery(query: string): Promise<void> {
    try {
      await this.db.config.put({
        key: CONFIG_KEYS.SEARCH_QUERY,
        value: query,
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error("repository", "Failed to set search query", {
        query,
        error,
      });
      throw error;
    }
  }

  /**
   * Set node type filter
   */
  async setNodeTypeFilter(
    entityType: EntityType,
    enabled: boolean,
  ): Promise<void> {
    try {
      const state = await this.getRepositoryState();
      const updatedFilter = { ...state.nodeTypeFilter, [entityType]: enabled };

      await this.db.config.put({
        key: CONFIG_KEYS.NODE_TYPE_FILTER,
        value: JSON.stringify(updatedFilter),
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error("repository", "Failed to set node type filter", {
        entityType,
        enabled,
        error,
      });
      throw error;
    }
  }

  /**
   * Set edge type filter
   */
  async setEdgeTypeFilter(
    relationType: RelationType,
    enabled: boolean,
  ): Promise<void> {
    try {
      const state = await this.getRepositoryState();
      const updatedFilter = {
        ...state.edgeTypeFilter,
        [relationType]: enabled,
      };

      await this.db.config.put({
        key: CONFIG_KEYS.EDGE_TYPE_FILTER,
        value: JSON.stringify(updatedFilter),
        updatedAt: new Date(),
      });
    } catch (error) {
      this.logger.error("repository", "Failed to set edge type filter", {
        relationType,
        enabled,
        error,
      });
      throw error;
    }
  }

  /**
   * Reset all filters
   */
  async resetFilters(): Promise<void> {
    try {
      await Promise.all([
        this.db.config.put({
          key: CONFIG_KEYS.SEARCH_QUERY,
          value: "",
          updatedAt: new Date(),
        }),
        this.db.config.put({
          key: CONFIG_KEYS.NODE_TYPE_FILTER,
          value: JSON.stringify(createInitialNodeTypeFilter()),
          updatedAt: new Date(),
        }),
        this.db.config.put({
          key: CONFIG_KEYS.EDGE_TYPE_FILTER,
          value: JSON.stringify(createInitialEdgeTypeFilter()),
          updatedAt: new Date(),
        }),
      ]);
    } catch (error) {
      this.logger.error("repository", "Failed to reset filters", { error });
      throw error;
    }
  }

  /**
   * Select/deselect repository node
   */
  async selectRepositoryNode(nodeId: string, selected: boolean): Promise<void> {
    try {
      const state = await this.getRepositoryState();
      const updatedSelections = {
        ...state.selectedRepositoryNodes,
        [nodeId]: selected,
      };

      await this.setSelectedRepositoryNodes(updatedSelections);
    } catch (error) {
      this.logger.error("repository", "Failed to select repository node", {
        nodeId,
        selected,
        error,
      });
      throw error;
    }
  }

  /**
   * Select/deselect repository edge
   */
  async selectRepositoryEdge(edgeId: string, selected: boolean): Promise<void> {
    try {
      const state = await this.getRepositoryState();
      const updatedSelections = {
        ...state.selectedRepositoryEdges,
        [edgeId]: selected,
      };

      await this.setSelectedRepositoryEdges(updatedSelections);
    } catch (error) {
      this.logger.error("repository", "Failed to select repository edge", {
        edgeId,
        selected,
        error,
      });
      throw error;
    }
  }

  /**
   * Select all nodes
   */
  async selectAllNodes(): Promise<void> {
    try {
      const nodes = await this.db.nodes.toArray();
      const selections: Record<string, boolean> = {};

      for (const node of nodes) {
        selections[node.id] = true;
      }

      await this.setSelectedRepositoryNodes(selections);
    } catch (error) {
      this.logger.error("repository", "Failed to select all nodes", { error });
      throw error;
    }
  }

  /**
   * Select all edges
   */
  async selectAllEdges(): Promise<void> {
    try {
      const edges = await this.db.edges.toArray();
      const selections: Record<string, boolean> = {};

      for (const edge of edges) {
        selections[edge.id] = true;
      }

      await this.setSelectedRepositoryEdges(selections);
    } catch (error) {
      this.logger.error("repository", "Failed to select all edges", { error });
      throw error;
    }
  }

  /**
   * Clear all selections
   */
  async clearAllSelections(): Promise<void> {
    try {
      await Promise.all([
        this.setSelectedRepositoryNodes({}),
        this.setSelectedRepositoryEdges({}),
      ]);
    } catch (error) {
      this.logger.error("repository", "Failed to clear all selections", {
        error,
      });
      throw error;
    }
  }

  // Private helper methods

  private async setSelectedRepositoryNodes(
    selections: Readonly<Record<string, boolean>>,
  ): Promise<void> {
    await this.db.config.put({
      key: CONFIG_KEYS.SELECTED_NODES,
      value: JSON.stringify(selections),
      updatedAt: new Date(),
    });
  }

  private async setSelectedRepositoryEdges(
    selections: Readonly<Record<string, boolean>>,
  ): Promise<void> {
    await this.db.config.put({
      key: CONFIG_KEYS.SELECTED_EDGES,
      value: JSON.stringify(selections),
      updatedAt: new Date(),
    });
  }

  // Public method to compute filtered nodes
  computeFilteredNodes(state: RepositoryState): GraphNode[] {
    const nodes = Object.values(state.repositoryNodes);

    if (
      !state.searchQuery &&
      Object.values(state.nodeTypeFilter).every(Boolean)
    ) {
      return nodes;
    }

    return nodes.filter((node) => {
      // Filter by node type
      if (!state.nodeTypeFilter[node.entityType]) {
        return false;
      }

      // Filter by search query
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        return (
          node.label.toLowerCase().includes(query) ||
          node.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }

  // Public method to compute filtered edges
  computeFilteredEdges(state: RepositoryState): GraphEdge[] {
    const edges = Object.values(state.repositoryEdges);

    if (
      !state.searchQuery &&
      Object.values(state.edgeTypeFilter).every(Boolean)
    ) {
      return edges;
    }

    return edges.filter((edge) => {
      // Filter by edge type
      if (!state.edgeTypeFilter[edge.type]) {
        return false;
      }

      // Filter by search query (search in connected node labels)
      if (state.searchQuery) {
        const query = state.searchQuery.toLowerCase();
        const sourceNode = getGraphNodeById(state.repositoryNodes, edge.source);
        const targetNode = getGraphNodeById(state.repositoryNodes, edge.target);

        return (
          (sourceNode?.label.toLowerCase().includes(query) ?? false) ||
          (targetNode?.label.toLowerCase().includes(query) ?? false) ||
          edge.id.toLowerCase().includes(query)
        );
      }

      return true;
    });
  }

  /**
   * Migrate from old storage (localStorage/IndexedDB hybrid)
   */
  async migrateFromOldStorage(): Promise<void> {
    try {
      // Check if migration already happened
      const migrationKey = "migration-completed";
      const existingMigration = await this.db.config.get({ key: migrationKey });

      if (existingMigration) {
        this.logger.debug("repository", "Migration already completed");
        return;
      }

      // Try to load from old localStorage/IndexedDB
      // This would need to be implemented based on the old storage format
      // For now, just mark as migrated
      await this.db.config.put({
        key: migrationKey,
        value: "true",
        updatedAt: new Date(),
      });

      this.logger.debug("repository", "Migration completed");
    } catch (error) {
      this.logger.error("repository", "Migration failed", { error });
    }
  }
}

// Singleton instance
export const repositoryStore = new RepoStore();

// Initialize migration on first load (only in browser)
if (typeof window !== "undefined") {
  void repositoryStore.migrateFromOldStorage();
}


// Export the existing helper functions
export { createInitialEdgeTypeFilter };

// Simple Zustand-style compatibility
export const useRepositoryStore = () => repositoryStore;
