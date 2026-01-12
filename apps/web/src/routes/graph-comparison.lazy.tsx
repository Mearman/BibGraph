/**
 * Graph Comparison Page - Compare two graph visualizations side-by-side
 *
 * This page provides comparison functionality for graph snapshots:
 * - Load two snapshots for comparison
 * - Visual diff highlighting (added/removed/common nodes and edges)
 * - Swap graphs functionality
 * - Diff statistics display
 * @module routes/graph-comparison
 */

import type { GraphEdge, GraphNode } from '@bibgraph/types';
import {
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Container,
  Group,
  Stack,
  Text,
  Title,
} from '@mantine/core';
import {
  IconAlertTriangle,
  IconArrowLeft,
  IconGraph,
  IconLoader,
} from '@tabler/icons-react';
import { createLazyFileRoute , Link } from '@tanstack/react-router';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { GraphComparison } from '@/components/graph/comparison';
import { ICON_SIZE } from '@/config/style-constants';
import { useGraphSnapshots } from '@/hooks/useGraphSnapshots';

interface GraphComparisonSearchParams {
  left?: string;
  right?: string;
}

/**
 * Graph Comparison Page Component
 */
const GraphComparisonPage = () => {
  const navigate = Route.useNavigate();
  const searchParams = Route.useSearch() as GraphComparisonSearchParams;

  const {
    manualSnapshots,
    autoSaveSnapshots,
    isLoading: isLoadingSnapshots,
    loadSnapshot,
  } = useGraphSnapshots();

  const [leftSnapshotId, setLeftSnapshotId] = useState<string | null>(searchParams.left ?? null);
  const [rightSnapshotId, setRightSnapshotId] = useState<string | null>(searchParams.right ?? null);

  const [leftSnapshot, setLeftSnapshot] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    name: string;
  } | null>(null);

  const [rightSnapshot, setRightSnapshot] = useState<{
    nodes: GraphNode[];
    edges: GraphEdge[];
    name: string;
  } | null>(null);

  const [error, setError] = useState<string | null>(null);

  // Load snapshots from URL params
  useEffect(() => {
    const loadSnapshotsFromURL = async () => {
      if (searchParams.left && searchParams.right) {
        setLeftSnapshotId(searchParams.left);
        setRightSnapshotId(searchParams.right);
      }
    };

    void loadSnapshotsFromURL();
  }, [searchParams.left, searchParams.right]);

  // Load left snapshot
  useEffect(() => {
    if (!leftSnapshotId) {
      setLeftSnapshot(null);
      return;
    }

    const loadLeft = async () => {
      setError(null);

      try {
        const snapshot = await loadSnapshot(leftSnapshotId);

        if (!snapshot) {
          setError('Left snapshot not found');
          setLeftSnapshot(null);
          return;
        }

        setLeftSnapshot({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          name: snapshot.name,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load left snapshot';
        setError(errorMessage);
        setLeftSnapshot(null);
      }
    };

    void loadLeft();
  }, [leftSnapshotId, loadSnapshot]);

  // Load right snapshot
  useEffect(() => {
    if (!rightSnapshotId) {
      setRightSnapshot(null);
      return;
    }

    const loadRight = async () => {
      setError(null);

      try {
        const snapshot = await loadSnapshot(rightSnapshotId);

        if (!snapshot) {
          setError('Right snapshot not found');
          setRightSnapshot(null);
          return;
        }

        setRightSnapshot({
          nodes: snapshot.nodes,
          edges: snapshot.edges,
          name: snapshot.name,
        });
      } catch (err) {
        const errorMessage = err instanceof Error ? err.message : 'Failed to load right snapshot';
        setError(errorMessage);
        setRightSnapshot(null);
      }
    };

    void loadRight();
  }, [rightSnapshotId, loadSnapshot]);

  // All snapshots
  const allSnapshots = useMemo(() => {
    return [...manualSnapshots, ...autoSaveSnapshots];
  }, [manualSnapshots, autoSaveSnapshots]);

  // Handle close
  const handleClose = useCallback(() => {
    navigate({ to: '/graph' });
  }, [navigate]);

  // Loading state
  if (isLoadingSnapshots) {
    return (
      <Container size="xl" py="md">
        <Stack align="center" justify="center" h="50vh" gap="md">
          <IconLoader size={ICON_SIZE.XL} className="animate-spin" />
          <Text c="dimmed">Loading snapshots...</Text>
        </Stack>
      </Container>
    );
  }

  // No snapshots available
  if (allSnapshots.length === 0) {
    return (
      <Container size="md" py="xl">
        <Stack gap="md" align="center">
          <Box c="dimmed">
            <IconGraph size={ICON_SIZE.HEADER} />
          </Box>
          <Title order={3}>No Snapshots Available</Title>
          <Text c="dimmed" ta="center">
            You need to create graph snapshots before you can compare them. Go to the graph page and save some snapshots first.
          </Text>
          <Button component={Link} to="/graph" leftSection={<IconArrowLeft size={ICON_SIZE.SM} />}>
            Back to Graph
          </Button>
        </Stack>
      </Container>
    );
  }

  // Snapshot selection state
  if (!leftSnapshot || !rightSnapshot) {
    return (
      <Container size="md" py="xl">
        <Stack gap="lg">
          <Group justify="space-between">
            <Title order={2}>Compare Graph Snapshots</Title>
            <Button component={Link} to="/graph" variant="subtle" leftSection={<IconArrowLeft size={ICON_SIZE.SM} />}>
              Back to Graph
            </Button>
          </Group>

          {error && (
            <Alert icon={<IconAlertTriangle size={ICON_SIZE.MD} />} title="Error" color="red">
              <Text>{error}</Text>
            </Alert>
          )}

          <Card withBorder p="md">
            <Stack gap="md">
              <Title order={4}>Select Snapshots to Compare</Title>

              {/* Left snapshot selection */}
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Left Graph {!leftSnapshotId && '(required)'}
                </Text>
                <Stack gap="xs">
                  {allSnapshots.map((snapshot) => (
                    <Card
                      key={snapshot.id}
                      withBorder
                      p="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setLeftSnapshotId(snapshot.id)}
                      styles={{
                        root: {
                          borderColor: leftSnapshotId === snapshot.id ? 'var(--mantine-color-blue-5)' : undefined,
                          backgroundColor: leftSnapshotId === snapshot.id ? 'var(--mantine-color-blue-0)' : undefined,
                        },
                      }}
                    >
                      <Group justify="space-between">
                        <Box>
                          <Text size="sm" fw={500}>
                            {snapshot.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {snapshot.nodes.length} nodes, {snapshot.edges.length} edges
                          </Text>
                        </Box>
                        {snapshot.isAutoSave && (
                          <Badge size="xs" variant="light">
                            Auto-save
                          </Badge>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Right snapshot selection */}
              <Box>
                <Text size="sm" fw={500} mb="xs">
                  Right Graph {!rightSnapshotId && '(required)'}
                </Text>
                <Stack gap="xs">
                  {allSnapshots.map((snapshot) => (
                    <Card
                      key={snapshot.id}
                      withBorder
                      p="sm"
                      style={{ cursor: 'pointer' }}
                      onClick={() => setRightSnapshotId(snapshot.id)}
                      styles={{
                        root: {
                          borderColor: rightSnapshotId === snapshot.id ? 'var(--mantine-color-blue-5)' : undefined,
                          backgroundColor: rightSnapshotId === snapshot.id ? 'var(--mantine-color-blue-0)' : undefined,
                        },
                      }}
                    >
                      <Group justify="space-between">
                        <Box>
                          <Text size="sm" fw={500}>
                            {snapshot.name}
                          </Text>
                          <Text size="xs" c="dimmed">
                            {snapshot.nodes.length} nodes, {snapshot.edges.length} edges
                          </Text>
                        </Box>
                        {snapshot.isAutoSave && (
                          <Badge size="xs" variant="light">
                            Auto-save
                          </Badge>
                        )}
                      </Group>
                    </Card>
                  ))}
                </Stack>
              </Box>

              {/* Compare button */}
              <Button
                disabled={!leftSnapshotId || !rightSnapshotId || leftSnapshotId === rightSnapshotId}
                onClick={() => {
                  // Update URL with selected snapshot IDs
                  navigate({
                    to: '/graph-comparison',
                    search: {
                      left: leftSnapshotId ?? undefined,
                      right: rightSnapshotId ?? undefined,
                    } as GraphComparisonSearchParams,
                  });
                }}
                fullWidth
              >
                Compare Selected Snapshots
              </Button>
            </Stack>
          </Card>
        </Stack>
      </Container>
    );
  }

  // Comparison view
  return (
    <GraphComparison
      leftNodes={leftSnapshot.nodes}
      leftEdges={leftSnapshot.edges}
      rightNodes={rightSnapshot.nodes}
      rightEdges={rightSnapshot.edges}
      leftName={leftSnapshot.name}
      rightName={rightSnapshot.name}
      onClose={handleClose}
    />
  );
};

export const Route = createLazyFileRoute('/graph-comparison')({
  component: GraphComparisonPage,
});

export default GraphComparisonPage;
