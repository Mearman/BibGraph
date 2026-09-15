/**
 * Runtime theme application utilities
 * Provides functions to apply and manage theme changes at runtime
 */

import { shadcnPaletteNames } from '../shadcn-colors';
import type { BorderRadius,ColorMode, ColorScheme, ComponentLibrary } from '../theme-contracts';
import { themeVars as themeVariables } from '../theme-vars.css';

/**
 * Runtime theme configuration that can be applied dynamically
 */
export interface RuntimeThemeConfig {
  componentLibrary: ComponentLibrary;
  colorScheme: ColorScheme;
  colorMode: ColorMode;
  borderRadius: BorderRadius;
}

const COMPONENT_LIBRARIES: readonly string[] = ['mantine', 'shadcn', 'radix'] satisfies readonly ComponentLibrary[];
const COLOR_MODES: readonly string[] = ['light', 'dark', 'auto'] satisfies readonly ColorMode[];
const BORDER_RADII: readonly string[] = ['xs', 'sm', 'md', 'lg', 'xl'] satisfies readonly BorderRadius[];

/**
 * Type guard validating that an unknown value parsed from storage matches the RuntimeThemeConfig shape.
 */
const isRuntimeThemeConfig = (value: unknown): value is RuntimeThemeConfig => {
  if (typeof value !== 'object' || value === null) return false;
  if (!('componentLibrary' in value) || !('colorScheme' in value) || !('colorMode' in value) || !('borderRadius' in value)) {
    return false;
  }
  return (
    typeof value.componentLibrary === 'string' && COMPONENT_LIBRARIES.includes(value.componentLibrary) &&
    typeof value.colorScheme === 'string' && shadcnPaletteNames.some((name) => name === value.colorScheme) &&
    typeof value.colorMode === 'string' && COLOR_MODES.includes(value.colorMode) &&
    typeof value.borderRadius === 'string' && BORDER_RADII.includes(value.borderRadius)
  );
};

/**
 * Component library-specific theme values
 */
const componentLibraryThemes = {
  mantine: {
    spacing: {
      xs: '4px',
      sm: '8px',
      md: '16px',
      lg: '24px',
      xl: '32px',
    },
    borderRadius: {
      xs: '2px',
      sm: '4px',
      md: '6px',
      lg: '8px',
      xl: '12px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.12), 0 1px 2px rgba(0, 0, 0, 0.24)',
      md: '0 4px 6px rgba(0, 0, 0, 0.07), 0 2px 4px rgba(0, 0, 0, 0.06)',
      lg: '0 10px 25px rgba(0, 0, 0, 0.15), 0 6px 10px rgba(0, 0, 0, 0.08)',
    },
  },
  shadcn: {
    spacing: {
      xs: '4px',
      sm: '6px',
      md: '12px',
      lg: '20px',
      xl: '28px',
    },
    borderRadius: {
      xs: '2px',
      sm: '6px',
      md: '8px',
      lg: '12px',
      xl: '16px',
    },
    shadows: {
      sm: '0 1px 2px 0 rgb(0 0 0 / 0.05)',
      md: '0 4px 6px -1px rgb(0 0 0 / 0.1), 0 2px 4px -2px rgb(0 0 0 / 0.1)',
      lg: '0 10px 15px -3px rgb(0 0 0 / 0.1), 0 4px 6px -4px rgb(0 0 0 / 0.1)',
    },
  },
  radix: {
    spacing: {
      xs: '2px',
      sm: '4px',
      md: '8px',
      lg: '16px',
      xl: '24px',
    },
    borderRadius: {
      xs: '1px',
      sm: '2px',
      md: '4px',
      lg: '6px',
      xl: '8px',
    },
    shadows: {
      sm: '0 1px 3px rgba(0, 0, 0, 0.1)',
      md: '0 2px 8px rgba(0, 0, 0, 0.1)',
      lg: '0 4px 12px rgba(0, 0, 0, 0.15)',
    },
  },
} as const;

