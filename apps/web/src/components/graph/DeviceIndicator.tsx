/**
 * Device and performance profile indicator
 */

import { Group } from '@mantine/core';
import { IconDeviceDesktop, IconDeviceMobile } from '@tabler/icons-react';
import React from 'react';

import type { PerformanceProfile } from './adaptive-graph-types';

interface DeviceIndicatorProperties {
  isMobile: boolean;
  performanceProfile: PerformanceProfile;
  zoomLevel: number;
}

const INDICATOR_STYLE: React.CSSProperties = {
  position: 'absolute',
  top: '8px',
  left: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '4px',
  padding: '4px 8px',
  color: '#fff',
  fontSize: '10px',
  zIndex: 10,
};

const ICON_SIZE = 12;
const PERCENTAGE_MULTIPLIER = 100;

export const DeviceIndicator: React.FC<DeviceIndicatorProperties> = ({
  isMobile,
  performanceProfile,
  zoomLevel,
}) => {
  const zoomPercentage = Math.round(zoomLevel * PERCENTAGE_MULTIPLIER);

  return (
    <Group gap="xs" style={INDICATOR_STYLE}>
      {isMobile ? (
        <IconDeviceMobile size={ICON_SIZE} />
      ) : (
        <IconDeviceDesktop size={ICON_SIZE} />
      )}
      <span>{performanceProfile.toUpperCase()}</span>
      <span>&bull;</span>
      <span>{zoomPercentage}%</span>
    </Group>
  );
};
