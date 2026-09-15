import { ActionIcon, Avatar, Badge, Button, Checkbox, Chip, Container, Input, Loader, Notification, Radio, rem, Select, Textarea } from '@mantine/core'

// Container sizes for custom Container component
const CONTAINER_SIZES: Record<string, string> = {
  xxs: rem("200px"),
  xs: rem("300px"),
  sm: rem("400px"),
  md: rem("500px"),
  lg: rem("600px"),
  xl: rem("1400px"),
  xxl: rem("1600px"),
}

// Color keys that render as neutral (black/white contrast) rather than a themed hue
const NEUTRAL_COLOR_KEYS = new Set(["zinc", "slate", "gray", "neutral", "stone"])

// Only truly essential components that can't be Mantine defaults This contains NO styling overrides - only functional components
export const essentialComponents = {
  // Container component is essential for layout functionality
  Container: Container.extend({
    vars: (_theme, { size, fluid }) => ({
      root: {
        '--container-size': fluid === true
          ? '100%'
          : (size !== undefined && size in CONTAINER_SIZES
            ? CONTAINER_SIZES[size]
            : rem(size)),
      },
    }),
  }),

  // Basic Button color variables (no styling overrides)
  Button: Button.extend({
    vars: (theme, properties) => {
      const color = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const variant = properties.variant ?? 'filled'
      const isNeutralColor = color !== undefined && NEUTRAL_COLOR_KEYS.has(color)

      return {
        root: {
          '--button-color': (() => {
            if (variant === 'filled') {
              return color !== undefined ? `var(--mantine-color-${color}-contrast)` : 'var(--mantine-primary-color-contrast)'
            }
            if (variant === 'white') {
              return isNeutralColor ? 'var(--mantine-color-black)' : undefined
            }
            return undefined
          })(),
        },
      }
    },
  }),

  // Basic Input error handling (no styling overrides)
  Input: Input.extend({
    styles: (theme, properties) => {
      const hasError = properties.error !== undefined && properties.error !== null && properties.error !== false

      return {
        input: {
          '--input-bg': 'var(--mantine-color-body)',
          '--input-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          '--input-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      }
    },
  }),

  // Basic Select error handling (no styling overrides)
  Select: Select.extend({
    defaultProps: {
      checkIconPosition: "right",
    },
    styles: (theme, properties) => {
      const hasError = properties.error !== undefined && properties.error !== null && properties.error !== false

      return {
        input: {
          '--select-bg': 'var(--mantine-color-body)',
          '--select-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          '--select-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      }
    },
  }),

  // Basic Textarea error handling (no styling overrides)
  Textarea: Textarea.extend({
    styles: (theme, properties) => {
      const hasError = properties.error !== undefined && properties.error !== null && properties.error !== false

      return {
        input: {
          '--textarea-bg': 'var(--mantine-color-body)',
          '--textarea-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          '--textarea-placeholder-color': 'var(--mantine-color-placeholder)',
        }
      }
    },
  }),

  // Basic Checkbox color variables (no styling overrides)
  Checkbox: Checkbox.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      return {
        root: {
          '--checkbox-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-filled)`
            : 'var(--mantine-primary-color-filled)',
          '--checkbox-icon-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-contrast)`
            : 'var(--mantine-primary-color-contrast)',
        },
      }
    },
  }),

  // Basic Radio color variables (no styling overrides)
  Radio: Radio.extend({
    vars: (theme, properties) => ({
      root: {
        '--radio-color': properties.color !== undefined
          ? Object.keys(theme.colors).includes(properties.color)
            ? NEUTRAL_COLOR_KEYS.has(properties.color)
              ? "var(--mantine-color-body)"
              : `var(--mantine-color-${properties.color}-filled)`
            : properties.color
          : "var(--mantine-primary-color-filled)",
        '--radio-icon-color': properties.color !== undefined
          ? (Object.keys(theme.colors).includes(properties.color)
            ? `var(--mantine-color-${properties.color}-contrast)`
            : properties.color)
          : "var(--mantine-primary-color-contrast)",
      },
    }),
  }),

  // Basic color variables for other components (no styling overrides)
  Notification: Notification.extend({
    styles: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      return {
        root: {
          '--notification-bg': colorKey !== undefined ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          '--notification-border': colorKey !== undefined ? `var(--mantine-color-${colorKey}-outline)` : 'var(--mantine-primary-color-outline)',
          '--notification-color': colorKey !== undefined ? `var(--mantine-color-${colorKey}-light-color)` : 'var(--mantine-primary-color-light-color)',
        }
      }
    },
  }),

  Loader: Loader.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      return {
        root: {
          '--loader-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-filled)`
            : 'var(--mantine-primary-color-filled)',
        },
      }
    },
  }),

  // Basic ActionIcon color variables (no styling overrides)
  ActionIcon: ActionIcon.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const isNeutralColor = colorKey !== undefined && NEUTRAL_COLOR_KEYS.has(colorKey)
      const variant = properties.variant ?? "filled"

      return {
        root: {
          '--ai-color': (() => {
            if (variant === "filled") {
              return colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-contrast)`
                : "var(--mantine-primary-color-contrast)"
            }
            if (variant === "white") {
              return isNeutralColor ? "var(--mantine-color-black)" : undefined
            }
            return undefined
          })(),
        },
      }
    }
  }),

  // Basic Badge color variables (no styling overrides)
  Badge: Badge.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const isNeutralColor = colorKey !== undefined && NEUTRAL_COLOR_KEYS.has(colorKey)
      const variant = properties.variant ?? "filled"

      return {
        root: {
          '--badge-bg': variant === "filled" && colorKey !== undefined ? `var(--mantine-color-${colorKey}-filled)` : undefined,
          '--badge-color':
            variant === "filled"
              ? (colorKey !== undefined ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)')
              : (variant === "white") && isNeutralColor ? `var(--mantine-color-black)` : undefined,
        },
      }
    },
  }),

  // Basic Chip color variables (simplified)
  Chip: Chip.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      return {
        root: {
          '--chip-bg': colorKey !== undefined ? `var(--mantine-color-${colorKey}-filled)` : 'var(--mantine-primary-color-filled)',
          '--chip-color': colorKey !== undefined ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
        },
      }
    },
  }),

  // Basic Avatar color variables (simplified)
  Avatar: Avatar.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      return {
        root: {
          '--avatar-bg': colorKey !== undefined ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          '--avatar-color': colorKey !== undefined ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
        },
      }
    },
  }),
}
