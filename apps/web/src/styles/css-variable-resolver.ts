import type { ShadcnPalette, ShadcnShade } from './shadcn-colors'
import { shadcnPalettes, shadcnSemanticColors } from './shadcn-colors'

export type ThemeColors = Record<string, string>

export type CSSVariableMapping = Record<string, Record<number, string>>

type ShadcnSemanticKey = keyof typeof shadcnSemanticColors.light

// Hex-alpha suffix maths: the maximum single-byte channel value and the hexadecimal radix used to encode it.
const RGB_CHANNEL_MAX = 255
const HEX_RADIX = 16
const HEX_BYTE_STRING_LENGTH = 2
const HEX_BYTE_PAD_CHAR = '0'

// Each shadcn CSS variable step corresponds to fifty tailwind-style shade units (50, 100, 150, ...).
const SHADE_VARIABLE_STEP = 50

// 1-based shade indices used to pick a representative shade for each semantic variant.
const FILLED_SHADE_NEUTRAL = 8
const FILLED_SHADE_LIGHT_TEXT_PALETTE = 4
const FILLED_SHADE_HIGH_CONTRAST_PALETTE = 6
const FILLED_SHADE_DEFAULT = 5
const FILLED_HOVER_ALPHA = 0.9

const LIGHT_BASE_SHADE = 4
const LIGHT_ALPHA_DARK_MODE = 0.15
const LIGHT_ALPHA_LIGHT_MODE = 0.1
const LIGHT_HOVER_ALPHA_FACTOR = 0.8
const LIGHT_COLOR_SHADE_DARK_MODE = 3
const LIGHT_COLOR_SHADE_LIGHT_MODE = 6

const OUTLINE_SHADE_NEUTRAL = 8
const OUTLINE_SHADE_HIGH_CONTRAST_PALETTE = 6
const OUTLINE_SHADE_DEFAULT = 5

const CONTRAST_SHADE_YELLOW = 6
const CONTRAST_SHADE_GREEN_DARK_MODE = 9
const CONTRAST_SHADE_DEFAULT = 0

// Helper function to create alpha-blended colors
const alpha = (color: string, alphaValue: number): string => {
  return `${color}${Math.round(alphaValue * RGB_CHANNEL_MAX).toString(HEX_RADIX).padStart(HEX_BYTE_STRING_LENGTH, HEX_BYTE_PAD_CHAR)}`
}

// Helper to detect neutral colors
const isNeutralColor = (palette: string): boolean => {
  return ["zinc", "slate", "gray", "neutral", "stone"].includes(palette)
}

const isShadcnPalette = (value: string): value is ShadcnPalette => value in shadcnPalettes

const isValidShadeIndex = (palette: ShadcnPalette, value: number): value is ShadcnShade =>
  Number.isInteger(value) && value >= 0 && value < shadcnPalettes[palette].length

export const resolveSemanticColor = (
  semanticKey: ShadcnSemanticKey,
  mode: 'light' | 'dark'
): string => {
  const colorKey = shadcnSemanticColors[mode][semanticKey]
  const [palette, shadeText] = colorKey.split('.', 2)
  if (!isShadcnPalette(palette)) return ''

  const shadeIndex = Number.parseInt(shadeText)
  if (!isValidShadeIndex(palette, shadeIndex)) return ''

  return shadcnPalettes[palette][shadeIndex]
}

