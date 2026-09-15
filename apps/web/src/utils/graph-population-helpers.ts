/**
 * Helper functions for graph auto-population
 *
 * Contains pure functions and API interaction logic extracted from useGraphAutoPopulation to reduce hook complexity.
 */

import {
  getAuthors,
  getInstitutions,
  getSources,
  getTopicById,
  getWorks,
} from '@bibgraph/client';
import type {
  EntityType,
  GraphEdge,
  GraphNode,
  RelationshipQueryConfig
} from '@bibgraph/types';
import { RelationType } from '@bibgraph/types';
import type { BackgroundTaskExecutor } from '@bibgraph/utils';
import { logger } from '@bibgraph/utils';

import type {
  LabelResolutionBatch,
  RelationshipDirection,
} from '@/types/graph-auto-population';
import { BATCH_SIZE, PROCESSING_CHUNK_SIZE } from '@/types/graph-auto-population';

const LOG_PREFIX = 'graph-population';

// RelationType is a real TS enum, so its string-literal-typed counterpart (RelationshipQueryConfig['type']) needs a genuine runtime membership check to convert between them rather than a type assertion.
const RELATION_TYPE_VALUES: ReadonlySet<string> = new Set(Object.values(RelationType).map(String));

const isRelationType = (value: string): value is RelationType => RELATION_TYPE_VALUES.has(value);

const toRelationType = (value: string): RelationType => {
  if (!isRelationType(value)) {
    throw new Error(`Unknown relation type: ${value}`);
  }
  return value;
};

const isEntityWithId = (value: unknown): value is { id: string; [key: string]: unknown } =>
  typeof value === 'object' && value !== null && 'id' in value && typeof value.id === 'string';

/**
 * Check if a label looks like an ID-only label (e.g., "W123456", "A789")
 */
export const isIdOnlyLabel = (label: string): boolean => /^[A-Z]\d+$/i.test(label);

/**
 * Normalize an OpenAlex ID to short form (uppercase, no URL prefix)
 */
export const normalizeId = (id: string): string =>
  id.replace('https://openalex.org/', '').toUpperCase();

/**
 * Create batches from an array
 */
export const createBatches = <T>(items: readonly T[], batchSize: number = BATCH_SIZE): T[][] => {
  const batches: T[][] = [];
  for (let index = 0; index < items.length; index += batchSize) {
    batches.push(items.slice(index, index + batchSize));
  }
  return batches;
};

/**
 * Flatten batch processor results
 */
const flattenBatchResults = <T>(result: { success: boolean; data?: T[][] }): T[] => {
  const flattened: T[] = [];
  if (result.success && result.data) {
    for (const batch of result.data) {
      flattened.push(...batch);
    }
  }
  return flattened;
};

/**
 * Fetch entity data by type and ID
 */
const fetchEntityData = async (
  entityType: EntityType,
  nodeId: string
): Promise<Record<string, unknown> | null> => {
  switch (entityType) {
    case 'works': {
      const response = await getWorks({
        filter: `openalex_id:${nodeId}`,
        per_page: 1,
      });
      return response.results.length > 0
        ? (response.results[0])
        : null;
    }
    case 'authors': {
      const response = await getAuthors({
        filter: `openalex_id:${nodeId}`,
        per_page: 1,
      });
      return response.results.length > 0
        ? (response.results[0])
        : null;
    }
    case 'institutions': {
      const response = await getInstitutions({
        filters: { id: nodeId },
        per_page: 1,
      });
      return response.results.length > 0
        ? (response.results[0])
        : null;
    }
    case 'sources': {
      const response = await getSources({
        filters: { id: nodeId },
        per_page: 1,
      });
      return response.results.length > 0
        ? (response.results[0])
        : null;
    }
    case 'topics': {
      const topic = await getTopicById(nodeId);
      return topic;
    }
    case 'concepts':
    case 'publishers':
    case 'funders':
    case 'keywords':
    case 'domains':
    case 'fields':
    case 'subfields':
      return null;
    default:
      throw new Error(`Unhandled entity type: ${String(entityType)}`);
  }
};

/**
 * Execute API query for relationship discovery based on target type
 */
const executeRelationshipQuery = async (
  targetType: EntityType,
  filter: string,
  selectFields: readonly string[]
): Promise<{ results: unknown[] } | null> => {
  switch (targetType) {
    case 'works':
      return getWorks({
        filter,
        per_page: 100,
        select: [...selectFields],
      });
    case 'authors':
      return getAuthors({
        filter,
        per_page: 100,
        select: [...selectFields],
      });
    case 'institutions':
      return getInstitutions({
        filters: { id: filter },
        per_page: 100,
        select: [...selectFields],
      });
    case 'sources':
      return getSources({
        filters: { id: filter },
        per_page: 100,
        select: [...selectFields],
      });
    case 'topics':
    case 'concepts':
    case 'publishers':
    case 'funders':
    case 'keywords':
    case 'domains':
    case 'fields':
    case 'subfields':
      logger.warn(LOG_PREFIX, `Unsupported target type ${targetType} for discovery`);
      return null;
    default:
      throw new Error(`Unhandled entity type: ${String(targetType)}`);
  }
};

