/**
 * ViewModeToggle - Switch between 2D and 3D visualization modes
 *
 * Provides a visual toggle for switching graph visualization modes,
 * with WebGL availability detection and informative tooltips.
 */

import type { ViewMode } from '@bibgraph/types';
import { detectWebGLCapabilities } from '@bibgraph/utils';
import { Box,SegmentedControl, Tooltip } from '@mantine/core';
import { IconAlertTriangle,IconCube, IconSquare } from '@tabler/icons-react';
import React, { useMemo } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export interface ViewModeToggleProps {
  /**
  Current view mode
   */
  value: ViewMode;
  /**
  Callback when mode changes
   */
  onChange: (mode: ViewMode) => void;
  /**
  Disable the toggle entirely
   */
  disabled?: boolean;
  /**
  Size of the control
   */
  size?: 'xs' | 'sm' | 'md' | 'lg';
  /**
  Full width mode
   */
  fullWidth?: boolean;
}

export const ViewModeToggle = ({
  value,
  onChange,
  disabled = false,
  size = 'sm',
  fullWidth = false,
}: ViewModeToggleProps) => {
  // Check WebGL availability - computed once and memoized
  const webglCapabilities = useMemo(() => detectWebGLCapabilities(), []);
  const isWebglAvailable = webglCapabilities.available;
  const webglReason = webglCapabilities.reason ?? '';

  // Disable 3D option if WebGL unavailable
  const is3DDisabled = !isWebglAvailable || disabled;

  const data = [
    {
      value: '2D' as const,
      label: (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mantine-spacing-xs)',
          }}
        >
          <IconSquare size={ICON_SIZE.SM} />
          <span>2D</span>
        </Box>
      ),
    },
    {
      value: '3D' as const,
      label: is3DDisabled ? (
        <Tooltip
          label={webglReason || '3D visualization is not available'}
          position="top"
          withArrow
          multiline
          w={220}
        >
          <Box
            style={{
              display: 'flex',
              alignItems: 'center',
              gap: 'var(--mantine-spacing-xs)',
              opacity: 0.5,
              cursor: 'not-allowed',
            }}
          >
            <IconCube size={ICON_SIZE.SM} />
            <span>3D</span>
            {!isWebglAvailable && <IconAlertTriangle size={ICON_SIZE.XS} />}
          </Box>
        </Tooltip>
      ) : (
        <Box
          style={{
            display: 'flex',
            alignItems: 'center',
            gap: 'var(--mantine-spacing-xs)',
          }}
        >
          <IconCube size={ICON_SIZE.SM} />
          <span>3D</span>
        </Box>
      ),
      disabled: is3DDisabled,
    },
  ];

  return (
    <SegmentedControl
      data-testid="view-mode-toggle"
      size={size}
      fullWidth={fullWidth}
      value={value}
      onChange={(value_) => {
        // Only allow change to 3D if WebGL is available
        if (value_ === '3D' && is3DDisabled) {
          return;
        }
        onChange(value_);
      }}
      data={data}
      disabled={disabled}
      aria-label="Toggle between 2D and 3D graph visualization modes"
    />
  );
};
