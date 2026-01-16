/**
 * Graph Annotation Operations
 * CRUD operations for graph annotations (text labels, shapes, drawings)
 */

import type { GenericLogger } from "../../logger.js";
import type { GraphAnnotationStorage } from "./index.js";
import { LOG_CATEGORY } from "./index.js";
import type { CatalogueDB } from "./schema.js";

type GraphAnnotationStorageInput = Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Add a graph annotation
 * @param db Database instance
 * @param annotation Annotation data (id will be generated if not provided)
 * @param logger Optional logger
 */
export const addAnnotation = async (
  db: CatalogueDB,
  annotation: GraphAnnotationStorageInput,
  logger?: GenericLogger
): Promise<string> => {
  try {
    const id = crypto.randomUUID();
    const now = new Date();
    const entry = {
      id,
      type: annotation.type,
      createdAt: now,
      updatedAt: now,
      visible: annotation.visible ?? true,
      color: annotation.color,
      // Text annotation fields
      content: annotation.content,
      x: annotation.x,
      y: annotation.y,
      fontSize: annotation.fontSize,
      backgroundColor: annotation.backgroundColor,
      nodeId: annotation.nodeId,
      // Rectangle annotation fields
      width: annotation.width,
      height: annotation.height,
      borderColor: annotation.borderColor,
      fillColor: annotation.fillColor,
      borderWidth: annotation.borderWidth,
      // Circle annotation fields
      radius: annotation.radius,
      // Drawing annotation fields
      points: annotation.points,
      strokeColor: annotation.strokeColor,
      strokeWidth: annotation.strokeWidth,
      closed: annotation.closed,
      // Graph association for sharing
      graphId: annotation.graphId,
    };

    await db.annotations.add(entry);
    logger?.debug(LOG_CATEGORY, 'Added graph annotation', { id, type: annotation.type });
    return id;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to add graph annotation', { error, annotation });
    throw error;
  }
};

/**
 * Get all annotations for a specific graph (or all annotations if no graphId provided)
 * @param db Database instance
 * @param graphId Optional graph ID to filter annotations
 * @param logger Optional logger
 */
export const getAnnotations = async (
  db: CatalogueDB,
  graphId?: string,
  logger?: GenericLogger
): Promise<GraphAnnotationStorage[]> => {
  try {
    if (graphId) {
      return await db.annotations.where('graphId').equals(graphId).toArray();
    }
    return await db.annotations.toArray();
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get graph annotations', { error, graphId });
    return [];
  }
};

/**
 * Get a single annotation by ID
 * @param db Database instance
 * @param id Annotation ID
 * @param logger Optional logger
 */
export const getAnnotation = async (
  db: CatalogueDB,
  id: string,
  logger?: GenericLogger
): Promise<GraphAnnotationStorage | null> => {
  try {
    const result = await db.annotations.get(id);
    return result ?? null;
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to get graph annotation', { id, error });
    return null;
  }
};

/**
 * Update an existing annotation
 * @param db Database instance
 * @param id Annotation ID
 * @param updates Fields to update
 * @param logger Optional logger
 */
export const updateAnnotation = async (
  db: CatalogueDB,
  id: string,
  updates: Partial<Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>>,
  logger?: GenericLogger
): Promise<void> => {
  try {
    const updateData = {
      ...updates,
      updatedAt: new Date(),
    };

    await db.annotations.update(id, updateData);
    logger?.debug(LOG_CATEGORY, 'Updated graph annotation', { id, updates });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to update graph annotation', { id, updates, error });
    throw error;
  }
};

/**
 * Delete an annotation
 * @param db Database instance
 * @param id Annotation ID
 * @param logger Optional logger
 */
export const deleteAnnotation = async (
  db: CatalogueDB,
  id: string,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.annotations.delete(id);
    logger?.debug(LOG_CATEGORY, 'Deleted graph annotation', { id });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to delete graph annotation', { id, error });
    throw error;
  }
};

/**
 * Delete all annotations for a specific graph
 * @param db Database instance
 * @param graphId Graph ID
 * @param logger Optional logger
 */
export const deleteAnnotationsByGraph = async (
  db: CatalogueDB,
  graphId: string,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.annotations.where('graphId').equals(graphId).delete();
    logger?.debug(LOG_CATEGORY, 'Deleted annotations for graph', { graphId });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to delete annotations for graph', { graphId, error });
    throw error;
  }
};

/**
 * Toggle annotation visibility
 * @param db Database instance
 * @param id Annotation ID
 * @param visible New visibility state
 * @param logger Optional logger
 */
export const toggleAnnotationVisibility = async (
  db: CatalogueDB,
  id: string,
  visible: boolean,
  logger?: GenericLogger
): Promise<void> => {
  try {
    await db.annotations.update(id, {
      visible,
      updatedAt: new Date(),
    });
    logger?.debug(LOG_CATEGORY, 'Toggled annotation visibility', { id, visible });
  } catch (error) {
    logger?.error(LOG_CATEGORY, 'Failed to toggle annotation visibility', { id, visible, error });
    throw error;
  }
};
