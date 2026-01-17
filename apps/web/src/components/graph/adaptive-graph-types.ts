/**
 * Type definitions for AdaptiveGraphRenderer
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';

export interface AdaptiveGraphRendererProps {
  /** Graph nodes */
  nodes: GraphNode[];
  /** Graph edges */
  edges: GraphEdge[];
  /** Whether to show the graph */
  visible?: boolean;
  /** Width of the visualization */
  width?: number;
  /** Height of the visualization */
  height?: number;
  /** Node click handler */
  onNodeClick?: (node: GraphNode) => void;
  /** Node right-click handler */
  onNodeRightClick?: (node: GraphNode, event: MouseEvent) => void;
  /** Node hover handler */
  onNodeHover?: (node: GraphNode | null) => void;
  /** Background click handler */
  onBackgroundClick?: () => void;
  /** Enable/disable force simulation */
  enableSimulation?: boolean;
  /** Show performance overlay */
  showPerformanceOverlay?: boolean;
  /** Callback when graph methods become available */
  onGraphReady?: (methods: unknown) => void;
  /** Custom performance profile (auto-detected if not provided) */
  performanceProfile?: PerformanceProfile;
}

export type PerformanceProfile = 'low' | 'medium' | 'high';

export type PerformanceLevel = 'good' | 'ok' | 'poor';

export interface PerformanceMetrics {
  fps: number;
  frameTime: number;
  memoryUsage?: number;
  nodeCount: number;
  edgeCount: number;
  performanceLevel: PerformanceLevel;
}

export type DetailLevel = 'low' | 'medium' | 'high';

export interface RenderSettings {
  nodeDetail: DetailLevel;
  linkDetail: DetailLevel;
  animationEnabled: boolean;
  labelEnabled: boolean;
  simulationCooldown: number;
  maxNodes: number;
  renderMode: 'canvas' | 'webgl';
}

export interface DeviceCapabilities {
  isLowEnd: boolean;
  cores: number;
  memory: number;
  supportsWebGL: boolean;
  maxTextureSize: number;
  isMobile: boolean;
}

export interface ForceGraphNodeData {
  x: number;
  y: number;
  entityType: string;
  label: string;
}

export interface ForceGraphLinkData {
  source: { x: number; y: number };
  target: { x: number; y: number };
}
