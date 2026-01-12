/**
 * Export Utilities
 *
 * Provides functionality to export search results to CSV and BibTeX formats,
 * and graph visualizations to SVG format.
 */

import type { AutocompleteResult, GraphEdge, GraphNode } from '@bibgraph/types';

import { ENTITY_TYPE_COLORS as HASH_BASED_ENTITY_COLORS } from '@/styles/hash-colors';

/**
 * Convert search results to CSV format
 * @param results
 * @param filename
 */
export const exportToCSV = (results: AutocompleteResult[], filename?: string): void => {
  if (results.length === 0) return;

  // CSV headers
  const headers = [
    'ID',
    'Display Name',
    'Entity Type',
    'Citation Count',
    'Works Count',
    'Hint',
    'URL',
  ];

  // Convert results to CSV rows
  const rows = results.map((result) => [
    result.id,
    `"${result.display_name.replaceAll('"', '""')}"`, // Escape quotes
    result.entity_type,
    result.cited_by_count ?? 0,
    result.works_count ?? 0,
    result.hint ?? '',
    result.id,
  ]);

  // Combine headers and rows
  const csvContent = [headers.join(','), ...rows.map((row) => row.join(','))].join('\n');

  // Create blob and download
  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `search-results-${Date.now()}.csv`);
  link.style.visibility = 'hidden';
  document.body.append(link);
  link.click();
  link.remove();
};

/**
 * Convert a work result to BibTeX format
 * @param result
 */
const workToBibTeX = (result: AutocompleteResult): string => {
  const id = result.id.replace('https://openalex.org/', '').toUpperCase();
  const bibKey = `work${id}`.replaceAll(/[^a-z0-9]/gi, '');

  let bibtex = `@misc{${bibKey},\n`;
  bibtex += `  title = {${result.display_name}},\n`;

  if (result.hint) {
    bibtex += `  howpublished = {${result.hint}},\n`;
  }

  if (result.cited_by_count) {
    bibtex += `  citations = {${result.cited_by_count}},\n`;
  }

  bibtex += `  url = {${result.id}},\n`;
  bibtex += `}\n`;

  return bibtex;
};

/**
 * Convert author result to BibTeX format
 * @param result
 */
const authorToBibTeX = (result: AutocompleteResult): string => {
  const id = result.id.replace('https://openalex.org/', '').toUpperCase();
  const bibKey = `${result.display_name.split(' ').pop() || 'author'}${id}`.replaceAll(/[^a-z0-9]/gi, '');

  let bibtex = `@misc{${bibKey},\n`;
  bibtex += `  author = {${result.display_name}},\n`;

  if (result.cited_by_count) {
    bibtex += `  citations = {${result.cited_by_count}},\n`;
  }

  if (result.works_count) {
    bibtex += `  works = {${result.works_count}},\n`;
  }

  bibtex += `  url = {${result.id},\n`;
  bibtex += `}\n`;

  return bibtex;
};

/**
 * Convert search results to BibTeX format
 * @param results
 * @param filename
 */
export const exportToBibTeX = (results: AutocompleteResult[], filename?: string): void => {
  if (results.length === 0) return;

  // Convert results to BibTeX entries
  const bibtexEntries = results.map((result) => {
    if (result.entity_type === 'work') {
      return workToBibTeX(result);
    }
    return authorToBibTeX(result);
  });

  const bibtexContent = bibtexEntries.join('\n');

  // Create blob and download
  const blob = new Blob([bibtexContent], { type: 'text/plain;charset=utf-8;' });
  const link = document.createElement('a');
  const url = URL.createObjectURL(blob);

  link.setAttribute('href', url);
  link.setAttribute('download', filename || `search-results-${Date.now()}.bib`);
  link.style.visibility = 'hidden';
  document.body.append(link);
  link.click();
  link.remove();
};

/**
 * Get export filename based on current search query
 * @param query
 * @param format
 */
export const getExportFilename = (query: string, format: 'csv' | 'bib'): string => {
  const sanitizedQuery = query.trim().replaceAll(/[^a-z0-9]/gi, '-').toLowerCase();
  const timestamp = new Date().toISOString().slice(0, 10);
  return sanitizedQuery
    ? `${sanitizedQuery}-results-${timestamp}.${format}`
    : `search-results-${timestamp}.${format}`;
};

interface SVGExportOptions {
  /** Width of the SVG in pixels */
  width: number;
  /** Height of the SVG in pixels */
  height: number;
  /** Padding around the graph content */
  padding?: number;
  /** Whether to include the legend */
  includeLegend?: boolean;
  /** Node positions override (optional, uses node.x/y if not provided) */
  nodePositions?: Map<string, { x: number; y: number }>;
}

/**
 * Generate SVG markup from graph data
 * @param nodes - Graph nodes to render
 * @param edges - Graph edges to render
 * @param options - Export options
 * @returns SVG markup as string
 */
