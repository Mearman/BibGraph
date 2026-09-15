/**
 * useGraphSnapshots - Hook for managing graph snapshots
 *
 * Provides CRUD operations for graph snapshots:
 * - Save current graph state
 * - Load snapshot
 * - Auto-save functionality
 * - Share via URL
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import type { GraphSnapshotStorage } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

import { isPlainObject } from './extractors/unknown-helpers';

interface GraphSnapshot {
  id: string;
  name: string;
  createdAt: Date;
  updatedAt: Date;
  isAutoSave: boolean;
  nodes: GraphNode[];
  edges: GraphEdge[];
  zoom: number;
  panX: number;
  panY: number;
  layoutType: string;
  nodePositions?: Map<string, { x: number; y: number }>;
  annotations?: unknown[];
  shareToken?: string;
}

const MAX_AUTO_SAVE_COUNT = 5;

const isMinimalRecordArray = <T extends { id: string }>(value: unknown): value is T[] =>
  Array.isArray(value) && value.every(item => isPlainObject(item) && typeof item.id === 'string');

const isPositionEntryArray = (value: unknown): value is [string, { x: number; y: number }][] =>
  Array.isArray(value) &&
  value.every(
    entry =>
      Array.isArray(entry) &&
      entry.length === 2 &&
      typeof entry[0] === 'string' &&
      isPlainObject(entry[1]) &&
      typeof entry[1].x === 'number' &&
      typeof entry[1].y === 'number'
  );

/**
 * Parse a single stored snapshot row into its deserialized runtime shape, tolerating malformed JSON in any of the serialized fields by falling back to empty/undefined for that field alone
 */
const deserializeSnapshot = (snapshot: Readonly<GraphSnapshotStorage>): GraphSnapshot => {
  let parsedNodes: GraphNode[] = [];
  let parsedEdges: GraphEdge[] = [];
  let parsedNodePositions: Map<string, { x: number; y: number }> | undefined;
  let parsedAnnotations: unknown[] | undefined;

  try {
    const rawNodes: unknown = JSON.parse(snapshot.nodes);
    parsedNodes = isMinimalRecordArray<GraphNode>(rawNodes) ? rawNodes : [];

    const rawEdges: unknown = JSON.parse(snapshot.edges);
    parsedEdges = isMinimalRecordArray<GraphEdge>(rawEdges) ? rawEdges : [];

    if (snapshot.nodePositions !== undefined) {
      const rawPositions: unknown = JSON.parse(snapshot.nodePositions);
      if (isPositionEntryArray(rawPositions)) {
        parsedNodePositions = new Map(rawPositions);
      }
    }

    if (snapshot.annotations !== undefined) {
      const rawAnnotations: unknown = JSON.parse(snapshot.annotations);
      parsedAnnotations = Array.isArray(rawAnnotations) ? rawAnnotations : undefined;
    }
  } catch (parseError) {
    console.error('Failed to parse snapshot data:', parseError);
  }

  return {
    id: snapshot.id ?? '',
    name: snapshot.name,
    createdAt: snapshot.createdAt,
    updatedAt: snapshot.updatedAt,
    isAutoSave: snapshot.isAutoSave,
    nodes: parsedNodes,
    edges: parsedEdges,
    zoom: snapshot.zoom,
    panX: snapshot.panX,
    panY: snapshot.panY,
    layoutType: snapshot.layoutType,
    nodePositions: parsedNodePositions,
    annotations: parsedAnnotations,
    shareToken: snapshot.shareToken,
  };
};

/**
 * Hook for managing graph snapshots
 */
