/**
 * Graph Algorithms Panel
 * UI component for running and displaying graph algorithm results
 * @module components/algorithms/GraphAlgorithmsPanel
 */

import type { GraphEdge,GraphNode } from '@bibgraph/types';
import {
  Accordion,
  Alert,
  Badge,
  Box,
  Button,
  Card,
  Group,
  List,
  NumberInput,
  Progress,
  rem,
  Select,
  Stack,
  Switch,
  Text,
  ThemeIcon,
  Title,
  Tooltip,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconArrowsShuffle,
  IconArrowsSort,
  IconChartBar,
  IconChartDonut,
  IconCircle,
  IconCircleCheck,
  IconCircleDot,
  IconCircles,
  IconFocusCentered,
  IconGraph,
  IconHierarchy,
  IconLink,
  IconNetwork,
  IconPoint,
  IconRoute,
  IconStar,
  IconTriangle,
  IconUsers,
} from '@tabler/icons-react';
import React, { useMemo,useState } from 'react';

import { BORDER_STYLE_GRAY_3, ICON_SIZE } from '@/config/style-constants';
import {
  type CommunityDetectionOptions,
  useBFS,
  useBibliographicCoupling,
  useBiconnectedComponents,
  useClusterQuality,
  useCoCitations,
  useCommunityDetection,
  useConnectedComponents,
  useCorePeriphery,
  useCycleDetection,
  useCycleInfo,
  useDFS,
  useEgoNetwork,
  useGraphStatistics,
  useKCore,
  useKTruss,
  useStarPatterns,
  useStronglyConnectedComponents,
  useTopologicalSort,
  useTriangles,
} from '@/hooks/use-graph-algorithms';
import { type ClusteringAlgorithm,findShortestPath, type PathResult } from '@/services/graph-algorithms';

import type { CommunityResult } from './types';

interface GraphAlgorithmsPanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  onHighlightNodes?: (nodeIds: string[]) => void;
  onHighlightPath?: (path: string[]) => void;
  onSelectCommunity?: (communityId: number, nodeIds: string[]) => void;
  /** Callback when community detection completes with all communities */
  onCommunitiesDetected?: (communities: CommunityResult[], communityColors: Map<number, string>) => void;
  /** Controlled path source node (for syncing with external selection) */
  pathSource?: string | null;
  /** Controlled path target node (for syncing with external selection) */
  pathTarget?: string | null;
  /** Callback when path source changes */
  onPathSourceChange?: (nodeId: string | null) => void;
  /** Callback when path target changes */
  onPathTargetChange?: (nodeId: string | null) => void;
}

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
 * Panel for running and displaying graph algorithm results
 * @param root0
 * @param root0.nodes
 * @param root0.edges
 * @param root0.onHighlightNodes
 * @param root0.onHighlightPath
 * @param root0.onSelectCommunity
 * @param root0.onCommunitiesDetected
 * @param root0.pathSource
 * @param root0.pathTarget
 * @param root0.onPathSourceChange
 * @param root0.onPathTargetChange
 */
