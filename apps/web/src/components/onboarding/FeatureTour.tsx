/**
 * Feature Tour Component
 *
 * Highlights specific UI elements during onboarding tour Uses CSS positioning to spotlight target elements
 */

import { Portal, Text, useMantineTheme } from '@mantine/core';
import { useWindowScroll } from '@mantine/hooks';
import { useEffect, useState } from 'react';

// Tour highlight sizing and timing constants
const ELEMENT_READY_DELAY_MS = 100;
const SPOTLIGHT_PADDING_PX = 8;
const SPOTLIGHT_SIZE_PADDING_PX = 16; // total padding added to width/height (both sides)
const TOOLTIP_OFFSET_PX = 16;

export interface TourHighlightProps {
  /**
  CSS selector for target element to highlight
   */
  target?: string;
  /**
  Whether the tour is active
   */
  active: boolean;
  /**
  Tooltip text to display
   */
  tooltip?: string;
  /**
  Position of the tooltip
   */
  position?: 'top' | 'bottom' | 'left' | 'right';
}

/**
 * Tour Highlight Component
 *
 * Creates a spotlight effect on target elements during onboarding
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
    // `!active` is also checked directly in the render guard below, so no state update is needed here to hide the highlight - it will already render null.
    if (!active || target === undefined) {
      return undefined;
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
    const timeoutId = setTimeout(findElement, ELEMENT_READY_DELAY_MS);
    return () => { clearTimeout(timeoutId); };
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
    left: highlightRect.left - SPOTLIGHT_PADDING_PX,
    top: highlightRect.top - SPOTLIGHT_PADDING_PX,
    width: highlightRect.width + SPOTLIGHT_SIZE_PADDING_PX,
    height: highlightRect.height + SPOTLIGHT_SIZE_PADDING_PX,
    borderRadius: '8px',
    boxShadow: `0 0 0 4000px rgba(0, 0, 0, 0.5), 0 0 0 4px ${theme.colors.blue[5]}`,
    transition: 'all 0.3s ease',
  };

  const getTooltipPosition = () => {
    const horizontalCenter = highlightRect.width / 2;
    const verticalCenter = highlightRect.height / 2;

    switch (position) {
      case 'top':
        return {
          bottom: highlightRect.height + TOOLTIP_OFFSET_PX,
          left: horizontalCenter,
          transform: 'translateX(-50%)',
        };
      case 'bottom':
        return {
          top: highlightRect.height + TOOLTIP_OFFSET_PX,
          left: horizontalCenter,
          transform: 'translateX(-50%)',
        };
      case 'left':
        return {
          right: highlightRect.width + TOOLTIP_OFFSET_PX,
          top: verticalCenter,
          transform: 'translateY(-50%)',
        };
      case 'right':
        return {
          left: highlightRect.width + TOOLTIP_OFFSET_PX,
          top: verticalCenter,
          transform: 'translateY(-50%)',
        };
      default:
        return position satisfies never;
    }
  };

  const tooltipPosition = getTooltipPosition();

  return (
    <Portal>
      <div style={overlayStyle}>
        <div style={spotlightStyle}>
          {tooltip !== undefined && tooltip !== "" && (
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
  /**
  Whether the tour is active
   */
  active: boolean;
  /**
  Current step index
   */
  currentStep: number;
  /**
  On close callback
   */
  onClose: () => void;
}

/**
 * Feature Tour with auto-highlighting
 */
export const FeatureTour: React.FC<FeatureTourProps> = (_props) => {
  // This component can be extended to provide more sophisticated tour features
  // For now, the TourHighlight component handles individual step highlighting

  return null;
};
