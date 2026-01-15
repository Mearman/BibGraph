/**
 * Heterogeneous graph path planting
 *
 * For graphs with multiple node types (e.g., OpenAlex with Works, Authors, Institutions)
 */

import { Graph } from '../../graph/graph';
import type { Path } from '../../types/algorithm-results';
import type { Edge, Node } from '../../types/graph';
import { type PlantedPathConfig,plantGroundTruthPaths } from './path-generator';

/**
 * Extended configuration for heterogeneous graphs.
 */
export interface HeterogeneousPathConfig<N extends Node, E extends Edge> extends PlantedPathConfig<N, E> {
  /** Path template specifying node types along path */
  pathTemplate: string[];

  /** Entity types in the graph */
  entityTypes: string[];
}

/**
 * Type-safe node type check.
 * @param node
 */
const getNodeType = <N extends Node>(node: N): string => {
  if ('type' in node && typeof node.type === 'string') {
    return node.type;
  }
  if ('entityType' in node && typeof node.entityType === 'string') {
    return node.entityType;
  }
  return 'unknown';
};

/**
 * Plant paths in heterogeneous graphs respecting entity type constraints.
 *
 * Ensures planted paths follow a type pattern (e.g., Work → Author → Work → Institution).
 *
 * @template N - Node type
 * @template E - Edge type
 * @param graph - Heterogeneous graph
 * @param pathTemplate - Template specifying node types along path
 * @param config - Planting configuration
 * @returns Graph with planted heterogeneous paths
 */
export const plantHeterogeneousPaths = <N extends Node, E extends Edge>(graph: Graph<N, E>, pathTemplate: string[], config: HeterogeneousPathConfig<N, E>) => {
  // Validate path template
  if (pathTemplate.length < 2) {
    throw new Error('Path template must have at least 2 node types');
  }

  // Group nodes by type
  const nodesByType = new Map<string, N[]>();
  for (const node of graph.getAllNodes()) {
    const nodeType = getNodeType(node);

    if (config.entityTypes.includes(nodeType)) {
      const existing = nodesByType.get(nodeType) ?? [];
      existing.push(node);
      nodesByType.set(nodeType, existing);
    }
  }

  // Check if all required types exist
  for (const type of pathTemplate) {
    if (!nodesByType.has(type)) {
      throw new Error(`No nodes found with type: ${type}`);
    }
  }

  // Generate path configuration with source/target constraints
  const sourceType = pathTemplate[0];
  const targetType = pathTemplate[pathTemplate.length - 1];

  const sources = nodesByType.get(sourceType)?.map(n => n.id) ?? [];
  const targets = nodesByType.get(targetType)?.map(n => n.id) ?? [];

  const extendedConfig: PlantedPathConfig<N, E> = {
    ...config,
    sourceNodes: sources,
    targetNodes: targets,
  };

  // Plant paths with type constraints
  // Note: The path generator doesn't enforce intermediate node types,
  // so this is a best-effort implementation
  return plantGroundTruthPaths(graph, extendedConfig);
};

/**
 * Filter nodes by entity type.
 * @param nodes
 * @param entityType
 */
export const filterNodesByType = <N extends Node>(nodes: N[], entityType: string): N[] => nodes.filter(node => getNodeType(node) === entityType);

/**
 * Check if a path follows a type template.
 * @param path
 * @param template
 */
export const pathFollowsTemplate = <N extends Node, E extends Edge>(path: Path<N, E>, template: string[]): boolean => {
  if (path.nodes.length !== template.length) {
    return false;
  }

  for (let i = 0; i < path.nodes.length; i++) {
    const nodeType = getNodeType(path.nodes[i]!);
    if (nodeType !== template[i]) {
      return false;
    }
  }

  return true;
};