export const GraphAlgorithmsPanel = ({
  nodes,
  edges,
  onHighlightNodes,
  onHighlightPath,
  onSelectCommunity,
  onCommunitiesDetected,
  pathSource: controlledPathSource,
  pathTarget: controlledPathTarget,
  onPathSourceChange,
  onPathTargetChange,
}: GraphAlgorithmsPanelProps) => {
  // Statistics hook
  const statistics = useGraphStatistics(nodes, edges, true);

  // Community detection state and hook
  const [communityAlgorithm, setCommunityAlgorithm] = useState<ClusteringAlgorithm>('louvain');
  const [resolution, setResolution] = useState<number>(1);
  const [numClusters, setNumClusters] = useState<number>(5);
  const [linkage, setLinkage] = useState<'single' | 'complete' | 'average'>('average');

  const communityOptions: CommunityDetectionOptions = useMemo(
    () => ({ algorithm: communityAlgorithm, resolution, numClusters, linkage }),
    [communityAlgorithm, resolution, numClusters, linkage]
  );

  const { communities, modularity, isComputing } = useCommunityDetection(
    nodes,
    edges,
    communityOptions
  );

  // Connected components hook
  const connectedComponents = useConnectedComponents(nodes, edges, { directed: false });

  // Strongly connected components hook
  const stronglyConnectedComponents = useStronglyConnectedComponents(nodes, edges);

  // Cycle detection hooks
  const hasCycles = useCycleDetection(nodes, edges, true);
  const cycleInfo = useCycleInfo(nodes, edges, true);

  // Topological sort hook
  const topologicalOrder = useTopologicalSort(nodes, edges);

  // K-core state and hook
  const [kCoreValue, setKCoreValue] = useState<number>(2);
  const kCore = useKCore(nodes, edges, kCoreValue);

  // Core-periphery state and hook
  const [coreThreshold, setCoreThreshold] = useState<number>(0.7);
  const corePeriphery = useCorePeriphery(nodes, edges, coreThreshold);

  // Biconnected components hook
  const biconnectedComponents = useBiconnectedComponents(nodes, edges);

  // Ego network state and hook
  const [egoCenter, setEgoCenter] = useState<string | null>(null);
  const [egoRadius, setEgoRadius] = useState<number>(1);
  const egoNetwork = useEgoNetwork(nodes, edges, egoCenter, egoRadius, true);

  // Motif detection hooks
  const triangles = useTriangles(nodes, edges);
  const [starMinDegree, setStarMinDegree] = useState<number>(3);
  const [starType, setStarType] = useState<'in' | 'out'>('out');
  const starPatterns = useStarPatterns(nodes, edges, { minDegree: starMinDegree, type: starType });

  // Co-citation and bibliographic coupling
  const [coCitationMinCount, setCoCitationMinCount] = useState<number>(2);
  const coCitations = useCoCitations(nodes, edges, coCitationMinCount);
  const [bibCouplingMinShared, setBibCouplingMinShared] = useState<number>(2);
  const bibCoupling = useBibliographicCoupling(nodes, edges, bibCouplingMinShared);

  // K-Truss state and hook
  const [kTrussK, setKTrussK] = useState<number>(3);
  const kTruss = useKTruss(nodes, edges, kTrussK);

  // Cluster quality metrics
  const clusterQuality = useClusterQuality(nodes, edges, communities);

  // Traversal state and hooks
  const [traversalStartNode, setTraversalStartNode] = useState<string | null>(null);
  const [traversalDirected, setTraversalDirected] = useState<boolean>(true);
  const bfsResult = useBFS(nodes, edges, traversalStartNode, traversalDirected);
  const dfsResult = useDFS(nodes, edges, traversalStartNode, traversalDirected);

  // Path finding state - supports both controlled and uncontrolled modes
  const [internalPathSource, setInternalPathSource] = useState<string | null>(null);
  const [internalPathTarget, setInternalPathTarget] = useState<string | null>(null);
  const [pathResult, setPathResult] = useState<PathResult | null>(null);
  const [pathDirected, setPathDirected] = useState<boolean>(true);

  // Use controlled values if provided, otherwise use internal state
  const isControlled = controlledPathSource !== undefined || controlledPathTarget !== undefined;
  const pathSource = isControlled ? (controlledPathSource ?? null) : internalPathSource;
  const pathTarget = isControlled ? (controlledPathTarget ?? null) : internalPathTarget;

  const setPathSource = (value: string | null) => {
    if (onPathSourceChange) {
      onPathSourceChange(value);
    }
    if (!isControlled) {
      setInternalPathSource(value);
    }
  };

  const setPathTarget = (value: string | null) => {
    if (onPathTargetChange) {
      onPathTargetChange(value);
    }
    if (!isControlled) {
      setInternalPathTarget(value);
    }
  };

  // Create node options for select dropdowns
  const nodeOptions = useMemo(
    () =>
      nodes.map((node) => ({
        value: node.id,
        label: node.label || node.id,
      })),
    [nodes]
  );

  // Handle path finding
  const handleFindPath = () => {
    if (pathSource && pathTarget) {
      const result = findShortestPath(nodes, edges, pathSource, pathTarget, pathDirected);
      setPathResult(result);
      if (result.found && onHighlightPath) {
        onHighlightPath(result.path);
      }
    }
  };

  // Handle community selection
  const handleCommunityClick = (communityId: number, nodeIds: string[]) => {
    if (onHighlightNodes) {
      onHighlightNodes(nodeIds);
    }
    if (onSelectCommunity) {
      onSelectCommunity(communityId, nodeIds);
    }
  };

  // Handle k-core highlight
  const handleKCoreHighlight = () => {
    if (onHighlightNodes && kCore.nodes.length > 0) {
      onHighlightNodes(kCore.nodes);
    }
  };

  // Sort communities by size
  const sortedCommunities = useMemo(
    () => [...communities].sort((a, b) => b.size - a.size),
    [communities]
  );

  // Community colors for visualization
  const communityColors = useMemo(() => {
    const colors = [
      '#3b82f6', // blue
      '#22c55e', // green
      '#f59e0b', // amber
      '#ef4444', // red
      '#8b5cf6', // violet
      '#ec4899', // pink
      '#06b6d4', // cyan
      '#84cc16', // lime
      '#f97316', // orange
      '#6366f1', // indigo
    ];
    const colorMap = new Map<number, string>();
    sortedCommunities.forEach((community, index) => {
      colorMap.set(community.id, colors[index % colors.length]);
    });
    return colorMap;
  }, [sortedCommunities]);

  // Notify parent when communities are detected
  React.useEffect(() => {
    if (onCommunitiesDetected && sortedCommunities.length > 0) {
      onCommunitiesDetected(sortedCommunities, communityColors);
    }
  }, [sortedCommunities, communityColors, onCommunitiesDetected]);

  if (nodes.length === 0) {
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
    <Stack gap="md">
      {/* Graph Statistics Card */}
      <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="md">
        <Title order={5} mb="sm">
          <Group gap="xs">
            <IconGraph size={ICON_SIZE.LG} />
            Graph Statistics
          </Group>
        </Title>

        <Stack gap="xs">
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Nodes</Text>
            <Badge variant="light">{statistics.nodeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Edges</Text>
            <Badge variant="light">{statistics.edgeCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Density</Text>
            <Badge variant="light">{(statistics.density * 100).toFixed(2)}%</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Avg. Degree</Text>
            <Badge variant="light">{statistics.averageDegree.toFixed(2)}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Connected</Text>
            <Badge color={statistics.isConnected ? 'green' : 'yellow'} variant="light">
              {statistics.isConnected ? 'Yes' : 'No'}
            </Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Components</Text>
            <Badge variant="light">{statistics.componentCount}</Badge>
          </Group>
          <Group justify="space-between">
            <Text size="sm" c="dimmed">Has Cycles</Text>
            <Badge color={hasCycles ? 'blue' : 'gray'} variant="light">
              {hasCycles ? 'Yes' : 'No'}
            </Badge>
          </Group>
        </Stack>
      </Card>

      {/* Algorithms Accordion */}
      <Accordion variant="separated" defaultValue="communities">
        {/* Community Detection */}
        <Accordion.Item value="communities">
          <Accordion.Control icon={<IconUsers size={ICON_SIZE.LG} />}>
            Community Detection
            {communities.length > 0 && (
              <Badge ml="xs" size="sm" variant="light">
                {communities.length} communities
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              {/* Computing indicator */}
              {isComputing && (
                <Alert
                  icon={<IconCircleDot size={ICON_SIZE.MD} />}
                  color="blue"
                  variant="light"
                  styles={{ root: { padding: 'var(--mantine-spacing-xs)' } }}
                >
                  <Text size="sm">Computing community structure...</Text>
                </Alert>
              )}

              {/* Algorithm Selection */}
              <Select
                label="Algorithm"
                description={ALGORITHM_INFO[communityAlgorithm]}
                disabled={isComputing}
                data={[
                  {
                    group: 'Modularity-based',
                    items: [
                      { value: 'louvain', label: 'Louvain' },
                      { value: 'leiden', label: 'Leiden' },
                    ],
                  },
                  {
                    group: 'Propagation-based',
                    items: [
                      { value: 'label-propagation', label: 'Label Propagation' },
                    ],
                  },
                  {
                    group: 'Information-theoretic',
                    items: [
                      { value: 'infomap', label: 'Infomap' },
                    ],
                  },
                  {
                    group: 'Matrix-based',
                    items: [
                      { value: 'spectral', label: 'Spectral Partitioning' },
                    ],
                  },
                  {
                    group: 'Agglomerative',
                    items: [
                      { value: 'hierarchical', label: 'Hierarchical Clustering' },
                    ],
                  },
                ]}
                value={communityAlgorithm}
                onChange={(value) => setCommunityAlgorithm(value as ClusteringAlgorithm)}
              />

              {/* Resolution Parameter - for louvain, leiden */}
              {(communityAlgorithm === 'louvain' || communityAlgorithm === 'leiden') && (
                <NumberInput
                  label="Resolution"
                  description="Higher = more communities, Lower = fewer communities"
                  disabled={isComputing}
                  value={resolution}
                  onChange={(value) => setResolution(typeof value === 'number' ? value : 1)}
                  min={0.1}
                  max={3}
                  step={0.1}
                  decimalScale={2}
                />
              )}

              {/* Number of clusters - for spectral and hierarchical */}
              {(communityAlgorithm === 'spectral' || communityAlgorithm === 'hierarchical') && (
                <NumberInput
                  label="Number of Clusters"
                  description="Target number of communities/partitions"
                  disabled={isComputing}
                  value={numClusters}
                  onChange={(value) => setNumClusters(typeof value === 'number' ? value : 5)}
                  min={2}
                  max={20}
                  step={1}
                />
              )}

              {/* Linkage method - for hierarchical */}
              {communityAlgorithm === 'hierarchical' && (
                <Select
                  label="Linkage Method"
                  description="How to measure distance between clusters"
                  disabled={isComputing}
                  data={[
                    { value: 'single', label: 'Single (minimum)' },
                    { value: 'complete', label: 'Complete (maximum)' },
                    { value: 'average', label: 'Average (UPGMA)' },
                  ]}
                  value={linkage}
                  onChange={(value) => setLinkage(value as 'single' | 'complete' | 'average')}
                />
              )}

              {/* Modularity Score */}
              {communities.length > 0 && (
                <Group justify="space-between">
                  <Text size="sm" c="dimmed">Modularity Score</Text>
                  <Tooltip label="Quality metric (higher is better, 0.3-0.7 typical)">
                    <Badge
                      color={modularity > 0.4 ? 'green' : (modularity > 0.2 ? 'yellow' : 'red')}
                      variant="light"
                    >
                      {modularity.toFixed(4)}
                    </Badge>
                  </Tooltip>
                </Group>
              )}

              {/* Loading indicator */}
              {isComputing && <Progress value={100} animated size="xs" />}

              {/* Community List */}
              {sortedCommunities.length > 0 && (
                <Box>
                  <Text size="sm" fw={500} mb="xs">
                    Communities (sorted by size)
                  </Text>
                  <List spacing="xs" size="sm">
                    {sortedCommunities.slice(0, 10).map((community) => (
                      <List.Item
                        key={community.id}
                        icon={
                          <ThemeIcon
                            size={ICON_SIZE.XL}
                            radius="xl"
                            style={{ backgroundColor: communityColors.get(community.id) }}
                          >
                            <IconCircleDot size={ICON_SIZE.XS} />
                          </ThemeIcon>
                        }
                        style={{ cursor: 'pointer' }}
                        onClick={() => handleCommunityClick(community.id, community.nodeIds)}
                      >
                        <Group justify="space-between" wrap="nowrap">
                          <Text size="sm" truncate style={{ maxWidth: rem(150) }}>
                            Community {community.id + 1}
                          </Text>
                          <Group gap="xs" wrap="nowrap">
                            <Badge size="xs" variant="light">
                              {community.size} nodes
                            </Badge>
                            <Badge size="xs" variant="outline">
                              {(community.density * 100).toFixed(0)}% dense
                            </Badge>
                          </Group>
                        </Group>
                      </List.Item>
                    ))}
                    {sortedCommunities.length > 10 && (
                      <Text size="xs" c="dimmed" mt="xs">
                        +{sortedCommunities.length - 10} more communities
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
          <Accordion.Control icon={<IconRoute size={ICON_SIZE.LG} />}>
            Shortest Path
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Select
                label="Source Node"
                placeholder="Select starting node"
                data={nodeOptions}
                value={pathSource}
                onChange={setPathSource}
                searchable
                clearable
              />
              <Select
                label="Target Node"
                placeholder="Select destination node"
                data={nodeOptions}
                value={pathTarget}
                onChange={setPathTarget}
                searchable
                clearable
              />
              <Switch
                label="Respect edge direction"
                description={pathDirected
                  ? "Only traverse edges from source → target"
                  : "Traverse edges in both directions"
                }
                checked={pathDirected}
                onChange={(e) => setPathDirected(e.currentTarget.checked)}
              />
              <Button
                onClick={handleFindPath}
                disabled={!pathSource || !pathTarget}
                leftSection={<IconRoute size={ICON_SIZE.MD} />}
              >
                Find Path
              </Button>

              {pathResult && (
                <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="sm" bg="gray.0">
                  {pathResult.found ? (
                    <Stack gap="xs">
                      <Group justify="space-between">
                        <Text size="sm" fw={500} c="green">
                          <IconCircleCheck size={ICON_SIZE.MD} style={{ verticalAlign: 'middle' }} /> Path Found
                        </Text>
                        <Badge variant="light">{pathResult.distance} hops</Badge>
                      </Group>
                      <Text size="xs" c="dimmed">
                        Path: {pathResult.path.length} nodes
                      </Text>
                    </Stack>
                  ) : (
                    <Text size="sm" c="red">
                      <IconAlertCircle size={ICON_SIZE.MD} style={{ verticalAlign: 'middle' }} /> No path exists
                    </Text>
                  )}
                </Card>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Connected Components */}
        <Accordion.Item value="components">
          <Accordion.Control icon={<IconNetwork size={ICON_SIZE.LG} />}>
            Connected Components
            <Badge ml="xs" size="sm" variant="light">
              {connectedComponents.count}
            </Badge>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              {connectedComponents.components.length > 0 && (
                <List spacing="xs" size="sm">
                  {connectedComponents.components.slice(0, 5).map((component, index) => (
                    <List.Item
                      key={index}
                      icon={
                        <ThemeIcon size={ICON_SIZE.XL} radius="xl" variant="light">
                          <IconCircleDot size={ICON_SIZE.XS} />
                        </ThemeIcon>
                      }
                      style={{ cursor: 'pointer' }}
                      onClick={() => onHighlightNodes?.(component)}
                    >
                      <Group justify="space-between">
                        <Text size="sm">Component {index + 1}</Text>
                        <Badge size="xs" variant="light">
                          {component.length} nodes
                        </Badge>
                      </Group>
                    </List.Item>
                  ))}
                  {connectedComponents.components.length > 5 && (
                    <Text size="xs" c="dimmed">
                      +{connectedComponents.components.length - 5} more components
                    </Text>
                  )}
                </List>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* K-Core Decomposition */}
        <Accordion.Item value="kcore">
          <Accordion.Control icon={<IconHierarchy size={ICON_SIZE.LG} />}>
            K-Core Decomposition
            {kCore.nodes.length > 0 && (
              <Badge ml="xs" size="sm" variant="light">
                {kCore.nodes.length} nodes
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <NumberInput
                label="K Value"
                description="Minimum degree for nodes in the k-core"
                value={kCoreValue}
                onChange={(value) => setKCoreValue(typeof value === 'number' ? value : 2)}
                min={1}
                max={20}
                step={1}
              />

              {kCore.nodes.length > 0 ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Nodes in {kCoreValue}-core</Text>
                    <Badge variant="light">{kCore.nodes.length}</Badge>
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={handleKCoreHighlight}
                    leftSection={<IconChartDonut size={ICON_SIZE.SM} />}
                  >
                    Highlight K-Core
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No {kCoreValue}-core exists (try a lower k value)
                </Text>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Graph Traversal (BFS/DFS) */}
        <Accordion.Item value="traversal">
          <Accordion.Control icon={<IconArrowsShuffle size={ICON_SIZE.LG} />}>
            Graph Traversal
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Select
                label="Start Node"
                placeholder="Select starting node for traversal"
                data={nodeOptions}
                value={traversalStartNode}
                onChange={setTraversalStartNode}
                searchable
                clearable
              />
              <Switch
                label="Directed traversal"
                description={traversalDirected
                  ? "Only follow edges in their direction"
                  : "Traverse edges in both directions"
                }
                checked={traversalDirected}
                onChange={(e) => setTraversalDirected(e.currentTarget.checked)}
              />

              {traversalStartNode && (
                <Stack gap="xs">
                  {/* BFS Results */}
                  <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Breadth-First Search (BFS)</Text>
                      {bfsResult && (
                        <Badge size="sm" variant="light">
                          {bfsResult.visitOrder.length} nodes
                        </Badge>
                      )}
                    </Group>
                    {bfsResult ? (
                      <>
                        <Text size="xs" c="dimmed" mb="xs">
                          Visit order (level by level):
                        </Text>
                        <Group gap="xs" wrap="wrap">
                          {bfsResult.visitOrder.slice(0, 10).map((nodeId, index) => (
                            <Tooltip key={nodeId} label={nodeId}>
                              <Badge
                                size="xs"
                                variant="outline"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onHighlightNodes?.([nodeId])}
                              >
                                {index + 1}
                              </Badge>
                            </Tooltip>
                          ))}
                          {bfsResult.visitOrder.length > 10 && (
                            <Text size="xs" c="dimmed">+{bfsResult.visitOrder.length - 10} more</Text>
                          )}
                        </Group>
                        <Button
                          variant="light"
                          size="xs"
                          mt="xs"
                          onClick={() => onHighlightPath?.(bfsResult.visitOrder)}
                        >
                          Highlight BFS Order
                        </Button>
                      </>
                    ) : (
                      <Text size="xs" c="dimmed">Select a start node</Text>
                    )}
                  </Card>

                  {/* DFS Results */}
                  <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                    <Group justify="space-between" mb="xs">
                      <Text size="sm" fw={500}>Depth-First Search (DFS)</Text>
                      {dfsResult && (
                        <Badge size="sm" variant="light">
                          {dfsResult.visitOrder.length} nodes
                        </Badge>
                      )}
                    </Group>
                    {dfsResult ? (
                      <>
                        <Text size="xs" c="dimmed" mb="xs">
                          Visit order (depth first):
                        </Text>
                        <Group gap="xs" wrap="wrap">
                          {dfsResult.visitOrder.slice(0, 10).map((nodeId, index) => (
                            <Tooltip key={nodeId} label={nodeId}>
                              <Badge
                                size="xs"
                                variant="outline"
                                style={{ cursor: 'pointer' }}
                                onClick={() => onHighlightNodes?.([nodeId])}
                              >
                                {index + 1}
                              </Badge>
                            </Tooltip>
                          ))}
                          {dfsResult.visitOrder.length > 10 && (
                            <Text size="xs" c="dimmed">+{dfsResult.visitOrder.length - 10} more</Text>
                          )}
                        </Group>
                        <Button
                          variant="light"
                          size="xs"
                          mt="xs"
                          onClick={() => onHighlightPath?.(dfsResult.visitOrder)}
                        >
                          Highlight DFS Order
                        </Button>
                      </>
                    ) : (
                      <Text size="xs" c="dimmed">Select a start node</Text>
                    )}
                  </Card>
                </Stack>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Strongly Connected Components */}
        <Accordion.Item value="scc">
          <Accordion.Control icon={<IconCircles size={ICON_SIZE.LG} />}>
            Strongly Connected Components
            <Badge ml="xs" size="sm" variant="light">
              {stronglyConnectedComponents.count}
            </Badge>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                SCCs are maximal sets of nodes where every node can reach every other node
                following edge directions.
              </Text>
              {stronglyConnectedComponents.components.length > 0 && (
                <List spacing="xs" size="sm">
                  {[...stronglyConnectedComponents.components]
                    .sort((a, b) => b.length - a.length)
                    .slice(0, 8)
                    .map((component, index) => (
                    <List.Item
                      key={index}
                      icon={
                        <ThemeIcon size={ICON_SIZE.XL} radius="xl" variant="light" color="violet">
                          <IconCircleDot size={ICON_SIZE.XS} />
                        </ThemeIcon>
                      }
                      style={{ cursor: 'pointer' }}
                      onClick={() => onHighlightNodes?.(component)}
                    >
                      <Group justify="space-between">
                        <Text size="sm">SCC {index + 1}</Text>
                        <Badge size="xs" variant="light">
                          {component.length} nodes
                        </Badge>
                      </Group>
                    </List.Item>
                  ))}
                  {stronglyConnectedComponents.components.length > 8 && (
                    <Text size="xs" c="dimmed">
                      +{stronglyConnectedComponents.components.length - 8} more SCCs
                    </Text>
                  )}
                </List>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Topological Sort & Cycle Detection */}
        <Accordion.Item value="topo-cycle">
          <Accordion.Control icon={<IconArrowsSort size={ICON_SIZE.LG} />}>
            Topological Sort / Cycles
            <Badge
              ml="xs"
              size="sm"
              variant="light"
              color={cycleInfo.hasCycle ? 'red' : 'green'}
            >
              {cycleInfo.hasCycle ? 'Has Cycles' : 'Acyclic'}
            </Badge>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              {cycleInfo.hasCycle ? (
                <>
                  <Alert color="yellow" icon={<IconAlertCircle size={ICON_SIZE.MD} />}>
                    Graph contains cycles - topological sort is not possible.
                  </Alert>
                  {cycleInfo.cycle.length > 0 && (
                    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                      <Text size="sm" fw={500} mb="xs">Detected Cycle:</Text>
                      <Group gap="xs" wrap="wrap">
                        {cycleInfo.cycle.map((nodeId, index) => (
                          <Group key={nodeId} gap={4}>
                            <Badge
                              size="xs"
                              variant="filled"
                              color="red"
                              style={{ cursor: 'pointer' }}
                              onClick={() => onHighlightNodes?.([nodeId])}
                            >
                              {nodeId.slice(0, 8)}...
                            </Badge>
                            {index < cycleInfo.cycle.length - 1 && (
                              <Text size="xs" c="dimmed">→</Text>
                            )}
                          </Group>
                        ))}
                      </Group>
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        color="red"
                        onClick={() => onHighlightNodes?.(cycleInfo.cycle)}
                      >
                        Highlight Cycle
                      </Button>
                    </Card>
                  )}
                </>
              ) : (
                <>
                  <Alert color="green" icon={<IconCircleCheck size={ICON_SIZE.MD} />}>
                    Graph is a DAG (Directed Acyclic Graph) - topological ordering exists.
                  </Alert>
                  {topologicalOrder && topologicalOrder.length > 0 && (
                    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                      <Text size="sm" fw={500} mb="xs">Topological Order:</Text>
                      <Text size="xs" c="dimmed" mb="xs">
                        Nodes ordered so all edges point from earlier to later nodes.
                      </Text>
                      <Group gap="xs" wrap="wrap">
                        {topologicalOrder.slice(0, 10).map((nodeId, index) => (
                          <Tooltip key={nodeId} label={nodeId}>
                            <Badge
                              size="xs"
                              variant="outline"
                              style={{ cursor: 'pointer' }}
                              onClick={() => onHighlightNodes?.([nodeId])}
                            >
                              {index + 1}
                            </Badge>
                          </Tooltip>
                        ))}
                        {topologicalOrder.length > 10 && (
                          <Text size="xs" c="dimmed">+{topologicalOrder.length - 10} more</Text>
                        )}
                      </Group>
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        onClick={() => onHighlightPath?.(topologicalOrder)}
                      >
                        Highlight Topological Order
                      </Button>
                    </Card>
                  )}
                </>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Core-Periphery Decomposition */}
        <Accordion.Item value="core-periphery">
          <Accordion.Control icon={<IconFocusCentered size={ICON_SIZE.LG} />}>
            Core-Periphery
            {corePeriphery && (
              <Badge ml="xs" size="sm" variant="light">
                {corePeriphery.coreNodes.length} core / {corePeriphery.peripheryNodes.length} periphery
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Identifies densely connected core nodes and sparsely connected periphery nodes
                (Borgatti-Everett model).
              </Text>
              <NumberInput
                label="Core Threshold"
                description="Coreness score above this = core member (0-1)"
                value={coreThreshold}
                onChange={(value) => setCoreThreshold(typeof value === 'number' ? value : 0.7)}
                min={0.1}
                max={0.95}
                step={0.05}
                decimalScale={2}
              />

              {corePeriphery ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Core Nodes</Text>
                    <Badge color="blue" variant="light">{corePeriphery.coreNodes.length}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Periphery Nodes</Text>
                    <Badge color="gray" variant="light">{corePeriphery.peripheryNodes.length}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Fit Quality</Text>
                    <Tooltip label="Correlation with ideal core-periphery structure (-1 to 1)">
                      <Badge
                        color={corePeriphery.fitQuality > 0.5 ? 'green' : (corePeriphery.fitQuality > 0 ? 'yellow' : 'red')}
                        variant="light"
                      >
                        {corePeriphery.fitQuality.toFixed(3)}
                      </Badge>
                    </Tooltip>
                  </Group>
                  <Group gap="xs">
                    <Button
                      variant="light"
                      size="xs"
                      color="blue"
                      onClick={() => onHighlightNodes?.(corePeriphery.coreNodes)}
                    >
                      Highlight Core
                    </Button>
                    <Button
                      variant="light"
                      size="xs"
                      color="gray"
                      onClick={() => onHighlightNodes?.(corePeriphery.peripheryNodes)}
                    >
                      Highlight Periphery
                    </Button>
                  </Group>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  Requires at least 3 nodes for core-periphery analysis.
                </Text>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Biconnected Components */}
        <Accordion.Item value="biconnected">
          <Accordion.Control icon={<IconLink size={ICON_SIZE.LG} />}>
            Biconnected Components
            {biconnectedComponents && (
              <Badge ml="xs" size="sm" variant="light">
                {biconnectedComponents.components.length} components
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Biconnected components remain connected after removing any single node.
                Articulation points are critical nodes whose removal disconnects the graph.
              </Text>

              {biconnectedComponents ? (
                <>
                  {/* Articulation Points */}
                  {biconnectedComponents.articulationPoints.length > 0 && (
                    <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                      <Group justify="space-between" mb="xs">
                        <Text size="sm" fw={500}>Articulation Points (Cut Vertices)</Text>
                        <Badge color="orange" variant="light">
                          {biconnectedComponents.articulationPoints.length}
                        </Badge>
                      </Group>
                      <Text size="xs" c="dimmed" mb="xs">
                        Removing these nodes would disconnect the graph:
                      </Text>
                      <Group gap="xs" wrap="wrap">
                        {biconnectedComponents.articulationPoints.slice(0, 8).map((nodeId) => (
                          <Badge
                            key={nodeId}
                            size="xs"
                            color="orange"
                            variant="filled"
                            style={{ cursor: 'pointer' }}
                            onClick={() => onHighlightNodes?.([nodeId])}
                          >
                            {nodeId.slice(0, 10)}...
                          </Badge>
                        ))}
                        {biconnectedComponents.articulationPoints.length > 8 && (
                          <Text size="xs" c="dimmed">
                            +{biconnectedComponents.articulationPoints.length - 8} more
                          </Text>
                        )}
                      </Group>
                      <Button
                        variant="light"
                        size="xs"
                        mt="xs"
                        color="orange"
                        onClick={() => onHighlightNodes?.(biconnectedComponents.articulationPoints)}
                      >
                        Highlight All Articulation Points
                      </Button>
                    </Card>
                  )}

                  {/* Biconnected Components List */}
                  <Box>
                    <Text size="sm" fw={500} mb="xs">Components</Text>
                    <List spacing="xs" size="sm">
                      {[...biconnectedComponents.components]
                        .sort((a, b) => b.nodes.length - a.nodes.length)
                        .slice(0, 6)
                        .map((component) => (
                        <List.Item
                          key={component.id}
                          icon={
                            <ThemeIcon
                              size={ICON_SIZE.XL}
                              radius="xl"
                              variant="light"
                              color={component.isBridge ? 'yellow' : 'teal'}
                            >
                              {component.isBridge ? <IconLink size={ICON_SIZE.XS} /> : <IconCircle size={ICON_SIZE.XS} />}
                            </ThemeIcon>
                          }
                          style={{ cursor: 'pointer' }}
                          onClick={() => onHighlightNodes?.(component.nodes)}
                        >
                          <Group justify="space-between">
                            <Group gap="xs">
                              <Text size="sm">Component {component.id + 1}</Text>
                              {component.isBridge && (
                                <Badge size="xs" color="yellow" variant="outline">Bridge</Badge>
                              )}
                            </Group>
                            <Badge size="xs" variant="light">
                              {component.nodes.length} nodes
                            </Badge>
                          </Group>
                        </List.Item>
                      ))}
                      {biconnectedComponents.components.length > 6 && (
                        <Text size="xs" c="dimmed">
                          +{biconnectedComponents.components.length - 6} more components
                        </Text>
                      )}
                    </List>
                  </Box>
                </>
              ) : (
                <Text size="sm" c="dimmed">
                  Requires at least 2 nodes for biconnected component analysis.
                </Text>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Ego Network */}
        <Accordion.Item value="ego-network">
          <Accordion.Control icon={<IconPoint size={ICON_SIZE.LG} />}>
            Ego Network
            {egoNetwork && (
              <Badge ml="xs" size="sm" variant="light">
                {egoNetwork.nodes.length} nodes
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Extract the local neighborhood around a center node within a given radius.
              </Text>
              <Select
                label="Center Node"
                placeholder="Select center node"
                data={nodeOptions}
                value={egoCenter}
                onChange={setEgoCenter}
                searchable
                clearable
              />
              <NumberInput
                label="Radius"
                description="Number of hops from the center node"
                value={egoRadius}
                onChange={(value) => setEgoRadius(typeof value === 'number' ? value : 1)}
                min={1}
                max={5}
                step={1}
              />

              {egoNetwork && egoCenter && (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Nodes in Ego Network</Text>
                    <Badge variant="light">{egoNetwork.nodes.length}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Edges in Ego Network</Text>
                    <Badge variant="light">{egoNetwork.edges.length}</Badge>
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => onHighlightNodes?.(egoNetwork.nodes.map(n => n.id))}
                  >
                    Highlight Ego Network
                  </Button>
                </Stack>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Motif Detection */}
        <Accordion.Item value="motifs">
          <Accordion.Control icon={<IconTriangle size={ICON_SIZE.LG} />}>
            Motif Detection
            <Badge ml="xs" size="sm" variant="light">
              {triangles.count} triangles
            </Badge>
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Detect common graph patterns: triangles (3-cliques) and star patterns (hub nodes).
              </Text>

              {/* Triangles */}
              <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Triangles (3-Cliques)</Text>
                  <Badge variant="light">{triangles.count}</Badge>
                </Group>
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Triangle Count</Text>
                    <Badge size="xs" variant="outline">{triangles.count}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="xs" c="dimmed">Global Clustering Coefficient</Text>
                    <Tooltip label="Probability that two neighbors of a node are connected (0-1)">
                      <Badge
                        size="xs"
                        variant="outline"
                        color={triangles.clusteringCoefficient > 0.3 ? 'green' : (triangles.clusteringCoefficient > 0.1 ? 'yellow' : 'gray')}
                      >
                        {(triangles.clusteringCoefficient * 100).toFixed(1)}%
                      </Badge>
                    </Tooltip>
                  </Group>
                  {triangles.triangles.length > 0 && (
                    <Button
                      variant="light"
                      size="xs"
                      onClick={() => {
                        const uniqueNodes = new Set<string>();
                        triangles.triangles.slice(0, 10).forEach(t => {
                          t.nodes.forEach(n => uniqueNodes.add(n));
                        });
                        onHighlightNodes?.([...uniqueNodes]);
                      }}
                    >
                      Highlight First 10 Triangles
                    </Button>
                  )}
                </Stack>
              </Card>

              {/* Star Patterns */}
              <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Star Patterns (Hub Nodes)</Text>
                  <Badge variant="light">{starPatterns.count}</Badge>
                </Group>
                <Stack gap="xs">
                  <NumberInput
                    label="Minimum Degree"
                    description="Nodes with at least this many connections"
                    value={starMinDegree}
                    onChange={(value) => setStarMinDegree(typeof value === 'number' ? value : 3)}
                    min={2}
                    max={20}
                    step={1}
                    size="xs"
                  />
                  <Select
                    label="Star Type"
                    data={[
                      { value: 'out', label: 'Out-Star (outgoing edges)' },
                      { value: 'in', label: 'In-Star (incoming edges)' },
                    ]}
                    value={starType}
                    onChange={(value) => setStarType(value as 'in' | 'out')}
                    size="xs"
                  />
                  {starPatterns.patterns.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed">
                        Found {starPatterns.count} hub nodes with {starMinDegree}+ connections
                      </Text>
                      <List spacing="xs" size="sm">
                        {starPatterns.patterns.slice(0, 5).map((pattern) => (
                          <List.Item
                            key={pattern.hubId}
                            icon={
                              <ThemeIcon size={ICON_SIZE.MD} radius="xl" variant="light" color="orange">
                                <IconStar size={ICON_SIZE.XXS} />
                              </ThemeIcon>
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => onHighlightNodes?.([pattern.hubId, ...pattern.leafIds])}
                          >
                            <Text size="xs">
                              Hub {pattern.hubId.slice(0, 10)}... ({pattern.leafIds.length} leaves)
                            </Text>
                          </List.Item>
                        ))}
                        {starPatterns.patterns.length > 5 && (
                          <Text size="xs" c="dimmed">
                            +{starPatterns.patterns.length - 5} more hubs
                          </Text>
                        )}
                      </List>
                    </>
                  )}
                </Stack>
              </Card>

              {/* Co-Citations */}
              <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Co-Citations</Text>
                  <Badge variant="light" color="cyan">{coCitations.pairs.length} pairs</Badge>
                </Group>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Papers frequently cited together by other papers (indicates related research).
                  </Text>
                  <NumberInput
                    label="Minimum Co-citation Count"
                    description="Minimum times two papers must be cited together"
                    value={coCitationMinCount}
                    onChange={(value) => setCoCitationMinCount(typeof value === 'number' ? value : 2)}
                    min={1}
                    max={20}
                    step={1}
                    size="xs"
                  />
                  {coCitations.pairs.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed">
                        Found {coCitations.pairs.length} co-citation pairs
                      </Text>
                      <List spacing="xs" size="sm">
                        {coCitations.pairs.slice(0, 5).map((pair) => (
                          <List.Item
                            key={`${pair.paper1Id}-${pair.paper2Id}`}
                            icon={
                              <ThemeIcon size={ICON_SIZE.MD} radius="xl" variant="light" color="cyan">
                                <IconLink size={ICON_SIZE.XXS} />
                              </ThemeIcon>
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => onHighlightNodes?.([pair.paper1Id, pair.paper2Id])}
                          >
                            <Text size="xs">
                              {pair.paper1Id.slice(0, 8)}... & {pair.paper2Id.slice(0, 8)}... ({pair.count}x)
                            </Text>
                          </List.Item>
                        ))}
                        {coCitations.pairs.length > 5 && (
                          <Text size="xs" c="dimmed">
                            +{coCitations.pairs.length - 5} more pairs
                          </Text>
                        )}
                      </List>
                    </>
                  )}
                </Stack>
              </Card>

              {/* Bibliographic Coupling */}
              <Card style={{ border: BORDER_STYLE_GRAY_3 }} p="xs">
                <Group justify="space-between" mb="xs">
                  <Text size="sm" fw={500}>Bibliographic Coupling</Text>
                  <Badge variant="light" color="grape">{bibCoupling.pairs.length} pairs</Badge>
                </Group>
                <Stack gap="xs">
                  <Text size="xs" c="dimmed">
                    Papers citing the same references (indicates similar research topics).
                  </Text>
                  <NumberInput
                    label="Minimum Shared References"
                    description="Minimum references two papers must share"
                    value={bibCouplingMinShared}
                    onChange={(value) => setBibCouplingMinShared(typeof value === 'number' ? value : 2)}
                    min={1}
                    max={20}
                    step={1}
                    size="xs"
                  />
                  {bibCoupling.pairs.length > 0 && (
                    <>
                      <Text size="xs" c="dimmed">
                        Found {bibCoupling.pairs.length} coupled paper pairs
                      </Text>
                      <List spacing="xs" size="sm">
                        {bibCoupling.pairs.slice(0, 5).map((pair) => (
                          <List.Item
                            key={`${pair.paper1Id}-${pair.paper2Id}`}
                            icon={
                              <ThemeIcon size={ICON_SIZE.MD} radius="xl" variant="light" color="grape">
                                <IconLink size={ICON_SIZE.XXS} />
                              </ThemeIcon>
                            }
                            style={{ cursor: 'pointer' }}
                            onClick={() => onHighlightNodes?.([pair.paper1Id, pair.paper2Id])}
                          >
                            <Text size="xs">
                              {pair.paper1Id.slice(0, 8)}... & {pair.paper2Id.slice(0, 8)}... ({pair.sharedReferences} shared)
                            </Text>
                          </List.Item>
                        ))}
                        {bibCoupling.pairs.length > 5 && (
                          <Text size="xs" c="dimmed">
                            +{bibCoupling.pairs.length - 5} more pairs
                          </Text>
                        )}
                      </List>
                    </>
                  )}
                </Stack>
              </Card>
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* K-Truss */}
        <Accordion.Item value="k-truss">
          <Accordion.Control icon={<IconChartDonut size={ICON_SIZE.LG} />}>
            K-Truss Decomposition
            {kTruss.nodeCount > 0 && (
              <Badge ml="xs" size="sm" variant="light">
                {kTruss.nodeCount} nodes
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                K-truss: subgraph where every edge participates in at least (k-2) triangles.
                Provides stronger cohesion guarantees than k-core.
              </Text>
              <NumberInput
                label="K Value"
                description="k=3 means edges in at least 1 triangle, k=4 means at least 2 triangles"
                value={kTrussK}
                onChange={(value) => setKTrussK(typeof value === 'number' ? value : 3)}
                min={2}
                max={10}
                step={1}
              />

              {kTruss.nodeCount > 0 ? (
                <Stack gap="xs">
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Nodes in {kTrussK}-truss</Text>
                    <Badge variant="light">{kTruss.nodeCount}</Badge>
                  </Group>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Edges in {kTrussK}-truss</Text>
                    <Badge variant="light">{kTruss.edgeCount}</Badge>
                  </Group>
                  <Button
                    variant="light"
                    size="xs"
                    onClick={() => onHighlightNodes?.(kTruss.nodes)}
                    leftSection={<IconChartDonut size={ICON_SIZE.SM} />}
                  >
                    Highlight K-Truss
                  </Button>
                </Stack>
              ) : (
                <Text size="sm" c="dimmed">
                  No {kTrussK}-truss exists (try a lower k value or add more edges)
                </Text>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>

        {/* Cluster Quality Metrics */}
        <Accordion.Item value="cluster-quality">
          <Accordion.Control icon={<IconChartBar size={ICON_SIZE.LG} />}>
            Cluster Quality Metrics
            {communities.length > 0 && (
              <Badge ml="xs" size="sm" variant="light" color="green">
                {communities.length} clusters
              </Badge>
            )}
          </Accordion.Control>
          <Accordion.Panel>
            <Stack gap="sm">
              <Text size="xs" c="dimmed">
                Quality metrics for the current community detection result.
                Run community detection first to see these metrics.
              </Text>

              {communities.length > 0 ? (
                <>
                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Modularity</Text>
                    <Tooltip label="Community structure quality (-0.5 to 1.0, higher is better)">
                      <Badge
                        color={clusterQuality.modularity > 0.4 ? 'green' : (clusterQuality.modularity > 0.2 ? 'yellow' : 'red')}
                        variant="light"
                      >
                        {clusterQuality.modularity.toFixed(4)}
                      </Badge>
                    </Tooltip>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Avg. Conductance</Text>
                    <Tooltip label="Ratio of boundary to internal edges (0-1, lower is better)">
                      <Badge
                        color={clusterQuality.avgConductance < 0.3 ? 'green' : (clusterQuality.avgConductance < 0.5 ? 'yellow' : 'red')}
                        variant="light"
                      >
                        {clusterQuality.avgConductance.toFixed(4)}
                      </Badge>
                    </Tooltip>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Avg. Density</Text>
                    <Tooltip label="Internal edge density of clusters (0-1, higher is better)">
                      <Badge
                        color={clusterQuality.avgDensity > 0.5 ? 'green' : (clusterQuality.avgDensity > 0.2 ? 'yellow' : 'gray')}
                        variant="light"
                      >
                        {(clusterQuality.avgDensity * 100).toFixed(1)}%
                      </Badge>
                    </Tooltip>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Coverage Ratio</Text>
                    <Tooltip label="Fraction of edges within clusters (0-1, higher is better)">
                      <Badge
                        color={clusterQuality.coverageRatio > 0.7 ? 'green' : (clusterQuality.coverageRatio > 0.4 ? 'yellow' : 'gray')}
                        variant="light"
                      >
                        {(clusterQuality.coverageRatio * 100).toFixed(1)}%
                      </Badge>
                    </Tooltip>
                  </Group>

                  <Group justify="space-between">
                    <Text size="sm" c="dimmed">Number of Clusters</Text>
                    <Badge variant="light">{clusterQuality.numClusters}</Badge>
                  </Group>
                </>
              ) : (
                <Alert icon={<IconAlertCircle size={ICON_SIZE.MD} />} color="gray">
                  Run community detection to see cluster quality metrics.
                </Alert>
              )}
            </Stack>
          </Accordion.Panel>
        </Accordion.Item>
      </Accordion>
    </Stack>
  );
};
