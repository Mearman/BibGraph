/**
 * Graph Annotation Layer
 *
 * Renders annotations as an SVG overlay on the graph canvas.
 * Supports text labels, shapes (rectangles, circles), and freehand drawings.
 *
 * @module components/graph/annotations/GraphAnnotationLayer
 */

import type { GraphAnnotationStorage } from '@bibgraph/utils';
import { Box } from '@mantine/core';
import { useState } from 'react';

import type { AnyAnnotation } from './types';

const DEFAULT_TEXT_COLOR = '#000000';
const DEFAULT_BG_COLOR = '#ffff00';
const DEFAULT_BORDER_COLOR = '#ff0000';
const DEFAULT_STROKE_COLOR = '#000000';

/**
 * Convert storage annotation to display annotation
 * @param storage
 */
const storageToAnnotation = (storage: GraphAnnotationStorage): AnyAnnotation => {
  if (!storage.id) {
    throw new Error('Annotation storage must have an id');
  }

  const base = {
    id: storage.id,
    type: storage.type,
    createdAt: new Date(storage.createdAt),
    updatedAt: new Date(storage.updatedAt),
    visible: storage.visible,
    color: storage.color,
  };

  switch (storage.type) {
    case 'text':
      return {
        ...base,
        type: 'text',
        content: storage.content ?? '',
        x: storage.x ?? 0,
        y: storage.y ?? 0,
        fontSize: storage.fontSize,
        backgroundColor: storage.backgroundColor,
        nodeId: storage.nodeId,
      } as AnyAnnotation;

    case 'rectangle':
      return {
        ...base,
        type: 'rectangle',
        x: storage.x ?? 0,
        y: storage.y ?? 0,
        width: storage.width ?? 0,
        height: storage.height ?? 0,
        borderColor: storage.borderColor,
        fillColor: storage.fillColor,
        borderWidth: storage.borderWidth,
      } as AnyAnnotation;

    case 'circle':
      return {
        ...base,
        type: 'circle',
        x: storage.x ?? 0,
        y: storage.y ?? 0,
        radius: storage.radius ?? 0,
        borderColor: storage.borderColor,
        fillColor: storage.fillColor,
        borderWidth: storage.borderWidth,
      } as AnyAnnotation;

    case 'drawing':
      return {
        ...base,
        type: 'drawing',
        points: storage.points ?? [],
        strokeColor: storage.strokeColor,
        strokeWidth: storage.strokeWidth,
        closed: storage.closed,
      } as AnyAnnotation;
  }
};

interface AnnotationLayerProps {
  annotations: GraphAnnotationStorage[];
  width: number;
  height: number;
}

/**
 * Render a single annotation
 * @param root0
 * @param root0.annotation
 */
const RenderAnnotation = ({ annotation }: { annotation: AnyAnnotation }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!annotation.visible) return null;

  switch (annotation.type) {
    case 'text': {
      const textAnn = annotation as Extract<AnyAnnotation, { type: 'text' }>;
      return (
        <g
          transform={`translate(${textAnn.x}, ${textAnn.y})`}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ cursor: 'move' }}
        >
          <rect
            x={-10}
            y={-(textAnn.fontSize ?? 20)}
            width={Math.max(textAnn.content.length * 8, 50)}
            height={Math.max(textAnn.fontSize ?? 20, 30)}
            fill={textAnn.backgroundColor ?? DEFAULT_BG_COLOR}
            stroke={isHovered ? '#666' : 'none'}
            strokeWidth={1}
            opacity={0.9}
            rx={4}
          />
          <text
            x={0}
            y={0}
            fontSize={textAnn.fontSize ?? 14}
            fill={DEFAULT_TEXT_COLOR}
            style={{
              fontFamily: 'sans-serif',
              pointerEvents: 'none',
            }}
          >
            {textAnn.content}
          </text>
        </g>
      );
    }

    case 'rectangle': {
      const rectAnn = annotation as Extract<AnyAnnotation, { type: 'rectangle' }>;
      return (
        <rect
          x={rectAnn.x}
          y={rectAnn.y}
          width={rectAnn.width}
          height={rectAnn.height}
          fill={rectAnn.fillColor ?? 'rgba(255, 0, 0, 0.1)'}
          stroke={rectAnn.borderColor ?? DEFAULT_BORDER_COLOR}
          strokeWidth={rectAnn.borderWidth ?? 2}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ cursor: 'move' }}
        />
      );
    }

    case 'circle': {
      const circleAnn = annotation as Extract<AnyAnnotation, { type: 'circle' }>;
      return (
        <circle
          cx={circleAnn.x}
          cy={circleAnn.y}
          r={circleAnn.radius}
          fill={circleAnn.fillColor ?? 'rgba(255, 0, 0, 0.1)'}
          stroke={circleAnn.borderColor ?? DEFAULT_BORDER_COLOR}
          strokeWidth={circleAnn.borderWidth ?? 2}
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ cursor: 'move' }}
        />
      );
    }

    case 'drawing': {
      const drawingAnn = annotation as Extract<AnyAnnotation, { type: 'drawing' }>;
      if (drawingAnn.points.length < 2) return null;

      const pathData = drawingAnn.closed
        ? `M ${drawingAnn.points.map(p => `${p.x} ${p.y}`).join(' L ')} Z`
        : `M ${drawingAnn.points.map(p => `${p.x} ${p.y}`).join(' L ')}`;

      return (
        <path
          d={pathData}
          fill={drawingAnn.closed ? (drawingAnn.color ?? 'rgba(0, 0, 255, 0.1)') : 'none'}
          stroke={drawingAnn.strokeColor ?? DEFAULT_STROKE_COLOR}
          strokeWidth={drawingAnn.strokeWidth ?? 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          onMouseEnter={() => setIsHovered(true)}
          onMouseLeave={() => setIsHovered(false)}
          style={{ cursor: 'move' }}
        />
      );
    }

    default:
      return null;
  }
};

/**
 * Annotation Layer Component
 *
 * Renders all visible annotations as an SVG overlay
 * @param root0
 * @param root0.annotations
 * @param root0.width
 * @param root0.height
 */
export const GraphAnnotationLayer: React.FC<AnnotationLayerProps> = ({
  annotations,
  width,
  height,
}) => {
  const visibleAnnotations = annotations.filter(a => a.visible);

  if (visibleAnnotations.length === 0) {
    return null;
  }

  return (
    <Box
      style={{
        position: 'absolute',
        top: 0,
        left: 0,
        width: '100%',
        height: '100%',
        pointerEvents: 'none',
      }}
    >
      <svg
        width={width}
        height={height}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          pointerEvents: 'auto',
        }}
      >
        {visibleAnnotations.map(annotation => {
          const displayAnnotation = storageToAnnotation(annotation);
          return (
            <RenderAnnotation
              key={annotation.id}
              annotation={displayAnnotation}
            />
          );
        })}
      </svg>
    </Box>
  );
};
