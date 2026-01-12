/**
 * Graph Annotations Component
 *
 * Main component for managing graph annotations.
 * Provides drawing tools, renders annotations, handles user interactions.
 *
 * @module components/graph/annotations/GraphAnnotations
 */

import type { GraphAnnotationStorage } from '@bibgraph/utils';
import { Box, Stack } from '@mantine/core';
import { useCallback, useRef, useState } from 'react';

import type { DrawingTool } from './AnnotationToolbar';
import { AnnotationToolbar, TextAnnotationPopover } from './AnnotationToolbar';
import { GraphAnnotationLayer } from './GraphAnnotationLayer';

/**
 * Default annotation colors
 */
const ANNOTATION_COLORS = {
  text: { bg: '#ffff00', text: '#000000' },
  rectangle: { border: '#ff0000', fill: 'rgba(255, 0, 0, 0.1)' },
  circle: { border: '#00ff00', fill: 'rgba(0, 255, 0, 0.1)' },
  drawing: { stroke: '#0000ff' },
} as const;

interface GraphAnnotationsProps {
  /** Graph container dimensions */
  width: number;
  height: number;
  /** All annotations from storage */
  annotations: GraphAnnotationStorage[];
  /** Callback when annotation is added */
  onAddAnnotation: (annotation: Omit<GraphAnnotationStorage, 'id' | 'createdAt' | 'updatedAt' | 'graphId'>) => Promise<void>;
  /** Callback when all annotations are cleared */
  onClearAnnotations?: () => Promise<void>;
}

/**
 * Main graph annotations component
 * @param root0
 * @param root0.width
 * @param root0.height
 * @param root0.annotations
 * @param root0.onAddAnnotation
 * @param root0.onClearAnnotations
 */
