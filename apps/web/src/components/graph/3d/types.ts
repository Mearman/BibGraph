/**
 * Type definitions for 3D Force-directed graph visualization
 *
 * These types are specific to the Three.js/react-force-graph-3d implementation.
 */

import type { EntityType, GraphEdge, GraphNode } from '@bibgraph/types';

/**
 * Node representation for the 3D force graph (extends NodeObject)
 */
export interface ForceGraphNode {
  id: string;
  entityType: EntityType;
  label: string;
  entityId: string;
  /** Position managed by force simulation */
  x?: number;
  y?: number;
  z?: number;
  /** Fixed x position (prevents simulation movement) */
  fx?: number;
  /** Fixed y position (prevents simulation movement) */
  fy?: number;
  /** Fixed z position (prevents simulation movement) */
  fz?: number;
  /** Reference to original graph node */
  originalNode: GraphNode;
}

/**
 * Link representation for the 3D force graph
 */
export interface ForceGraphLink {
  id: string;
  type: string;
  source: string | ForceGraphNode;
  target: string | ForceGraphNode;
  /** Reference to original graph edge */
  originalEdge: GraphEdge;
}

/**
 * Graph data structure for react-force-graph-3d
 */
export interface ForceGraphData {
  nodes: ForceGraphNode[];
  links: ForceGraphLink[];
}

/**
 * LOD (Level of Detail) render settings for nodes
 */
export interface LODRenderSettings {
  /** Number of sphere segments (lower = better performance) */
  segments: number;
  /** Whether to show the label sprite */
  showLabel: boolean;
  /** Material type: 'basic' (fast) or 'phong' (quality) */
  materialType: 'basic' | 'phong';
  /** Whether to render highlight ring for selected nodes */
  useRing: boolean;
}

/**
 * 3D position vector
 */
export interface Vector3D {
  x: number;
  y: number;
  z: number;
}

/**
 * WebGL availability status
 */
export interface WebGLStatus {
  available: boolean;
  reason?: string;
}
