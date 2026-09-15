import type { MantineColorsTuple } from '@mantine/core'
import { rem } from '@mantine/core'

import { generateMantineColors } from '../css-variable-resolver'

const shadcnColors = generateMantineColors()

// Convert shadcn palettes to MantineColorsTuple format
const createMantineColorTuple = (colors: readonly string[]): MantineColorsTuple => [
  colors[0], colors[1], colors[2], colors[3], colors[4],
  colors[5], colors[6], colors[7], colors[8], colors[9], colors[10]
]

// Shared foundation colors - used by all themes
export const foundationColors = {
  // All shadcn color palettes
  zinc: createMantineColorTuple(shadcnColors.zinc),
  slate: createMantineColorTuple(shadcnColors.slate),
  stone: createMantineColorTuple(shadcnColors.stone),
  red: createMantineColorTuple(shadcnColors.red),
  orange: createMantineColorTuple(shadcnColors.orange),
  amber: createMantineColorTuple(shadcnColors.amber),
  yellow: createMantineColorTuple(shadcnColors.yellow),
  lime: createMantineColorTuple(shadcnColors.lime),
  green: createMantineColorTuple(shadcnColors.green),
  emerald: createMantineColorTuple(shadcnColors.emerald),
  teal: createMantineColorTuple(shadcnColors.teal),
  cyan: createMantineColorTuple(shadcnColors.cyan),
  sky: createMantineColorTuple(shadcnColors.sky),
  blue: createMantineColorTuple(shadcnColors.blue),
  indigo: createMantineColorTuple(shadcnColors.indigo),
  violet: createMantineColorTuple(shadcnColors.violet),
  purple: createMantineColorTuple(shadcnColors.purple),
  fuchsia: createMantineColorTuple(shadcnColors.fuchsia),
  pink: createMantineColorTuple(shadcnColors.pink),
  rose: createMantineColorTuple(shadcnColors.rose),

  // Semantic colors with shadcn mappings
  primary: createMantineColorTuple(shadcnColors.stone),
  secondary: createMantineColorTuple(shadcnColors.zinc),
  accent: createMantineColorTuple(shadcnColors.zinc),
  neutral: createMantineColorTuple(shadcnColors.zinc),
  destructive: createMantineColorTuple(shadcnColors.red),
  success: createMantineColorTuple(shadcnColors.green),
  warning: createMantineColorTuple(shadcnColors.orange),
  info: createMantineColorTuple(shadcnColors.blue),

  // Academic entity colors
  work: createMantineColorTuple(shadcnColors.blue),
  author: createMantineColorTuple(shadcnColors.green),
  source: createMantineColorTuple(shadcnColors.violet),
  institution: createMantineColorTuple(shadcnColors.orange),
  concept: createMantineColorTuple(shadcnColors.pink),
  topic: createMantineColorTuple(shadcnColors.red),
  publisher: createMantineColorTuple(shadcnColors.teal),
  funder: createMantineColorTuple(shadcnColors.cyan),
  keyword: createMantineColorTuple(shadcnColors.zinc),
}

