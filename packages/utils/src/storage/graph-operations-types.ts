/**
 * Graph Operations Interface
 *
 * Interface definitions for graph list, annotation, and snapshot operations.
 * @package
 */

import type {
  AddToGraphListParams,
  GraphListNode,
  PruneGraphListResult,
} from '@bibgraph/types';

import type {
  GraphAnnotationStorage,
  GraphSnapshotStorage,
} from './catalogue-db/index.js';

/**
 * Graph List Operations Interface
 *
 * Operations for managing the persistent graph working set.
 */
export interface GraphListOperationsInterface {
  /**
   * Get all nodes in the graph list (newest first)
   * @returns Promise resolving to array of graph list nodes
   */
  getGraphList(): Promise<GraphListNode[]>;

  /**
   * Add a node to the graph list
   * @param params - Node parameters (entityId, entityType, label, provenance)
   * @returns Promise resolving to node ID
   * @throws {Error} If graph list is full (1000 nodes)
   */
  addToGraphList(params: AddToGraphListParams): Promise<string>;

  /**
   * Remove a node from the graph list
   * @param entityId - OpenAlex entity ID to remove
   */
  removeFromGraphList(entityId: string): Promise<void>;

  /**
   * Clear all nodes from the graph list
   */
  clearGraphList(): Promise<void>;

  /**
   * Get current size of graph list
   * @returns Promise resolving to node count
   */
  getGraphListSize(): Promise<number>;

  /**
   * Prune old auto-populated nodes (older than 24 hours)
   * @returns Promise resolving to prune result
   */
  pruneGraphList(): Promise<PruneGraphListResult>;

  /**
   * Check if a node exists in the graph list
   * @param entityId - OpenAlex entity ID to check
   * @returns Promise resolving to true if node exists
   */
  isInGraphList(entityId: string): Promise<boolean>;

  /**
   * Batch add nodes to graph list
   * @param nodes - Array of nodes to add
   * @returns Promise resolving to array of added node IDs
   */
  batchAddToGraphList(nodes: AddToGraphListParams[]): Promise<string[]>;
}

/**
 * Graph Annotation Operations Interface
 *
 * Operations for managing visual annotations on graphs.
 */
export interface GraphAnnotationOperationsInterface {
  /**
   * Add a new annotation
   * @param annotation - Annotation data (without id, timestamps, graphId)
   * @returns Promise resolving to annotation ID
   */
  addAnnotation(annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt' | 'graphId'> & { graphId?: string }): Promise<string>;

  /**
   * Get all annotations, optionally filtered by graph ID
   * @param graphId - Optional graph ID to filter annotations
   * @returns Promise resolving to array of annotations
   */
  getAnnotations(graphId?: string): Promise<GraphAnnotationStorage[]>;

  /**
   * Update an existing annotation
   * @param annotationId - ID of the annotation to update
   * @param updates - Partial annotation data to update
   */
  updateAnnotation(annotationId: string, updates: Partial<Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt' | 'graphId'>>): Promise<void>;

  /**
   * Delete an annotation
   * @param annotationId - ID of the annotation to delete
   */
  deleteAnnotation(annotationId: string): Promise<void>;

  /**
   * Toggle annotation visibility
   * @param annotationId - ID of the annotation
   * @param visible - New visibility state
   */
  toggleAnnotationVisibility(annotationId: string, visible: boolean): Promise<void>;

  /**
   * Delete all annotations for a specific graph
   * @param graphId - ID of the graph
   */
  deleteAnnotationsByGraph(graphId: string): Promise<void>;
}

/**
 * Graph Snapshot Operations Interface
 *
 * Operations for managing graph state snapshots.
 */
export interface GraphSnapshotOperationsInterface {
  /**
   * Add a new graph snapshot
   * @param snapshot - Snapshot data
   * @returns Promise resolving to snapshot ID
   */
  addSnapshot(snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>): Promise<string>;

  /**
   * Get all snapshots
   * @returns Promise resolving to array of snapshots
   */
  getSnapshots(): Promise<GraphSnapshotStorage[]>;

  /**
   * Get a specific snapshot by ID
   * @param snapshotId - ID of the snapshot
   * @returns Promise resolving to snapshot or null if not found
   */
  getSnapshot(snapshotId: string): Promise<GraphSnapshotStorage | null>;

  /**
   * Delete a snapshot
   * @param snapshotId - ID of the snapshot to delete
   */
  deleteSnapshot(snapshotId: string): Promise<void>;

  /**
   * Update a snapshot
   * @param snapshotId - ID of the snapshot to update
   * @param updates - Partial snapshot data to update
   */
  updateSnapshot(snapshotId: string, updates: Partial<Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt'>>): Promise<void>;

  /**
   * Prune old auto-save snapshots, keeping only the most recent N
   * @param maxCount - Maximum number of auto-save snapshots to keep
   */
  pruneAutoSaveSnapshots(maxCount: number): Promise<void>;
}
