/**
 * Author Collaboration Network Mini-Graph
 *
 * Shows co-author relationships as a small circle-layout graph, derived from the authorships of the works already fetched for the author page:
 * - Co-authors as nodes (collaboration count as edge weight)
 * - Click to navigate to author pages
 * - Limited to MAX_COAUTHORS co-authors for performance
 */

import type { Work } from '@bibgraph/types';
import { Group, Loader, Paper, Stack, Text, Title } from '@mantine/core';
import { IconNetwork } from '@tabler/icons-react';
import { useEffect, useRef, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { useThemeColors } from '@/hooks/use-theme-colors';

import { extractCoAuthors } from './collaboration-data';

interface CollaborationNetworkProperties {
  /**
  Current author ID
   */
  authorId: string;
  /**
  The author's works whose authorships supply the co-authors
   */
  works: readonly Work[];
  /**
  True while the works query is in flight
   */
  isLoading: boolean;
}

const MAX_COAUTHORS = 30;
const GRAPH_WIDTH = 600;
const GRAPH_HEIGHT = 400;
const NODE_RADIUS = 8;
const CIRCLE_LAYOUT_RADIUS_DIVISOR = 3;
const HOVER_NODE_RADIUS_INCREASE = 3;
const NODE_LABEL_OFFSET_Y = 15;
const MAX_LABEL_LENGTH = 20;
// Edge stroke scales between these widths by share of the busiest co-author's collaboration count.
const MIN_EDGE_STROKE_WIDTH = 1;
const MAX_EDGE_STROKE_EXTRA = 2;

/**
 * CollaborationNetwork Component
 */
export const CollaborationNetwork: React.FC<CollaborationNetworkProperties> = ({
  authorId,
  works,
  isLoading,
}) => {
  const svgRef = useRef<SVGSVGElement>(null);
  const { getEntityColor } = useThemeColors();
  const [hoveredNode, setHoveredNode] = useState<string | null>(null);

  // Derive co-authors from the loaded works; order is stable (count desc, then name).
  const coAuthors = extractCoAuthors(works, authorId);

  // Limit co-authors for performance
  const limitedCoAuthors = coAuthors.slice(0, MAX_COAUTHORS);

  useEffect(() => {
    const abortController = new AbortController();

    if (svgRef.current && limitedCoAuthors.length > 0) {
      const svg = svgRef.current;
      svg.replaceChildren();

      // Create node data
      const nodes = [
        { id: authorId, displayName: 'Current Author', isCenter: true },
        ...limitedCoAuthors.map((coAuthor) => ({
          id: coAuthor.id,
          displayName: coAuthor.displayName,
          isCenter: false,
        })),
      ];

      // Position nodes in a circle around the centre.
      const centerX = GRAPH_WIDTH / 2;
      const centerY = GRAPH_HEIGHT / 2;
      const radius = Math.min(GRAPH_WIDTH, GRAPH_HEIGHT) / CIRCLE_LAYOUT_RADIUS_DIVISOR;

      const nodePositions = new Map<string, { x: number; y: number }>();

      // Center node
      nodePositions.set(authorId, { x: centerX, y: centerY });

      // Co-authors in circle
      for (const [index, coAuthor] of limitedCoAuthors.entries()) {
        const angle = (2 * Math.PI * index) / limitedCoAuthors.length;
        nodePositions.set(coAuthor.id, {
          x: centerX + radius * Math.cos(angle),
          y: centerY + radius * Math.sin(angle),
        });
      }

      // Draw links, thickening with collaboration count
      const maxCollaborationCount = limitedCoAuthors[0]?.collaborationCount ?? 1;
      for (const coAuthor of limitedCoAuthors) {
        const sourcePos = nodePositions.get(authorId);
        const targetPos = nodePositions.get(coAuthor.id);

        if (!sourcePos || !targetPos) continue;

        const line = document.createElementNS('http://www.w3.org/2000/svg', 'line');
        line.setAttribute('x1', sourcePos.x.toString());
        line.setAttribute('y1', sourcePos.y.toString());
        line.setAttribute('x2', targetPos.x.toString());
        line.setAttribute('y2', targetPos.y.toString());
        line.setAttribute('stroke', 'var(--mantine-color-gray-3)');
        line.setAttribute('stroke-width', (MIN_EDGE_STROKE_WIDTH + (coAuthor.collaborationCount / maxCollaborationCount) * MAX_EDGE_STROKE_EXTRA).toString());
        line.setAttribute('opacity', '0.5');
        svg.append(line);
      }

      // Draw nodes
      for (const node of nodes) {
        const pos = nodePositions.get(node.id);
        if (!pos) continue;

        const g = document.createElementNS('http://www.w3.org/2000/svg', 'g');

        // Node circle
        const circle = document.createElementNS('http://www.w3.org/2000/svg', 'circle');
        circle.setAttribute('cx', pos.x.toString());
        circle.setAttribute('cy', pos.y.toString());
        circle.setAttribute('r', (node.isCenter ? NODE_RADIUS + 2 : NODE_RADIUS).toString());
        circle.setAttribute('fill', getEntityColor(node.id));
        circle.setAttribute('stroke', node.isCenter ? 'var(--mantine-color-blue-6)' : 'white');
        circle.setAttribute('stroke-width', node.isCenter ? '3' : '2');
        circle.style.cursor = 'pointer';
        circle.style.transition = 'r 0.2s';

        // Hover effect
        const handleMouseEnter = () => {
          circle.setAttribute('r', (NODE_RADIUS + HOVER_NODE_RADIUS_INCREASE).toString());
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
          window.location.assign(`/authors/${node.id}`);
        };

        circle.addEventListener('click', handleClick, { signal: abortController.signal });

        g.append(circle);

        // Node label (only for center and hovered nodes)
        if (node.isCenter || node.id === hoveredNode) {
          const text = document.createElementNS('http://www.w3.org/2000/svg', 'text');
          text.setAttribute('x', pos.x.toString());
          text.setAttribute('y', (pos.y + NODE_RADIUS + NODE_LABEL_OFFSET_Y).toString());
          text.setAttribute('text-anchor', 'middle');
          text.setAttribute('font-size', '12');
          text.setAttribute('fill', 'var(--mantine-color-dimmed)');
          text.textContent = node.displayName.length > MAX_LABEL_LENGTH
            ? `${node.displayName.slice(0, MAX_LABEL_LENGTH)}...`
            : node.displayName;
          g.append(text);
        }

        svg.append(g);
      }
    }

    // Cleanup event listeners on unmount
    return () => {
      abortController.abort();
    };
  }, [authorId, limitedCoAuthors, getEntityColor, hoveredNode]);

  if (isLoading) {
    return (
      <Paper p="xl" radius="xl">
        <Stack gap="lg">
          <Group gap="sm">
            <IconNetwork size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Collaboration Network</Title>
          </Group>
          <Group gap="sm" justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading co-authors from the author's works...</Text>
          </Group>
        </Stack>
      </Paper>
    );
  }

  if (limitedCoAuthors.length === 0) {
    return (
      <Paper p="xl" radius="xl">
        <Stack gap="lg">
          <Group gap="sm">
            <IconNetwork size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Collaboration Network</Title>
          </Group>
          <Text size="sm" c="dimmed" ta="center" py="xl">
            No co-authors appear in this author's works.
          </Text>
        </Stack>
      </Paper>
    );
  }

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
            role="img"
            aria-label={`Collaboration network of ${String(coAuthors.length)} co-authors`}
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
          Showing {limitedCoAuthors.length} of {coAuthors.length} co-authors from the author's works. Click nodes to navigate.
        </Text>
      </Stack>
    </Paper>
  );
};
