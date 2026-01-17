/**
 * Warning display when graph exceeds device capabilities
 */

import { Box, Stack, Text } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';
import React from 'react';

import { ICON_SIZE } from '@/config/style-constants';

interface GraphTooLargeWarningProps {
  width?: number;
  height: number;
  nodeCount: number;
  edgeCount: number;
  maxNodes: number;
}

export const GraphTooLargeWarning: React.FC<GraphTooLargeWarningProps> = ({
  width,
  height,
  nodeCount,
  edgeCount,
  maxNodes,
}) => {
  return (
    <Box
      pos="relative"
      style={{
        width: width ?? '100%',
        height,
        border: '1px solid var(--mantine-color-yellow-6)',
        borderRadius: '8px',
        overflow: 'hidden',
        backgroundColor: 'var(--mantine-color-yellow-0)',
        padding: '20px',
        textAlign: 'center',
      }}
    >
      <Stack align="center" gap="md">
        <IconAlertTriangle
          size={ICON_SIZE.EMPTY_STATE}
          style={{ color: 'var(--mantine-color-yellow-6)' }}
        />
        <div>
          <Text size="lg" fw={600} c="var(--mantine-color-yellow-8)">
            Graph Too Large for Device
          </Text>
          <Text size="sm" c="var(--mantine-color-yellow-7)" mt="xs">
            This graph contains {nodeCount} nodes and {edgeCount} edges, which
            exceeds the recommended limit of {maxNodes} for your device.
          </Text>
          <Text size="sm" c="var(--mantine-color-yellow-7)">
            Consider using filters to reduce the graph size or view on a more
            powerful device.
          </Text>
        </div>
      </Stack>
    </Box>
  );
};
