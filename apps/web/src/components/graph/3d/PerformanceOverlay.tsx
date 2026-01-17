/**
 * PerformanceOverlay - Performance monitoring overlay for 3D graph
 *
 * Displays real-time performance metrics:
 * - FPS and frame time
 * - Visible node/edge counts
 * - Memory usage (if available)
 * - Jank score
 * - LOD level
 */

import type { GraphLODManager } from '@bibgraph/utils';
import { LODLevel } from '@bibgraph/utils';
import { Badge, Box, Group, Stack, Text } from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';

import type { PerformanceStats } from '../../../hooks/useGraph3DPerformance';
import { getPerformanceLevelColor } from '../../../hooks/useGraph3DPerformance';
import { OVERLAY_3D, PERFORMANCE_3D } from '../constants';

export interface PerformanceOverlayProps {
  /** Performance statistics to display */
  stats: PerformanceStats;
  /** Whether adaptive LOD is enabled */
  enableAdaptiveLOD: boolean;
  /** LOD manager instance (for current LOD level) */
  lodManager: GraphLODManager | null;
}

/**
 * Get badge color based on performance level
 * @param level
 */
const getPerformanceBadgeColor = (
  level: 'good' | 'ok' | 'poor'
): 'green' | 'yellow' | 'red' => {
  switch (level) {
    case 'good':
      return 'green';
    case 'ok':
      return 'yellow';
    case 'poor':
      return 'red';
    default:
      return 'yellow';
  }
};

/**
 * Get LOD level display text
 * @param lodLevel
 */
const getLODDisplayText = (lodLevel: LODLevel): string => {
  switch (lodLevel) {
    case LODLevel.HIGH:
      return 'HIGH';
    case LODLevel.MEDIUM:
      return 'MED';
    case LODLevel.LOW:
      return 'LOW';
    default:
      return 'N/A';
  }
};

/**
 * Performance overlay component
 *
 * Positioned in the top-right corner of the graph container.
 * Shows real-time performance metrics for debugging and optimization.
 * @param root0
 * @param root0.stats
 * @param root0.enableAdaptiveLOD
 * @param root0.lodManager
 */
export const PerformanceOverlay = ({
  stats,
  enableAdaptiveLOD,
  lodManager,
}: PerformanceOverlayProps) => {
  if (!stats.isMonitoring) {
    return null;
  }

  return (
    <Box
      style={{
        position: 'absolute',
        top: OVERLAY_3D.POSITION_OFFSET,
        right: OVERLAY_3D.POSITION_OFFSET,
        backgroundColor: 'rgba(0, 0, 0, 0.75)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: '8px 12px',
        color: '#fff',
        fontSize: 'var(--mantine-font-size-xs)',
        fontFamily: 'monospace',
        zIndex: 10,
        minWidth: OVERLAY_3D.MIN_WIDTH,
      }}
    >
      <Stack gap={4}>
        {/* Header */}
        <Group gap={8} justify="space-between">
          <Group gap={4}>
            <IconActivity size={ICON_SIZE.SM} />
            <Text size="xs" fw={500}>
              Performance
            </Text>
          </Group>
          <Badge size="xs" color={getPerformanceBadgeColor(stats.performanceLevel)}>
            {stats.performanceLevel.toUpperCase()}
          </Badge>
        </Group>

        {/* FPS */}
        <Group gap={8} justify="space-between">
          <Text size="xs" c="dimmed">
            FPS:
          </Text>
          <Text
            size="xs"
            fw={500}
            style={{ color: getPerformanceLevelColor(stats.performanceLevel) }}
          >
            {stats.fps}
          </Text>
        </Group>

        {/* Frame time */}
        <Group gap={8} justify="space-between">
          <Text size="xs" c="dimmed">
            Frame:
          </Text>
          <Text size="xs">{stats.avgFrameTime.toFixed(1)}ms</Text>
        </Group>

        {/* Node count */}
        <Group gap={8} justify="space-between">
          <Text size="xs" c="dimmed">
            Nodes:
          </Text>
          <Text size="xs">{stats.visibleNodes}</Text>
        </Group>

        {/* Edge count */}
        <Group gap={8} justify="space-between">
          <Text size="xs" c="dimmed">
            Edges:
          </Text>
          <Text size="xs">{stats.visibleEdges}</Text>
        </Group>

        {/* Jank score (only show if above threshold) */}
        {stats.jankScore > PERFORMANCE_3D.JANK_DISPLAY_THRESHOLD && (
          <Group gap={8} justify="space-between">
            <Text size="xs" c="dimmed">
              Jank:
            </Text>
            <Text size="xs" c="red">
              {stats.jankScore}%
            </Text>
          </Group>
        )}

        {/* Memory usage (if available) */}
        {stats.memoryMB !== null && (
          <Group gap={8} justify="space-between">
            <Text size="xs" c="dimmed">
              Memory:
            </Text>
            <Text size="xs">{stats.memoryMB}MB</Text>
          </Group>
        )}

        {/* LOD level (if adaptive LOD is enabled) */}
        {enableAdaptiveLOD && lodManager && (
          <Group gap={8} justify="space-between">
            <Text size="xs" c="dimmed">
              LOD:
            </Text>
            <Text size="xs">{getLODDisplayText(lodManager.getGlobalLOD())}</Text>
          </Group>
        )}
      </Stack>
    </Box>
  );
};
