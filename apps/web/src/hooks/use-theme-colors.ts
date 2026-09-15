/**
 * Theme colors utility hook using shadcn theme system
 * Provides consistent access to shadcn theme colors across light and dark modes
 */

import { detectEntityType, getEntityColor as getTaxonomyColorName } from "@bibgraph/types";
import { useMantineColorScheme, useMantineTheme } from "@mantine/core";
import { useCallback,useMemo } from "react";

import { getAcademicEntityColors } from "@/styles/css-variable-resolver";

const SHADE_LIGHTEST = 0;
const SHADE_LIGHT = 1;
const SHADE_LIGHT_MEDIUM = 2;
const SHADE_MEDIUM_LIGHT = 3;
const SHADE_MEDIUM = 4;
const SHADE_MEDIUM_DARK = 5;
const SHADE_PRIMARY = 6;
const SHADE_DARK = 7;
const SHADE_DARKER = 8;
const SHADE_DARKEST = 9;
const SHADE_DEEPEST = 10;

/**
 * Reads a shade from a Mantine theme color palette, tolerating a palette that isn't registered in the current theme (Mantine's own types claim every palette name is always present, but a custom shadcn-style palette that hasn't been added to the theme config is genuinely absent at runtime) by falling back to the given default
 */
const readShade = (colors: Readonly<Record<string, readonly string[] | undefined>>, colorName: string, shade: number, fallback: string): string =>
  colors[colorName]?.[shade] ?? fallback;