// Shared foundation settings
export const foundationSettings = {
  primaryColor: 'stone' as const,
  defaultRadius: 'sm' as const,
  focusRing: 'never' as const,
  autoContrast: true,
  luminanceThreshold: 0.3,
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  fontFamilyMonospace: 'JetBrains Mono, Fira Code, Consolas, monospace',
  cursorType: 'pointer' as const,

  radius: {
    xs: rem('2px'),    // rounded-sm (Tailwind)
    sm: rem('4px'),    // rounded (Tailwind default)
    md: rem('6px'),    // rounded-md
    lg: rem('8px'),    // rounded-lg
    xl: rem('12px'),   // rounded-xl
    '2xl': rem('16px'), // rounded-2xl
    '3xl': rem('24px'), // rounded-3xl
    full: '9999px',   // rounded-full
  },

  spacing: {
    '4xs': rem('2px'),
    '3xs': rem('4px'),
    '2xs': rem('8px'),
    xs: rem('10px'),
    sm: rem('12px'),
    md: rem('16px'),
    lg: rem('20px'),
    xl: rem('24px'),
    '2xl': rem('28px'),
    '3xl': rem('32px'),
    '4xl': rem('40px'),
  },

  fontSizes: {
    xs: rem('12px'),   // text-xs
    sm: rem('13px'),   // text-sm (shadcn default)
    md: rem('14px'),   // text-base (shadcn default)
    lg: rem('16px'),   // text-lg
    xl: rem('18px'),   // text-xl
    '2xl': rem('20px'), // text-2xl
    '3xl': rem('24px'), // text-3xl
    '4xl': rem('30px'), // text-4xl
    '5xl': rem('36px'), // text-5xl
    '6xl': rem('48px'), // text-6xl (shadcn hero text)
    '7xl': rem('56px'), // text-7xl
    '8xl': rem('64px'), // text-8xl
    '9xl': rem('72px'), // text-9xl
  },

  lineHeights: {
    xs: '1.25',      // text-xs
    sm: '1.4',       // text-sm
    md: '1.5',       // text-base (shadcn default)
    lg: '1.5',       // text-lg
    xl: '1.5',       // text-xl
    '2xl': '1.5',    // text-2xl
    '3xl': '1.25',    // text-3xl
    '4xl': '1.25',    // text-4xl
    '5xl': '1.25',    // text-5xl
    '6xl': '1.25',    // text-6xl
    '7xl': '1.25',    // text-7xl
    '8xl': '1.25',    // text-8xl
    '9xl': '1.25',    // text-9xl
  },

  headings: {
    fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
    fontWeight: '600',
    sizes: {
      h1: { fontSize: rem('32px'), lineHeight: '1.25', fontWeight: '800' }, // text-4xl font-extrabold
      h2: { fontSize: rem('24px'), lineHeight: '1.25', fontWeight: '700' }, // text-3xl font-bold
      h3: { fontSize: rem('20px'), lineHeight: '1.5', fontWeight: '600' },  // text-xl font-semibold
      h4: { fontSize: rem('18px'), lineHeight: '1.5', fontWeight: '600' },  // text-lg font-semibold
      h5: { fontSize: rem('16px'), lineHeight: '1.5', fontWeight: '600' },  // text-base font-semibold
      h6: { fontSize: rem('14px'), lineHeight: '1.5', fontWeight: '600' },  // text-sm font-semibold
    },
  },

  shadows: {
    xs: '0 1px 2px rgba(0, 0, 0, 0.05)',
    sm: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)',
    md: '0 4px 6px rgba(0, 0, 0, 0.1), 0 2px 4px rgba(0, 0, 0, 0.06)',
    lg: '0 10px 15px rgba(0, 0, 0, 0.1), 0 4px 6px rgba(0, 0, 0, 0.05)',
    xl: '0 20px 25px rgba(0, 0, 0, 0.1), 0 10px 10px rgba(0, 0, 0, 0.04)',
    xxl: '0 25px 50px rgba(0, 0, 0, 0.25)',
  },
}

// shadcn-specific semantic tokens
export const shadcnSemanticTokens = {
  '--shadcn-background': '0 0% 100%',
  '--shadcn-foreground': '222.2 84% 4.9%',
  '--shadcn-card': '0 0% 100%',
  '--shadcn-card-foreground': '222.2 84% 4.9%',
  '--shadcn-popover': '0 0% 100%',
  '--shadcn-popover-foreground': '222.2 84% 4.9%',
  '--shadcn-primary': '222.2 47.4% 11.2%',
  '--shadcn-primary-foreground': '210 40% 98%',
  '--shadcn-secondary': '210 40% 96%',
  '--shadcn-secondary-foreground': '222.2 84% 4.9%',
  '--shadcn-muted': '210 40% 96%',
  '--shadcn-muted-foreground': '215.4 16.3% 46.9%',
  '--shadcn-accent': '210 40% 96%',
  '--shadcn-accent-foreground': '222.2 84% 4.9%',
  '--shadcn-destructive': '0 84.2% 60.2%',
  '--shadcn-destructive-foreground': '210 40% 98%',
  '--shadcn-border': '214.3 31.8% 91.4%',
  '--shadcn-input': '214.3 31.8% 91.4%',
  '--shadcn-ring': '222.2 84% 4.9%',
  '--shadcn-radius': '0.5rem',
  // Dark mode semantic colors
  '--shadcn-background-dark': '222.2 84% 4.9%',
  '--shadcn-foreground-dark': '210 40% 98%',
  '--shadcn-card-dark': '222.2 84% 4.9%',
  '--shadcn-card-foreground-dark': '210 40% 98%',
  '--shadcn-popover-dark': '222.2 84% 4.9%',
  '--shadcn-popover-foreground-dark': '210 40% 98%',
  '--shadcn-primary-dark': '210 40% 98%',
  '--shadcn-primary-foreground-dark': '222.2 47.4% 11.2%',
  '--shadcn-secondary-dark': '217.2 32.6% 17.5%',
  '--shadcn-secondary-foreground-dark': '210 40% 98%',
  '--shadcn-muted-dark': '217.2 32.6% 17.5%',
  '--shadcn-muted-foreground-dark': '215 20.2% 65.1%',
  '--shadcn-accent-dark': '217.2 32.6% 17.5%',
  '--shadcn-accent-foreground-dark': '210 40% 98%',
  '--shadcn-destructive-dark': '0 62.8% 30.6%',
  '--shadcn-destructive-foreground-dark': '210 40% 98%',
  '--shadcn-border-dark': '217.2 32.6% 17.5%',
  '--shadcn-input-dark': '217.2 32.6% 17.5%',
  '--shadcn-ring-dark': '212.7 26.8% 83.9%',
}