/**
 * Types for graph auto-population functionality
 * @module types/graph-auto-population
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import type { BackgroundStrategy } from '@bibgraph/utils';

/**
 * Maximum number of IDs to include in a single batch query
 */
export const BATCH_SIZE = 50;

/**
 * Debounce delay for auto-population (ms)
 */
export const DEBOUNCE_DELAY_MS = 500;

/**
 * Chunk size for background processing
 */
export const PROCESSING_CHUNK_SIZE = 10;

/**
 * Result of auto-population
 */
export interface AutoPopulationResult {
  /** Number of labels resolved */
  labelsResolved: number;
  /** Number of edges discovered */
  edgesDiscovered: number;
  /** Whether population is in progress */
  isPopulating: boolean;
  /** Error if population failed */
  error: Error | null;
  /** Current background processing strategy */
  currentStrategy: BackgroundStrategy;
}

/**
 * Options for the auto-population hook
 */
export interface UseGraphAutoPopulationOptions {
  /** Current graph nodes */
  nodes: GraphNode[];
  /** Current graph edges */
  edges: GraphEdge[];
  /** Callback to update node labels */
  onLabelsResolved?: (updates: Map<string, string>) => void;
  /** Callback to add discovered edges */
  onEdgesDiscovered?: (edges: GraphEdge[]) => void;
  /** Whether auto-population is enabled */
  enabled?: boolean;
  /** Background processing strategy (default: 'idle') */
  strategy?: BackgroundStrategy;
}

/**
 * Batch descriptor for label resolution
 */
export interface LabelResolutionBatch {
  entityType: import('@bibgraph/types').EntityType;
  ids: string[];
}

/**
 * Direction of relationship discovery
 */
export type RelationshipDirection = 'inbound' | 'outbound';