export const useThemeColors = () => {
  const theme = useMantineTheme();
  const { colorScheme } = useMantineColorScheme();

  // Resolve the actual color scheme when colorScheme is 'auto'
  const resolvedColorScheme = useMemo(() => {
    if (colorScheme === "auto") {
      try {
        return window.matchMedia("(prefers-color-scheme: dark)").matches
          ? "dark"
          : "light";
      } catch {
        return "light";
      }
    }
    return colorScheme;
  }, [colorScheme]);

  const isDark = resolvedColorScheme === "dark";

  // Get shadcn academic entity colors
  const shadcnEntityColors = getAcademicEntityColors();

  // Base color utilities - memoized to prevent React 19 infinite loops
  const getColor = useCallback(
    (color: string, shade = SHADE_PRIMARY) => {
      if (color in theme.colors) {
        return theme.colors[color][shade] || color;
      }
      return color;
    },
    [theme.colors],
  );

  // Semantic colors using shadcn theme system - cached to prevent React 19 infinite loops
  const colors = useMemo(
    () => ({
      // Text colors using shadcn semantic colors
      text: {
        primary: isDark ? readShade(theme.colors, "stone", SHADE_LIGHTEST, "#fafaf9") : readShade(theme.colors, "stone", SHADE_DARKEST, "#0c0a09"),
        secondary: isDark ? readShade(theme.colors, "zinc", SHADE_MEDIUM, "#a1a1aa") : readShade(theme.colors, "zinc", SHADE_MEDIUM_DARK, "#71717a"),
        tertiary: isDark ? readShade(theme.colors, "zinc", SHADE_MEDIUM_DARK, "#71717a") : readShade(theme.colors, "zinc", SHADE_MEDIUM, "#a1a1aa"),
        inverse: isDark ? readShade(theme.colors, "stone", SHADE_DARKEST, "#0c0a09") : readShade(theme.colors, "stone", SHADE_LIGHTEST, "#fafaf9"),
      },

      // Background colors using shadcn semantic colors
      background: {
        primary: isDark ? readShade(theme.colors, "slate", SHADE_DEEPEST, "#020617") : readShade(theme.colors, "slate", SHADE_LIGHTEST, "#f8fafc"),
        secondary: isDark ? readShade(theme.colors, "slate", SHADE_DARKEST, "#0f172a") : readShade(theme.colors, "slate", SHADE_LIGHT, "#f1f5f9"),
        tertiary: isDark ? readShade(theme.colors, "slate", SHADE_DARKER, "#1e293b") : readShade(theme.colors, "slate", SHADE_LIGHT_MEDIUM, "#e2e8f0"),
        overlay: isDark ? "rgba(2, 6, 23, 0.8)" : "rgba(248, 250, 252, 0.95)",
        blur: isDark ? "rgba(15, 23, 42, 0.95)" : "rgba(241, 245, 249, 0.95)",
      },

      // Border colors using shadcn semantic colors
      border: {
        primary: isDark ? readShade(theme.colors, "zinc", SHADE_DARKER, "#27272a") : readShade(theme.colors, "zinc", SHADE_LIGHT_MEDIUM, "#e4e4e7"),
        secondary: isDark ? readShade(theme.colors, "zinc", SHADE_DARK, "#3f3f46") : readShade(theme.colors, "zinc", SHADE_MEDIUM_LIGHT, "#d4d4d8"),
      },

      // Semantic colors using shadcn primary/secondary system
      primary: readShade(theme.colors, "stone", SHADE_PRIMARY, "#57534e"),
      secondary: readShade(theme.colors, "zinc", SHADE_PRIMARY, "#52525b"),
      success: readShade(theme.colors, "emerald", SHADE_PRIMARY, "#059669"),
      warning: readShade(theme.colors, "orange", SHADE_PRIMARY, "#ea580c"),
      error: readShade(theme.colors, "red", SHADE_PRIMARY, "#dc2626"),
      info: readShade(theme.colors, "sky", SHADE_PRIMARY, "#0284c7"),

      // Academic entity colors using shadcn palette mapping
      entity: {
        work: getColor(shadcnEntityColors.work, SHADE_PRIMARY),
        author: getColor(shadcnEntityColors.author, SHADE_PRIMARY),
        source: getColor(shadcnEntityColors.source, SHADE_PRIMARY),
        institution: getColor(shadcnEntityColors.institution, SHADE_PRIMARY),
        concept: getColor(shadcnEntityColors.concept, SHADE_PRIMARY),
        topic: getColor(shadcnEntityColors.topic, SHADE_PRIMARY),
        publisher: getColor(shadcnEntityColors.publisher, SHADE_PRIMARY),
        funder: getColor(shadcnEntityColors.funder, SHADE_PRIMARY),
      },

      // Entity to shadcn color name mapping for shade access
      entityColorNames: shadcnEntityColors,
    }),
    [theme.colors, isDark, shadcnEntityColors, getColor],
  );

  // Type guard for valid entity color keys
  const isValidEntityColorKey = useCallback(
    (key: string): key is keyof typeof colors.entity => {
      const validKeys = [
        "work",
        "author",
        "source",
        "institution",
        "concept",
        "topic",
        "publisher",
        "funder",
        // Also support plural forms
        "works",
        "authors",
        "sources",
        "institutions",
        "concepts",
        "topics",
        "publishers",
        "funders",
      ];
      return validKeys.includes(key);
    },
    [], // No dependencies needed - validKeys is static
  );

  // Entity color utilities - memoized to prevent React 19 infinite loops
  const getEntityColor = useCallback(
    (entityType: string | null | undefined): string => {
      // Handle undefined or null entity type
      if (entityType === null || entityType === undefined || entityType === "") {
        return colors.primary;
      }

      // If entityType is already a detected entity type (like "works", "authors", etc.), convert to singular for color mapping
      const normalizedType = entityType.toLowerCase();
      if (isValidEntityColorKey(normalizedType)) {
        // Convert plural to singular for color lookup
        const singularType = normalizedType.replace(/s$/, "");
        if (isValidEntityColorKey(singularType)) {
          return colors.entity[singularType];
        }
      }

      // If it's not a direct match, try to detect it as an OpenAlex ID
      try {
        const detectedType = detectEntityType(entityType);
        if (detectedType) {
          // Convert plural taxonomy key to singular color key
          const singularType = detectedType.replace(/s$/, "");
          if (isValidEntityColorKey(singularType)) {
            return colors.entity[singularType];
          }
        }
      } catch {
        // Ignore detection errors
      }

      return colors.primary;
    },
    [colors, isValidEntityColorKey],
  );

  const getEntityColorShade = useCallback(
    (entityType: string | null | undefined, shade = SHADE_PRIMARY): string => {
      // Handle undefined or null entity type
      if (entityType === null || entityType === undefined || entityType === "") {
        return getColor("blue", shade);
      }

      // If entityType is already a detected entity type, use it directly
      const normalizedType = entityType.toLowerCase();
      if (isValidEntityColorKey(normalizedType)) {
        // Convert plural to singular for color lookup
        const singularType = normalizedType.replace(/s$/, "");
        if (isValidEntityColorKey(singularType)) {
          const colorName = colors.entityColorNames[singularType];
          return getColor(colorName, shade);
        }
      }

      // Fall back to detection if it's an OpenAlex ID
      try {
        const detectedType = detectEntityType(entityType);
        if (detectedType) {
          const taxonomyColorName = getTaxonomyColorName(detectedType);
          // Taxonomy color names directly map to shadcn palette names
          return getColor(taxonomyColorName, shade);
        }
      } catch {
        // Ignore detection errors
      }

      return getColor("blue", shade);
    },
    [colors, getColor, isValidEntityColorKey],
  );

  return {
    colors,
    getColor,
    getEntityColor,
    getEntityColorShade,
    isDark,
    theme,
    resolvedColorScheme,
  };
};