/**
 * Border radius values mapping
 */
const borderRadiusValues = {
  xs: '2px',
  sm: '4px',
  md: '6px',
  lg: '8px',
  xl: '12px',
} as const;

/**
 * Apply runtime theme based on configuration
 * This updates CSS custom properties dynamically
 */
export const applyRuntimeTheme = (config: Readonly<RuntimeThemeConfig>) => {
  const theme = componentLibraryThemes[config.componentLibrary];

  // Apply theme variables to the document root directly
  // This is the approach recommended for runtime theme switching
  const root = document.documentElement;

  // Set component library
  root.style.setProperty(themeVariables.componentLibrary, config.componentLibrary);

  // Color scheme mapping
  root.style.setProperty(themeVariables.primaryColor, `var(--mantine-color-${config.colorScheme}-6)`);
  root.style.setProperty(themeVariables.primaryColorHover, `var(--mantine-color-${config.colorScheme}-7)`);
  root.style.setProperty(themeVariables.primaryColorLight, `var(--mantine-color-${config.colorScheme}-0)`);
  root.style.setProperty(themeVariables.backgroundColor, 'var(--mantine-color-white)');
  root.style.setProperty(themeVariables.backgroundColorHover, 'var(--mantine-color-gray-0)');
  root.style.setProperty(themeVariables.surfaceColor, 'var(--mantine-color-white)');
  root.style.setProperty(themeVariables.textColor, 'var(--mantine-color-gray-9)');
  root.style.setProperty(themeVariables.textSecondaryColor, 'var(--mantine-color-gray-6)');
  root.style.setProperty(themeVariables.textMutedColor, 'var(--mantine-color-gray-5)');
  root.style.setProperty(themeVariables.borderColor, 'var(--mantine-color-gray-3)');

  // Component-specific colors
  root.style.setProperty(themeVariables.cardBackground,
    config.componentLibrary === 'shadcn' ? 'hsl(var(--shadcn-card))' : 'var(--mantine-color-white)');
  root.style.setProperty(themeVariables.inputBackground, 'var(--mantine-color-white)');
  root.style.setProperty(themeVariables.buttonBackground, `var(--mantine-color-${config.colorScheme}-6)`);
  root.style.setProperty(themeVariables.buttonHover, `var(--mantine-color-${config.colorScheme}-7)`);

  // Spacing from component library theme
  root.style.setProperty(themeVariables.spacingUnit, theme.spacing.md);
  root.style.setProperty(themeVariables.spacingSm, theme.spacing.sm);
  root.style.setProperty(themeVariables.spacingMd, theme.spacing.md);
  root.style.setProperty(themeVariables.spacingLg, theme.spacing.lg);

  // Border radius from config
  root.style.setProperty(themeVariables.borderRadius, borderRadiusValues[config.borderRadius]);
  root.style.setProperty(themeVariables.borderRadiusSm, borderRadiusValues.xs);
  root.style.setProperty(themeVariables.borderRadiusLg, borderRadiusValues.lg);

  // Shadows
  root.style.setProperty(themeVariables.shadowSm, theme.shadows.sm);
  root.style.setProperty(themeVariables.shadowMd, theme.shadows.md);
  root.style.setProperty(themeVariables.shadowLg, theme.shadows.lg);
};

/**
 * Apply color mode (light/dark) theme
 * This handles the light/dark mode switching
 */
export const applyColorModeTheme = (colorMode: ColorMode) => {
  const root = document.documentElement;

  if (colorMode === 'dark') {
    root.dataset.mantineColorScheme = 'dark';
    root.style.colorScheme = 'dark';
  } else {
    root.dataset.mantineColorScheme = 'light';
    root.style.colorScheme = 'light';
  }
};

/**
 * Apply dynamic CSS custom properties for interactive states
 * These properties are used by the dynamic styles
 */
