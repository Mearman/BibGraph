/**
 * Repository Algorithms Panel
 * Integrates graph algorithms with the repository store data
 * Shows analysis of the current graph in the repository
 * @module components/algorithms/RepositoryAlgorithmsPanel
 */

import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  List,
  Loader,
  NumberInput,
  Progress,
  rem,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconChartDonut,
  IconCircleCheck,
  IconCircleDot,
  IconGraph,
  IconHierarchy,
  IconNetwork,
  IconRoute,
  IconUsers,
} from '@tabler/icons-react';
import React, { useMemo,useState } from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import { useRepositoryAlgorithms } from '@/hooks/use-repository-algorithms';
import type { ClusteringAlgorithm } from '@/services/graph-algorithms';

/**
 * Algorithm descriptions for user guidance
 */
const ALGORITHM_INFO: Record<ClusteringAlgorithm, string> = {
  louvain: 'Fast community detection using modularity optimization. Best for large graphs.',
  leiden: 'Improved version of Louvain with better community quality. Slightly slower.',
  'label-propagation': 'Simple and fast. Uses label spreading to find communities.',
  infomap: 'Information-theoretic approach. Finds communities by minimizing flow description length.',
  spectral: 'Uses graph eigenvalues for balanced partitioning. Good for k-way partitions.',
  hierarchical: 'Agglomerative clustering that builds a dendrogram. Supports different linkage methods.',
};

/**
 * Panel for analyzing repository graph with algorithms
 */
