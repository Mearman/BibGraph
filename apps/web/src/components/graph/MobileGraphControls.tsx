/**
 * Mobile touch controls for graph navigation
 */

import { Group } from '@mantine/core';
import {
  IconMaximize,
  IconRotateClockwise,
  IconZoomIn,
  IconZoomOut,
} from '@tabler/icons-react';
import React from 'react';

import { announceToScreenReader } from '@/utils/accessibility';

interface MobileGraphControlsProps {
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomToFit: () => void;
  onRotate: () => void;
}

const CONTROL_BUTTON_STYLE: React.CSSProperties = {
  background: 'transparent',
  border: 'none',
  color: '#fff',
  cursor: 'pointer',
  padding: '4px',
};

const CONTROL_ICON_SIZE = 16;

export const MobileGraphControls: React.FC<MobileGraphControlsProps> = ({
  onZoomIn,
  onZoomOut,
  onZoomToFit,
  onRotate,
}) => {
  const handleZoomOut = () => {
    onZoomOut();
  };

  const handleZoomIn = () => {
    onZoomIn();
  };

  const handleZoomToFit = () => {
    onZoomToFit();
    announceToScreenReader('Zoom to fit');
  };

  const handleRotate = () => {
    onRotate();
    announceToScreenReader('Rotate graph 45 degrees');
  };

  return (
    <Group
      gap="xs"
      style={{
        position: 'absolute',
        top: '8px',
        right: '8px',
        backgroundColor: 'rgba(0, 0, 0, 0.7)',
        borderRadius: '4px',
        padding: '4px',
        zIndex: 10,
      }}
    >
      <button
        onClick={handleZoomOut}
        style={CONTROL_BUTTON_STYLE}
        aria-label="Zoom out"
      >
        <IconZoomOut size={CONTROL_ICON_SIZE} />
      </button>

      <button
        onClick={handleZoomIn}
        style={CONTROL_BUTTON_STYLE}
        aria-label="Zoom in"
      >
        <IconZoomIn size={CONTROL_ICON_SIZE} />
      </button>

      <button
        onClick={handleZoomToFit}
        style={CONTROL_BUTTON_STYLE}
        aria-label="Zoom to fit"
      >
        <IconMaximize size={CONTROL_ICON_SIZE} />
      </button>

      <button
        onClick={handleRotate}
        style={CONTROL_BUTTON_STYLE}
        aria-label="Rotate graph"
      >
        <IconRotateClockwise size={CONTROL_ICON_SIZE} />
      </button>
    </Group>
  );
};