export const applyInteractiveProperties = () => {
  const root = document.documentElement;

  // Set up interactive state variables
  root.style.setProperty('--hover-background', 'var(--mantine-color-gray-0)');
  root.style.setProperty('--active-background', 'var(--mantine-color-gray-1)');
  root.style.setProperty('--selected-background', 'var(--mantine-color-blue-light)');

  // Set up shadcn semantic variables if needed
  root.style.setProperty('--shadcn-card', '210 40% 98%');
  root.style.setProperty('--shadcn-border', '214.3 31.8% 91.4%');
  root.style.setProperty('--shadcn-muted-foreground', '215.4 16.3% 46.9%');
  root.style.setProperty('--shadcn-destructive', '0 84.2% 60.2%');
};

/**
 * Initialize runtime theme system
 * Call this once when the application starts
 */
export const initializeRuntimeTheme = (config: Readonly<RuntimeThemeConfig>) => {
  // Apply the main theme
  applyRuntimeTheme(config);

  // Apply color mode
  applyColorModeTheme(config.colorMode);

  // Set up interactive properties
  applyInteractiveProperties();

  // Listen for system color scheme changes if using 'auto'
  if (config.colorMode === 'auto') {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');

    const handleColorSchemeChange = (e: MediaQueryListEvent) => {
      applyColorModeTheme(e.matches ? 'dark' : 'light');
    };

    mediaQuery.addEventListener('change', handleColorSchemeChange);

    // Apply initial color scheme
    applyColorModeTheme(mediaQuery.matches ? 'dark' : 'light');
  }
};

/**
 * Update theme at runtime
 * Use this when the user changes theme settings
 */
export const updateRuntimeTheme = (newConfig: Readonly<Partial<RuntimeThemeConfig>>) => {
  // Get current theme from localStorage or use defaults
  const currentConfig: RuntimeThemeConfig = {
    componentLibrary: 'mantine',
    colorScheme: 'blue',
    colorMode: 'auto',
    borderRadius: 'md',
  };

  // Merge with new configuration
  const updatedConfig = { ...currentConfig, ...newConfig };

  // Apply the updated theme
  applyRuntimeTheme(updatedConfig);

  // Apply color mode if it changed
  if (newConfig.colorMode) {
    applyColorModeTheme(newConfig.colorMode);
  }

  // Save to localStorage for persistence
  if (typeof window !== 'undefined') {
    localStorage.setItem('theme-config', JSON.stringify(updatedConfig));
  }
};

/**
 * Get current runtime theme configuration
 */
export const getCurrentRuntimeTheme = (): RuntimeThemeConfig => {
  if (typeof window === 'undefined') {
    return {
      componentLibrary: 'mantine',
      colorScheme: 'blue',
      colorMode: 'auto',
      borderRadius: 'md',
    };
  }

  try {
    const saved = localStorage.getItem('theme-config');
    if (saved !== null) {
      const parsed: unknown = JSON.parse(saved);
      if (isRuntimeThemeConfig(parsed)) {
        return parsed;
      }
    }
  } catch (error) {
    console.warn('Failed to parse theme config from localStorage:', error);
  }

  return {
    componentLibrary: 'mantine',
    colorScheme: 'blue',
    colorMode: 'auto',
    borderRadius: 'md',
  };
};

/**
 * Utility to create theme-aware CSS values
 * This helps components use the correct theme variables
 */
export const createThemeValue = (property: keyof typeof themeVariables, fallback?: string) => {
  const cssVariable = `var(${themeVariables[property]})`;
  return cssVariable === 'var(undefined)' && fallback !== undefined ? fallback : cssVariable;
};

/**
 * Get theme value for a specific component library
 */
export const getComponentLibraryTheme = (library: ComponentLibrary) => {
  return componentLibraryThemes[library];
};

/**
 * Type exports for TypeScript support
 */
