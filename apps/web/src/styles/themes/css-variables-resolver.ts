import type { CSSVariablesResolver } from "@mantine/core";

/**
 * Mantine's default dimmed text colour (gray 6 in light, dark 2 in dark) falls below the WCAG AA 4.5:1 ratio for normal text on the app's surfaces. These shades are the lightest and darkest steps of the default palettes that clear it on the body and card backgrounds.
 */
export const DIMMED_COLOR_LIGHT = "var(--mantine-color-gray-7)";
export const DIMMED_COLOR_DARK = "var(--mantine-color-dark-1)";

export const bibgraphCssVariablesResolver: CSSVariablesResolver = () => ({
  variables: {},
  light: { "--mantine-color-dimmed": DIMMED_COLOR_LIGHT },
  dark: { "--mantine-color-dimmed": DIMMED_COLOR_DARK },
});
