/**
 * Graph Annotations Module
 *
 * Exports all annotation-related components and utilities.
 *
 * @module components/graph/annotations
 */

export { AnnotationToolbar, TextAnnotationPopover, type DrawingTool } from './AnnotationToolbar';
export { GraphAnnotationLayer } from './GraphAnnotationLayer';
export { GraphAnnotations } from './GraphAnnotations';
export type {
  AnyAnnotation,
  CircleAnnotation,
  DrawingAnnotation,
  GraphAnnotation,
  RectangleAnnotation,
  SerializableAnnotation,
  TextAnnotation,
} from './types';
export { deserializeAnnotation, serializeAnnotation } from './types';
