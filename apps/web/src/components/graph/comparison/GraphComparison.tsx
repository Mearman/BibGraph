/**
 * Graph Comparison Component
 *
 * Displays two graph visualizations side-by-side for comparison.
 * Highlights differences between nodes and edges.
 * Shows diff statistics and swap functionality.
 *
 * @module components/graph/comparison
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import {
  ActionIcon,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Flex,
  Group,
  Stack,
  Text,
  Title,
  Tooltip,
} from '@mantine/core';
import { useDisclosure } from '@mantine/hooks';
import { notifications } from '@mantine/notifications';
import {
  IconArrowLeft,
  IconArrowsLeftRight,
  IconMinus,
  IconPlus,
  IconRefresh,
  IconX,
} from '@tabler/icons-react';
import { useCallback, useMemo, useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';
import { type GraphLayoutType, useGraphLayout } from '@/hooks/useGraphLayout';
import { OptimizedForceGraphVisualization } from '@/components/graph/OptimizedForceGraphVisualization';
import type { DisplayMode } from '@/components/graph/types';

interface GraphComparisonProps {
  /** Left graph nodes */
  leftNodes: GraphNode[];
  /** Left graph edges */
  leftEdges: GraphEdge[];
  /** Right graph nodes */
  rightNodes: GraphNode[];
  /** Right graph edges */
  rightEdges: GraphEdge[];
  /** Left graph name */
  leftName?: string;
  /** Right graph name */
  rightName?: string;
  /** Layout type for both graphs */
  layoutType?: GraphLayoutType;
  /** Close comparison handler */
  onClose?: () => void;
}

interface GraphDiff {
  /** Nodes only in left graph */
  removedNodes: GraphNode[];
  /** Nodes only in right graph */
  addedNodes: GraphNode[];
  /** Nodes in both graphs */
  commonNodes: GraphNode[];
  /** Edges only in left graph */
  removedEdges: GraphEdge[];
  /** Edges only in right graph */
  addedEdges: GraphEdge[];
  /** Edges in both graphs */
  commonEdges: GraphEdge[];
}

/**
 * Graph Comparison Component
 * @param root0
 * @param root0.leftNodes
 * @param root0.leftEdges
 * @param root0.rightNodes
 * @param root0.rightEdges
 * @param root0.leftName
 * @param root0.rightName
 * @param root0.layoutType
 * @param root0.onClose
 */
