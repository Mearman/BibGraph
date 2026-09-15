import { globalStyle, style } from '@vanilla-extract/css'

import { createCSSVariableString } from './css-variable-resolver'

const SHADCN_VARIABLE_LINE_PATTERN = /--shadcn-([^:]+):\s*([^;\s][^;]*);/

// Root CSS variables for light mode
export const shadcnLightTheme = style({
  ':root': {
    ...createCSSVariableString('light').split('\n').reduce<Record<string, string>>((accumulator, line) => {
      const match = SHADCN_VARIABLE_LINE_PATTERN.exec(line)
      if (match) {
        accumulator[`--shadcn-${match[1]}`] = match[2]
      }
      return accumulator
    }, {})
  }
})

// Dark mode CSS variables using globalStyle
export const shadcnDarkThemeVariables = createCSSVariableString('dark').split('\n').reduce<Record<string, string>>((accumulator, line) => {
  const match = SHADCN_VARIABLE_LINE_PATTERN.exec(line)
  if (match) {
    accumulator[`--shadcn-${match[1]}`] = match[2]
  }
  return accumulator
}, {})

// Apply dark mode variables globally
globalStyle('[data-mantine-color-scheme="dark"]', shadcnDarkThemeVariables)

// Global styles for shadcn theme integration
globalStyle('*', {
  borderColor: 'var(--shadcn-border)',
})

globalStyle('body', {
  backgroundColor: 'var(--shadcn-background)',
  color: 'var(--shadcn-foreground)',
  fontFamily: 'Inter, -apple-system, BlinkMacSystemFont, Segoe UI, Roboto, sans-serif',
  lineHeight: '1.6',
})

// Focus styles for accessibility
globalStyle('*:focus-visible', {
  outline: '2px solid var(--shadcn-ring)',
  outlineOffset: '2px',
})

// Custom scrollbar styling
globalStyle('::-webkit-scrollbar', {
  width: '8px',
  height: '8px',
})

globalStyle('::-webkit-scrollbar-track', {
  background: 'var(--shadcn-muted)',
})

globalStyle('::-webkit-scrollbar-thumb', {
  background: 'var(--shadcn-muted-foreground)',
  borderRadius: '4px',
})

globalStyle('::-webkit-scrollbar-thumb:hover', {
  background: 'var(--shadcn-border)',
})

// Selection styling
globalStyle('::selection', {
  backgroundColor: 'var(--shadcn-primary)',
  color: 'var(--shadcn-primary-foreground)',
})

// Academic entity color classes
export const entityWork = style({ color: 'var(--shadcn-blue-9)' })
export const entityAuthor = style({ color: 'var(--shadcn-green-9)' })
export const entitySource = style({ color: 'var(--shadcn-violet-9)' })
export const entityInstitution = style({ color: 'var(--shadcn-orange-9)' })
export const entityConcept = style({ color: 'var(--shadcn-pink-9)' })
export const entityTopic = style({ color: 'var(--shadcn-red-9)' })
export const entityPublisher = style({ color: 'var(--shadcn-teal-9)' })
export const entityFunder = style({ color: 'var(--shadcn-cyan-9)' })
export const entityKeyword = style({ color: 'var(--shadcn-zinc-9)' })

// Utility classes for semantic colors
export const textPrimary = style({ color: 'var(--shadcn-foreground)' })
export const textSecondary = style({ color: 'var(--shadcn-muted-foreground)' })
export const textMuted = style({ color: 'var(--shadcn-muted-foreground)' })
export const bgPrimary = style({ backgroundColor: 'var(--shadcn-background)' })
export const bgSecondary = style({ backgroundColor: 'var(--shadcn-card)' })
export const bgMuted = style({ backgroundColor: 'var(--shadcn-muted)' })