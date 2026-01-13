/**
 * Motif Detection Algorithm Item
 * Detects triangles, star patterns, co-citations, and bibliographic coupling
 * @module components/algorithms/items/MotifDetectionItem
 */

import {
  Badge,
  Button,
  Card,
  Group,
  List,
  NumberInput,
  Select,
  Stack,
  Text,
  ThemeIcon,
  Tooltip,
} from '@mantine/core';
import { IconLink, IconStar } from '@tabler/icons-react';
import { useState } from 'react';

import { BORDER_STYLE_GRAY_3 } from '@/config/style-constants';
import {
  useBibliographicCoupling,
  useCoCitations,
  useStarPatterns,
  useTriangles,
} from '@/hooks/use-graph-algorithms';

import { MOTIF_DETECTION, QUALITY_THRESHOLDS } from '../constants';
import type { AlgorithmItemBaseProps } from '../types';

export const MotifDetectionItem = ({
  nodes,
  edges,
  onHighlightNodes,
}: AlgorithmItemBaseProps) => {
  // Motif detection hooks
  const triangles = useTriangles(nodes, edges);
  const [starMinDegree, setStarMinDegree] = useState<number>(MOTIF_DETECTION.STAR_MIN_DEGREE_DEFAULT);
  const [starType, setStarType] = useState<'in' | 'out'>('out');
  const starPatterns = useStarPatterns(nodes, edges, { minDegree: starMinDegree, type: starType });

  // Co-citation and bibliographic coupling
  const [coCitationMinCount, setCoCitationMinCount] = useState<number>(MOTIF_DETECTION.CO_CITATION_MIN_DEFAULT);
  const coCitations = useCoCitations(nodes, edges, coCitationMinCount);
  const [bibCouplingMinShared, setBibCouplingMinShared] = useState<number>(MOTIF_DETECTION.BIB_COUPLING_MIN_DEFAULT);
  const bibCoupling = useBibliographicCoupling(nodes, edges, bibCouplingMinShared);

  return (
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
                color={triangles.clusteringCoefficient > QUALITY_THRESHOLDS.CLUSTERING_COEFFICIENT.HIGH ? 'green' : (triangles.clusteringCoefficient > QUALITY_THRESHOLDS.CLUSTERING_COEFFICIENT.MEDIUM ? 'yellow' : 'gray')}
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
                triangles.triangles.forEach(t => {
                  t.nodes.forEach(n => uniqueNodes.add(n));
                });
                onHighlightNodes?.([...uniqueNodes]);
              }}
            >
              Highlight All Triangles
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
            onChange={(value) => setStarMinDegree(typeof value === 'number' ? value : MOTIF_DETECTION.STAR_MIN_DEGREE_DEFAULT)}
            min={MOTIF_DETECTION.STAR_MIN_DEGREE_MIN}
            max={MOTIF_DETECTION.STAR_MIN_DEGREE_MAX}
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
                {starPatterns.patterns.map((pattern) => (
                  <List.Item
                    key={pattern.hubId}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="orange">
                        <IconStar size={10} />
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
            onChange={(value) => setCoCitationMinCount(typeof value === 'number' ? value : MOTIF_DETECTION.CO_CITATION_MIN_DEFAULT)}
            min={MOTIF_DETECTION.CO_CITATION_MIN}
            max={MOTIF_DETECTION.CO_CITATION_MAX}
            step={1}
            size="xs"
          />
          {coCitations.pairs.length > 0 && (
            <>
              <Text size="xs" c="dimmed">
                Found {coCitations.pairs.length} co-citation pairs
              </Text>
              <List spacing="xs" size="sm">
                {coCitations.pairs.map((pair) => (
                  <List.Item
                    key={`${pair.paper1Id}-${pair.paper2Id}`}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="cyan">
                        <IconLink size={10} />
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
            onChange={(value) => setBibCouplingMinShared(typeof value === 'number' ? value : MOTIF_DETECTION.BIB_COUPLING_MIN_DEFAULT)}
            min={MOTIF_DETECTION.BIB_COUPLING_MIN}
            max={MOTIF_DETECTION.BIB_COUPLING_MAX}
            step={1}
            size="xs"
          />
          {bibCoupling.pairs.length > 0 && (
            <>
              <Text size="xs" c="dimmed">
                Found {bibCoupling.pairs.length} coupled paper pairs
              </Text>
              <List spacing="xs" size="sm">
                {bibCoupling.pairs.map((pair) => (
                  <List.Item
                    key={`${pair.paper1Id}-${pair.paper2Id}`}
                    icon={
                      <ThemeIcon size={16} radius="xl" variant="light" color="grape">
                        <IconLink size={10} />
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
              </List>
            </>
          )}
        </Stack>
      </Card>
    </Stack>
  );
};