/**
 * Create an edge object with proper structure
 */
const createEdge = (
  sourceId: string,
  targetId: string,
  relationType: RelationType
): GraphEdge => ({
  id: `${sourceId}-${targetId}-${relationType}`,
  source: sourceId,
  target: targetId,
  type: relationType,
  weight: 1,
});

/**
 * Determine edge source and target based on direction
 */
const determineEdgeEndpoints = (
  nodeId: string,
  relatedId: string,
  direction: RelationshipDirection
): { sourceId: string; targetId: string } => {
  if (direction === 'inbound') {
    return { sourceId: relatedId, targetId: nodeId };
  }
  return { sourceId: nodeId, targetId: relatedId };
};

/**
 * Check if an edge should be created (not existing and not processed)
 */
const shouldCreateEdge = (
  edgeKey: string,
  pairKey: string,
  existingEdgeKeys: Set<string>,
  processedPairs: Set<string>
): boolean => !existingEdgeKeys.has(edgeKey) && !processedPairs.has(pairKey);

/**
 * Resolve labels for a batch of entities
 */
export const resolveLabelBatch = async (
  batch: LabelResolutionBatch
): Promise<{ id: string; display_name?: string; title?: string }[]> => {
  const idFilter = batch.ids.join('|');
  const selectFields = ['id', 'display_name', 'title'];

  try {
    let results: { id: string; display_name?: string; title?: string }[] = [];

    switch (batch.entityType) {
      case 'works': {
        const response = await getWorks({
          filter: `id:${idFilter}`,
          per_page: batch.ids.length,
          select: selectFields,
        });
        results = response.results;
        break;
      }
      case 'authors': {
        const response = await getAuthors({
          filter: `id:${idFilter}`,
          per_page: batch.ids.length,
          select: selectFields,
        });
        results = response.results;
        break;
      }
      case 'institutions': {
        const response = await getInstitutions({
          filters: { id: idFilter },
          per_page: batch.ids.length,
          select: selectFields,
        });
        results = response.results;
        break;
      }
      case 'sources': {
        const response = await getSources({
          filters: { id: idFilter },
          per_page: batch.ids.length,
          select: selectFields,
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
        return [];
    }

    return results;
  } catch (error) {
    logger.warn(LOG_PREFIX, `Failed to resolve batch of ${batch.entityType}`, { error: error });
    return [];
  }
};

/**
 * Process API query results to discover edges
 */
const processApiQueryResults = (
  results: readonly { id: string; [key: string]: unknown }[],
  batchIds: readonly string[],
  relationType: RelationType,
  direction: RelationshipDirection,
  allNodeIds: Set<string>,
  existingEdgeKeys: Set<string>,
  processedPairs: Set<string>
): GraphEdge[] => {
  const discoveredEdges: GraphEdge[] = [];

  for (const entity of results) {
    const entityId = normalizeId(entity.id);

    if (!allNodeIds.has(entityId)) continue;

    for (const batchId of batchIds) {
      const normalizedBatchId = normalizeId(batchId);

      if (!allNodeIds.has(normalizedBatchId)) continue;

      const { sourceId, targetId } = determineEdgeEndpoints(
        normalizedBatchId,
        entityId,
        direction
      );

      const edgeKey = `${sourceId}-${targetId}-${relationType}`;
      const pairKey = `${sourceId}-${targetId}`;

      if (!shouldCreateEdge(edgeKey, pairKey, existingEdgeKeys, processedPairs)) {
        continue;
      }

      processedPairs.add(pairKey);
      discoveredEdges.push(createEdge(sourceId, targetId, relationType));
    }
  }

  return discoveredEdges;
};

/**
 * Discover relationships for API-based query configuration
 */
export const discoverApiRelationships = async (
  sourceNodes: readonly GraphNode[],
  query: RelationshipQueryConfig & { source: 'api' },
  allNodeIds: Set<string>,
  existingEdgeKeys: Set<string>,
  processedPairs: Set<string>,
  direction: RelationshipDirection,
  executor: BackgroundTaskExecutor,
  signal?: AbortSignal
): Promise<GraphEdge[]> => {
  const sourceIds = sourceNodes.map((n) => n.id);
  const batches = createBatches(sourceIds);

  const result = await executor.processBatch(
    batches,
    async (batch) => {
      try {
        const filterValue = batch.join('|');
        const filter = query.buildFilter(filterValue);

        const response = await executeRelationshipQuery(
          query.targetType,
          filter,
          query.select ?? ['id']
        );

        if (!response) return [];

        return processApiQueryResults(
          response.results.filter(isEntityWithId),
          batch,
          toRelationType(query.type),
          direction,
          allNodeIds,
          existingEdgeKeys,
          processedPairs
        );
      } catch (error) {
        logger.warn(LOG_PREFIX, `Failed to discover ${query.type} relationships`, { error: error });
        return [];
      }
    },
    { signal, chunkSize: PROCESSING_CHUNK_SIZE }
  );

  const edges = flattenBatchResults(result);
  logger.debug(LOG_PREFIX, `Discovered ${String(edges.length)} ${query.type} edges via API`);
  return edges;
};

/**
 * Discover relationships from embedded data
 */
export const discoverEmbeddedRelationships = async (
  sourceNodes: readonly GraphNode[],
  query: RelationshipQueryConfig & { source: 'embedded' },
  sourceEntityType: EntityType,
  allNodeIds: Set<string>,
  existingEdgeKeys: Set<string>,
  processedPairs: Set<string>,
  direction: RelationshipDirection,
  executor: BackgroundTaskExecutor,
  signal?: AbortSignal
): Promise<GraphEdge[]> => {
  const batches = createBatches(sourceNodes);

  const result = await executor.processBatch(
    batches,
    async (batch) => {
      const discoveredEdges: GraphEdge[] = [];

      for (const node of batch) {
        try {
          const entityData = await fetchEntityData(sourceEntityType, node.id);
          if (!entityData) continue;

          const embeddedItems = query.extractEmbedded(entityData);

          for (const item of embeddedItems) {
            const targetId = normalizeId(item.id);
            if (!allNodeIds.has(targetId)) continue;

            const sourceId = normalizeId(node.id);
            const { sourceId: edgeSource, targetId: edgeTarget } = determineEdgeEndpoints(
              sourceId,
              targetId,
              direction
            );

            const edgeKey = `${edgeSource}-${edgeTarget}-${query.type}`;
            const pairKey = `${edgeSource}-${edgeTarget}`;

            if (!shouldCreateEdge(edgeKey, pairKey, existingEdgeKeys, processedPairs)) {
              continue;
            }

            processedPairs.add(pairKey);
            discoveredEdges.push(createEdge(edgeSource, edgeTarget, toRelationType(query.type)));
          }
        } catch (error) {
          logger.warn(LOG_PREFIX, `Failed to discover embedded ${query.type} for ${node.id}`, {
            error: error,
          });
        }
      }

      return discoveredEdges;
    },
    { signal, chunkSize: PROCESSING_CHUNK_SIZE }
  );

  const edges = flattenBatchResults(result);
  logger.debug(LOG_PREFIX, `Discovered ${String(edges.length)} embedded ${query.type} edges`);
  return edges;
};

/**
 * Discover relationships from embedded IDs with resolution
 */
export const discoverEmbeddedWithResolutionRelationships = async (
  sourceNodes: readonly GraphNode[],
  query: RelationshipQueryConfig & { source: 'embedded-with-resolution' },
  sourceEntityType: EntityType,
  allNodeIds: Set<string>,
  existingEdgeKeys: Set<string>,
  processedPairs: Set<string>,
  direction: RelationshipDirection,
  executor: BackgroundTaskExecutor,
  signal?: AbortSignal
): Promise<GraphEdge[]> => {
  const batches = createBatches(sourceNodes);

  const result = await executor.processBatch(
    batches,
    async (batch) => {
      const discoveredEdges: GraphEdge[] = [];

      for (const node of batch) {
        try {
          // Currently only institutions supported for embedded-with-resolution
          if (sourceEntityType !== 'institutions') continue;

          const response = await getInstitutions({
            filters: { id: node.id },
            per_page: 1,
          });

          if (response.results.length === 0) continue;

          const entityData = response.results[0];
          const itemsNeedingResolution = query.extractIds(entityData);

          for (const item of itemsNeedingResolution) {
            const targetId = normalizeId(item.id);
            if (!allNodeIds.has(targetId)) continue;

            const sourceId = normalizeId(node.id);
            const { sourceId: edgeSource, targetId: edgeTarget } = determineEdgeEndpoints(
              sourceId,
              targetId,
              direction
            );

            const edgeKey = `${edgeSource}-${edgeTarget}-${query.type}`;
            const pairKey = `${edgeSource}-${edgeTarget}`;

            if (!shouldCreateEdge(edgeKey, pairKey, existingEdgeKeys, processedPairs)) {
              continue;
            }

            processedPairs.add(pairKey);
            discoveredEdges.push(createEdge(edgeSource, edgeTarget, toRelationType(query.type)));
          }
        } catch (error) {
          logger.warn(
            LOG_PREFIX,
            `Failed to discover embedded-with-resolution ${query.type} for ${node.id}`,
            { error: error }
          );
        }
      }

      return discoveredEdges;
    },
    { signal, chunkSize: PROCESSING_CHUNK_SIZE }
  );

  const edges = flattenBatchResults(result);
  logger.debug(LOG_PREFIX, `Discovered ${String(edges.length)} embedded-with-resolution ${query.type} edges`);
  return edges;
};
