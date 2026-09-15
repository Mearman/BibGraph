/**
 * Graph Expansion
 *
 * Provides functionality for expanding nodes in the persistent graph
 * by fetching their relationships from the OpenAlex API.
 *
 * When a user clicks on a node, this module:
 * 1. Fetches the full entity data if not already present
 * 2. Extracts and indexes all relationships
 * 3. Creates stub nodes for newly discovered entities
 * 4. Marks the node as expanded
 */

import type { EntityType } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';

import {
  getAuthorById,
  getAuthors,
  getConceptById,
  getFunderById,
  getInstitutionById,
  getInstitutions,
  getKeywordById,
  getPublisherById,
  getSourceById,
  getSources,
  getTopicById,
  getWorkById,
  getWorks,
} from '../../helpers';
import { extractAndIndexRelationships } from './graph-extraction';
import type { PersistentGraph } from './persistent-graph';

const LOG_PREFIX = 'graph-expansion';

/**
 * OpenAlex ID prefix to entity type mapping
 */
const ID_PREFIX_TO_TYPE: Record<string, EntityType> = {
  W: 'works',
  A: 'authors',
  I: 'institutions',
  S: 'sources',
  C: 'concepts',
  T: 'topics',
  F: 'funders',
  P: 'publishers',
  K: 'keywords',
};

/**
 * Infer entity type from OpenAlex ID prefix
 * e.g., "W123456" resolves to "works", "A789012" resolves to "authors"
 */
const inferEntityTypeFromId = (id: string): EntityType | undefined => {
  if (!id || id.length < 2) return undefined;
  const prefix = id.charAt(0).toUpperCase();
  return ID_PREFIX_TO_TYPE[prefix];
};

/**
 * Check if a label looks like an ID-only label (no display name resolved)
 * ID-only labels match the OpenAlex ID pattern: letter followed by digits
 */
const isIdOnlyLabel = (label: string): boolean => /^[A-Z]\d+$/i.test(label);

/**
 * Maximum number of IDs to include in a single batch query
 * OpenAlex supports up to 100 IDs with OR syntax
 */
const BATCH_SIZE = 100;

/**
 * Resolve display names for stub nodes that have ID-only labels
 * Uses batch OR syntax for efficiency (e.g., id:W1|W2|W3)
 * @param stubs - Stub nodes to resolve labels for
 * @returns Map of entity ID to resolved display_name
 */
const resolveStubLabels = async (stubs: readonly { id: string; entityType: EntityType; label: string }[]): Promise<Map<string, string>> => {
  const labelMap = new Map<string, string>();

  // Filter to only stubs with ID-only labels
  const needsResolution = stubs.filter((stub) => isIdOnlyLabel(stub.label));

  if (needsResolution.length === 0) {
    return labelMap;
  }

  logger.debug(LOG_PREFIX, `Resolving labels for ${String(needsResolution.length)} stub nodes using batch queries`);

  // Group stubs by entity type for batch queries
  const stubsByType = new Map<EntityType, { id: string; label: string }[]>();
  for (const stub of needsResolution) {
    const existing = stubsByType.get(stub.entityType) ?? [];
    existing.push({ id: stub.id, label: stub.label });
    stubsByType.set(stub.entityType, existing);
  }

  // Process each entity type with batch queries
  for (const [entityType, typeStubs] of stubsByType) {
    // Split into batches of BATCH_SIZE
    for (let index = 0; index < typeStubs.length; index += BATCH_SIZE) {
      const batch = typeStubs.slice(index, index + BATCH_SIZE);
      const idFilter = batch.map((s) => s.id).join('|');
      const selectFields = ['id', 'display_name', 'title'];

      try {
        // Use batch query with OR syntax - different helpers per entity type
        let results: { id: string; display_name?: string; title?: string }[] = [];

        switch (entityType) {
          case 'works': {
            const response = await getWorks({
              filter: `id:${idFilter}`,
              select: selectFields,
              per_page: batch.length,
            });
            results = response.results;
            break;
          }
          case 'authors': {
            const response = await getAuthors({
              filter: `id:${idFilter}`,
              select: selectFields,
              per_page: batch.length,
            });
            results = response.results;
            break;
          }
          case 'institutions': {
            const response = await getInstitutions({
              filters: { id: idFilter },
              select: selectFields,
              per_page: batch.length,
            });
            results = response.results;
            break;
          }
          case 'sources': {
            const response = await getSources({
              filters: { id: idFilter },
              select: selectFields,
              per_page: batch.length,
            });
            results = response.results;
            break;
          }
          case 'topics':
          case 'concepts':
          case 'publishers':
          case 'funders':
          case 'keywords':
          case 'domains':
          case 'fields':
          case 'subfields':
          default:
            // For other entity types without batch support, skip batch resolution
            logger.debug(LOG_PREFIX, `Batch resolution not supported for ${entityType}, skipping ${String(batch.length)} stubs`);
            continue;
        }

        // Map resolved entities to their display names
        for (const entity of results) {
          const displayName = entity.display_name ?? entity.title;
          if (displayName !== undefined && entity.id) {
            // Normalize ID to short form for consistent lookup
            const shortId = entity.id.replace('https://openalex.org/', '');
            labelMap.set(shortId, displayName);
            // Also store with full URL for compatibility
            labelMap.set(entity.id, displayName);
          }
        }
      } catch (error) {
        // Log error but continue with other batches
        logger.warn(LOG_PREFIX, `Failed to resolve batch of ${entityType}`, { error, batchSize: batch.length });
      }
    }
  }

  logger.debug(LOG_PREFIX, `Resolved ${String(labelMap.size)} of ${String(needsResolution.length)} stub labels via batch queries`);

  return labelMap;
};

