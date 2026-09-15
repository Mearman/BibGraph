/**
 * Graph Annotation Types
 *
 * Defines annotation data structures for graph visual markup:
 * - Text labels (sticky notes)
 * - Shapes (rectangles, circles)
 * - Freehand drawings
 */

/**
 * Base annotation interface
 */
export interface GraphAnnotation {
  /**
  Unique annotation ID
   */
  id: string;
  /**
  Annotation type
   */
  type: 'text' | 'rectangle' | 'circle' | 'drawing';
  /**
  Creation timestamp
   */
  createdAt: Date;
  /**
  Last modified timestamp
   */
  updatedAt: Date;
  /**
  Whether annotation is visible
   */
  visible: boolean;
  /**
  Optional color
   */
  color?: string;
}

/**
 * Text label annotation (sticky note)
 */
export interface TextAnnotation extends GraphAnnotation {
  type: 'text';
  /**
  Text content
   */
  content: string;
  /**
  Position (relative to graph canvas)
   */
  x: number;
  y: number;
  /**
  Font size
   */
  fontSize?: number;
  /**
  Background color
   */
  backgroundColor?: string;
  /**
  Linked node ID (optional)
   */
  nodeId?: string;
}

/**
 * Rectangle shape annotation
 */
export interface RectangleAnnotation extends GraphAnnotation {
  type: 'rectangle';
  /**
  Top-left position
   */
  x: number;
  y: number;
  /**
  Rectangle dimensions
   */
  width: number;
  height: number;
  /**
  Border color
   */
  borderColor?: string;
  /**
  Fill color with opacity
   */
  fillColor?: string;
  /**
  Border width
   */
  borderWidth?: number;
}

/**
 * Circle shape annotation
 */
export interface CircleAnnotation extends GraphAnnotation {
  type: 'circle';
  /**
  Center position
   */
  x: number;
  y: number;
  /**
  Circle radius
   */
  radius: number;
  /**
  Border color
   */
  borderColor?: string;
  /**
  Fill color with opacity
   */
  fillColor?: string;
  /**
  Border width
   */
  borderWidth?: number;
}

/**
 * Freehand drawing annotation
 */
export interface DrawingAnnotation extends GraphAnnotation {
  type: 'drawing';
  /**
  Array of points in the drawing path
   */
  points: { x: number; y: number }[];
  /**
  Stroke color
   */
  strokeColor?: string;
  /**
  Stroke width
   */
  strokeWidth?: number;
  /**
  Whether drawing is closed (connects last point to first)
   */
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
 * Distributive variant of the built-in `Omit`.
 *
 * The built-in `Omit` is not distributive over union types: applied to a discriminated union it collapses to only the properties common across every member, discarding each variant's own fields. Distributing the `Omit` over each union member individually preserves the discriminated union shape.
 */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown ? Omit<T, K> : never;

/**
 * Annotation for serialization (JSON-compatible)
 */
export type SerializableAnnotation = DistributiveOmit<AnyAnnotation, 'createdAt' | 'updatedAt'> & {
  createdAt: string;
  updatedAt: string;
};

/**
 * Convert annotation to serializable format
 */
export const serializeAnnotation = (annotation: AnyAnnotation): SerializableAnnotation => ({
    ...annotation,
    createdAt: annotation.createdAt.toISOString(),
    updatedAt: annotation.updatedAt.toISOString(),
  });

/**
 * Convert serializable annotation back to annotation
 */
export const deserializeAnnotation = (serializable: SerializableAnnotation): AnyAnnotation => {
  const createdAt = new Date(serializable.createdAt);
  const updatedAt = new Date(serializable.updatedAt);

  // Return type-specific annotation based on type field
  switch (serializable.type) {
    case 'text':
      return { ...serializable, createdAt, updatedAt };
    case 'rectangle':
      return { ...serializable, createdAt, updatedAt };
    case 'circle':
      return { ...serializable, createdAt, updatedAt };
    case 'drawing':
      return { ...serializable, createdAt, updatedAt };
    default:
      return serializable satisfies never;
  }
};
