// @vitest-environment jsdom

import type { MantineColorScheme, MantineTheme } from "@mantine/core";
import {
  useMantineColorScheme,
  useMantineTheme,
} from "@mantine/core";
import { renderHook } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useThemeColors } from "./use-theme-colors";

// Mock the Mantine hooks
vi.mock("@mantine/core", async () => {
  const actual = await vi.importActual("@mantine/core");
  return {
    ...actual,
    useMantineColorScheme: vi.fn(),
    useMantineTheme: vi.fn(),
  };
});

/**
 * Builds a fully-typed `useMantineColorScheme` mock return value so mock action handlers satisfy their real `() => void` / `(value: MantineColorScheme) => void` signatures
 */
const createColorSchemeMock = (colorScheme: MantineColorScheme) => ({
  colorScheme,
  setColorScheme: vi.fn<(value: MantineColorScheme) => void>(),
  toggleColorScheme: vi.fn<() => void>(),
  clearColorScheme: vi.fn<() => void>(),
});

const TEST_SHADE_3 = 3;
const TEST_SHADE_4 = 4;
const TEST_SHADE_7 = 7;
const TEST_SHADE_OUT_OF_RANGE = 15;

describe("useThemeColors", () => {
  let mockTheme: Partial<MantineTheme>;
  let mockMatchMedia: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    // Setup mock theme with all required color palettes
    mockTheme = {
      colors: {
        blue: [
          "#e7f5ff",
          "#d0ebff",
          "#a5d8ff",
          "#74c0fc",
          "#339af0",
          "#228be6",
          "#1c7ed6",
          "#1971c2",
          "#1864ab",
          "#0b5394",
        ],
        gray: [
          "#f8f9fa",
          "#f1f3f4",
          "#e9ecef",
          "#dee2e6",
          "#ced4da",
          "#adb5bd",
          "#6c757d",
          "#495057",
          "#343a40",
          "#212529",
        ],
        green: [
          "#ebfbee",
          "#d3f9d8",
          "#b2f2bb",
          "#8ce99a",
          "#69db7c",
          "#51cf66",
          "#40c057",
          "#37b24d",
          "#2f9e44",
          "#2b8a3e",
        ],
        yellow: [
          "#fff9db",
          "#fff3bf",
          "#ffec99",
          "#ffe066",
          "#ffd43b",
          "#fcc419",
          "#fab005",
          "#f59f00",
          "#f08c00",
          "#e67700",
        ],
        red: [
          "#fff5f5",
          "#ffe3e3",
          "#ffc9c9",
          "#ffa8a8",
          "#ff8787",
          "#ff6b6b",
          "#fa5252",
          "#f03e3e",
          "#e03131",
          "#c92a2a",
        ],
        cyan: [
          "#e3fafc",
          "#c5f6fa",
          "#99e9f2",
          "#66d9ef",
          "#3bc9db",
          "#22b8cf",
          "#15aabf",
          "#1098ad",
          "#0c8599",
          "#0b7285",
        ],
        pink: [
          "#fff0f6",
          "#ffdeeb",
          "#fcc2d7",
          "#faa2c1",
          "#f783ac",
          "#f06595",
          "#e64980",
          "#d6336c",
          "#c2255c",
          "#a61e4d",
        ],
        lime: [
          "#F4FCE3",
          "#E9F8D0",
          "#D4F0A0",
          "#B8E745",
          "#A3E635",
          "#84CC16",
          "#65A30D",
          "#4D7C0F",
          "#3F6212",
          "#365314",
        ],
        orange: [
          "#FFF7ED",
          "#FFEDD5",
          "#FED7AA",
          "#FD9A52",
          "#FB7C23",
          "#EA580C",
          "#C2410C",
          "#9A3412",
          "#7C2D12",
          "#431407",
        ],
        teal: [
          "#F0FDFA",
          "#CCFBF1",
          "#99F6E4",
          "#5EEAD4",
          "#2DD4BF",
          "#14B8A6",
          "#0F766E",
          "#115E59",
          "#134E4A",
          "#042F2E",
        ],
        dark: [
          "#C1C2C5",
          "#A6A7AB",
          "#909296",
          "#5C5F66",
          "#373A40",
          "#2C2E33",
          "#25262B",
          "#1A1B1E",
          "#141517",
          "#101113",
        ],
        grape: [
          "#F8F0FC",
          "#F3D9FA",
          "#EEBEFA",
          "#E599F7",
          "#DA77F2",
          "#CC5DE8",
          "#BE4BDB",
          "#AE3EC9",
          "#9C36B5",
          "#862E9C",
        ],
        violet: [
          "#F3F0FF",
          "#E5DBFF",
          "#D0BFFF",
          "#B197FC",
          "#9775FA",
          "#845EF7",
          "#7950F2",
          "#7048E8",
          "#6741D9",
          "#5F3DC4",
        ],
        indigo: [
          "#EDF2FF",
          "#DBE4FF",
          "#BAC8FF",
          "#91A7FF",
          "#748FFC",
          "#5C7CFA",
          "#4C6EF5",
          "#4263EB",
          "#3B5BDB",
          "#364FC7",
        ],
        purple: [
          "#FAF5FF",
          "#F3E8FF",
          "#E9D5FF",
          "#D8B4FE",
          "#C084FC",
          "#A855F7",
          "#9333EA",
          "#7C3AED",
          "#6D28D9",
          "#581C87",
        ],
        stone: [
          "#fafaf9",
          "#f5f5f4",
          "#e7e5e4",
          "#d6d3d1",
          "#a8a29e",
          "#78716c",
          "#57534e",
          "#44403c",
          "#292524",
          "#1c1917",
        ],
        zinc: [
          "#fafafa",
          "#f4f4f5",
          "#e4e4e7",
          "#d4d4d8",
          "#a1a1aa",
          "#71717a",
          "#52525b",
          "#3f3f46",
          "#27272a",
          "#18181b",
        ],
        // Custom entity colors
        author: [
          "#e7fcf0",
          "#d3f9d8",
          "#b2f2bb",
          "#8ce99a",
          "#69db7c",
          "#51cf66",
          "#40c057",
          "#37b24d",
          "#2f9e44",
          "#2b8a3e",
        ],
        source: [
          "#f3e8ff",
          "#e9d5ff",
          "#d8b4fe",
          "#c084fc",
          "#a855f7",
          "#9333ea",
          "#7c3aed",
          "#6d28d9",
          "#5b21b6",
          "#4c1d95",
        ],
        institution: [
          "#fffbeb",
          "#fef3c7",
          "#fed7aa",
          "#fdba74",
          "#fb923c",
          "#f97316",
          "#ea580c",
          "#dc2626",
          "#c2410c",
          "#9a3412",
        ],
      },
    };

    // Setup window.matchMedia mock
    mockMatchMedia = vi.fn();
    Object.defineProperty(window, "matchMedia", {
      writable: true,
      value: mockMatchMedia,
    });

    // Setup default mocks
    vi.mocked(useMantineTheme).mockReturnValue(mockTheme as MantineTheme);
    vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("light"));

    // Default matchMedia to light mode
    mockMatchMedia.mockReturnValue({
      matches: false,
      addEventListener: vi.fn(),
      removeEventListener: vi.fn(),
    });
  });

  describe("basic functionality", () => {
    it("should return all expected properties", () => {
      const { result } = renderHook(() => useThemeColors());

      expect(result.current.colors).toBeDefined();
      expect(result.current.getColor).toBeInstanceOf(Function);
      expect(result.current.getEntityColor).toBeInstanceOf(Function);
      expect(result.current.getEntityColorShade).toBeInstanceOf(Function);
      expect(typeof result.current.isDark).toBe("boolean");
      expect(result.current.theme).toBeDefined();
    });

    it("should correctly detect light mode", () => {
      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("light"));

      const { result } = renderHook(() => useThemeColors());

      expect(result.current.isDark).toBe(false);
    });

    it("should correctly detect dark mode", () => {
      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("dark"));

      const { result } = renderHook(() => useThemeColors());

      expect(result.current.isDark).toBe(true);
    });
  });

  describe("auto color scheme detection", () => {
    it("should resolve auto to light when system prefers light", () => {
      mockMatchMedia.mockReturnValue({
        matches: false, // prefers-color-scheme: dark is false
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("auto"));

      const { result } = renderHook(() => useThemeColors());

      expect(result.current.isDark).toBe(false);
    });

    it("should resolve auto to dark when system prefers dark", () => {
      mockMatchMedia.mockReturnValue({
        matches: true, // prefers-color-scheme: dark is true
        addEventListener: vi.fn(),
        removeEventListener: vi.fn(),
      });

      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("auto"));

      const { result } = renderHook(() => useThemeColors());

      expect(result.current.isDark).toBe(true);
    });
  });

  describe("color structure in light mode", () => {
    beforeEach(() => {
      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("light"));
    });

    it("should provide correct text colors for light mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // text.primary uses stone[9] from mockTheme
      expect(result.current.colors.text.primary).toBe(
        mockTheme.colors!.stone[9],
      );
      // text.secondary uses zinc[5] from mockTheme
      expect(result.current.colors.text.secondary).toBe(
        mockTheme.colors!.zinc[5],
      );
      // text.tertiary uses zinc[4] from mockTheme
      expect(result.current.colors.text.tertiary).toBe(
        mockTheme.colors!.zinc[4],
      );
      // text.inverse uses stone[0] from mockTheme
      expect(result.current.colors.text.inverse).toBe(
        mockTheme.colors!.stone[0],
      );
    });

    it("should provide correct background colors for light mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // background.primary uses slate[0] fallback (no slate in mockTheme)
      expect(result.current.colors.background.primary).toBe(
        "#f8fafc",
      );
      // background.secondary uses slate[1] fallback (no slate in mockTheme)
      expect(result.current.colors.background.secondary).toBe(
        "#f1f5f9",
      );
      // background.tertiary uses slate[2] fallback (no slate in mockTheme)
      expect(result.current.colors.background.tertiary).toBe(
        "#e2e8f0",
      );
      expect(result.current.colors.background.overlay).toBe(
        "rgba(248, 250, 252, 0.95)",
      );
      expect(result.current.colors.background.blur).toBe(
        "rgba(241, 245, 249, 0.95)",
      );
    });

    it("should provide correct border colors for light mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // border.primary uses zinc[2] from mockTheme
      expect(result.current.colors.border.primary).toBe(
        mockTheme.colors!.zinc[2],
      );
      // border.secondary uses zinc[3] from mockTheme
      expect(result.current.colors.border.secondary).toBe(
        mockTheme.colors!.zinc[3],
      );
    });
  });

  describe("color structure in dark mode", () => {
    beforeEach(() => {
      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("dark"));
    });

    it("should provide correct text colors for dark mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // text.primary uses stone[0] from mockTheme
      expect(result.current.colors.text.primary).toBe(
        mockTheme.colors!.stone[0],
      );
      // text.secondary uses zinc[4] from mockTheme
      expect(result.current.colors.text.secondary).toBe(
        mockTheme.colors!.zinc[4],
      );
      // text.tertiary uses zinc[5] from mockTheme
      expect(result.current.colors.text.tertiary).toBe(
        mockTheme.colors!.zinc[5],
      );
      // text.inverse uses stone[9] from mockTheme
      expect(result.current.colors.text.inverse).toBe(
        mockTheme.colors!.stone[9],
      );
    });

    it("should provide correct background colors for dark mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // background.primary uses slate[10] fallback (no slate in mockTheme)
      expect(result.current.colors.background.primary).toBe(
        "#020617",
      );
      // background.secondary uses slate[9] fallback (no slate in mockTheme)
      expect(result.current.colors.background.secondary).toBe(
        "#0f172a",
      );
      // background.tertiary uses slate[8] fallback (no slate in mockTheme)
      expect(result.current.colors.background.tertiary).toBe(
        "#1e293b",
      );
      expect(result.current.colors.background.overlay).toBe(
        "rgba(2, 6, 23, 0.8)",
      );
      expect(result.current.colors.background.blur).toBe(
        "rgba(15, 23, 42, 0.95)",
      );
    });

    it("should provide correct border colors for dark mode", () => {
      const { result } = renderHook(() => useThemeColors());

      // border.primary uses zinc[8] from mockTheme
      expect(result.current.colors.border.primary).toBe(
        mockTheme.colors!.zinc[8],
      );
      // border.secondary uses zinc[7] from mockTheme
      expect(result.current.colors.border.secondary).toBe(
        mockTheme.colors!.zinc[7],
      );
    });
  });

  describe("semantic colors", () => {
    it("should provide consistent semantic colors with fallbacks", () => {
      const { result } = renderHook(() => useThemeColors());

      // Implementation uses different color palettes that may not be in mockTheme
      // primary uses stone[6], success uses emerald[6], warning uses orange[6],
      // error uses red[6], info uses sky[6]
      // When palettes are missing, it falls back to hardcoded values
      expect(result.current.colors.primary).toBe(mockTheme.colors!.stone[6]);
      expect(result.current.colors.success).toBe("#059669"); // emerald fallback
      expect(result.current.colors.warning).toBe(mockTheme.colors!.orange[6]);
      expect(result.current.colors.error).toBe(mockTheme.colors!.red[6]);
      expect(result.current.colors.info).toBe("#0284c7"); // sky fallback
    });

    it("should fallback to hardcoded colors when theme colors are missing", () => {
      // Remove colors from theme by setting them to empty arrays
      const themeWithoutColors = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          stone: [] as unknown as string[],
          orange: [] as unknown as string[],
          red: [] as unknown as string[],
        },
      };

      vi.mocked(useMantineTheme).mockReturnValue(
        themeWithoutColors as unknown as MantineTheme,
      );

      const { result } = renderHook(() => useThemeColors());

      expect(result.current.colors.primary).toBe("#57534e"); // stone fallback
      expect(result.current.colors.success).toBe("#059669"); // emerald fallback
      expect(result.current.colors.warning).toBe("#ea580c"); // orange fallback
      expect(result.current.colors.error).toBe("#dc2626"); // red fallback
      expect(result.current.colors.info).toBe("#0284c7"); // sky fallback
    });
  });

  describe("entity colors", () => {
    it("should provide all entity colors", () => {
      const { result } = renderHook(() => useThemeColors());

      // Implementation uses shade 6 as default for entity colors
      expect(result.current.colors.entity.work).toBe(mockTheme.colors!.blue[6]);
      expect(result.current.colors.entity.author).toBe(
        mockTheme.colors!.green[6],
      );
      expect(result.current.colors.entity.source).toBe(
        mockTheme.colors!.violet[6],
      );
      expect(result.current.colors.entity.institution).toBe(
        mockTheme.colors!.orange[6],
      );
      expect(result.current.colors.entity.concept).toBe(
        mockTheme.colors!.pink[6],
      );
      expect(result.current.colors.entity.topic).toBe(mockTheme.colors!.red[6]);
      expect(result.current.colors.entity.publisher).toBe(
        mockTheme.colors!.teal[6],
      );
      expect(result.current.colors.entity.funder).toBe(
        mockTheme.colors!.cyan[6],
      );
    });

    it("should fallback to color name when mapped palette is missing", () => {
      // Entity colors use shadcn palette names: author → green, source → violet, institution → orange
      // When the mapped palette is empty, getColor returns the color name string
      const themeWithoutMappedPalettes = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          green: [] as unknown as string[],
          violet: [] as unknown as string[],
          orange: [] as unknown as string[],
        },
      };

      vi.mocked(useMantineTheme).mockReturnValue(
        themeWithoutMappedPalettes as unknown as MantineTheme,
      );

      const { result } = renderHook(() => useThemeColors());

      // When palette is empty, getColor returns the color name as fallback
      expect(result.current.colors.entity.author).toBe("green");
      expect(result.current.colors.entity.source).toBe("violet");
      expect(result.current.colors.entity.institution).toBe("orange");
    });
  });

  describe("getColor function", () => {
    it("should return color at default shade 6", () => {
      const { result } = renderHook(() => useThemeColors());

      const blueColor = result.current.getColor("blue");
      expect(blueColor).toBe(mockTheme.colors!.blue[6]);
    });

    it("should return color at specified shade", () => {
      const { result } = renderHook(() => useThemeColors());

      const blueColor3 = result.current.getColor("blue", TEST_SHADE_3);
      expect(blueColor3).toBe(mockTheme.colors!.blue[3]);
    });

    it("should fallback to the color name if shade doesn't exist", () => {
      const { result } = renderHook(() => useThemeColors());

      const invalidColor = result.current.getColor("nonexistent");
      expect(invalidColor).toBe("nonexistent");
    });

    it("should handle missing color array gracefully", () => {
      const themeWithMissingColor = {
        ...mockTheme,
        colors: {
          ...mockTheme.colors,
          purple: [] as readonly string[],
        },
      };

      vi.mocked(useMantineTheme).mockReturnValue(
        themeWithMissingColor as unknown as MantineTheme,
      );

      const { result } = renderHook(() => useThemeColors());

      const purpleColor = result.current.getColor("purple");
      expect(purpleColor).toBe("purple");
    });
  });

  describe("getEntityColor function", () => {
    it("should return correct colors for valid entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      // Implementation uses shade 6 as default
      expect(result.current.getEntityColor("work")).toBe(
        mockTheme.colors!.blue[6],
      );
      expect(result.current.getEntityColor("author")).toBe(
        mockTheme.colors!.green[6],
      );
      expect(result.current.getEntityColor("source")).toBe(
        mockTheme.colors!.violet[6],
      );
      expect(result.current.getEntityColor("institution")).toBe(
        mockTheme.colors!.orange[6],
      );
      expect(result.current.getEntityColor("concept")).toBe(
        mockTheme.colors!.pink[6],
      );
      expect(result.current.getEntityColor("topic")).toBe(
        mockTheme.colors!.red[6],
      );
      expect(result.current.getEntityColor("publisher")).toBe(
        mockTheme.colors!.teal[6],
      );
      expect(result.current.getEntityColor("funder")).toBe(
        mockTheme.colors!.cyan[6],
      );
    });

    it("should handle case insensitive entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      expect(result.current.getEntityColor("WORK")).toBe(
        mockTheme.colors!.blue[6],
      );
      expect(result.current.getEntityColor("Author")).toBe(
        mockTheme.colors!.green[6],
      );
      expect(result.current.getEntityColor("SOURCE")).toBe(
        mockTheme.colors!.violet[6],
      );
    });

    it("should fallback to primary color for unknown entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      // Primary color is stone[6] in the implementation
      expect(result.current.getEntityColor("unknown")).toBe(
        mockTheme.colors!.stone[6],
      );
      expect(result.current.getEntityColor("invalid")).toBe(
        mockTheme.colors!.stone[6],
      );
      expect(result.current.getEntityColor("")).toBe(mockTheme.colors!.stone[6]);
    });
  });

  describe("getEntityColorShade function", () => {
    it("should return correct colors at default shade 6", () => {
      const { result } = renderHook(() => useThemeColors());

      // Implementation uses shade 6 as default
      expect(result.current.getEntityColorShade("work")).toBe(
        mockTheme.colors!.blue[6],
      );
      expect(result.current.getEntityColorShade("author")).toBe(
        mockTheme.colors!.green[6],
      );
    });

    it("should return correct colors at specified shade", () => {
      const { result } = renderHook(() => useThemeColors());

      expect(result.current.getEntityColorShade("work", TEST_SHADE_3)).toBe(
        mockTheme.colors!.blue[3],
      );
      expect(result.current.getEntityColorShade("author", TEST_SHADE_7)).toBe(
        mockTheme.colors!.green[7],
      );
    });

    it("should handle plural entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      // Implementation uses shade 6 as default
      expect(result.current.getEntityColorShade("works")).toBe(
        mockTheme.colors!.blue[6],
      );
      expect(result.current.getEntityColorShade("authors")).toBe(
        mockTheme.colors!.green[6],
      );
      expect(result.current.getEntityColorShade("sources")).toBe(
        mockTheme.colors!.violet[6],
      );
      expect(result.current.getEntityColorShade("institutions")).toBe(
        mockTheme.colors!.orange[6],
      );
      expect(result.current.getEntityColorShade("concepts")).toBe(
        mockTheme.colors!.pink[6],
      );
      expect(result.current.getEntityColorShade("topics")).toBe(
        mockTheme.colors!.red[6],
      );
      expect(result.current.getEntityColorShade("publishers")).toBe(
        mockTheme.colors!.teal[6],
      );
      expect(result.current.getEntityColorShade("funders")).toBe(
        mockTheme.colors!.cyan[6],
      );
    });

    it("should handle case insensitive entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      expect(result.current.getEntityColorShade("WORKS", 2)).toBe(
        mockTheme.colors!.blue[2],
      );
      expect(result.current.getEntityColorShade("Authors", TEST_SHADE_4)).toBe(
        mockTheme.colors!.green[4],
      );
    });

    it("should fallback to blue for unknown entity types", () => {
      const { result } = renderHook(() => useThemeColors());

      // Default shade is 6, and fallback color is blue
      expect(result.current.getEntityColorShade("unknown")).toBe(
        mockTheme.colors!.blue[6],
      );
      expect(result.current.getEntityColorShade("invalid", TEST_SHADE_3)).toBe(
        mockTheme.colors!.blue[3],
      );
    });
  });

  describe("theme object access", () => {
    it("should provide access to the Mantine theme object", () => {
      const { result } = renderHook(() => useThemeColors());

      expect(result.current.theme).toBe(mockTheme);
      expect(result.current.theme.colors).toBeDefined();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle empty entity type strings", () => {
      const { result } = renderHook(() => useThemeColors());

      // Empty string returns primary color from getEntityColor
      const emptyColor = result.current.getEntityColor("");
      expect(emptyColor).toBe(mockTheme.colors!.stone[6]); // Primary color

      // Empty string returns blue[6] from getEntityColorShade (fallback)
      expect(result.current.getEntityColorShade("")).toBe(mockTheme.colors!.blue[6]);
    });

    it("should handle missing matchMedia gracefully", () => {
      // Set matchMedia to throw an error
      Object.defineProperty(window, "matchMedia", {
        value: vi.fn(() => {
          throw new Error("matchMedia not supported");
        }),
        writable: true,
      });

      vi.mocked(useMantineColorScheme).mockReturnValue(createColorSchemeMock("auto"));

      // Should fall back to light mode when matchMedia fails
      const { result } = renderHook(() => useThemeColors());
      expect(result.current.isDark).toBe(false);
    });

    it("should handle very high shade numbers gracefully", () => {
      const { result } = renderHook(() => useThemeColors());

      // Shade 15 doesn't exist, should fallback to color name
      const highShade = result.current.getColor("blue", TEST_SHADE_OUT_OF_RANGE);
      expect(highShade).toBe("blue");
    });
  });
});
