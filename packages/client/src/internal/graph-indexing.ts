/**
 * Graph Indexing Module
 *
 * Functions for indexing OpenAlex entities in the persistent graph
 */

import type { EntityType, OpenAlexEntity } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import { extractAndIndexRelationships } from "../cache/dexie/graph-extraction";
import { getPersistentGraph } from "../cache/dexie/persistent-graph";
import { hasValidOpenAlexId } from "./entity-type-detection";
import { cleanOpenAlexId } from "./static-data-utils";

/**
 * Index a single entity in the persistent graph
 * Extracts relationships and stores nodes/edges for fast graph queries
 * @param entityId - The cleaned entity ID
 * @param entityType - The entity type
 * @param entityData - The full entity data
 */
export const indexEntityInGraph = async (entityId: string, entityType: string, entityData: OpenAlexEntity): Promise<void> => {
  try {
    const graph = getPersistentGraph();
    await graph.initialize();

    const result = await extractAndIndexRelationships(
      graph,
      entityType as EntityType,
      entityId,
      entityData as Record<string, unknown>,
    );

    if (result.edgesAdded > 0 || result.stubsCreated > 0) {
      logger.debug("client", "Indexed entity in graph", {
        entityId,
        entityType,
        nodesProcessed: result.nodesProcessed,
        edgesAdded: result.edgesAdded,
        stubsCreated: result.stubsCreated,
      });
    }
  } catch (error: unknown) {
    // Log but don't throw - graph indexing is a non-critical enhancement
    logger.debug("client", "Failed to index entity in graph", {
      entityId,
      entityType,
      error,
    });
  }
};

/**
 * Index multiple entities in the persistent graph
 * Used for batch indexing from list responses
 * @param results - Array of entity results
 * @param entityType - The entity type
 */
export const indexEntitiesInGraph = async (results: unknown[], entityType: string): Promise<void> => {
  try {
    const graph = getPersistentGraph();
    await graph.initialize();

    let totalNodes = 0;
    let totalEdges = 0;
    let totalStubs = 0;

    for (const result of results) {
      if (hasValidOpenAlexId(result)) {
        const cleanId = cleanOpenAlexId(result.id);
        try {
          const extractResult = await extractAndIndexRelationships(
            graph,
            entityType as EntityType,
            cleanId,
            result as Record<string, unknown>,
          );
          totalNodes += extractResult.nodesProcessed;
          totalEdges += extractResult.edgesAdded;
          totalStubs += extractResult.stubsCreated;
        } catch {
          // Silently ignore individual indexing failures
        }
      }
    }

    if (totalEdges > 0 || totalStubs > 0) {
      logger.debug("client", "Indexed entities in graph from list response", {
        entityType,
        count: results.length,
        nodesProcessed: totalNodes,
        edgesAdded: totalEdges,
        stubsCreated: totalStubs,
      });
    }
  } catch (error: unknown) {
    // Log but don't throw - graph indexing is a non-critical enhancement
    logger.debug("client", "Failed to index entities in graph", {
      entityType,
      error,
    });
  }
};
