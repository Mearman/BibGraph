/**
 * Temporary fallback for dynamic theme utilities
 * Bypasses Vanilla Extract issues while maintaining API compatibility
 */

import { setElementVars } from '@vanilla-extract/dynamic';

import type { ComponentLibrary } from '../theme-contracts';

/**
 * Type definitions for dynamic theme configuration
 */
export interface DynamicThemeConfig {
  colors?: {
    primary?: string;
    secondary?: string;
    accent?: string;
  };
  spacing?: {
    xs?: string;
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
  borderRadius?: {
    sm?: string;
    md?: string;
    lg?: string;
    xl?: string;
  };
}

export interface InteractiveStateProps {
  disabled?: boolean;
  selected?: boolean;
  hoverable?: boolean;
}

export interface CardProps {
  elevated?: boolean;
  library?: ComponentLibrary;
}

export interface ButtonProps {
  variant?: 'solid' | 'subtle' | 'outline' | 'ghost';
  size?: 'xs' | 'sm' | 'md' | 'lg';
  library?: ComponentLibrary;
}

// Inject theme CSS variables for interactive states
if (typeof document !== 'undefined') {
  const style = new CSSStyleSheet();
  const cssText = `
    :root {
      --text-primary: var(--mantine-color-gray-9);
      --text-secondary: var(--mantine-color-gray-6);
      --text-muted: var(--mantine-color-gray-5);
      --background-primary: var(--mantine-color-white);
      --background-secondary: var(--mantine-color-gray-0);
      --border-primary: var(--mantine-color-gray-3);
    }
    [data-mantine-color-scheme="dark"] {
      --text-primary: var(--mantine-color-gray-0);
      --text-secondary: var(--mantine-color-gray-4);
      --text-muted: var(--mantine-color-gray-6);
      --background-primary: var(--mantine-color-dark-6);
      --background-secondary: var(--mantine-color-dark-7);
      --border-primary: var(--mantine-color-dark-4);
    }
  `;
  style.replaceSync(cssText);
  // adoptedStyleSheets may not be iterable in test environments (JSDOM)
  if (Symbol.iterator in new Object(document.adoptedStyleSheets)) {
    document.adoptedStyleSheets = [...document.adoptedStyleSheets, style];
  } else {
    // Fallback for test environments: initialize with single stylesheet
    document.adoptedStyleSheets = [style];
  }
}

/**
 * Dynamic theme variables that can change at runtime
 * These enable runtime theme switching without page reload
 */

// Base dynamic theme contract
export const dynamicThemeVars = {
  colors: {
    primary: '--primary-color',
    secondary: '--secondary-color',
    accent: '--accent-color',
  },
  spacing: {
    xs: '--spacing-xs',
    sm: '--spacing-sm',
    md: '--spacing-md',
    lg: '--spacing-lg',
    xl: '--spacing-xl',
  },
  borderRadius: {
    sm: '--border-radius-sm',
    md: '--border-radius-md',
    lg: '--border-radius-lg',
    xl: '--border-radius-xl',
  },
} as const;

/**
 * Dynamic interactive states using inline styles
 * These automatically adapt when the user switches between themes
 */
export const interactiveStates = {
  // Base interactive style
  base: {
    transition: 'all 0.2s ease',
    cursor: 'pointer',
  },

  // Disabled state
  disabled: {
    cursor: 'not-allowed',
    opacity: '0.6',
    pointerEvents: 'none',
  },

  // Selected state
  selected: {
    backgroundColor: 'var(--mantine-color-white)',
    border: '2px solid var(--mantine-color-blue-6)',
  },

  // Hover state
  hoverable: {
    cursor: 'pointer',
    transition: 'all 0.2s ease',
  },
} as const;

/**
 * Dynamic color schemes that adapt to current theme
 */
export const colorSchemes = {
  light: {
    '--text-primary': 'var(--mantine-color-gray-9)',
    '--text-secondary': 'var(--mantine-color-gray-6)',
    '--text-muted': 'var(--mantine-color-gray-5)',
    '--background-primary': 'var(--mantine-color-white)',
    '--background-secondary': 'var(--mantine-color-gray-0)',
    '--border-primary': 'var(--mantine-color-gray-3)',
  },
  dark: {
    '--text-primary': 'var(--mantine-color-gray-0)',
    '--text-secondary': 'var(--mantine-color-gray-4)',
    '--text-muted': 'var(--mantine-color-gray-6)',
    '--background-primary': 'var(--mantine-color-dark-6)',
    '--background-secondary': 'var(--mantine-color-dark-7)',
    '--border-primary': 'var(--mantine-color-dark-4)',
  },
};

/**
 * Component library-specific spacing values
 */
export const createDynamicSpacing = (library: ComponentLibrary) => {
  const spacingScales = {
    mantine: { xs: '4px', sm: '8px', md: '16px', lg: '24px' },
    shadcn: { xs: '4px', sm: '6px', md: '12px', lg: '20px' },
    radix: { xs: '2px', sm: '4px', md: '8px', lg: '16px' },
  };

  return spacingScales[library];
};

/**
 * Dynamic border radius that adapts to component library
 */
export const createDynamicBorderRadius = (library: ComponentLibrary) => {
  const radiusScales = {
    mantine: { xs: '2px', sm: '4px', md: '8px', lg: '16px' },
    shadcn: { xs: '2px', sm: '4px', md: '6px', lg: '8px' },
    radix: { xs: '1px', sm: '2px', md: '4px', lg: '6px' },
  };

  return radiusScales[library];
};

/**
 * Dynamic card styles that adapt to component library
 */
export const createCardStyles = (library: ComponentLibrary, elevated = false) => {
  const baseStyle = {
    padding: 'var(--spacing-md)',
    borderRadius: 'var(--border-radius-lg)',
    border: '1px solid var(--border-primary)',
  };

  const libraryStyles = {
    mantine: {
      ...baseStyle,
      ...(elevated && {
        boxShadow: '0 4px 12px rgba(0, 0, 0, 0.1)',
      }),
    },
    shadcn: {
      ...baseStyle,
      ...(elevated && {
        boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
      }),
    },
    radix: {
      ...baseStyle,
      ...(elevated && {
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
      }),
    },
  };

  return libraryStyles[library];
};

/**
 * Dynamic button styles that adapt to component library
 */
export const createButtonStyles = (
  library: ComponentLibrary,
  variant: 'solid' | 'subtle' | 'outline' | 'ghost' = 'solid',
  size: 'xs' | 'sm' | 'md' | 'lg' = 'md'
) => {
  const baseStyle = {
    padding: 'var(--button-padding)',
    borderRadius: 'var(--button-radius)',
    border: '1px solid transparent',
    transition: 'all 0.2s ease',
  };

  const variantStyles = {
    solid: {
      backgroundColor: 'var(--button-bg-solid)',
      color: 'var(--button-color-solid)',
      borderColor: 'var(--button-border-solid)',
    },
    subtle: {
      backgroundColor: 'var(--button-bg-subtle)',
      color: 'var(--button-color-subtle)',
      borderColor: 'var(--button-border-subtle)',
    },
    outline: {
      backgroundColor: 'transparent',
      color: 'var(--button-color-outline)',
      borderColor: 'var(--button-border-outline)',
    },
    ghost: {
      backgroundColor: 'transparent',
      color: 'var(--button-color-ghost)',
      borderColor: 'transparent',
    },
  };

  const sizeStyles = {
    xs: { padding: 'var(--button-padding-xs)', fontSize: 'var(--button-font-xs)' },
    sm: { padding: 'var(--button-padding-sm)', fontSize: 'var(--button-font-sm)' },
    md: { padding: 'var(--button-padding-md)', fontSize: 'var(--button-font-md)' },
    lg: { padding: 'var(--button-padding-lg)', fontSize: 'var(--button-font-lg)' },
  };

  return {
    ...baseStyle,
    ...variantStyles[variant],
    ...sizeStyles[size],
  };
};

/**
 * Apply dynamic theme to an element
 */
export const applyDynamicTheme = (element: HTMLElement, theme: DynamicThemeConfig) => {
  const variables = {
    [dynamicThemeVars.colors.primary]: theme.colors?.primary ?? 'var(--mantine-color-blue-6)',
    [dynamicThemeVars.spacing.md]: theme.spacing?.md ?? '16px',
    [dynamicThemeVars.borderRadius.md]: theme.borderRadius?.md ?? '8px',
  };

  setElementVars(element, variables);
};

/**
 * Apply color mode theme (light/dark) to an element
 */
export const applyColorModeTheme = (element: HTMLElement, colorMode: 'light' | 'dark') => {
  const schemeClass = colorMode === 'light' ? 'light' : 'dark';
  element.className = element.className.replaceAll(/color-scheme-(dark|light)/g, `color-scheme-${schemeClass}`);
};

/**
 * Apply interactive properties to an element
 */
export const applyInteractiveProperties = (
  element: HTMLElement,
  options: Readonly<{ disabled?: boolean; selected?: boolean; hoverable?: boolean }>
) => {
  let styles: Record<string, string> = {};

  if (options.hoverable !== false) {
    styles = { ...styles, ...interactiveStates.hoverable };
  }
  if (options.disabled === true) {
    styles = { ...styles, ...interactiveStates.disabled };
  }
  if (options.selected === true) {
    styles = { ...styles, ...interactiveStates.selected };
  }

  // Apply styles directly to the element
  for (const [property, value] of Object.entries(styles)) {
    element.style.setProperty(property, value);
  }
};

/**
 * Initialize runtime theme for the application
 */
export const initializeRuntimeTheme = () => {
  // Root theme setup
  const root = document.documentElement;
  const isPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const initialMode = isPrefersDark ? 'dark' : 'light';

  applyColorModeTheme(root, initialMode);
};

/**
 * Update runtime theme
 */
export const updateRuntimeTheme = (colorMode: 'light' | 'dark') => {
  const root = document.documentElement;
  applyColorModeTheme(root, colorMode);
};

/**
 * Get current runtime theme
 */
export const getCurrentRuntimeTheme = (): 'light' | 'dark' => {
  const root = document.documentElement;
  return root.classList.contains('color-scheme-dark') ? 'dark' : 'light';
};

/**
 * Create theme value for CSS variables
 */
export const createThemeValue = (key: string, value: string) => {
  return `var(--${key}, ${value})`;
};

/**
 * Get component library theme configuration
 * Uses CSS variables for proper theme/dark mode support
 */
export const getComponentLibraryTheme = (library: ComponentLibrary) => {
  const themes = {
    mantine: {
      primary: 'var(--mantine-color-blue-6)',
      primaryHover: 'var(--mantine-color-blue-7)',
      background: 'var(--mantine-color-body)',
      border: 'var(--mantine-color-default-border)',
    },
    shadcn: {
      primary: 'var(--mantine-color-blue-5)',
      primaryHover: 'var(--mantine-color-blue-6)',
      background: 'var(--mantine-color-body)',
      border: 'var(--mantine-color-default-border)',
    },
    radix: {
      primary: 'var(--mantine-color-gray-6)',
      primaryHover: 'var(--mantine-color-gray-7)',
      background: 'var(--mantine-color-body)',
      border: 'var(--mantine-color-default-border)',
    },
  };

  return themes[library];
};