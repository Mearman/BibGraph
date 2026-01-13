/**
 * Feature Tour Component
 *
 * Highlights specific UI elements during onboarding tour
 * Uses CSS positioning to spotlight target elements
 *
 * @module components/onboarding/FeatureTour
 */

import { Portal, Text, useMantineTheme } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { useEffect, useState } from 'react';

export interface TourHighlightProps {
  /** CSS selector for target element to highlight */
  target?: string;
  /** Whether the tour is active */
  active: boolean;
  /** Tooltip text to display */
  tooltip?: string;
  /** Position of the tooltip */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tour Highlight Component
 *
 * Creates a spotlight effect on target elements during onboarding
 *
 * @param props
 * @param props.target
 * @param props.active
 * @param props.tooltip
 * @param props.position
 */
export const TourHighlight: React.FC<TourHighlightProps> = ({
  target,
  active,
  tooltip,
  position = 'bottom',
}) => {
  const [highlightRect, setHighlightRect] = useState<DOMRect | null>(null);
  const [visible, setVisible] = useState(false);
  const theme = useMantineTheme();
  const [scroll] = useWindowScroll();

  useEffect(() => {
    if (!active || !target) {
      setVisible(false);
      return;
    }

    // Find target element
    const findElement = () => {
      const element = document.querySelector(target);
      if (element instanceof HTMLElement) {
        const rect = element.getBoundingClientRect();
        setHighlightRect(rect);
        setVisible(true);

        // Scroll element into view
        element.scrollIntoView({
          behavior: 'smooth',
          block: 'center',
          inline: 'center',
        });
      }
    };

    // Small delay to ensure DOM is ready
    const timeoutId = setTimeout(findElement, 100);
    return () => clearTimeout(timeoutId);
  }, [active, target, scroll]);

  if (!active || !highlightRect || !visible) {
    return null;
  }

  const overlayStyle = {
    position: 'fixed' as const,
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    zIndex: 9999,
    pointerEvents: 'none' as const,
  };

  const spotlightStyle = {
    position: 'absolute' as const,
    left: highlightRect.left - 8,
    top: highlightRect.top - 8,
    width: highlightRect.width + 16,
    height: highlightRect.height + 16,
    borderRadius: '8px',
    boxShadow: `0 0 0 4000px rgba(0, 0, 0, 0.5), 0 0 0 4px ${theme.colors.blue[5]}`,
    transition: 'all 0.3s ease',
  };

  const getTooltipPosition = () => {
    const offset = 16;
    const horizontalCenter = highlightRect.width / 2;
    const verticalCenter = highlightRect.height / 2;

    switch (position) {
      case 'top':
        return {
          bottom: highlightRect.height + offset,
          left: horizontalCenter,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: highlightRect.height + offset,
          left: horizontalCenter,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          right: highlightRect.width + offset,
          top: verticalCenter,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          left: highlightRect.width + offset,
          top: verticalCenter,
          transform: 'translateY(-50%)',
        };
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <Portal>
      <div style={overlayStyle}>
        <div style={spotlightStyle}>
          {tooltip && (
            <div
              style={{
                position: 'absolute',
                ...tooltipPosition,
                backgroundColor: 'white',
                padding: '12px 16px',
                borderRadius: '8px',
                boxShadow: theme.shadows.md,
                maxWidth: 300,
                zIndex: 10000,
              }}
            >
              <Text size="sm">{tooltip}</Text>
            </div>
          )}
        </div>
      </div>
    </Portal>
  );
};

/**
 * Feature Tour Component
 *
 * Orchestrates multi-step tour with highlights
 */
export interface FeatureTourProps {
  /** Whether the tour is active */
  active: boolean;
  /** Current step index */
  currentStep: number;
  /** On close callback */
  onClose: () => void;
}

/**
 * Feature Tour with auto-highlighting
 *
 * @param _props
 * @param _props.active
 * @param _props.currentStep
 * @param _props.onClose
 */
export const FeatureTour: React.FC<FeatureTourProps> = (_props) => {
  // This component can be extended to provide more sophisticated tour features
  // For now, the TourHighlight component handles individual step highlighting

  return null;
};
