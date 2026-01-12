/**
 * useGraphAnnotations - Hook for managing graph annotations
 *
 * Provides CRUD operations for graph annotations:
 * - Text labels (sticky notes)
 * - Shapes (rectangles, circles)
 * - Freehand drawings
 *
 * Annotations are stored in IndexedDB via catalogueService
 * and can be shared via graph snapshots (URL-encoded)
 *
 * @module hooks/use-graph-annotations
 */

import type { GraphAnnotationStorage } from '@bibgraph/utils';
import { catalogueService } from '@bibgraph/utils';
import { useCallback, useEffect, useMemo, useState } from 'react';

/**
 * Hook for managing graph annotations
 * @param graphId Optional graph ID for filtering annotations (used for sharing)
 */
export const useGraphAnnotations = (graphId?: string) => {
  const [annotations, setAnnotations] = useState<GraphAnnotationStorage[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  // Load annotations on mount
  useEffect(() => {
    const loadAnnotations = async () => {
      try {
        setIsLoading(true);
        setError(null);
        const loadedAnnotations = await catalogueService.getAnnotations(graphId);
        setAnnotations(loadedAnnotations);
      } catch (err) {
        const errorObj = err instanceof Error ? err : new Error(String(err));
        setError(errorObj);
        console.error('Failed to load annotations:', err);
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
      const id = await catalogueService.addAnnotation({
        ...annotation,
        graphId,
      });

      // Refresh annotations from storage
      const updatedAnnotations = await catalogueService.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);

      return id;
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Failed to add annotation:', err);
      throw errorObj;
    }
  }, [graphId]);

  /**
   * Add text annotation (sticky note)
   */
  const addTextAnnotation = useCallback(async (params: {
    content: string;
    x: number;
    y: number;
    fontSize?: number;
    backgroundColor?: string;
    nodeId?: string;
    color?: string;
  }) => {
    return addAnnotation({
      type: 'text',
      visible: true,
      content: params.content,
      x: params.x,
      y: params.y,
      fontSize: params.fontSize,
      backgroundColor: params.backgroundColor,
      nodeId: params.nodeId,
      color: params.color,
    });
  }, [addAnnotation]);

  /**
   * Add rectangle annotation
   */
  const addRectangleAnnotation = useCallback(async (params: {
    x: number;
    y: number;
    width: number;
    height: number;
    borderColor?: string;
    fillColor?: string;
    borderWidth?: number;
    color?: string;
  }) => {
    return addAnnotation({
      type: 'rectangle',
      visible: true,
      x: params.x,
      y: params.y,
      width: params.width,
      height: params.height,
      borderColor: params.borderColor,
      fillColor: params.fillColor,
      borderWidth: params.borderWidth,
      color: params.color,
    });
  }, [addAnnotation]);

  /**
   * Add circle annotation
   */
  const addCircleAnnotation = useCallback(async (params: {
    x: number;
    y: number;
    radius: number;
    borderColor?: string;
    fillColor?: string;
    borderWidth?: number;
    color?: string;
  }) => {
    return addAnnotation({
      type: 'circle',
      visible: true,
      x: params.x,
      y: params.y,
      radius: params.radius,
      borderColor: params.borderColor,
      fillColor: params.fillColor,
      borderWidth: params.borderWidth,
      color: params.color,
    });
  }, [addAnnotation]);

  /**
   * Add drawing annotation (freehand)
   */
  const addDrawingAnnotation = useCallback(async (params: {
    points: Array<{ x: number; y: number }>;
    strokeColor?: string;
    strokeWidth?: number;
    closed?: boolean;
    color?: string;
  }) => {
    return addAnnotation({
      type: 'drawing',
      visible: true,
      points: params.points,
      strokeColor: params.strokeColor,
      strokeWidth: params.strokeWidth,
      closed: params.closed,
      color: params.color,
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
      await catalogueService.updateAnnotation(id, updates);

      // Refresh annotations from storage
      const updatedAnnotations = await catalogueService.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Failed to update annotation:', err);
      throw errorObj;
    }
  }, [graphId]);

  /**
   * Delete an annotation
   */
  const deleteAnnotation = useCallback(async (id: string) => {
    try {
      await catalogueService.deleteAnnotation(id);

      // Remove from local state
      setAnnotations(prev => prev.filter(a => a.id !== id));
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Failed to delete annotation:', err);
      throw errorObj;
    }
  }, []);

  /**
   * Toggle annotation visibility
   */
  const toggleVisibility = useCallback(async (id: string) => {
    const annotation = annotations.find(a => a.id === id);
    if (!annotation) return;

    const newVisibility = !annotation.visible;
    try {
      await catalogueService.toggleAnnotationVisibility(id, newVisibility);

      // Update local state
      setAnnotations(prev =>
        prev.map(a =>
          a.id === id ? { ...a, visible: newVisibility, updatedAt: new Date() } : a
        )
      );
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Failed to toggle annotation visibility:', err);
      throw errorObj;
    }
  }, [annotations]);

  /**
   * Clear all annotations for current graph
   */
  const clearAnnotations = useCallback(async () => {
    if (!graphId) {
      // If no graphId, clear all from local state
      setAnnotations([]);
      return;
    }

    try {
      await catalogueService.deleteAnnotationsByGraph(graphId);
      setAnnotations([]);
    } catch (err) {
      const errorObj = err instanceof Error ? err : new Error(String(err));
      setError(errorObj);
      console.error('Failed to clear annotations:', err);
      throw errorObj;
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
    return annotations.reduce((acc, annotation) => {
      if (!acc[annotation.type]) {
        acc[annotation.type] = [];
      }
      const typeArray = acc[annotation.type];
      if (typeArray) {
        typeArray.push(annotation);
      }
      return acc;
    }, {} as Record<string, GraphAnnotationStorage[]>);
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
      const updatedAnnotations = await catalogueService.getAnnotations(graphId);
      setAnnotations(updatedAnnotations);
    }, [graphId]),
  };
};
