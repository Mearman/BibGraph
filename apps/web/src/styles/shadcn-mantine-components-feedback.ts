import { Alert, Blockquote, Flex, getBaseValue, Indicator, Mark, NavLink, Pagination, SegmentedControl, Stepper, Text, ThemeIcon, Timeline } from '@mantine/core'

// Color keys that render as neutral (black/white contrast) rather than a themed hue
const NEUTRAL_COLOR_KEYS = new Set(["zinc", "slate", "gray", "neutral", "stone"])

export const shadcnMantineComponentsFeedback = {
  SegmentedControl: SegmentedControl.extend({
    vars: (theme, properties) => ({
      root: {
        '--sc-color': properties.color !== undefined
          ? Object.keys(theme.colors).includes(properties.color)
            ? NEUTRAL_COLOR_KEYS.has(properties.color)
              ? "var(--mantine-color-body)"
              : `var(--mantine-color-${properties.color}-filled)`
            : properties.color
          : "var(--mantine-color-default)",
      },
    }),
  }),

  NavLink: NavLink.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const variant = properties.variant ?? "light"

      return {
        root: {
          '--nl-color':
            variant === "filled" ? (colorKey !== undefined ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)') : undefined,
        },
        children: {},
      }
    },
  }),

  Pagination: Pagination.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined

      return {
        root: {
          '--pagination-active-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-contrast)`
            : "var(--mantine-primary-color-contrast)",
        },
      }
    },
  }),

  Stepper: Stepper.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined

      return {
        root: {
          '--stepper-icon-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-contrast)`
            : "var(--mantine-primary-color-contrast)",
        },
      }
    },
  }),

  Alert: Alert.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const isNeutralColor = colorKey !== undefined && NEUTRAL_COLOR_KEYS.has(colorKey)
      const variant = properties.variant ?? "light"

      return {
        root: {
          '--alert-color':
            variant === "filled"
              ? (colorKey !== undefined
                ? `var(--mantine-color-${colorKey}-contrast)`
                : "var(--mantine-primary-color-contrast)")
              : (variant === "white") && isNeutralColor ? `var(--mantine-color-black)` : undefined,
        },
      }
    },
  }),

  Indicator: Indicator.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined

      return {
        root: {
          '--indicator-text-color': colorKey !== undefined
            ? `var(--mantine-color-${colorKey}-contrast)`
            : "var(--mantine-primary-color-contrast)",
        },
      }
    },
  }),

  ThemeIcon: ThemeIcon.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const isNeutralColor = colorKey !== undefined && NEUTRAL_COLOR_KEYS.has(colorKey)
      const variant = properties.variant ?? "filled"

      return {
        root: {
          '--ti-color': variant === "filled"
            ? (colorKey !== undefined
              ? `var(--mantine-color-${colorKey}-contrast)`
              : "var(--mantine-primary-color-contrast)")
            : (variant === "white") && isNeutralColor ? `var(--mantine-color-black)` : undefined,
        },
      }
    },
  }),

  Timeline: Timeline.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined

      return {
        root: {
          '--tl-icon-color': colorKey !== undefined ? `var(--mantine-color-${colorKey}-contrast)` : 'var(--mantine-primary-color-contrast)',
        },
      }
    },
  }),

  Blockquote: Blockquote.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined

      return {
        root: {
          '--bq-bg-dark': colorKey !== undefined ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
          '--bq-bg-light': colorKey !== undefined ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)',
        },
      }
    },
  }),

  Mark: Mark.extend({
    vars: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : 'yellow'
      const isNeutralColor = NEUTRAL_COLOR_KEYS.has(colorKey)

      return {
        root: {
          '--mark-bg-light': `var(--mantine-color-${colorKey}-${isNeutralColor ? '3' : 'filled-hover'})`,
          '--mark-bg-dark': `var(--mantine-color-${colorKey}-filled)`
        },
      }
    },
  }),

  // Anchor component with default props
  Anchor: {
    defaultProps: {
      underline: "always",
    },
  },

  // Enhanced Flex component with comprehensive flexbox props. `direction`/`align`/`justify`/`wrap` accept a responsive per-breakpoint object, which `getBaseValue` collapses to its base-breakpoint value since a `styles` callback returns one plain CSSProperties object with no media-query support; `gap` is only applied when it resolves to a plain spacing key/number, for the same reason.
  Flex: Flex.extend({
    styles: (_theme, properties) => {
      const rawGap = properties.gap
      const gap = typeof rawGap === 'string' || typeof rawGap === 'number' ? `var(--mantine-spacing-${String(rawGap)})` : '0'

      return {
        root: {
          display: 'flex',
          flexDirection: getBaseValue(properties.direction) ?? 'row',
          alignItems: getBaseValue(properties.align) ?? 'stretch',
          justifyContent: getBaseValue(properties.justify) ?? 'flex-start',
          flexWrap: getBaseValue(properties.wrap) ?? 'nowrap',
          gap,
          columnGap: gap,
          rowGap: gap,
        }
      }
    },
  }),

  // Enhanced Text component for typography props not already covered by Mantine's own style props. `letterSpacing`/`textTransform`/`textAlign`/`textDecoration` accept a responsive per-breakpoint object, which `getBaseValue` collapses to its base-breakpoint value since a `styles` callback returns one plain CSSProperties object with no media-query support; `fw`/`lh` are only applied when they resolve to a plain string/number, for the same reason.
  Text: Text.extend({
    styles: (_theme, properties) => {
      const fw = typeof properties.fw === 'string' || typeof properties.fw === 'number' ? String(properties.fw) : undefined
      const lh = typeof properties.lh === 'string' || typeof properties.lh === 'number' ? `var(--mantine-line-height-${String(properties.lh)})` : undefined

      return {
        root: {
          fontSize: properties.size !== undefined ? `var(--mantine-font-size-${properties.size})` : undefined,
          fontWeight: fw,
          lineHeight: lh,
          letterSpacing: getBaseValue(properties.lts),
          textTransform: getBaseValue(properties.tt),
          textAlign: getBaseValue(properties.ta),
          textDecoration: getBaseValue(properties.td),
        }
      }
    },
  }),
}