export const GraphComparison: React.FC<GraphComparisonProps> = ({
  leftNodes,
  leftEdges,
  rightNodes,
  rightEdges,
  leftName = 'Graph A',
  rightName = 'Graph B',
  layoutType = 'force',
  onClose,
}) => {
  const [swapped, swap] = useDisclosure();

  // Calculate diff between graphs
  const diff = useMemo<GraphDiff>(() => {
    const leftNodeIds = new Set(leftNodes.map((n) => n.id));
    const rightNodeIds = new Set(rightNodes.map((n) => n.id));

    const removedNodes = leftNodes.filter((n) => !rightNodeIds.has(n.id));
    const addedNodes = rightNodes.filter((n) => !leftNodeIds.has(n.id));
    const commonNodes = leftNodes.filter((n) => rightNodeIds.has(n.id));

    const leftEdgeIds = new Set(leftEdges.map((e) => `${e.source}-${e.target}`));
    const rightEdgeIds = new Set(rightEdges.map((e) => `${e.source}-${e.target}`));

    const removedEdges = leftEdges.filter((e) => !rightEdgeIds.has(`${e.source}-${e.target}`));
    const addedEdges = rightEdges.filter((e) => !leftEdgeIds.has(`${e.source}-${e.target}`));
    const commonEdges = leftEdges.filter((e) => rightEdgeIds.has(`${e.source}-${e.target}`));

    return {
      removedNodes,
      addedNodes,
      commonNodes,
      removedEdges,
      addedEdges,
      commonEdges,
    };
  }, [leftNodes, rightNodes, leftEdges, rightEdges]);

  // Highlighted nodes for left graph (show removed nodes in red)
  const leftHighlightedNodeIds = useMemo(() => {
    return new Set(diff.removedNodes.map((n) => n.id));
  }, [diff.removedNodes]);

  // Highlighted nodes for right graph (show added nodes in green)
  const rightHighlightedNodeIds = useMemo(() => {
    return new Set(diff.addedNodes.map((n) => n.id));
  }, [diff.addedNodes]);

  // Layout hooks for both graphs
  const leftLayout = useGraphLayout(leftNodes, leftEdges, layoutType);
  const rightLayout = useGraphLayout(rightNodes, rightEdges, layoutType);

  // Apply layout
  const leftNodePositions = useMemo(() => {
    return layoutType === 'force' ? new Map<string, { x: number; y: number }>() : leftLayout.applyLayout(layoutType);
  }, [layoutType, leftLayout]);

  const rightNodePositions = useMemo(() => {
    return layoutType === 'force' ? new Map<string, { x: number; y: number }>() : rightLayout.applyLayout(layoutType);
  }, [layoutType, rightLayout]);

  // Handle swap
  const handleSwap = useCallback(() => {
    swap.toggle();
  }, [swap]);

  // Current graphs (may be swapped)
  const currentLeftNodes = swapped ? rightNodes : leftNodes;
  const currentLeftEdges = swapped ? rightEdges : leftEdges;
  const currentLeftName = swapped ? rightName : leftName;
  const currentLeftHighlighted = swapped ? rightHighlightedNodeIds : leftHighlightedNodeIds;

  const currentRightNodes = swapped ? leftNodes : rightNodes;
  const currentRightEdges = swapped ? leftEdges : rightEdges;
  const currentRightName = swapped ? leftName : rightName;
  const currentRightHighlighted = swapped ? leftHighlightedNodeIds : rightHighlightedNodeIds;

  return (
    <Container size="xl" py="md">
      <Stack gap="md">
        {/* Header */}
        <Group justify="space-between" align="center">
          <Group>
            <Title order={2}>Graph Comparison</Title>
            {onClose && (
              <Tooltip label="Close comparison">
                <ActionIcon variant="subtle" onClick={onClose} aria-label="Close comparison">
                  <IconX size={ICON_SIZE.MD} />
                </ActionIcon>
              </Tooltip>
            )}
          </Group>
          <Group gap="xs">
            <Tooltip label="Swap graphs">
              <ActionIcon variant="light" onClick={handleSwap} aria-label="Swap graphs">
                <IconArrowsLeftRight size={ICON_SIZE.MD} />
              </ActionIcon>
            </Tooltip>
          </Group>
        </Group>

        {/* Diff Statistics */}
        <Card withBorder p="md">
          <Group gap="lg" wrap="nowrap">
            <Flex direction="column" gap="xs">
              <Text size="sm" fw={500} c="dimmed">
                Nodes
              </Text>
              <Group gap="xs">
                <Badge color="red" variant="light" leftSection={<IconMinus size={ICON_SIZE.XS} />}>
                  {diff.removedNodes.length} removed
                </Badge>
                <Badge color="green" variant="light" leftSection={<IconPlus size={ICON_SIZE.XS} />}>
                  {diff.addedNodes.length} added
                </Badge>
                <Badge color="blue" variant="light">
                  {diff.commonNodes.length} common
                </Badge>
              </Group>
            </Flex>
            <Flex direction="column" gap="xs">
              <Text size="sm" fw={500} c="dimmed">
                Edges
              </Text>
              <Group gap="xs">
                <Badge color="red" variant="light" leftSection={<IconMinus size={ICON_SIZE.XS} />}>
                  {diff.removedEdges.length} removed
                </Badge>
                <Badge color="green" variant="light" leftSection={<IconPlus size={ICON_SIZE.XS} />}>
                  {diff.addedEdges.length} added
                </Badge>
                <Badge color="blue" variant="light">
                  {diff.commonEdges.length} common
                </Badge>
              </Group>
            </Flex>
          </Group>
        </Card>

        {/* Side-by-side graphs */}
        <Flex gap="md" style={{ height: 'calc(100vh - 300px)', minHeight: 500 }}>
          {/* Left graph */}
          <Box flex={1} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '4px', overflow: 'hidden' }}>
            <Box p="xs" bg="var(--mantine-color-gray-0)" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  {currentLeftName}
                </Text>
                <Text size="xs" c="dimmed">
                  {currentLeftNodes.length} nodes, {currentLeftEdges.length} edges
                </Text>
              </Group>
            </Box>
            <Box style={{ height: 'calc(100% - 40px)' }}>
              <OptimizedForceGraphVisualization
                nodes={currentLeftNodes}
                edges={currentLeftEdges}
                highlightedNodeIds={currentLeftHighlighted}
                highlightedPath={[]}
                communityAssignments={new Map()}
                communityColors={new Map()}
                expandingNodeIds={new Set()}
                _displayMode="filter"
                enableSimulation={layoutType === 'force'}
                nodePositions={swapped ? rightNodePositions : leftNodePositions}
                onNodeClick={() => {}}
                onNodeRightClick={() => {}}
                onBackgroundClick={() => {}}
                onGraphReady={() => {}}
                enableOptimizations={true}
                progressiveLoading={{
                  enabled: true,
                  batchSize: 50,
                  batchDelayMs: 16,
                }}
              />
            </Box>
          </Box>

          {/* Right graph */}
          <Box flex={1} style={{ border: '1px solid var(--mantine-color-gray-2)', borderRadius: '4px', overflow: 'hidden' }}>
            <Box p="xs" bg="var(--mantine-color-gray-0)" style={{ borderBottom: '1px solid var(--mantine-color-gray-2)' }}>
              <Group justify="space-between">
                <Text size="sm" fw={500}>
                  {currentRightName}
                </Text>
                <Text size="xs" c="dimmed">
                  {currentRightNodes.length} nodes, {currentRightEdges.length} edges
                </Text>
              </Group>
            </Box>
            <Box style={{ height: 'calc(100% - 40px)' }}>
              <OptimizedForceGraphVisualization
                nodes={currentRightNodes}
                edges={currentRightEdges}
                highlightedNodeIds={currentRightHighlighted}
                highlightedPath={[]}
                communityAssignments={new Map()}
                communityColors={new Map()}
                expandingNodeIds={new Set()}
                _displayMode="filter"
                enableSimulation={layoutType === 'force'}
                nodePositions={swapped ? leftNodePositions : rightNodePositions}
                onNodeClick={() => {}}
                onNodeRightClick={() => {}}
                onBackgroundClick={() => {}}
                onGraphReady={() => {}}
                enableOptimizations={true}
                progressiveLoading={{
                  enabled: true,
                  batchSize: 50,
                  batchDelayMs: 16,
                }}
              />
            </Box>
          </Box>
        </Flex>

        {/* Legend */}
        <Card withBorder p="sm">
          <Group gap="md">
            <Flex gap="xs" align="center">
              <Badge color="red" variant="light" circle size="xs" />
              <Text size="sm">Removed from left graph</Text>
            </Flex>
            <Flex gap="xs" align="center">
              <Badge color="green" variant="light" circle size="xs" />
              <Text size="sm">Added to right graph</Text>
            </Flex>
            <Flex gap="xs" align="center">
              <Badge color="blue" variant="light" circle size="xs" />
              <Text size="sm">Common to both graphs</Text>
            </Flex>
          </Group>
        </Card>
      </Stack>
    </Container>
  );
};