/**
 * Node data returned from expansion (for incremental UI updates)
 */
export interface ExpansionNode {
  id: string;
  entityType: EntityType;
  label: string;
  completeness: 'stub' | 'partial' | 'full';
}

/**
 * Edge data returned from expansion (for incremental UI updates)
 */
export interface ExpansionEdge {
  source: string;
  target: string;
  type: string;
  score?: number;
  authorPosition?: string;
  isCorresponding?: boolean;
  isOpenAccess?: boolean;
}

/**
 * Result of expanding a node
 */
export interface NodeExpansionResult {
  /**
  Whether the expansion was successful
   */
  success: boolean;

  /**
  Number of new nodes added
   */
  nodesAdded: number;

  /**
  Number of new edges added
   */
  edgesAdded: number;

  /**
  Error message if expansion failed
   */
  error?: string;

  /**
  Whether the entity was already fully expanded
   */
  alreadyExpanded: boolean;

  /**
  Actual nodes that were added (for incremental UI updates)
   */
  nodes: ExpansionNode[];

  /**
  Actual edges that were added (for incremental UI updates)
   */
  edges: ExpansionEdge[];
}

/**
 * Fetch entity data by type and ID
 */
const fetchEntityData = async (entityType: EntityType, entityId: string): Promise<Record<string, unknown> | null> => {
  try {
    switch (entityType) {
      case 'works':
        return await getWorkById(entityId);
      case 'authors':
        return await getAuthorById(entityId);
      case 'institutions':
        return await getInstitutionById(entityId);
      case 'sources':
        return await getSourceById(entityId);
      case 'topics':
        return await getTopicById(entityId);
      case 'funders':
        return await getFunderById(entityId);
      case 'publishers':
        return await getPublisherById(entityId);
      case 'concepts':
        return await getConceptById(entityId);
      case 'keywords':
        return await getKeywordById(entityId);
      case 'domains':
      case 'fields':
      case 'subfields':
      default:
        logger.warn(LOG_PREFIX, `Unsupported entity type: ${entityType}`);
        return null;
    }
  } catch (error) {
    logger.error(LOG_PREFIX, `Failed to fetch ${entityType} ${entityId}`, { error });
    return null;
  }
};

/**
 * Expand a node by fetching its entity data and all relationships
 *
 * This function:
 * 1. Checks if the node is already expanded (returns early if so)
 * 2. Fetches the full entity data from OpenAlex API
 * 3. Extracts and indexes all relationships
 * 4. Creates stub nodes for newly discovered entities
 * 5. Marks the node as expanded with timestamp
 * @param graph - The PersistentGraph instance
 * @param nodeId - The ID of the node to expand
 * @returns Expansion result with statistics
 */
