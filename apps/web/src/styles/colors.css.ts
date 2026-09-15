import { componentLibraries } from "./component-libraries.css";
import { type ShadcnPalette,shadcnPalettes } from './shadcn-colors';
import type { ColorScheme } from "./theme-contracts";

// Both palette dictionaries below only ever hold resolved light/dark values - "auto" is a UI-facing preference that callers must resolve to one of these before reaching this module.
type ResolvedColorMode = 'light' | 'dark'

// Helper function to create color scheme from shadcn palette
const createColorScheme = (palette: ShadcnPalette) => ({
  light: {
    primary: shadcnPalettes[palette][6], // Use shade 6 as primary
    primaryHover: shadcnPalettes[palette][7], // Use shade 7 as hover
    primaryLight: shadcnPalettes[palette][4], // Use shade 4 as light
    background: "#ffffff",
    backgroundHover: "#f8f9fa",
    surface: "#ffffff",
    border: "#dee2e6",
    text: "#212529",
    textSecondary: "#495057",
    textMuted: "#868e96",
    card: "#ffffff",
    input: "#ffffff",
    button: shadcnPalettes[palette][6],
    buttonHover: shadcnPalettes[palette][7],
  },
  dark: {
    primary: shadcnPalettes[palette][5], // Use shade 5 as primary in dark
    primaryHover: shadcnPalettes[palette][6], // Use shade 6 as hover in dark
    primaryLight: shadcnPalettes[palette][4], // Use shade 4 as light in dark
    background: "#1a1b1e",
    backgroundHover: "#25262b",
    surface: "#2c2e33",
    border: "#373a40",
    text: "#ffffff",
    textSecondary: "#adb5bd",
    textMuted: "#868e96",
    card: "#25262b",
    input: "#1a1b1e",
    button: shadcnPalettes[palette][5],
    buttonHover: shadcnPalettes[palette][6],
  },
});

// Create color schemes for all shadcn palettes
const colorSchemes = {
  zinc: createColorScheme('zinc'),
  slate: createColorScheme('slate'),
  stone: createColorScheme('stone'),
  red: createColorScheme('red'),
  orange: createColorScheme('orange'),
  amber: createColorScheme('amber'),
  yellow: createColorScheme('yellow'),
  lime: createColorScheme('lime'),
  green: createColorScheme('green'),
  emerald: createColorScheme('emerald'),
  teal: createColorScheme('teal'),
  cyan: createColorScheme('cyan'),
  sky: createColorScheme('sky'),
  blue: createColorScheme('blue'),
  indigo: createColorScheme('indigo'),
  violet: createColorScheme('violet'),
  purple: createColorScheme('purple'),
  fuchsia: createColorScheme('fuchsia'),
  pink: createColorScheme('pink'),
  rose: createColorScheme('rose'),
} as const;

// Export color scheme function to get colors by scheme and mode
export const getColorScheme = (scheme: ColorScheme, mode: ResolvedColorMode) => colorSchemes[scheme][mode];

// Helper function to get colors by scheme and mode
export const getColorThemeTokens = (scheme: ColorScheme, mode: ResolvedColorMode) => {
  const colors = getColorScheme(scheme, mode);
  const mantineTokens = componentLibraries.mantine; // Use mantine tokens for spacing/borders/shadows

  return {
    colors,
    spacing: mantineTokens.spacing,
    borders: mantineTokens.borders,
    shadows: mantineTokens.shadows,
  };
};