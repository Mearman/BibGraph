/**
 * Author Collaboration Network Mini-Graph
 *
 * Shows co-author relationships as a small force-directed graph:
 * - Co-authors as nodes
 * - Collaboration count as edge weight
 * - Click to navigate to author pages
 * - Limited to 30 co-authors for performance
 *
 * @module components/entity-detail
 */

import type { Author } from '@bibgraph/types';
import { Group, Paper, Stack, Text, Title } from '@mantine/core';
import { IconNetwork } from '@tabler/icons-react';
import { type CSSProperties, useEffect, useRef, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useThemeColors } from '@/hooks/use-theme-colors';

interface CoAuthorNode {
  id: string;
  displayName: string;
  collaborationCount: number;
}

interface CollaborationNetworkProps {
  /** Current author ID */
  authorId: string;
  /** Author data from OpenAlex */
  author: Author | null;
}

const MAX_COAUTHORS = 30;
const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 400;
const NODE_RADIUS = 8;

/**
 * Extract co-authors from author data
 * OpenAlex Author object includes counts_by_year but not direct co-author lists.
 * We'll need to parse the author's works to extract co-authors.
 * @param author
 */
const extractCoAuthors = (author: Author | null): CoAuthorNode[] => {
  if (!author) return [];

  // Note: OpenAlex API doesn't directly provide co-author lists in the Author object.
  // The author's works would need to be fetched and their authorships parsed.
  // For now, return empty array - this component will need additional data fetching.
  // Future enhancement: Add a co-authors endpoint or fetch works with authorships.

  return [];
};

/**
 * CollaborationNetwork Component
 * @param root0
 * @param root0.authorId
 * @param root0.author
 */