export const expandNode = async (graph: PersistentGraph, nodeId: string, entityType?: EntityType): Promise<NodeExpansionResult> => {
  // Get current node state
  const node = graph.getNode(nodeId);

  // If node doesn't exist in graph, we need to fetch and add it first
  if (!node) {
    // If no entity type provided, try to infer from ID prefix
    const inferredType = entityType ?? inferEntityTypeFromId(nodeId);
    if (!inferredType) {
      return {
        success: false,
        nodesAdded: 0,
        edgesAdded: 0,
        error: `Node ${nodeId} not found in graph and entity type could not be determined`,
        alreadyExpanded: false,
        nodes: [],
        edges: [],
      };
    }

    logger.debug(LOG_PREFIX, `Node ${nodeId} not in graph, fetching and adding...`);

    // Fetch the entity data to create the node
    const entityData = await fetchEntityData(inferredType, nodeId);
    if (!entityData) {
      return {
        success: false,
        nodesAdded: 0,
        edgesAdded: 0,
        error: `Failed to fetch entity data for ${nodeId}`,
        alreadyExpanded: false,
        nodes: [],
        edges: [],
      };
    }

    // Add the node to the graph using extractAndIndexRelationships
    // This will create the node and extract its relationships
    const extractionResult = await extractAndIndexRelationships(
      graph,
      inferredType,
      nodeId,
      entityData
    );

    // Mark node as expanded
    await graph.markNodeExpanded(nodeId);

    // Resolve labels for stubs that still have ID-only labels
    const resolvedLabels = await resolveStubLabels(extractionResult.stubNodes);

    // Update graph nodes with resolved labels
    for (const [id, label] of resolvedLabels) {
      await graph.updateNodeLabel(id, label);
    }

    // Convert extraction result to expansion result format (with resolved labels)
    const expansionNodes: ExpansionNode[] = extractionResult.stubNodes.map((stub) => ({
      id: stub.id,
      entityType: stub.entityType,
      label: resolvedLabels.get(stub.id) ?? stub.label,
      completeness: stub.completeness,
    }));

    const expansionEdges: ExpansionEdge[] = extractionResult.edgeInputs.map((edge) => ({
      source: edge.source,
      target: edge.target,
      type: edge.type,
      score: edge.score,
      authorPosition: edge.authorPosition,
      isCorresponding: edge.isCorresponding,
      isOpenAccess: edge.isOpenAccess,
    }));

    return {
      success: true,
      nodesAdded: extractionResult.nodesProcessed + extractionResult.stubsCreated,
      edgesAdded: extractionResult.edgesAdded,
      alreadyExpanded: false,
      nodes: expansionNodes,
      edges: expansionEdges,
    };
  }

  // Check if already expanded
  if (node.expandedAt !== undefined) {
    logger.debug(LOG_PREFIX, `Node ${nodeId} already expanded`, {
      expandedAt: new Date(node.expandedAt).toISOString(),
    });
    return {
      success: true,
      nodesAdded: 0,
      edgesAdded: 0,
      alreadyExpanded: true,
      nodes: [],
      edges: [],
    };
  }

  // Get counts before expansion
  const nodeCountBefore = graph.getStatistics().nodeCount;
  const edgeCountBefore = graph.getStatistics().edgeCount;

  // Fetch entity data
  logger.debug(LOG_PREFIX, `Fetching entity data for ${node.entityType} ${nodeId}`);
  const entityData = await fetchEntityData(node.entityType, nodeId);

  if (!entityData) {
    return {
      success: false,
      nodesAdded: 0,
      edgesAdded: 0,
      error: `Failed to fetch entity data for ${nodeId}`,
      alreadyExpanded: false,
      nodes: [],
      edges: [],
    };
  }

  // Extract and index relationships
  const extractionResult = await extractAndIndexRelationships(
    graph,
    node.entityType,
    nodeId,
    entityData
  );

  // Mark node as expanded
  await graph.markNodeExpanded(nodeId);

  // Calculate added counts
  const nodeCountAfter = graph.getStatistics().nodeCount;
  const edgeCountAfter = graph.getStatistics().edgeCount;

  // Resolve labels for stubs that still have ID-only labels
  const resolvedLabels = await resolveStubLabels(extractionResult.stubNodes);

  // Update graph nodes with resolved labels
  for (const [id, label] of resolvedLabels) {
    await graph.updateNodeLabel(id, label);
  }

  // Convert extraction result to expansion result format (with resolved labels)
  const expansionNodes: ExpansionNode[] = extractionResult.stubNodes.map((stub) => ({
    id: stub.id,
    entityType: stub.entityType,
    label: resolvedLabels.get(stub.id) ?? stub.label,
    completeness: stub.completeness,
  }));

  const expansionEdges: ExpansionEdge[] = extractionResult.edgeInputs.map((edge) => ({
    source: edge.source,
    target: edge.target,
    type: edge.type,
    score: edge.score,
    authorPosition: edge.authorPosition,
    isCorresponding: edge.isCorresponding,
    isOpenAccess: edge.isOpenAccess,
  }));

  const result: NodeExpansionResult = {
    success: true,
    nodesAdded: nodeCountAfter - nodeCountBefore,
    edgesAdded: edgeCountAfter - edgeCountBefore,
    alreadyExpanded: false,
    nodes: expansionNodes,
    edges: expansionEdges,
  };

  logger.debug(LOG_PREFIX, `Expanded node ${nodeId}`, {
    nodesAdded: result.nodesAdded,
    edgesAdded: result.edgesAdded,
    relationshipsExtracted: extractionResult.edgesAdded,
    stubsCreated: extractionResult.stubsCreated,
    labelsResolved: resolvedLabels.size,
  });

  return result;
};

/**
 * Check if a node is fully expanded (has expandedAt timestamp)
 */
export const isNodeExpanded = (graph: PersistentGraph, nodeId: string): boolean => {
  const node = graph.getNode(nodeId);
  return node?.expandedAt !== undefined;
};

/**
 * Check if a node is a stub (completeness === 'stub')
 */
export const isStubNode = (graph: PersistentGraph, nodeId: string): boolean => {
  const node = graph.getNode(nodeId);
  return node?.completeness === 'stub';
};
