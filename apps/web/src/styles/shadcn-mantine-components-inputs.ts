import { ActionIcon, Avatar, Badge, Button, Card, Checkbox, Chip, Container, Input, Loader, Notification, Radio, rem, Select, Textarea } from '@mantine/core'

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

export const shadcnMantineComponentsInputs = {
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

  // Card has no `variant` or `color` prop, so the theme-dependent values below are constant
  Card: Card.extend({
    defaultProps: {
      p: 'xl',
      shadow: 'xl',
      withBorder: true,
    },
    styles: (theme) => ({
      root: {
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: theme.shadows.lg,
        borderRadius: 'var(--mantine-radius-default)',
        padding: 'var(--mantine-spacing-xl)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.2s ease',
        '&:hover': {
          boxShadow: `${theme.shadows.lg}, 0 0 0 1px var(--mantine-color-primary-outline)`,
        },
      },
    }),
  }),

  Paper: {
    defaultProps: {
      shadow: 'xl',
    },
  },

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

  Radio: Radio.extend({
    vars: (theme, properties) => ({
      root: {
        '--radio-color': properties.color !== undefined
          ? (Object.keys(theme.colors).includes(properties.color)
            ? `var(--mantine-color-${properties.color}-filled)`
            : properties.color)
          : "var(--mantine-primary-color-filled)",
        '--radio-icon-color': properties.color !== undefined
          ? (Object.keys(theme.colors).includes(properties.color)
            ? `var(--mantine-color-${properties.color}-contrast)`
            : properties.color)
          : "var(--mantine-primary-color-contrast)",
      },
    }),
  }),

  Switch: {
    styles: () => ({
      thumb: {
        backgroundColor: "var(--mantine-color-default)",
        borderColor: "var(--mantine-color-default-border)",
      },
      track: {
        borderColor: "var(--mantine-color-default-border)",
      },
    }),
  },

  Modal: {
    defaultProps: {
      withBorder: true,
    },
  },

  Drawer: {},

  Popover: {},

  Tooltip: {
    vars: () => ({
      tooltip: {
        '--tooltip-bg': 'var(--mantine-primary-color-filled)',
        '--tooltip-color': 'var(--mantine-primary-color-contrast)',
      },
    }),
  },

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

  Chip: Chip.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const variant = properties.variant ?? "filled"

      return {
        root: {
          '--chip-bg':
            variant === "light"
              ? undefined
              : (colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-filled)`
                : "var(--mantine-primary-color-filled)"),
          '--chip-color':
            variant === "filled"
              ? (colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-contrast)`
                : "var(--mantine-primary-color-contrast)")
              : undefined,
        },
      }
    },
  }),

  Avatar: Avatar.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const isNeutralColor = colorKey !== undefined && NEUTRAL_COLOR_KEYS.has(colorKey)
      const variant = properties.variant ?? "light"

      return {
        root: {
          '--avatar-bg':
            variant === "filled"
              ? (colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-filled)`
                : "var(--mantine-primary-color-filled)")
              : variant === "light"
                ? colorKey !== undefined
                  ? `var(--mantine-color-${colorKey}-light)`
                  : "var(--mantine-primary-color-light)"
                : undefined,

          '--avatar-color':
            variant === "filled"
              ? (colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-contrast)`
                : "var(--mantine-primary-color-contrast)")
              : variant === "light"
                ? colorKey !== undefined
                  ? `var(--mantine-color-${colorKey}-light-color)`
                  : "var(--mantine-primary-color-light-color)"
                : variant === "white"
                  ? isNeutralColor
                    ? `var(--mantine-color-black)`
                    : colorKey !== undefined
                      ? `var(--mantine-color-${colorKey}-outline)`
                      : "var(--mantine-primary-color-filled)"
                  : variant === "outline" || variant === "transparent"
                    ? colorKey !== undefined
                      ? `var(--mantine-color-${colorKey}-outline)`
                      : "var(--mantine-primary-color-filled)"
                    : undefined,

          '--avatar-bd':
            variant === "outline"
              ? (colorKey !== undefined
                ? `1px solid var(--mantine-color-${colorKey}-outline)`
                : "1px solid var(--mantine-primary-color-filled)")
              : undefined,
        },
      }
    },
  }),
}
