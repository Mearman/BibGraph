import { createTheme, MantineProvider, type MantineThemeOverride } from "@mantine/core";
import { useColorScheme, useHotkeys, useLocalStorage } from "@mantine/hooks";
import React, { createContext, use, useCallback, useMemo } from "react";

import type { ShadcnPalette } from '@/styles/shadcn-colors'
import { mantineTheme, radixTheme,shadcnTheme } from "@/styles/themes";

type ComponentLibrary = 'mantine' | 'shadcn' | 'radix'
type ColorScheme = ShadcnPalette
type ColorMode = 'light' | 'dark' | 'auto'
type BorderRadius = 'xs' | 'sm' | 'md' | 'lg' | 'xl'

export interface ThemeConfig {
  componentLibrary: ComponentLibrary
  colorScheme: ColorScheme
  colorMode: ColorMode
  borderRadius: BorderRadius
}

// Theme context interface
interface ThemeContextType {
  config: ThemeConfig;
  setComponentLibrary: (library: ComponentLibrary) => void;
  setColorScheme: (scheme: ColorScheme) => void;
  setColorMode: (mode: ColorMode | "auto") => void;
  setBorderRadius: (radius: BorderRadius) => void;
  resetTheme: () => void;
}

// Create theme context
const ThemeContext = createContext<ThemeContextType | null>(null);

// Default theme configuration
const defaultThemeConfig: ThemeConfig = {
  componentLibrary: "mantine",
  colorScheme: "blue",
  colorMode: "auto",
  borderRadius: "md",
};

// Theme provider component
export const ThemeProvider = ({ children }: { children: React.ReactNode }) => {
  const systemColorMode = useColorScheme();
  const [config, setConfig] = useLocalStorage<ThemeConfig>({
    key: "theme-config",
    defaultValue: defaultThemeConfig,
    getInitialValueInEffect: true,
  });

  
  // Theme setters
  const setComponentLibrary = useCallback((library: ComponentLibrary) => {
    setConfig((previous) => ({
      ...previous,
      componentLibrary: library,
    }));
  }, [setConfig]);

  const setColorScheme = useCallback((scheme: ColorScheme) => {
    setConfig((previous) => ({
      ...previous,
      colorScheme: scheme,
    }));
  }, [setConfig]);

  const setColorMode = useCallback((mode: ColorMode) => {
    setConfig((previous) => ({
      ...previous,
      colorMode: mode,
    }));
  }, [setConfig]);

  const setBorderRadius = useCallback((radius: BorderRadius) => {
    setConfig((previous) => ({
      ...previous,
      borderRadius: radius,
    }));
  }, [setConfig]);

  const resetTheme = useCallback(() => {
    // Remove user preferences from localStorage to revert to defaults
    localStorage.removeItem("theme-config");
    setConfig(defaultThemeConfig);
  }, [setConfig]);

  // Keyboard shortcuts for theme switching
  useHotkeys([
    ["mod+K", () => { setColorMode(config.colorMode === "light" ? "dark" : "light"); }],
    ["mod+Shift+K", () => { setColorMode("auto"); }],
  ]);

  // Get base theme based on component library selection
  const getBaseTheme = () => {
    switch (config.componentLibrary) {
      case 'mantine':
        return mantineTheme
      case 'shadcn':
        return shadcnTheme
      case 'radix':
        return radixTheme
      default:
        return mantineTheme
    }
  }

  // Generate Mantine theme based on current configuration
  const generateMantineTheme = (): MantineThemeOverride => {
    const baseTheme = getBaseTheme()

    return createTheme({
      ...baseTheme,
      primaryColor: config.colorScheme,
      focusRing: "auto",
      defaultRadius: config.borderRadius, // Apply border radius globally
      // NO component-level overrides - handled in theme definitions
    });
  };

  const contextValue: ThemeContextType = useMemo(
    () => ({
      config,
      setComponentLibrary,
      setColorScheme,
      setColorMode,
      setBorderRadius,
      resetTheme,
    }),
    [config, setComponentLibrary, setColorScheme, setColorMode, setBorderRadius, resetTheme]
  );

  const currentMantineTheme = generateMantineTheme();

  // Determine the effective color scheme
  const effectiveColorScheme = config.colorMode === 'auto' ? systemColorMode : config.colorMode;

  return (
    <ThemeContext value={contextValue}>
      <MantineProvider
        theme={currentMantineTheme}
        defaultColorScheme={effectiveColorScheme}
        forceColorScheme={effectiveColorScheme}
      >
        {children}
      </MantineProvider>
    </ThemeContext>
  );
};

// Hook to use theme context
export const useTheme = () => {
  const context = use(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider");
  }
  return context;
};

// Export theme context for use in components
export { ThemeContext };