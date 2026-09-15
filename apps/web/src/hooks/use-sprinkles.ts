/**
 * React hooks for Vanilla Extract Sprinkles integration
 * Provides convenient hooks for using sprinkles with theme awareness
 */

import type { CSSProperties } from 'react';
import { useCallback, useEffect, useMemo, useState } from 'react';

import { useTheme } from '../contexts/theme-context';
import type { Sprinkles } from '../styles/sprinkles';
import { sprinkles } from '../styles/sprinkles';
import {
  createButtonStyles,
  createCardStyles,
  createDynamicSpacing,
  interactiveStates} from '../styles/sprinkles/dynamic-theme';
import type { ComponentLibrary } from '../styles/theme-contracts';

/**
 * Hook to access sprinkles with theme awareness
 * Returns the sprinkles function with current theme context
 */
export const useSprinkles = () => {
  const { config } = useTheme();

  const themeAwareSprinkles = useCallback((properties: Sprinkles) => {
    return sprinkles(properties);
  }, []);

  return useMemo(() => ({
    /**
     * Main sprinkles function
     */
    sprinkles: themeAwareSprinkles,

    /**
     * Current theme configuration
     */
    themeConfig: config,

    /**
     * Helper for creating theme-aware spacing
     */
    spacing: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') =>
      `var(--mantine-spacing-${size})`,

    /**
     * Helper for creating theme-aware border radius
     */
    radius: (size: 'xs' | 'sm' | 'md' | 'lg' | 'xl') =>
      `var(--mantine-radius-${size})`,

    /**
     * Helper for theme-aware colors
     */
    color: {
      primary: `var(--mantine-color-${config.colorScheme}-6)`,
      primaryHover: `var(--mantine-color-${config.colorScheme}-7)`,
      primaryLight: `var(--mantine-color-${config.colorScheme}-0)`,
      text: 'var(--mantine-color-gray-9)',
      textSecondary: 'var(--mantine-color-gray-6)',
      textMuted: 'var(--mantine-color-gray-5)',
      border: 'var(--mantine-color-gray-3)',
      background: 'var(--mantine-color-white)',
    },

    /**
     * Component library specific helpers
     */
    componentLibrary: config.componentLibrary,

    /**
     * Current color scheme
     */
    colorScheme: config.colorScheme,

    /**
     * Current border radius setting
     */
    borderRadius: config.borderRadius,

  }), [config, themeAwareSprinkles]);
};

/**
 * Hook for dynamic spacing based on component library
 * Returns spacing values that adapt to the current component library
 */
export const useDynamicSpacing = () => {
  const { config } = useTheme();

  const spacingValues = useMemo(() => {
    return createDynamicSpacing(config.componentLibrary);
  }, [config.componentLibrary]);

  return {
    spacingValues,
    getSpacing: (size: 'xs' | 'sm' | 'md' | 'lg') => {
      return spacingValues[size] || '16px'; // fallback to md
    },
  };
};

/**
 * Hook for interactive states (hover, active, disabled, selected)
 * Returns dynamic styles and utilities for interactive components
 */
export const useInteractiveStates = (options?: {
  disabled?: boolean;
  selected?: boolean;
  hoverable?: boolean;
}) => {
  const states = useMemo(() => {
    return {
      base: interactiveStates.base,
      disabled: interactiveStates.disabled,
      selected: interactiveStates.selected,
      hoverable: interactiveStates.hoverable,
    };
  }, []);

  const getStyles = useCallback((
    base = true,
    disabled = false,
    selected = false,
    hoverable = true
  ): CSSProperties => {
    let combinedStyles: CSSProperties = {};
    if (base) combinedStyles = { ...combinedStyles, ...states.base };
    if (disabled) combinedStyles = { ...combinedStyles, ...states.disabled };
    if (selected) combinedStyles = { ...combinedStyles, ...states.selected };
    if (hoverable) combinedStyles = { ...combinedStyles, ...states.hoverable };
    return combinedStyles;
  }, [states]);

  return {
    states,
    getStyles,
    isDisabled: options?.disabled ?? false,
    isSelected: options?.selected ?? false,
    isHoverable: options?.hoverable !== false,
  };
};

