/**
 * Performance metrics overlay for graph debugging
 */

import { Box, Group, Stack, Text } from '@mantine/core';
import { IconActivity } from '@tabler/icons-react';
import React from 'react';

import type { PerformanceMetrics, RenderSettings } from './adaptive-graph-types';
import { getPerformanceLevelColor } from './adaptive-graph-utils';

interface PerformanceOverlayProps {
  metrics: PerformanceMetrics;
  renderSettings: RenderSettings;
}

const OVERLAY_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  right: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.75)',
  borderRadius: '4px',
  padding: '8px',
  color: '#fff',
  fontSize: '10px',
  fontFamily: 'monospace',
  zIndex: 10,
  minWidth: '120px',
};

const ICON_SIZE = 10;

export const PerformanceOverlay: React.FC<PerformanceOverlayProps> = ({
  metrics,
  renderSettings,
}) => {
  return (
    <Box style={OVERLAY_STYLE}>
      <Stack gap={2}>
        <Group gap={4} justify="space-between">
          <Group gap={2}>
            <IconActivity size={ICON_SIZE} />
            <Text size="xs" fw={500} c="white">
              Perf
            </Text>
          </Group>
          <Text
            size="xs"
            fw={500}
            c={getPerformanceLevelColor(metrics.performanceLevel)}
          >
            {metrics.performanceLevel.toUpperCase()}
          </Text>
        </Group>
        <Group gap={4} justify="space-between">
          <Text size="xs" c="var(--mantine-color-gray-4)">
            FPS:
          </Text>
          <Text size="xs" c="white">
            {metrics.fps}
          </Text>
        </Group>
        <Group gap={4} justify="space-between">
          <Text size="xs" c="var(--mantine-color-gray-4)">
            Nodes:
          </Text>
          <Text size="xs" c="white">
            {metrics.nodeCount}
          </Text>
        </Group>
        <Group gap={4} justify="space-between">
          <Text size="xs" c="var(--mantine-color-gray-4)">
            Edges:
          </Text>
          <Text size="xs" c="white">
            {metrics.edgeCount}
          </Text>
        </Group>
        {renderSettings.animationEnabled && (
          <Text size="xs" c="var(--mantine-color-green-4)">
            Animation enabled
          </Text>
        )}
        {renderSettings.labelEnabled && (
          <Text size="xs" c="var(--mantine-color-blue-4)">
            Labels enabled
          </Text>
        )}
      </Stack>
    </Box>
  );
};
