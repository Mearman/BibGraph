/**
 * Minimal Hierarchical Layout Algorithm
 *
 * A Reingold-Tilford inspired tree layout for graph visualization.
 * Extracted locally to avoid dependency on external graph algorithm packages.
 *
 * @module utils/hierarchical-layout
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';

/**
 * Layout configuration options
 */
export interface HierarchicalLayoutOptions {
  /** Distance between levels (horizontal) */
  levelSpacing?: number;
  /** Distance between nodes on same level (vertical) */
  nodeSpacing?: number;
  /** Root node ID (if null, selects node with no incoming edges) */
  rootNodeId?: string | null;
  /** Direction of tree growth */
  direction?: 'horizontal' | 'vertical';
}

/**
 * Positioned node with layout coordinates
 */
export interface HierarchicalPositionedNode {
  node: GraphNode;
  x: number;
  y: number;
  level: number;
}

/**
 * Layout result with positioned nodes
 */
export interface HierarchicalLayoutResult {
  nodes: HierarchicalPositionedNode[];
  maxDepth: number;
  rootNodeId: string;
}

const DEFAULT_LEVEL_SPACING = 150;
const DEFAULT_NODE_SPACING = 80;

const isParentChildEdge = (edge: GraphEdge): boolean => {
  return edge.type === 'REFERENCE' || edge.type === 'AUTHORSHIP' || edge.type === 'AFFILIATION';
};

const buildTreeStructure = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  rootNodeId: string | null
): { rootNodeId: string; children: Map<string, string[]> } => {
  const children = new Map<string, string[]>();
  const parents = new Map<string, string>();

  for (const edge of edges.filter(isParentChildEdge)) {
    const { source, target } = edge;
    let parent: string;
    let child: string;

    if (edge.type === 'AUTHORSHIP' || edge.type === 'AFFILIATION') {
      parent = source;
      child = target;
    } else {
      parent = target;
      child = source;
    }

    if (!children.has(parent)) {
      children.set(parent, []);
    }
    children.get(parent)?.push(child);
    parents.set(child, parent);
  }

  let root = rootNodeId;
  if (root === null) {
    const nodeIds = new Set(nodes.map((n) => n.id));
    const childIds = new Set(parents.keys());
    const rootCandidate = [...nodeIds].find((id) => !childIds.has(id));
    root = rootCandidate ?? nodes[0]?.id ?? '';
  }

  return { rootNodeId: root, children };
};

const calculateSubtreeWidth = (
  nodeId: string,
  children: Map<string, string[]>,
  nodeSpacing: number
): number => {
  const nodeChildren = children.get(nodeId);
  if (!nodeChildren || nodeChildren.length === 0) {
    return nodeSpacing;
  }
  return nodeChildren.reduce(
    (total, childId) => total + calculateSubtreeWidth(childId, children, nodeSpacing),
    0
  );
};

const assignChildPositions = (
  nodeId: string,
  children: Map<string, string[]>,
  nodeSpacing: number,
  startY: number
): Map<string, number> => {
  const positions = new Map<string, number>();
  const nodeChildren = children.get(nodeId);

  if (!nodeChildren || nodeChildren.length === 0) {
    return positions;
  }

  let currentY = startY;
  for (const childId of nodeChildren) {
    positions.set(childId, currentY);
    const childPositions = assignChildPositions(childId, children, nodeSpacing, currentY);
    for (const [id, y] of childPositions.entries()) {
      positions.set(id, y);
    }
    currentY += calculateSubtreeWidth(childId, children, nodeSpacing);
  }

  return positions;
};

/**
 * Apply hierarchical layout to graph
 * @param nodes - Graph nodes to position
 * @param edges - Graph edges defining relationships
 * @param options - Layout configuration options
 * @returns Layout result with positioned nodes
 */
export const hierarchicalLayout = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: HierarchicalLayoutOptions = {}
): HierarchicalLayoutResult => {
  const levelSpacing = options.levelSpacing ?? DEFAULT_LEVEL_SPACING;
  const nodeSpacing = options.nodeSpacing ?? DEFAULT_NODE_SPACING;
  const direction = options.direction ?? 'horizontal';

  if (nodes.length === 0) {
    return { nodes: [], maxDepth: 0, rootNodeId: '' };
  }

  const { rootNodeId, children } = buildTreeStructure(nodes, edges, options.rootNodeId ?? null);

  // BFS to assign levels
  const levels = new Map<string, number>();
  const queue: { nodeId: string; level: number }[] = [{ nodeId: rootNodeId, level: 0 }];
  const visited = new Set<string>([rootNodeId]);
  let maxDepth = 0;

  while (queue.length > 0) {
    const item = queue.shift();
    if (!item) break;
    const { nodeId, level } = item;
    levels.set(nodeId, level);
    maxDepth = Math.max(maxDepth, level);

    for (const childId of children.get(nodeId) ?? []) {
      if (!visited.has(childId)) {
        visited.add(childId);
        queue.push({ nodeId: childId, level: level + 1 });
      }
    }
  }

  // Calculate Y positions
  const yPositions = assignChildPositions(rootNodeId, children, nodeSpacing, 0);
  const rootSubtreeWidth = calculateSubtreeWidth(rootNodeId, children, nodeSpacing);
  yPositions.set(rootNodeId, rootSubtreeWidth / 2 - nodeSpacing / 2);

  // Create positioned nodes
  const positionedNodes: HierarchicalPositionedNode[] = nodes.map((node) => {
    const level = levels.get(node.id) ?? 0;
    const y = yPositions.get(node.id) ?? 0;

    const x = direction === 'horizontal' ? level * levelSpacing : y;
    const finalY = direction === 'horizontal' ? y : level * levelSpacing;

    return { node, x, y: finalY, level };
  });

  return { nodes: positionedNodes, maxDepth, rootNodeId };
};