/**
 * Hook for dynamic card styling
 * Returns card styles that adapt to the current component library
 */
export const useDynamicCard = (options?: {
  elevated?: boolean;
  library?: ComponentLibrary;
}) => {
  const { config } = useTheme();

  const cardStyle = useMemo(() => {
    return createCardStyles(
      options?.library ?? config.componentLibrary,
      options?.elevated ?? false
    );
  }, [config.componentLibrary, options?.library, options?.elevated]);

  return {
    cardStyle,
    isElevated: options?.elevated ?? false,
    library: options?.library ?? config.componentLibrary,
  };
};

/**
 * Hook for dynamic button styling
 * Returns button styles that adapt to the current component library
 */
export const useDynamicButton = (options?: {
  variant?: 'solid' | 'subtle' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  library?: ComponentLibrary;
}) => {
  const { config } = useTheme();

  const buttonStyle = useMemo(() => {
    return createButtonStyles(
      options?.library ?? config.componentLibrary,
      options?.variant ?? 'solid',
      options?.size ?? 'md'
    );
  }, [config.componentLibrary, options?.library, options?.variant, options?.size]);

  return {
    buttonStyle,
    variant: options?.variant ?? 'solid',
    size: options?.size ?? 'md',
    library: options?.library ?? config.componentLibrary,
  };
};

/**
 * Hook for responsive design utilities
 * Provides breakpoint-aware styling helpers with proper event handling
 */
const RESIZE_DEBOUNCE_MS = 100;

export const useResponsiveDesign = () => {
  const breakpoints = useMemo(() => ({
    mobile: '0px',
    tablet: '768px',
    desktop: '1024px',
    wide: '1280px',
  }), []);

  // Use state to track current breakpoint for reactive updates
  const [currentBreakpoint, setCurrentBreakpoint] = useState<'mobile' | 'tablet' | 'desktop' | 'wide'>('mobile');

  // Update breakpoint on mount and resize
  useEffect(() => {
    const updateBreakpoint = () => {
      const width = window.innerWidth;
      if (width < Number.parseInt(breakpoints.tablet)) {
        setCurrentBreakpoint('mobile');
      } else if (width < Number.parseInt(breakpoints.desktop)) {
        setCurrentBreakpoint('tablet');
      } else if (width < Number.parseInt(breakpoints.wide)) {
        setCurrentBreakpoint('desktop');
      } else {
        setCurrentBreakpoint('wide');
      }
    };

    // Initial check
    updateBreakpoint();

    // Add resize listener with debouncing
    let resizeTimer: NodeJS.Timeout;
    const handleResize = () => {
      clearTimeout(resizeTimer);
      resizeTimer = setTimeout(updateBreakpoint, RESIZE_DEBOUNCE_MS);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      clearTimeout(resizeTimer);
    };
  }, [breakpoints]);

  const responsiveSprinkles = useCallback((properties: {
    mobile?: Sprinkles;
    tablet?: Sprinkles;
    desktop?: Sprinkles;
    wide?: Sprinkles;
  }) => {
    // Return styles based on current breakpoint
    const breakpointStyles = properties[currentBreakpoint] ?? properties.mobile ?? {};
    return sprinkles(breakpointStyles);
  }, [currentBreakpoint]);

  return {
    breakpoints,
    responsiveSprinkles,
    currentBreakpoint,
    isMobile: () => currentBreakpoint === 'mobile',
    isTablet: () => currentBreakpoint === 'tablet',
    isDesktop: () => currentBreakpoint === 'desktop' || currentBreakpoint === 'wide',
    isWide: () => currentBreakpoint === 'wide',
  };
};

/**
 * Hook for theme-aware color utilities
 * Provides convenient access to theme colors with proper fallbacks
 */
