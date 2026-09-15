/**
 * Graph Annotation Layer
 *
 * Renders annotations as an SVG overlay on the graph canvas. Supports text labels, shapes (rectangles, circles), and freehand drawings.
 */

import type { GraphAnnotationStorage } from '@bibgraph/utils';
import { Box } from '@mantine/core';
import { useState } from 'react';

import type { AnyAnnotation } from './types';

const DEFAULT_TEXT_COLOR = '#000000';
const DEFAULT_BG_COLOR = '#ffff00';
const DEFAULT_BORDER_COLOR = '#ff0000';
const DEFAULT_STROKE_COLOR = '#000000';
const DEFAULT_TEXT_BOX_FONT_SIZE = 20;
const TEXT_LABEL_CHAR_WIDTH_PX = 8;
const TEXT_LABEL_MIN_WIDTH_PX = 50;
const TEXT_LABEL_MIN_HEIGHT_PX = 30;
const DEFAULT_TEXT_RENDER_FONT_SIZE = 14;

/**
 * Convert storage annotation to display annotation
 */
const storageToAnnotation = (storage: GraphAnnotationStorage): AnyAnnotation => {
  if (storage.id === undefined || storage.id === '') {
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
      };

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
      };

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
      };

    case 'drawing':
      return {
        ...base,
        type: 'drawing',
        points: storage.points ?? [],
        strokeColor: storage.strokeColor,
        strokeWidth: storage.strokeWidth,
        closed: storage.closed,
      };

    default:
      return storage.type satisfies never;
  }
};

interface AnnotationLayerProperties {
  annotations: GraphAnnotationStorage[];
  width: number;
  height: number;
}

/**
 * Render a single annotation
 */
const RenderAnnotation = ({ annotation }: { annotation: AnyAnnotation }) => {
  const [isHovered, setIsHovered] = useState(false);

  if (!annotation.visible) return null;

  switch (annotation.type) {
    case 'text': {
      return (
        <g
          transform={`translate(${String(annotation.x)}, ${String(annotation.y)})`}
          onMouseEnter={() => { setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
          style={{ cursor: 'move' }}
        >
          <rect
            x={-10}
            y={-(annotation.fontSize ?? DEFAULT_TEXT_BOX_FONT_SIZE)}
            width={Math.max(annotation.content.length * TEXT_LABEL_CHAR_WIDTH_PX, TEXT_LABEL_MIN_WIDTH_PX)}
            height={Math.max(annotation.fontSize ?? DEFAULT_TEXT_BOX_FONT_SIZE, TEXT_LABEL_MIN_HEIGHT_PX)}
            fill={annotation.backgroundColor ?? DEFAULT_BG_COLOR}
            stroke={isHovered ? '#666' : 'none'}
            strokeWidth={1}
            opacity={0.9}
            rx={4}
          />
          <text
            x={0}
            y={0}
            fontSize={annotation.fontSize ?? DEFAULT_TEXT_RENDER_FONT_SIZE}
            fill={DEFAULT_TEXT_COLOR}
            style={{
              fontFamily: 'sans-serif',
              pointerEvents: 'none',
            }}
          >
            {annotation.content}
          </text>
        </g>
      );
    }

    case 'rectangle': {
      return (
        <rect
          x={annotation.x}
          y={annotation.y}
          width={annotation.width}
          height={annotation.height}
          fill={annotation.fillColor ?? 'rgba(255, 0, 0, 0.1)'}
          stroke={annotation.borderColor ?? DEFAULT_BORDER_COLOR}
          strokeWidth={annotation.borderWidth ?? 2}
          onMouseEnter={() => { setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
          style={{ cursor: 'move' }}
        />
      );
    }

    case 'circle': {
      return (
        <circle
          cx={annotation.x}
          cy={annotation.y}
          r={annotation.radius}
          fill={annotation.fillColor ?? 'rgba(255, 0, 0, 0.1)'}
          stroke={annotation.borderColor ?? DEFAULT_BORDER_COLOR}
          strokeWidth={annotation.borderWidth ?? 2}
          onMouseEnter={() => { setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
          style={{ cursor: 'move' }}
        />
      );
    }

    case 'drawing': {
      if (annotation.points.length < 2) return null;

      const pathData = annotation.closed === true
        ? `M ${annotation.points.map(p => `${String(p.x)} ${String(p.y)}`).join(' L ')} Z`
        : `M ${annotation.points.map(p => `${String(p.x)} ${String(p.y)}`).join(' L ')}`;

      return (
        <path
          d={pathData}
          fill={annotation.closed === true ? (annotation.color ?? 'rgba(0, 0, 255, 0.1)') : 'none'}
          stroke={annotation.strokeColor ?? DEFAULT_STROKE_COLOR}
          strokeWidth={annotation.strokeWidth ?? 2}
          strokeLinecap="round"
          strokeLinejoin="round"
          onMouseEnter={() => { setIsHovered(true); }}
          onMouseLeave={() => { setIsHovered(false); }}
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
 */
export const GraphAnnotationLayer: React.FC<AnnotationLayerProperties> = ({
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
