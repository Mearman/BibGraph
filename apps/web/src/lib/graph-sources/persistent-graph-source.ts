/**
 * Persistent Graph Data Source
 *
 * Provides graph data from the PersistentGraph index - a unified view of all
 * entity relationships discovered during browsing, with indexed edge properties
 * for efficient filtering.
 *
 * Unlike cache sources which rebuild relationships on-demand, the persistent
 * graph stores pre-computed relationships that persist across sessions.
 */

import { getPersistentGraph } from '@bibgraph/client';
import type { GraphEdgeRecord, GraphNodeRecord } from '@bibgraph/types';
import type {
  GraphDataSource,
  GraphSourceEntity,
  GraphSourceRelationship,
} from '@bibgraph/utils';

const SOURCE_ID = 'graph:persistent';

/**
 * Create a graph data source from the PersistentGraph index
 *
 * This source provides all entities and their relationships from the
 * persistent graph index. It includes:
 * - Full entities (completeness = 'full')
 * - Partial entities (completeness = 'partial')
 * - Stub entities (completeness = 'stub') - referenced but not yet fetched
 */
export const createPersistentGraphSource = (): GraphDataSource => ({
    id: SOURCE_ID,
    label: 'Persistent Graph',
    category: 'graph',
    description: 'All discovered entity relationships (persists across sessions)',

    getEntities: async (): Promise<GraphSourceEntity[]> => {
      const graph = getPersistentGraph();

      // Ensure graph is hydrated
      await graph.initialize();

      const nodes = graph.getAllNodes();
      const edges = graph.getAllEdges();

      // Build node map for entity type lookup
      const nodeMap = new Map<string, GraphNodeRecord>();
      for (const node of nodes) {
        nodeMap.set(node.id, node);
      }

      // Build outbound edge map for efficient lookup
      const outboundEdges = new Map<string, GraphEdgeRecord[]>();
      for (const edge of edges) {
        const existing = outboundEdges.get(edge.source) ?? [];
        existing.push(edge);
        outboundEdges.set(edge.source, existing);
      }

      // Convert nodes to GraphSourceEntity format
      const entities: GraphSourceEntity[] = nodes.map((node) => {
        const nodeEdges = outboundEdges.get(node.id) ?? [];
        const relationships: GraphSourceRelationship[] = nodeEdges
          .map((edge): GraphSourceRelationship | null => {
            const targetNode = nodeMap.get(edge.target);
            if (!targetNode) return null;

            return {
              targetId: edge.target,
              targetType: targetNode.entityType,
              relationType: edge.type,
              // Include indexed edge properties for weighted traversal
              score: edge.score,
              authorPosition: edge.authorPosition,
              isCorresponding: edge.isCorresponding,
              isOpenAccess: edge.isOpenAccess,
            };
          })
          .filter((rel): rel is GraphSourceRelationship => rel !== null);

        return {
          entityType: node.entityType,
          entityId: node.id,
          label: node.label,
          entityData: {
            completeness: node.completeness,
            cachedAt: node.cachedAt,
            updatedAt: node.updatedAt,
            ...node.metadata,
          },
          sourceId: SOURCE_ID,
          relationships,
        };
      });

      return entities;
    },

    getEntityCount: async (): Promise<number> => {
      const graph = getPersistentGraph();
      await graph.initialize();
      const stats = graph.getStatistics();
      return stats.nodeCount;
    },

    isAvailable: async (): Promise<boolean> => {
      await Promise.resolve();
      return typeof indexedDB !== 'undefined';
    },
  });
