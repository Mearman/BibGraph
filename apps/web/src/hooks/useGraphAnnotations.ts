/**
 * useGraphAnnotations - Hook for managing graph annotations
 *
 * Provides CRUD operations for graph annotations:
 * - Text labels (sticky notes)
 * - Shapes (rectangles, circles)
 * - Freehand drawings
 *
 * Annotations are stored in IndexedDB via storage provider
 * and can be shared via graph snapshots (URL-encoded)
 */

import type { GraphAnnotationStorage } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

/**
 * Hook for managing graph annotations
 * @param graphId - Optional graph ID for filtering annotations (used for sharing)
 */
export const useGraphAnnotations = (graphId?: string) => {
  const storageProvider = useStorageProvider();
  const [annotations, setAnnotations] = useState<GraphAnnotationStorage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load annotations on mount
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedAnnotations = await storageProvider.getAnnotations(graphId);
        setAnnotations(loadedAnnotations);
      } catch (error_) {
        const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
        setError(errorObject);
        console.error('Failed to load annotations:', error_);
      } finally {
        setIsLoading(false);
      }
    };

    void loadAnnotations();
  }, [graphId]);

  /**
   * Add a new annotation
   */
  const addAnnotation = useCallback(async (
    annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt' | 'graphId'>
  ) => {
    try {
      const id = await storageProvider.addAnnotation({
        ...annotation,
        graphId,
      });

      // Refresh annotations from storage
      const updatedAnnotations = await storageProvider.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);

      return id;
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to add annotation:', error_);
      throw errorObject;
    }
  }, [graphId]);

  /**
   * Add text annotation (sticky note)
   */
  const addTextAnnotation = useCallback(async (parameters: Readonly<{
    content: string;
    x: number;
    y: number;
    fontSize?: number;
    backgroundColor?: string;
    nodeId?: string;
    color?: string;
  }>) => {
    return addAnnotation({
      type: 'text',
      visible: true,
      content: parameters.content,
      x: parameters.x,
      y: parameters.y,
      fontSize: parameters.fontSize,
      backgroundColor: parameters.backgroundColor,
      nodeId: parameters.nodeId,
      color: parameters.color,
    });
  }, [addAnnotation]);

  /**
   * Add rectangle annotation
   */
  const addRectangleAnnotation = useCallback(async (parameters: Readonly<{
    x: number;
    y: number;
    width: number;
    height: number;
    borderColor?: string;
    fillColor?: string;
    borderWidth?: number;
    color?: string;
  }>) => {
    return addAnnotation({
      type: 'rectangle',
      visible: true,
      x: parameters.x,
      y: parameters.y,
      width: parameters.width,
      height: parameters.height,
      borderColor: parameters.borderColor,
      fillColor: parameters.fillColor,
      borderWidth: parameters.borderWidth,
      color: parameters.color,
    });
  }, [addAnnotation]);

  /**
   * Add circle annotation
   */
  const addCircleAnnotation = useCallback(async (parameters: Readonly<{
    x: number;
    y: number;
    radius: number;
    borderColor?: string;
    fillColor?: string;
    borderWidth?: number;
    color?: string;
  }>) => {
    return addAnnotation({
      type: 'circle',
      visible: true,
      x: parameters.x,
      y: parameters.y,
      radius: parameters.radius,
      borderColor: parameters.borderColor,
      fillColor: parameters.fillColor,
      borderWidth: parameters.borderWidth,
      color: parameters.color,
    });
  }, [addAnnotation]);

  /**
   * Add drawing annotation (freehand)
   */
  const addDrawingAnnotation = useCallback(async (parameters: {
    points: { x: number; y: number }[];
    strokeColor?: string;
    strokeWidth?: number;
    closed?: boolean;
    color?: string;
  }) => {
    return addAnnotation({
      type: 'drawing',
      visible: true,
      points: parameters.points,
      strokeColor: parameters.strokeColor,
      strokeWidth: parameters.strokeWidth,
      closed: parameters.closed,
      color: parameters.color,
    });
  }, [addAnnotation]);

  /**
   * Update an existing annotation
   */
  const updateAnnotation = useCallback(async (
    id: string,
    updates: Partial<Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt' | 'graphId'>>
  ) => {
    try {
      await storageProvider.updateAnnotation(id, updates);

      // Refresh annotations from storage
      const updatedAnnotations = await storageProvider.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to update annotation:', error_);
      throw errorObject;
    }
  }, [graphId]);

  /**
   * Delete an annotation
   */
  const deleteAnnotation = useCallback(async (id: string) => {
    try {
      await storageProvider.deleteAnnotation(id);

      // Remove from local state
      setAnnotations(previous => previous.filter(a => a.id !== id));
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to delete annotation:', error_);
      throw errorObject;
    }
  }, []);

  /**
   * Toggle annotation visibility
   */
  const toggleVisibility = useCallback(async (id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (!annotation) return;

    const isNewVisibility = !annotation.visible;
    try {
      await storageProvider.toggleAnnotationVisibility(id, isNewVisibility);

      // Update local state
      setAnnotations(previous =>
        previous.map(a =>
          a.id === id ? { ...a, visible: isNewVisibility, updatedAt: new Date() } : a
        )
      );
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to toggle annotation visibility:', error_);
      throw errorObject;
    }
  }, [annotations]);

  /**
   * Clear all annotations for current graph
   */
  const clearAnnotations = useCallback(async () => {
    if (graphId === undefined || graphId === '') {
      // If no graphId, clear all from local state
      setAnnotations([]);
      return;
    }

    try {
      await storageProvider.deleteAnnotationsByGraph(graphId);
      setAnnotations([]);
    } catch (error_) {
      const errorObject = error_ instanceof Error ? error_ : new Error(String(error_));
      setError(errorObject);
      console.error('Failed to clear annotations:', error_);
      throw errorObject;
    }
  }, [graphId]);

  /**
   * Filtered annotations by visibility
   */
  const visibleAnnotations = useMemo(() => {
    return annotations.filter(a => a.visible);
  }, [annotations]);

  /**
   * Annotations grouped by type
   */
  const annotationsByType = useMemo(() => {
    return annotations.reduce<Partial<Record<string, GraphAnnotationStorage[]>>>((accumulator, annotation) => {
      const existing = accumulator[annotation.type];
      if (existing === undefined) {
        accumulator[annotation.type] = [annotation];
      } else {
        existing.push(annotation);
      }
      return accumulator;
    }, {});
  }, [annotations]);

  return {
    // State
    annotations,
    visibleAnnotations,
    annotationsByType,
    isLoading,
    error,

    // CRUD operations
    addAnnotation,
    addTextAnnotation,
    addRectangleAnnotation,
    addCircleAnnotation,
    addDrawingAnnotation,
    updateAnnotation,
    deleteAnnotation,
    toggleVisibility,
    clearAnnotations,

    // Helpers
    refresh: useCallback(async () => {
      const updatedAnnotations = await storageProvider.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);
    }, [graphId]),
  };
};