export const generateGraphSVG = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: SVGExportOptions,
): string => {
  const { width, height, padding = 20, includeLegend = false, nodePositions } = options;

  // Calculate bounds of the graph
  let minX = Infinity;
  let maxX = -Infinity;
  let minY = Infinity;
  let maxY = -Infinity;

  nodes.forEach((node) => {
    const x = nodePositions?.get(node.id)?.x ?? node.x ?? 0;
    const y = nodePositions?.get(node.id)?.y ?? node.y ?? 0;

    minX = Math.min(minX, x);
    maxX = Math.max(maxX, x);
    minY = Math.min(minY, y);
    maxY = Math.max(maxY, y);
  });

  // Add padding
  minX -= padding;
  maxX += padding;
  minY -= padding;
  maxY += padding;

  const graphWidth = maxX - minX;
  const graphHeight = maxY - minY;

  // Calculate scale to fit within requested dimensions
  const scaleX = width / graphWidth;
  const scaleY = height / graphHeight;
  const scale = Math.min(scaleX, scaleY);

  // Calculate offsets to center the graph
  const offsetX = (width - graphWidth * scale) / 2 - minX * scale;
  const offsetY = (height - graphHeight * scale) / 2 - minY * scale;

  // Generate SVG elements
  const svgElements: string[] = [];

  // Background
  svgElements.push(`<rect width="${width}" height="${height}" fill="white"/>`);

  // Edges (draw before nodes so they appear behind)
  edges.forEach((edge) => {
    const sourceNode = nodes.find((n) => n.id === edge.source);
    const targetNode = nodes.find((n) => n.id === edge.target);

    if (!sourceNode || !targetNode) return;

    const x1 = (nodePositions?.get(sourceNode.id)?.x ?? sourceNode.x ?? 0) * scale + offsetX;
    const y1 = (nodePositions?.get(sourceNode.id)?.y ?? sourceNode.y ?? 0) * scale + offsetY;
    const x2 = (nodePositions?.get(targetNode.id)?.x ?? targetNode.x ?? 0) * scale + offsetX;
    const y2 = (nodePositions?.get(targetNode.id)?.y ?? targetNode.y ?? 0) * scale + offsetY;

    const edgeColor = '#94a3b8';
    const edgeWidth = 1;

    svgElements.push(
      `<line x1="${x1}" y1="${y1}" x2="${x2}" y2="${y2}" stroke="${edgeColor}" stroke-width="${edgeWidth}" opacity="0.6"/>`,
    );
  });

  // Nodes
  const NODE_RADIUS = 5;
  nodes.forEach((node) => {
    const x = (nodePositions?.get(node.id)?.x ?? node.x ?? 0) * scale + offsetX;
    const y = (nodePositions?.get(node.id)?.y ?? node.y ?? 0) * scale + offsetY;

    const nodeColor = HASH_BASED_ENTITY_COLORS[node.entityType];

    svgElements.push(
      `<circle cx="${x}" cy="${y}" r="${NODE_RADIUS}" fill="${nodeColor}" stroke="#333" stroke-width="0.5"/>`,
    );
  });

  // Legend
  if (includeLegend) {
    const entityTypes = new Set(nodes.map((n) => n.entityType));
    const legendX = width - 150;
    const legendY = 20;
    const legendItemHeight = 25;

    // Legend background
    svgElements.push(
      `<rect x="${legendX - 10}" y="${legendY - 10}" width="140" height="${entityTypes.size * legendItemHeight + 20}" fill="white" stroke="#ccc" stroke-width="1" opacity="0.9"/>`,
    );

    // Legend items
    let itemIndex = 0;
    entityTypes.forEach((entityType) => {
      const itemY = legendY + itemIndex * legendItemHeight;

      svgElements.push(
        `<circle cx="${legendX}" cy="${itemY + 7}" r="5" fill="${HASH_BASED_ENTITY_COLORS[entityType]}"/>`,
      );
      svgElements.push(
        `<text x="${legendX + 15}" y="${itemY + 11}" font-family="sans-serif" font-size="12" fill="#333">${entityType}</text>`,
      );

      itemIndex++;
    });
  }

  // Wrap in SVG tag
  const svgContent = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  ${svgElements.join('\n  ')}
</svg>`;

  return svgContent;
};

/**
 * Download graph as SVG file
 * @param nodes - Graph nodes to export
 * @param edges - Graph edges to export
 * @param options - Export options
 * @param filename - Name for the downloaded file (without .svg extension)
 */
export const downloadGraphSVG = (
  nodes: GraphNode[],
  edges: GraphEdge[],
  options: SVGExportOptions,
  filename: string = `graph-${new Date().toISOString().split('T')[0]}-${new Date().toISOString().split('T')[1].split('.')[0].replaceAll(':', '-')}`,
): void => {
  const svgContent = generateGraphSVG(nodes, edges, options);

  // Create blob and download
  const blob = new Blob([svgContent], { type: 'image/svg+xml;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const link = document.createElement('a');
  link.href = url;
  link.download = `${filename}.svg`;
  link.style.display = 'none';

  document.body.append(link);
  link.click();

  // Cleanup
  link.remove();
  URL.revokeObjectURL(url);
};