export const useGraphSnapshots = () => {
  const storageProvider = useStorageProvider();
  const [snapshots, setSnapshots] = useState<GraphSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load snapshots on mount
  useEffect(() => {
    const loadSnapshots = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedSnapshots = await storageProvider.getSnapshots();

        // Deserialize snapshots
        const deserialized = loadedSnapshots.map(deserializeSnapshot);

        setSnapshots(deserialized);
      } catch (error_) {
        const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
        setError(errorObject);
        console.error('Failed to load snapshots:', error_);
      } finally {
        setIsLoading(false);
      }
    };

    void loadSnapshots();
  }, []);

  /**
   * Create a new snapshot
   */
  const saveSnapshot = useCallback(async (parameters: {
    name: string;
    nodes: GraphNode[];
    edges: GraphEdge[];
    zoom: number;
    panX: number;
    panY: number;
    layoutType: string;
    nodePositions?: Map<string, { x: number; y: number }>;
    annotations?: unknown[];
    isAutoSave?: boolean;
  }) => {
    try {
      const serializedPositions = parameters.nodePositions
        ? JSON.stringify([...parameters.nodePositions])
        : undefined;

      const serializedAnnotations = parameters.annotations
        ? JSON.stringify(parameters.annotations)
        : undefined;

      const id = await storageProvider.addSnapshot({
        name: parameters.name,
        nodes: JSON.stringify(parameters.nodes),
        edges: JSON.stringify(parameters.edges),
        zoom: parameters.zoom,
        panX: parameters.panX,
        panY: parameters.panY,
        layoutType: parameters.layoutType,
        nodePositions: serializedPositions,
        annotations: serializedAnnotations,
        isAutoSave: parameters.isAutoSave ?? false,
      });

      // Prune old auto-saves if this is a manual save
      if (parameters.isAutoSave !== true) {
        await storageProvider.pruneAutoSaveSnapshots(MAX_AUTO_SAVE_COUNT);
      }

      // Refresh snapshots from storage
      const updatedSnapshots = await storageProvider.getSnapshots();
      const deserialized = updatedSnapshots.map(deserializeSnapshot);

      setSnapshots(deserialized);

      return id;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to save snapshot:', error_);
      throw errorObject;
    }
  }, []);

  /**
   * Auto-save current graph state
   */
  const autoSave = useCallback(async (parameters: {
    nodes: GraphNode[];
    edges: GraphEdge[];
    zoom: number;
    panX: number;
    panY: number;
    layoutType: string;
    nodePositions?: Map<string, { x: number; y: number }>;
    annotations?: unknown[];
  }) => {
    const now = new Date();
    const timeString = now.toLocaleTimeString();

    return saveSnapshot({
      ...parameters,
      name: `Auto-save ${timeString}`,
      isAutoSave: true,
    });
  }, [saveSnapshot]);

  /**
   * Delete a snapshot
   */
  const deleteSnapshot = useCallback(async (id: string) => {
    try {
      await storageProvider.deleteSnapshot(id);

      // Remove from local state
      setSnapshots(previous => previous.filter(s => s.id !== id));
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to delete snapshot:', error_);
      throw errorObject;
    }
  }, []);

  /**
   * Load snapshot by ID
   */
  const loadSnapshot = useCallback(async (id: string): Promise<GraphSnapshot | null> => {
    try {
      const snapshot = await storageProvider.getSnapshot(id);

      if (!snapshot) return null;

      return deserializeSnapshot(snapshot);
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to load snapshot:', error_);
      throw errorObject;
    }
  }, []);

  /**
   * Manual snapshots (non-auto-save)
   */
  const manualSnapshots = useMemo(() => {
    return snapshots.filter(s => !s.isAutoSave);
  }, [snapshots]);

  /**
   * Auto-save snapshots
   */
  const autoSaveSnapshots = useMemo(() => {
    return snapshots.filter(s => s.isAutoSave);
  }, [snapshots]);

  return {
    // State
    snapshots,
    manualSnapshots,
    autoSaveSnapshots,
    isLoading,
    error,

    // CRUD operations
    saveSnapshot,
    autoSave,
    deleteSnapshot,
    loadSnapshot,

    // Helpers
    refresh: useCallback(async () => {
      const updatedSnapshots = await storageProvider.getSnapshots();
      const deserialized = updatedSnapshots.map(deserializeSnapshot);

      setSnapshots(deserialized);
    }, []),
  };
};
