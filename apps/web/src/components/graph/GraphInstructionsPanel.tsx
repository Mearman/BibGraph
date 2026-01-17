/**
 * Accessibility instructions panel for graph navigation
 */

import { Box, Text } from '@mantine/core';
import React from 'react';

interface GraphInstructionsPanelProps {
  isMobile: boolean;
}

const PANEL_STYLE: React.CSSProperties = {
  position: 'absolute',
  bottom: '8px',
  left: '8px',
  backgroundColor: 'rgba(0, 0, 0, 0.7)',
  borderRadius: '4px',
  padding: '4px 8px',
  color: '#fff',
  fontSize: '10px',
  zIndex: 10,
  maxWidth: '200px',
};

const MobileInstructions: React.FC = () => (
  <Text size="xs" c="white">
    <div>Swipe up/down to zoom</div>
    <div>Double-tap to toggle zoom</div>
    <div>Long-press to show controls</div>
    <div>Pinch to zoom precisely</div>
    <div>Drag nodes to reposition</div>
    <div>Tap nodes for details</div>
  </Text>
);

const DesktopInstructions: React.FC = () => (
  <Text size="xs" c="white">
    <div>Scroll to zoom in/out</div>
    <div>Drag to pan around</div>
    <div>Click nodes for details</div>
    <div>Right-click for context menu</div>
    <div>Use Tab + Enter for keyboard nav</div>
  </Text>
);

export const GraphInstructionsPanel: React.FC<GraphInstructionsPanelProps> = ({
  isMobile,
}) => {
  return (
    <Box style={PANEL_STYLE}>
      {isMobile ? <MobileInstructions /> : <DesktopInstructions />}
    </Box>
  );
};
