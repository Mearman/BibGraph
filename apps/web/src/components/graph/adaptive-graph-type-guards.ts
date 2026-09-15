/**
 * Type guards for AdaptiveGraphRenderer
 */

import type { GraphNode } from '@bibgraph/types';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';

import type { ForceGraphLinkData, ForceGraphNodeData } from './adaptive-graph-types';

/**
 * Type guard for force graph node with position and entity data
 */
export const isForceGraphNode = (node: unknown): node is ForceGraphNodeData => typeof node === 'object' &&
    node !== null &&
    'x' in node &&
    typeof node.x === 'number' &&
    'y' in node &&
    typeof node.y === 'number' &&
    'entityType' in node &&
    typeof node.entityType === 'string' &&
    'label' in node &&
    typeof node.label === 'string';

/**
 * Type guard for a position-bearing endpoint (link source/target) with numeric x/y coordinates
 */
const hasNumericPosition = (endpoint: unknown): endpoint is { x: number; y: number } =>
  typeof endpoint === 'object' &&
  endpoint !== null &&
  'x' in endpoint &&
  typeof endpoint.x === 'number' &&
  'y' in endpoint &&
  typeof endpoint.y === 'number';

/**
 * Type guard for force graph link with source and target positions
 */
export const isForceGraphLink = (link: unknown): link is ForceGraphLinkData => {
  if (typeof link !== 'object' || link === null) return false;
  if (!('source' in link) || !('target' in link)) return false;

  return hasNumericPosition(link.source) && hasNumericPosition(link.target);
};

/**
 * Type guard for GraphNode callback parameter
 */
export const isGraphCallbackNode = (node: unknown): node is GraphNode => typeof node === 'object' &&
    node !== null &&
    'id' in node &&
    typeof node.id === 'string' &&
    'entityType' in node &&
    typeof node.entityType === 'string' &&
    'label' in node &&
    typeof node.label === 'string' &&
    'entityId' in node &&
    typeof node.entityId === 'string';

/**
 * Type guard for force graph methods with zoom capability
 */
export const hasZoomMethod = (obj: ForceGraphMethods<NodeObject, LinkObject<NodeObject>> | undefined): obj is ForceGraphMethods<NodeObject, LinkObject<NodeObject>> => obj !== undefined;
