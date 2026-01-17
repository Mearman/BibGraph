/**
 * Type guards for AdaptiveGraphRenderer
 */

import type { GraphNode } from '@bibgraph/types';
import type { ForceGraphMethods, LinkObject, NodeObject } from 'react-force-graph-2d';

import type { ForceGraphLinkData, ForceGraphNodeData } from './adaptive-graph-types';

/**
 * Type guard for force graph node with position and entity data
 * @param node
 */
export const isForceGraphNode = (node: unknown): node is ForceGraphNodeData => typeof node === 'object' &&
    node !== null &&
    'x' in node &&
    typeof (node as Record<string, unknown>).x === 'number' &&
    'y' in node &&
    typeof (node as Record<string, unknown>).y === 'number' &&
    'entityType' in node &&
    typeof (node as Record<string, unknown>).entityType === 'string' &&
    'label' in node &&
    typeof (node as Record<string, unknown>).label === 'string';

/**
 * Type guard for force graph link with source and target positions
 * @param link
 */
export const isForceGraphLink = (link: unknown): link is ForceGraphLinkData => {
  if (typeof link !== 'object' || link === null) return false;
  const linkObj = link as Record<string, unknown>;

  if (!('source' in linkObj) || !('target' in linkObj)) return false;
  const source = linkObj.source;
  const target = linkObj.target;

  if (
    typeof source !== 'object' ||
    source === null ||
    typeof target !== 'object' ||
    target === null
  )
    return false;
  const sourceObj = source as Record<string, unknown>;
  const targetObj = target as Record<string, unknown>;

  return (
    'x' in sourceObj &&
    typeof sourceObj.x === 'number' &&
    'y' in sourceObj &&
    typeof sourceObj.y === 'number' &&
    'x' in targetObj &&
    typeof targetObj.x === 'number' &&
    'y' in targetObj &&
    typeof targetObj.y === 'number'
  );
};

/**
 * Type guard for GraphNode callback parameter
 * @param node
 */
export const isGraphCallbackNode = (node: unknown): node is GraphNode => typeof node === 'object' &&
    node !== null &&
    'id' in node &&
    typeof (node as Record<string, unknown>).id === 'string' &&
    'entityType' in node &&
    typeof (node as Record<string, unknown>).entityType === 'string' &&
    'label' in node &&
    typeof (node as Record<string, unknown>).label === 'string' &&
    'entityId' in node &&
    typeof (node as Record<string, unknown>).entityId === 'string';

/**
 * Type guard for force graph methods with zoom capability
 * @param obj
 */
export const hasZoomMethod = (obj: ForceGraphMethods<NodeObject, LinkObject<NodeObject>> | undefined): obj is ForceGraphMethods<NodeObject, LinkObject<NodeObject>> => obj !== undefined;
