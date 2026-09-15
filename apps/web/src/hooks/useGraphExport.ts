/**
 * Graph Export Hook
 *
 * Handles exporting graph visualizations to PNG and SVG formats.
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import { notifications } from '@mantine/notifications';
import { type RefObject,useCallback, useState } from 'react';

import { downloadGraphSVG } from '@/utils/exportUtils';

interface UseGraphExportOptions {
  /**
  Ref to the graph container element
   */
  graphContainerRef: RefObject<HTMLDivElement | null>;
  /**
  Graph nodes for SVG export
   */
  nodes: GraphNode[];
  /**
  Graph edges for SVG export
   */
  edges: GraphEdge[];
  /**
  Optional node positions for layout preservation
   */
  nodePositions?: Map<string, { x: number; y: number }>;
}

interface UseGraphExportReturn {
  /**
  Whether PNG export is in progress
   */
  isExportingPNG: boolean;
  /**
  Whether SVG export is in progress
   */
  isExportingSVG: boolean;
  /**
  Export graph as PNG
   */
  handleExportPNG: () => void;
  /**
  Export graph as SVG
   */
  handleExportSVG: () => void;
}

/**
 * Generate a timestamped filename for exports
 */
const DEFAULT_EXPORT_WIDTH = 1200;
const DEFAULT_EXPORT_HEIGHT = 600;
const EXPORT_HEIGHT_VIEWPORT_RATIO = 0.55;

const generateExportFilename = (extension: 'png' | 'svg'): string => {
  const date = new Date().toISOString().split('T', 1)[0];
  const time = new Date().toISOString().split('T', 2)[1].split('.', 1)[0].replaceAll(':', '-');
  return `graph-${date}-${time}.${extension}`;
};

/**
 * Hook for exporting graph visualizations
 */
export const useGraphExport = ({
  graphContainerRef,
  nodes,
  edges,
  nodePositions = new Map(),
}: UseGraphExportOptions): UseGraphExportReturn => {
  const [isExportingPNG, setIsExportingPNG] = useState(false);
  const [isExportingSVG, setIsExportingSVG] = useState(false);

  const handleExportPNG = useCallback(() => {
    if (!graphContainerRef.current) {
      notifications.show({
        title: 'Export Failed',
        message: 'Graph container is not ready for export.',
        color: 'red',
      });
      return;
    }

    try {
      setIsExportingPNG(true);

      // Find the canvas element within the graph container
      const canvas = graphContainerRef.current.querySelector('canvas');
      if (!canvas) {
        throw new Error('Could not find graph canvas element');
      }

      // Convert canvas to data URL
      const dataUrl = canvas.toDataURL('image/png');
      const filename = generateExportFilename('png');

      // Create download link
      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = filename;
      link.style.display = 'none';

      document.body.append(link);
      link.click();

      // Cleanup
      link.remove();
      setIsExportingPNG(false);

      notifications.show({
        title: 'Export Successful',
        message: `Graph exported as ${filename}`,
        color: 'green',
      });
    } catch (error) {
      setIsExportingPNG(false);
      notifications.show({
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export graph',
        color: 'red',
      });
    }
  }, [graphContainerRef]);

  const handleExportSVG = useCallback(() => {
    if (nodes.length === 0) {
      notifications.show({
        title: 'Export Failed',
        message: 'Graph has no nodes to export.',
        color: 'red',
      });
      return;
    }

    try {
      setIsExportingSVG(true);

      const width = graphContainerRef.current?.clientWidth ?? DEFAULT_EXPORT_WIDTH;
      const height = typeof window !== 'undefined' ? window.innerHeight * EXPORT_HEIGHT_VIEWPORT_RATIO : DEFAULT_EXPORT_HEIGHT;

      const filename = generateExportFilename('svg').replace('.svg', '');

      // Download SVG
      downloadGraphSVG(nodes, edges, {
        width,
        height,
        padding: 50,
        includeLegend: true,
        nodePositions,
      }, filename);

      setIsExportingSVG(false);

      notifications.show({
        title: 'Export Successful',
        message: `Graph exported as ${filename}.svg`,
        color: 'green',
      });
    } catch (error) {
      setIsExportingSVG(false);
      notifications.show({
        title: 'Export Failed',
        message: error instanceof Error ? error.message : 'Failed to export graph',
        color: 'red',
      });
    }
  }, [nodes, edges, nodePositions, graphContainerRef]);

  return {
    isExportingPNG,
    isExportingSVG,
    handleExportPNG,
    handleExportSVG,
  };
};