export const GraphAnnotations: React.FC<GraphAnnotationsProps> = ({
  width,
  height,
  annotations,
  onAddAnnotation,
  onClearAnnotations,
}) => {
  const [activeTool, setActiveTool] = useState<DrawingTool>('select');
  const [isDrawing, setIsDrawing] = useState(false);
  const [drawingPoints, setDrawingPoints] = useState<Array<{ x: number; y: number }>>([]);

  const [showTextPopover, setShowTextPopover] = useState(false);
  const [textPosition, setTextPosition] = useState({ x: 0, y: 0 });

  const canvasRef = useRef<HTMLDivElement>(null);
  const startPointRef = useRef<{ x: number; y: number } | null>(null);

  /**
   * Get mouse position relative to canvas
   */
  const getMousePosition = useCallback((event: MouseEvent) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };

    const rect = canvas.getBoundingClientRect();
    return {
      x: event.clientX - rect.left,
      y: event.clientY - rect.top,
    };
  }, []);

  /**
   * Handle mouse down - start drawing
   */
  const handleMouseDown = useCallback(async (event: MouseEvent) => {
    if (activeTool === 'select' || activeTool === 'erase') return;

    const pos = getMousePosition(event);
    startPointRef.current = pos;
    setIsDrawing(true);

    if (activeTool === 'text') {
      setTextPosition(pos);
      setShowTextPopover(true);
      setIsDrawing(false);
      return;
    }

    if (activeTool === 'drawing') {
      setDrawingPoints([pos]);
    }
  }, [activeTool, getMousePosition]);

  /**
   * Handle mouse move - update drawing preview
   */
  const handleMouseMove = useCallback((event: MouseEvent) => {
    if (!isDrawing || !startPointRef.current) return;

    const pos = getMousePosition(event);

    if (activeTool === 'drawing') {
      setDrawingPoints(prev => [...prev, pos]);
    }
  }, [isDrawing, activeTool, getMousePosition]);

  /**
   * Handle mouse up - finish drawing and create annotation
   */
  const handleMouseUp = useCallback(async () => {
    if (!isDrawing || !startPointRef.current) return;

    const start = startPointRef.current;

    try {
      switch (activeTool) {
        case 'rectangle': {
          const currentPos = drawingPoints[drawingPoints.length - 1] ?? start;
          const width = Math.abs(currentPos.x - start.x);
          const height = Math.abs(currentPos.y - start.y);

          if (width > 5 && height > 5) {
            await onAddAnnotation({
              type: 'rectangle',
              visible: true,
              x: Math.min(start.x, currentPos.x),
              y: Math.min(start.y, currentPos.y),
              width,
              height,
              borderColor: ANNOTATION_COLORS.rectangle.border,
              fillColor: ANNOTATION_COLORS.rectangle.fill,
              borderWidth: 2,
            });
          }
          break;
        }

        case 'circle': {
          const currentPos = drawingPoints[drawingPoints.length - 1] ?? start;
          const radius = Math.sqrt(
            Math.pow(currentPos.x - start.x, 2) +
            Math.pow(currentPos.y - start.y, 2)
          );

          if (radius > 5) {
            await onAddAnnotation({
              type: 'circle',
              visible: true,
              x: start.x,
              y: start.y,
              radius,
              borderColor: ANNOTATION_COLORS.circle.border,
              fillColor: ANNOTATION_COLORS.circle.fill,
              borderWidth: 2,
            });
          }
          break;
        }

        case 'drawing': {
          if (drawingPoints.length > 2) {
            await onAddAnnotation({
              type: 'drawing',
              visible: true,
              points: drawingPoints,
              strokeColor: ANNOTATION_COLORS.drawing.stroke,
              strokeWidth: 2,
              closed: false,
            });
          }
          setDrawingPoints([]);
          break;
        }
      }
    } catch (error) {
      console.error('Failed to create annotation:', error);
    } finally {
      setIsDrawing(false);
      startPointRef.current = null;
      setDrawingPoints([]);
    }
  }, [isDrawing, activeTool, drawingPoints, onAddAnnotation]);

  /**
   * Handle text annotation submission
   */
  const handleTextSubmit = useCallback(async (text: string) => {
    try {
      await onAddAnnotation({
        type: 'text',
        visible: true,
        content: text,
        x: textPosition.x,
        y: textPosition.y,
        fontSize: 14,
        backgroundColor: ANNOTATION_COLORS.text.bg,
      });
    } catch (error) {
      console.error('Failed to create text annotation:', error);
    }
  }, [textPosition, onAddAnnotation]);

  /**
   * Handle clear all annotations
   */
  const handleClearAll = useCallback(async () => {
    if (!onClearAnnotations) return;
    try {
      await onClearAnnotations();
    } catch (error) {
      console.error('Failed to clear annotations:', error);
    }
  }, [onClearAnnotations]);

  return (
    <Stack gap="xs">
      {/* Annotation toolbar */}
      <AnnotationToolbar
        activeTool={activeTool}
        onToolChange={setActiveTool}
        annotationCount={annotations.length}
        onClearAll={handleClearAll}
      />

      {/* Annotation canvas */}
      <Box
        ref={canvasRef}
        style={{
          position: 'absolute',
          top: 0,
          left: 0,
          width: '100%',
          height: '100%',
          cursor: activeTool === 'select' ? 'default' : 'crosshair',
        }}
        onMouseDown={(e) => {
          if (activeTool !== 'select') {
            handleMouseDown(e.nativeEvent);
          }
        }}
        onMouseMove={(e) => handleMouseMove(e.nativeEvent)}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        {/* Render existing annotations */}
        <GraphAnnotationLayer
          annotations={annotations}
          width={width}
          height={height}
        />

        {/* Drawing preview for shapes */}
        {isDrawing && startPointRef.current && drawingPoints.length > 0 && (
          <svg
            width={width}
            height={height}
            style={{
              position: 'absolute',
              top: 0,
              left: 0,
              pointerEvents: 'none',
            }}
          >
            {activeTool === 'rectangle' && (
              <rect
                x={Math.min(startPointRef.current.x, drawingPoints[drawingPoints.length - 1]?.x ?? 0)}
                y={Math.min(startPointRef.current.y, drawingPoints[drawingPoints.length - 1]?.y ?? 0)}
                width={Math.abs((drawingPoints[drawingPoints.length - 1]?.x ?? 0) - startPointRef.current.x)}
                height={Math.abs((drawingPoints[drawingPoints.length - 1]?.y ?? 0) - startPointRef.current.y)}
                fill="none"
                stroke="#ff0000"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}

            {activeTool === 'circle' && startPointRef.current && (
              <circle
                cx={startPointRef.current.x}
                cy={startPointRef.current.y}
                r={Math.sqrt(
                  Math.pow((drawingPoints[drawingPoints.length - 1]?.x ?? 0) - startPointRef.current.x, 2) +
                  Math.pow((drawingPoints[drawingPoints.length - 1]?.y ?? 0) - startPointRef.current.y, 2)
                )}
                fill="none"
                stroke="#00ff00"
                strokeWidth={2}
                strokeDasharray="5,5"
              />
            )}

            {activeTool === 'drawing' && drawingPoints.length > 1 && (
              <path
                d={`M ${drawingPoints.map(p => `${p.x} ${p.y}`).join(' L ')}`}
                fill="none"
                stroke="#0000ff"
                strokeWidth={2}
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            )}
          </svg>
        )}
      </Box>

      {/* Text annotation popover */}
      <TextAnnotationPopover
        opened={showTextPopover}
        onClose={() => setShowTextPopover(false)}
        onSubmit={handleTextSubmit}
        position={textPosition}
      />
    </Stack>
  );
};