export const generateCSSVariables = (mode: 'light' | 'dark'): ThemeColors => {
  const colors: ThemeColors = {}

  // Generate base palette variables
  for (const [paletteName, shades] of Object.entries(shadcnPalettes)) {
    for (const [shadeIndex, color] of shades.entries()) {
      colors[`--shadcn-${paletteName}-${String((shadeIndex + 1) * SHADE_VARIABLE_STEP)}`] = color
    }
  }

  // Generate semantic variables
  for (const [semanticKey, colorValue] of Object.entries(shadcnSemanticColors[mode])) {
    const [palette, shadeText] = colorValue.split('.', 2)
    if (!isShadcnPalette(palette)) continue

    const shadeIndex = Number.parseInt(shadeText)
    if (!isValidShadeIndex(palette, shadeIndex)) continue

    colors[`--shadcn-${semanticKey}`] = shadcnPalettes[palette][shadeIndex]
  }

  // Generate variant variables (filled, light, outline, contrast) with hover states
  for (const [paletteName, shades] of Object.entries(shadcnPalettes)) {
    // Filled variants
    const filledShade = isNeutralColor(paletteName) ? FILLED_SHADE_NEUTRAL :
                        ["yellow", "lime"].includes(paletteName) ? FILLED_SHADE_LIGHT_TEXT_PALETTE :
                        ["green", "blue"].includes(paletteName) ? FILLED_SHADE_HIGH_CONTRAST_PALETTE : FILLED_SHADE_DEFAULT

    colors[`--shadcn-${paletteName}-filled`] = shades[filledShade - 1]
    colors[`--shadcn-${paletteName}-filled-hover`] = alpha(shades[filledShade - 1], FILLED_HOVER_ALPHA)

    // Light variants with alpha blending
    const lightAlpha = mode === 'dark' ? LIGHT_ALPHA_DARK_MODE : LIGHT_ALPHA_LIGHT_MODE
    colors[`--shadcn-${paletteName}-light`] = alpha(shades[LIGHT_BASE_SHADE - 1], lightAlpha)
    colors[`--shadcn-${paletteName}-light-hover`] = alpha(shades[LIGHT_BASE_SHADE - 1], lightAlpha * LIGHT_HOVER_ALPHA_FACTOR)

    const lightColorShade = mode === 'dark' ? LIGHT_COLOR_SHADE_DARK_MODE : LIGHT_COLOR_SHADE_LIGHT_MODE
    colors[`--shadcn-${paletteName}-light-color`] = shades[lightColorShade - 1]

    // Outline variants
    const outlineShade = isNeutralColor(paletteName) ? OUTLINE_SHADE_NEUTRAL :
                        mode === 'dark' ?
                          (["orange", "indigo", "violet", "purple", "fuchsia", "pink"].includes(paletteName) ? OUTLINE_SHADE_HIGH_CONTRAST_PALETTE : OUTLINE_SHADE_DEFAULT) :
                          (["green", "blue"].includes(paletteName) ? OUTLINE_SHADE_HIGH_CONTRAST_PALETTE : OUTLINE_SHADE_DEFAULT)

    colors[`--shadcn-${paletteName}-outline`] = shades[outlineShade - 1]
    colors[`--shadcn-${paletteName}-outline-hover`] = alpha(shades[LIGHT_BASE_SHADE - 1], mode === 'dark' ? LIGHT_ALPHA_DARK_MODE : LIGHT_ALPHA_LIGHT_MODE)

    // Contrast variants
    const contrastMap: Record<string, number> = {
      zinc: CONTRAST_SHADE_DEFAULT, slate: CONTRAST_SHADE_DEFAULT, gray: CONTRAST_SHADE_DEFAULT, neutral: CONTRAST_SHADE_DEFAULT, stone: CONTRAST_SHADE_DEFAULT,
      red: CONTRAST_SHADE_DEFAULT, rose: CONTRAST_SHADE_DEFAULT,
      orange: CONTRAST_SHADE_DEFAULT, amber: CONTRAST_SHADE_DEFAULT, lime: CONTRAST_SHADE_DEFAULT, emerald: CONTRAST_SHADE_DEFAULT, teal: CONTRAST_SHADE_DEFAULT, cyan: CONTRAST_SHADE_DEFAULT, sky: CONTRAST_SHADE_DEFAULT, indigo: CONTRAST_SHADE_DEFAULT, fuchsia: CONTRAST_SHADE_DEFAULT, purple: CONTRAST_SHADE_DEFAULT, pink: CONTRAST_SHADE_DEFAULT,
      yellow: CONTRAST_SHADE_YELLOW, green: mode === 'light' ? CONTRAST_SHADE_DEFAULT : CONTRAST_SHADE_GREEN_DARK_MODE, blue: CONTRAST_SHADE_DEFAULT
    }

    colors[`--shadcn-${paletteName}-contrast`] = shades[contrastMap[paletteName] || 0]
  }

  return colors
}

export const generateMantineColors = (): Record<string, string[]> => {
  return Object.fromEntries(
    Object.entries(shadcnPalettes).map(([paletteName, shades]) => [
      paletteName,
      [...shades] // Convert readonly tuple to mutable array
    ])
  )
}

export const resolveThemeVariable = (
  palette: ShadcnPalette,
  shade: ShadcnShade
): string => {
  return `var(--shadcn-${palette}-${String((shade + 1) * SHADE_VARIABLE_STEP)})`
}

export const resolveCSSVariable = (variableName: string): string => {
  return `var(--shadcn-${variableName})`
}

// Enhanced resolver for variant access
export const resolveVariantVariable = (
  palette: ShadcnPalette,
  variant: 'filled' | 'light' | 'outline' | 'contrast',
  hover?: boolean
): string => {
  const hoverSuffix = hover === true ? '-hover' : ''
  return `var(--shadcn-${palette}-${variant}${hoverSuffix})`
}

export const createCSSVariableString = (mode: 'light' | 'dark'): string => {
  const variables = generateCSSVariables(mode)
  return Object.entries(variables)
    .map(([key, value]) => `${key}: ${value};`)
    .join('\n  ')
}

export const getAcademicEntityColors = () => ({
  work: 'blue',
  author: 'green',
  source: 'violet',
  institution: 'orange',
  concept: 'pink',
  topic: 'red',
  publisher: 'teal',
  funder: 'cyan',
  keyword: 'zinc'
})