export const useThemeColors = () => {
  const { config } = useTheme();

  return useMemo(() => ({
    // Primary colors for current scheme
    primary: {
      6: `var(--mantine-color-${config.colorScheme}-6)`,
      7: `var(--mantine-color-${config.colorScheme}-7)`,
      0: `var(--mantine-color-${config.colorScheme}-0)`,
      light: `var(--mantine-color-${config.colorScheme}-0)`,
      main: `var(--mantine-color-${config.colorScheme}-6)`,
      hover: `var(--mantine-color-${config.colorScheme}-7)`,
    },

    // Neutral colors
    gray: {
      0: 'var(--mantine-color-gray-0)',
      1: 'var(--mantine-color-gray-1)',
      2: 'var(--mantine-color-gray-2)',
      3: 'var(--mantine-color-gray-3)',
      4: 'var(--mantine-color-gray-4)',
      5: 'var(--mantine-color-gray-5)',
      6: 'var(--mantine-color-gray-6)',
      7: 'var(--mantine-color-gray-7)',
      8: 'var(--mantine-color-gray-8)',
      9: 'var(--mantine-color-gray-9)',
    },

    // Semantic colors
    semantic: {
      success: 'var(--mantine-color-green-6)',
      warning: 'var(--mantine-color-orange-6)',
      error: 'var(--mantine-color-red-6)',
      info: 'var(--mantine-color-blue-6)',
    },

    // Text colors
    text: {
      primary: 'var(--mantine-color-gray-9)',
      secondary: 'var(--mantine-color-gray-6)',
      muted: 'var(--mantine-color-gray-5)',
      dimmed: 'var(--mantine-color-gray-4)',
      disabled: 'var(--mantine-color-gray-3)',
    },

    // Background colors
    background: {
      primary: 'var(--mantine-color-white)',
      secondary: 'var(--mantine-color-gray-0)',
      tertiary: 'var(--mantine-color-blue-0)',
    },

    // Border colors
    border: {
      primary: 'var(--mantine-color-gray-3)',
      secondary: 'var(--mantine-color-gray-2)',
      focus: `var(--mantine-color-${config.colorScheme}-6)`,
    },

    // Current theme info
    currentScheme: config.colorScheme,
    currentLibrary: config.componentLibrary,
    currentRadius: config.borderRadius,

  }), [config.colorScheme, config.componentLibrary, config.borderRadius]);
};

/**
 * Hook for common layout patterns
 * Provides pre-configured sprinkles combinations for common layouts
 * Simplified version that returns valid Sprinkles parameters
 */
export const useLayoutPatterns = () => {
  return useMemo(() => ({
    // Flex layouts - returning the parameters instead of calling sprinkles
    flexCenter: { display: 'flex', alignItems: 'center', justifyContent: 'center' },
    flexBetween: { display: 'flex', alignItems: 'center', justifyContent: 'space-between' },
    flexStart: { display: 'flex', alignItems: 'center', justifyContent: 'flex-start' },
    flexEnd: { display: 'flex', alignItems: 'center', justifyContent: 'flex-end' },
    flexColumn: { display: 'flex', flexDirection: 'column' },
    flexColumnCenter: { display: 'flex', flexDirection: 'column', alignItems: 'center' },

    // Spacing utilities
    sectionPadding: { padding: 'lg' },
    cardPadding: { padding: 'md' },
    buttonPadding: { paddingTop: 'sm', paddingBottom: 'sm', paddingLeft: 'lg', paddingRight: 'lg' },

    // Text utilities
    headingText: { fontSize: 'lg', fontWeight: '600' },
    bodyText: { fontSize: 'sm', lineHeight: '1.5' },
    captionText: { fontSize: 'xs', color: 'textMuted' },

    // Interactive utilities
    clickable: { cursor: 'pointer', transition: 'all 0.2s ease' },

    // Card utilities
    card: {
      padding: 'md',
      borderRadius: 'lg',
      borderStyle: 'solid',
      borderWidth: '1px',
      borderColor: 'border',
      backgroundColor: 'background'
    },

  }), []);
};

/**
 * Type exports for TypeScript support
 */
