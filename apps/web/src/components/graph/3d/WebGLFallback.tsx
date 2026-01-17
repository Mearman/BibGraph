/**
 * WebGLFallback - Fallback component when WebGL is unavailable
 *
 * Displays a user-friendly message explaining that 3D visualization
 * is not available, along with the reason.
 */

import { Box } from '@mantine/core';
import { IconAlertTriangle } from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';

export interface WebGLFallbackProps {
  /** Reason why WebGL is unavailable */
  reason: string;
}

/**
 * WebGL unavailable fallback component
 *
 * Displayed when the browser doesn't support WebGL or it's disabled.
 * @param root0
 * @param root0.reason
 */
export const WebGLFallback = ({ reason }: WebGLFallbackProps) => (
  <Box
    style={{
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      height: '100%',
      padding: 'var(--mantine-spacing-xl)',
      textAlign: 'center',
      color: 'var(--mantine-color-dimmed)',
    }}
  >
    <IconAlertTriangle
      size={ICON_SIZE.EMPTY_STATE}
      style={{ marginBottom: 'var(--mantine-spacing-md)' }}
    />
    <Box style={{ fontWeight: 500, marginBottom: 'var(--mantine-spacing-xs)' }}>
      3D Visualization Unavailable
    </Box>
    <Box style={{ fontSize: 'var(--mantine-font-size-sm)' }}>{reason}</Box>
  </Box>
);