export const RepositoryAlgorithmsPanel = () => {
  const {
    nodes,
    // edges is available but not currently used in display
    hasData,
    statistics,
    communities,
    communityAssignment,
    clusteringAlgorithm,
    resolution,
    updateClusteringOptions,
    pathResult,
    findPath,
    kCore,
    kCoreK,
    computeKCore,
    isLoading,
    isComputing,
  } = useRepositoryAlgorithms();

  // Path finding state
  const [pathSource, setPathSource] = useState<string | null>(null);
  const [pathTarget, setPathTarget] = useState<string | null>(null);
  const [localKCoreValue, setLocalKCoreValue] = useState<number>(2);

  // Create node options for select dropdowns
  const nodeOptions = useMemo(
    () =>
      nodes.slice(0, 100).map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  // Calculate node type counts
  const nodeTypeCounts = useMemo(() => {
    const counts: Record<string, number> = {};
    nodes.forEach((node) => {
      counts[node.entityType] = (counts[node.entityType] || 0) + 1;
    });
    return counts;
  }, [nodes]);

  // Sort communities by size
  const sortedCommunities = useMemo(
    () => [...communities].sort((a, b) => b.size - a.size),
    [communities]
  );

  // Handle path finding
  const handleFindPath = () => {
    if (pathSource && pathTarget) {
      findPath(pathSource, pathTarget);
    }
  };

  // Handle k-core computation
  const handleComputeKCore = () => {
    computeKCore(localKCoreValue);
  };

  if (isLoading) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="md">
        <Stack align="center" gap="sm">
          <Loader size="sm" />
          <Text size="sm" c="dimmed">Loading repository data...</Text>
        </Stack>
      </Card>
    );
  }

  if (!hasData) {
    return (
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="lg">
        <Stack align="center" gap="md" mih="200px" justify="center">
          <IconGraph size={ICON_SIZE.XL} color="var(--mantine-color-gray-4)" style={{ opacity: 0.5 }} />
          <Stack gap="xs" ta="center">
            <Title order={4} c="dimmed">Build Your Graph</Title>
            <Text size="sm" c="dimmed">
              Add entities from search results or entity detail pages to start analyzing connections.
            </Text>
            <Text size="xs" c="dimmed" mt="sm">
              Use the graph icon button on any entity to add it here.
            </Text>
          </Stack>
        </Stack>
      </Card>
    );
  }

  return (
    <Stack gap="sm">
      {/* Graph Statistics Card */}
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="sm">
        <Title order={6} mb="xs">
          <Group gap="xs">
            <IconGraph size={ICON_SIZE.MD} />
            Repository Graph
          </Group>
        </Title>

        <Stack gap={4}>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Nodes</Text>
            <Badge size="xs" variant="light">{statistics?.nodeCount ?? 0}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Edges</Text>
            <Badge size="xs" variant="light">{statistics?.edgeCount ?? 0}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Components</Text>
            <Badge size="xs" variant="light">{statistics?.componentCount ?? 0}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="xs" c="dimmed">Connected</Text>
            <Badge
              size="xs"
              color={statistics?.isConnected ? 'green' : 'yellow'}
              variant="light"
            >
              {statistics?.isConnected ? 'Yes' : 'No'}
            </Badge>
          </Group>
        </Stack>

        {/* Node type breakdown */}
        {Object.keys(nodeTypeCounts).length > 0 && (
          <Box mt="xs">
            <Text size="xs" fw={500} mb={4}>By Type</Text>
            <Group gap={4} wrap="wrap">
              {Object.entries(nodeTypeCounts).map(([type, count]) => (
                <Badge key={type} size="xs" variant="outline">
                  {type}: {count}
                </Badge>
              ))}
            </Group>
          </Box>
        )}
      </Card>

      {/* Algorithms Accordion */}
      <Accordion variant="separated" defaultValue="communities" styles={{ item: { borderRadius: 'var(--mantine-radius-sm)' } }}>
        {/* Community Detection */}
        <Accordion.Item value="communities">
          <Accordion.Control icon={<IconUsers size={ICON_SIZE.MD} />}>
            <Group gap="xs">
              <Text size="sm">Communities</Text>
              {communities.length > 0 && (
                <Badge size="xs" variant="light">
                  {communities.length}
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              {/* Algorithm Selection */}
              <Select
                size="xs"
                label="Algorithm"
                description={ALGORITHM_INFO[clusteringAlgorithm]}
                data={[
                  { value: 'louvain', label: 'Louvain' },
                  { value: 'leiden', label: 'Leiden' },
                  { value: 'label-propagation', label: 'Label Propagation' },
                ]}
                value={clusteringAlgorithm}
                onChange={(value) =>
                  updateClusteringOptions({ algorithm: value as ClusteringAlgorithm })
                }
              />

              {/* Resolution Parameter */}
              {clusteringAlgorithm !== 'label-propagation' && (
                <NumberInput
                  size="xs"
                  label="Resolution"
                  description="Higher = more communities"
                  value={resolution}
                  onChange={(value) =>
                    updateClusteringOptions({
                      resolution: typeof value === 'number' ? value : 1,
                    })
                  }
                  min={0.1}
                  max={3}
                  step={0.1}
                  decimalScale={2}
                />
              )}

              {/* Loading indicator */}
              {isComputing && <Progress value={100} animated size="xs" />}

              {/* Community List */}
              {sortedCommunities.length > 0 && (
                <Box>
                  <Text size="xs" fw={500} mb={4}>
                    Detected Communities
                  </Text>
                  <List spacing={4} size="xs">
                    {sortedCommunities.slice(0, 8).map((community) => (
                      <List.Item
                        key={community.id}
                        icon={
                          <ThemeIcon
                            size={ICON_SIZE.MD}
                            radius="xl"
                            style={{
                              backgroundColor:
                                communityAssignment?.communityColors.get(community.id) ??
                                '#gray',
                            }}
                          >
                            <IconCircleDot size={ICON_SIZE.XXS} />
                          </ThemeIcon>
                        }
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="xs" truncate style={{ maxWidth: rem(100) }}>
                            Community {community.id + 1}
                          </Text>
                          <Badge size="xs" variant="light">
                            {community.size} nodes
                          </Badge>
                        </Group>
                      </List.Item>
                    ))}
                    {sortedCommunities.length > 8 && (
                      <Text size="xs" c="dimmed">
                        +{sortedCommunities.length - 8} more
                      </Text>
                    )}
                  </List>
                </Box>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Shortest Path */}
        <Accordion.Item value="path">
          <Accordion.Control icon={<IconRoute size={ICON_SIZE.MD} />}>
            <Text size="sm">Shortest Path</Text>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Select
                size="xs"
                label="Source"
                placeholder="Select start"
                data={nodeOptions}
                value={pathSource}
                onChange={setPathSource}
                searchable
                clearable
                maxDropdownHeight={200}
              />
              <Select
                size="xs"
                label="Target"
                placeholder="Select end"
                data={nodeOptions}
                value={pathTarget}
                onChange={setPathTarget}
                searchable
                clearable
                maxDropdownHeight={200}
              />
              <Button
                size="xs"
                onClick={handleFindPath}
                disabled={!pathSource || !pathTarget}
                leftSection={<IconRoute size={ICON_SIZE.SM} />}
              >
                Find Path
              </Button>

              {pathResult && (
                <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs" bg="gray.0">
                  {pathResult.found ? (
                    <Stack gap={4}>
                      <Group justify="space-between">
                        <Text size="xs" fw={500} c="green">
                          <IconCircleCheck
                            size={ICON_SIZE.SM}
                            style={{ verticalAlign: 'middle' }}
                          />{' '}
                          Path Found
                        </Text>
                        <Badge size="xs" variant="light">
                          {pathResult.distance} hops
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        {pathResult.path.length} nodes in path
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="xs" c="red">
                      <IconAlertCircle
                        size={ICON_SIZE.SM}
                        style={{ verticalAlign: 'middle' }}
                      />{' '}
                      No path exists
                    </Text>
                  )}
                </Card>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* K-Core */}
        <Accordion.Item value="kcore">
          <Accordion.Control icon={<IconHierarchy size={ICON_SIZE.MD} />}>
            <Group gap="xs">
              <Text size="sm">K-Core</Text>
              {kCore && kCore.nodes.length > 0 && (
                <Badge size="xs" variant="light">
                  {kCore.nodes.length} nodes
                </Badge>
              )}
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <NumberInput
                size="xs"
                label="K Value"
                description="Minimum node degree"
                value={localKCoreValue}
                onChange={(value) =>
                  setLocalKCoreValue(typeof value === 'number' ? value : 2)
                }
                min={1}
                max={20}
                step={1}
              />
              <Button
                size="xs"
                onClick={handleComputeKCore}
                leftSection={<IconChartDonut size={ICON_SIZE.SM} />}
              >
                Find {localKCoreValue}-Core
              </Button>

              {kCore && (
                <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                  {kCore.nodes.length > 0 ? (
                    <Group justify="space-between">
                      <Text size="xs" c="dimmed">
                        Nodes in {kCoreK}-core
                      </Text>
                      <Badge size="xs" variant="light">
                        {kCore.nodes.length}
                      </Badge>
                    </Group>
                  ) : (
                    <Text size="xs" c="dimmed">
                      No {kCoreK}-core exists (try lower k)
                    </Text>
                  )}
                </Card>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Components */}
        <Accordion.Item value="components">
          <Accordion.Control icon={<IconNetwork size={ICON_SIZE.MD} />}>
            <Group gap="xs">
              <Text size="sm">Components</Text>
              <Badge size="xs" variant="light">
                {statistics?.componentCount ?? 0}
              </Badge>
            </Group>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="xs">
              <Text size="xs" c="dimmed">
                The graph has {statistics?.componentCount ?? 0} connected component(s).
              </Text>
              {statistics?.isConnected ? (
                <Text size="xs" c="green">
                  <IconCircleCheck size={ICON_SIZE.SM} style={{ verticalAlign: 'middle' }} />{' '}
                  All nodes are reachable from each other.
                </Text>
              ) : (
                <Text size="xs" c="yellow">
                  <IconAlertCircle size={ICON_SIZE.SM} style={{ verticalAlign: 'middle' }} />{' '}
                  Some nodes are not connected to others.
                </Text>
              )}
              <Text size="xs" c="dimmed">
                Cycles: {statistics?.hasCycles ? 'Yes' : 'No'}
              </Text>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