export const CollaborationNetwork: React.FC<CollaborationNetworkProps> = ({
  authorId,
  author,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { getEntityColor } = useThemeColors();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Extract co-authors from author data
  const coAuthors = extractCoAuthors(author);

  // Limit co-authors for performance
  const limitedCoAuthors = coAuthors.slice(0, MAX_COAUTHORS);

  // Show placeholder when no co-author data available
  if (limitedCoAuthors.length === 0) {
    return (
      <Paper p="xl" radius="xl">
        <Stack gap="lg">
          {/* Header */}
          <Group justify="space-between" align="center">
            <Group gap="sm">
              <IconNetwork size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
              <Title order={3}>Collaboration Network</Title>
            </Group>
          </Group>

          {/* Placeholder */}
          <Text size="sm" c="dimmed" ta="center" py="xl">
            Collaboration network requires fetching co-author data from works.
            This feature will be enhanced with additional API queries.
          </Text>
        </Stack>
      </Paper>
    );
  }

  useEffect(() => {
    if (!svgRef.current || limitedCoAuthors.length === 0) return;

    // Clear previous graph
    const svg = svgRef.current;
    while (svg.firstChild) {
      svg.firstChild.remove();
    }

    // Create node data
    const nodes = [
      { id: authorId, displayName: 'Current Author', isCenter: true },
      ...limitedCoAuthors.map((coAuthor) => ({
        id: coAuthor.id,
        displayName: coAuthor.displayName,
        isCenter: false,
      })),
    ];

    // Create link data
    const links = limitedCoAuthors.map((coAuthor) => ({
      source: authorId,
      target: coAuthor.id,
      collaborationCount: coAuthor.collaborationCount,
    }));

    // Simple force-directed layout without D3 dependency
    // Position nodes in a circle around center
    const centerX = GRAPH_WIDTH / 2;
    const centerY = GRAPH_HEIGHT / 2;
    const radius = Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) / 3;

    const nodePositions = new Map<string, { x: number; y: number }>();

    // Center node
    nodePositions.set(authorId, { x: centerX, y: centerY });

    // Co-authors in circle
    limitedCoAuthors.forEach((coAuthor, index) => {
      const angle = (2 * Math.PI * index) / limitedCoAuthors.length;
      nodePositions.set(coAuthor.id, {
        x: centerX + radius * Math.cos(angle),
        y: centerY + radius * Math.sin(angle),
      });
    });

    // Draw links
    links.forEach((link) => {
      const sourcePos = nodePositions.get(link.source as string);
      const targetPos = nodePositions.get(link.target as string);

      if (!sourcePos || !targetPos) return;

      const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
      line.setAttribute('x1', sourcePos.x.toString());
      line.setAttribute('y1', sourcePos.y.toString());
      line.setAttribute('x2', targetPos.x.toString());
      line.setAttribute('y2', targetPos.y.toString());
      line.setAttribute('stroke', 'var(--mantine-color-gray-3)');
      line.setAttribute('stroke-width', '1');
      line.setAttribute('opacity', '0.5');
      svg.append(line);
    });

    // Draw nodes
    const abortController = new AbortController();

    nodes.forEach((node) => {
      const pos = nodePositions.get(node.id);
      if (!pos) return;

      const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

      // Node circle
      const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
      circle.setAttribute('cx', pos.x.toString());
      circle.setAttribute('cy', pos.y.toString());
      circle.setAttribute('r', (node.isCenter ? NODE_RADIUS + 2 : NODE_RADIUS).toString());
      circle.setAttribute('fill', getEntityColor(node.id));
      circle.setAttribute('stroke', node.isCenter ? 'var(--mantine-color-blue-6)' : 'white');
      circle.setAttribute('stroke-width', node.isCenter ? '3' : '2');
      const style: CSSProperties = {
        cursor: 'pointer',
        transition: 'r 0.2s',
      };
      Object.entries(style).forEach(([key, value]) => {
        circle.style.setProperty(key, value);
      });

      // Hover effect
      const handleMouseEnter = () => {
        circle.setAttribute('r', (NODE_RADIUS + 3).toString());
        setHoveredNode(node.id);
      };
      const handleMouseLeave = () => {
        circle.setAttribute('r', (node.isCenter ? NODE_RADIUS + 2 : NODE_RADIUS).toString());
        setHoveredNode(null);
      };

      circle.addEventListener('mouseenter', handleMouseEnter, { signal: abortController.signal });
      circle.addEventListener('mouseleave', handleMouseLeave, { signal: abortController.signal });

      // Click to navigate
      const handleClick = () => {
        window.location.href = `/authors/${node.id}`;
      };

      circle.addEventListener('click', handleClick, { signal: abortController.signal });

      g.append(circle);

      // Node label (only for center and hovered nodes)
      if (node.isCenter || node.id === hoveredNode) {
        const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
        text.setAttribute('x', pos.x.toString());
        text.setAttribute('y', (pos.y + NODE_RADIUS + 15).toString());
        text.setAttribute('text-anchor', 'middle');
        text.setAttribute('font-size', '12');
        text.setAttribute('fill', 'var(--mantine-color-dimmed)');
        text.textContent = node.displayName.length > 20
          ? `${node.displayName.slice(0, 20)}...`
          : node.displayName;
        g.append(text);
      }

      svg.append(g);
    });

    // Cleanup event listeners on unmount
    return () => {
      abortController.abort();
    };
  }, [authorId, limitedCoAuthors, getEntityColor, hoveredNode]);

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconNetwork size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Collaboration Network</Title>
          </Group>
        </Group>

        {/* Graph */}
        <Group justify="center">
          <svg
            ref={svgRef}
            width={GRAPH_WIDTH}
            height={GRAPH_HEIGHT}
            style={{
              border: '1px solid var(--mantine-color-gray-3)',
              borderRadius: '8px',
              backgroundColor: 'var(--mantine-color-gray-0)',
              maxWidth: '100%',
              height: 'auto',
            }}
          />
        </Group>

        {/* Legend */}
        <Text size="sm" c="dimmed" ta="center">
          Showing {limitedCoAuthors.length} of {coAuthors.length} co-authors. Click nodes to navigate.
        </Text>
      </Stack>
    </Paper>
  );
};
