/**
 * In-memory annotation operations
 * Graph annotation CRUD operations
 */

import type { GraphAnnotationStorage } from './catalogue-db/index.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';

/**
 * Add a new annotation
 */
export const addAnnotation = (storage: InMemoryStorage, annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt'>): string => {
	const id = crypto.randomUUID();
	const timestamp = new Date();
	const storedAnnotation: GraphAnnotationStorage = {
		id,
		type: annotation.type,
		visible: annotation.visible,
		x: annotation.x,
		y: annotation.y,
		content: annotation.content,
		width: annotation.width,
		height: annotation.height,
		radius: annotation.radius,
		borderColor: annotation.borderColor,
		fillColor: annotation.fillColor,
		borderWidth: annotation.borderWidth,
		points: annotation.points,
		strokeColor: annotation.strokeColor,
		strokeWidth: annotation.strokeWidth,
		closed: annotation.closed,
		fontSize: annotation.fontSize,
		backgroundColor: annotation.backgroundColor,
		nodeId: annotation.nodeId,
		graphId: annotation.graphId,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	storage.annotations.set(id, storedAnnotation);
	return id;
};

/**
 * Get all annotations, optionally filtered by graphId
 */
export const getAnnotations = (storage: InMemoryStorage, graphId?: string): GraphAnnotationStorage[] => {
	const allAnnotations = [...storage.annotations.values()];
	if (graphId === undefined) {
		return allAnnotations;
	}
	return allAnnotations.filter((ann) => ann.graphId === graphId);
};

/**
 * Update an existing annotation
 */
export const updateAnnotation = (storage: InMemoryStorage, annotationId: string, updates: Readonly<{
		visible?: boolean;
		x?: number;
		y?: number;
		content?: string;
	}>): void => {
	const annotation = storage.annotations.get(annotationId);
	if (!annotation) {
		throw new Error('Annotation not found');
	}
	const updatedAnnotation: GraphAnnotationStorage = {
		...annotation,
		...updates,
		updatedAt: new Date(),
	};
	storage.annotations.set(annotationId, updatedAnnotation);
};

/**
 * Delete an annotation
 */
export const deleteAnnotation = (storage: InMemoryStorage, annotationId: string): void => {
	storage.annotations.delete(annotationId);
};

/**
 * Toggle annotation visibility
 */
export const toggleAnnotationVisibility = (storage: InMemoryStorage, annotationId: string, visible: boolean): void => {
	const annotation = storage.annotations.get(annotationId);
	if (!annotation) {
		throw new Error('Annotation not found');
	}
	const updatedAnnotation: GraphAnnotationStorage = {
		...annotation,
		visible,
		updatedAt: new Date(),
	};
	storage.annotations.set(annotationId, updatedAnnotation);
};

/**
 * Delete all annotations for a specific graph
 */
export const deleteAnnotationsByGraph = (storage: InMemoryStorage, graphId: string): void => {
	for (const [id, annotation] of storage.annotations) {
		if (annotation.graphId === graphId) {
			storage.annotations.delete(id);
		}
	}
};
