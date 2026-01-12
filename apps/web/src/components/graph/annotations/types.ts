/**
 * Graph Annotation Types
 *
 * Defines annotation data structures for graph visual markup:
 * - Text labels (sticky notes)
 * - Shapes (rectangles, circles)
 * - Freehand drawings
 *
 * @module components/graph/annotations/types
 */

/**
 * Base annotation interface
 */
export interface GraphAnnotation {
  /** Unique annotation ID */
  id: string;
  /** Annotation type */
  type: 'text' | 'rectangle' | 'circle' | 'drawing';
  /** Creation timestamp */
  createdAt: Date;
  /** Last modified timestamp */
  updatedAt: Date;
  /** Whether annotation is visible */
  visible: boolean;
  /** Optional color */
  color?: string;
}

/**
 * Text label annotation (sticky note)
 */
export interface TextAnnotation extends GraphAnnotation {
  type: 'text';
  /** Text content */
  content: string;
  /** Position (relative to graph canvas) */
  x: number;
  y: number;
  /** Font size */
  fontSize?: number;
  /** Background color */
  backgroundColor?: string;
  /** Linked node ID (optional) */
  nodeId?: string;
}

/**
 * Rectangle shape annotation
 */
export interface RectangleAnnotation extends GraphAnnotation {
  type: 'rectangle';
  /** Top-left position */
  x: number;
  y: number;
  /** Rectangle dimensions */
  width: number;
  height: number;
  /** Border color */
  borderColor?: string;
  /** Fill color with opacity */
  fillColor?: string;
  /** Border width */
  borderWidth?: number;
}

/**
 * Circle shape annotation
 */
export interface CircleAnnotation extends GraphAnnotation {
  type: 'circle';
  /** Center position */
  x: number;
  y: number;
  /** Circle radius */
  radius: number;
  /** Border color */
  borderColor?: string;
  /** Fill color with opacity */
  fillColor?: string;
  /** Border width */
  borderWidth?: number;
}

/**
 * Freehand drawing annotation
 */
export interface DrawingAnnotation extends GraphAnnotation {
  type: 'drawing';
  /** Array of points in the drawing path */
  points: Array<{ x: number; y: number }>;
  /** Stroke color */
  strokeColor?: string;
  /** Stroke width */
  strokeWidth?: number;
  /** Whether drawing is closed (connects last point to first) */
  closed?: boolean;
}

/**
 * Union type of all annotation types
 */
export type AnyAnnotation =
  | TextAnnotation
  | RectangleAnnotation
  | CircleAnnotation
  | DrawingAnnotation;

/**
 * Annotation for serialization (JSON-compatible)
 */
export type SerializableAnnotation = Omit<AnyAnnotation, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

/**
 * Convert annotation to serializable format
 * @param annotation
 */
export const serializeAnnotation = (annotation: AnyAnnotation): SerializableAnnotation => ({
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
  });

/**
 * Convert serializable annotation back to annotation
 * @param serializable
 */
export const deserializeAnnotation = (serializable: SerializableAnnotation): AnyAnnotation => {
  const base = {
    ...serializable,
    createdAt: new Date(serializable.createdAt),
    updatedAt: new Date(serializable.updatedAt),
  };

  // Return type-specific annotation based on type field
  switch (serializable.type) {
    case 'text':
      return base as TextAnnotation;
    case 'rectangle':
      return base as RectangleAnnotation;
    case 'circle':
      return base as CircleAnnotation;
    case 'drawing':
      return base as DrawingAnnotation;
  }
};
