import { Menu, Tabs } from '@mantine/core'

// Layout, navigation, and data-display component overrides. Most of these don't read `theme`/`props` dynamically, so they need no explicit typing beyond the plain object shape Mantine expects; Menu and Tabs do read `theme`, so those two are built via `.extend()` for a properly typed callback.
export const shadcnMantineComponentsLayout = {
  AppShell: {
    vars: () => ({
      root: {
        '--appshell-bg': 'var(--mantine-color-body)',
        '--appshell-border-color': 'var(--mantine-color-default-border)',
      },
      navbar: {
        '--navbar-bg': 'var(--mantine-color-body)',
        '--navbar-border-color': 'var(--mantine-color-default-border)',
        '--navbar-padding': 'var(--mantine-spacing-md)',
      },
      header: {
        '--header-bg': 'var(--mantine-color-body)',
        '--header-border-color': 'var(--mantine-color-default-border)',
        '--header-height': 'rem(60px)',
        '--header-padding': 'var(--mantine-spacing-md)',
      },
      aside: {
        '--aside-bg': 'var(--mantine-color-body)',
        '--aside-border-color': 'var(--mantine-color-default-border)',
        '--aside-padding': 'var(--mantine-spacing-md)',
      },
      footer: {
        '--footer-bg': 'var(--mantine-color-body)',
        '--footer-border-color': 'var(--mantine-color-default-border)',
        '--footer-padding': 'var(--mantine-spacing-md)',
      },
    }),
    styles: {
      root: {
        backgroundColor: 'var(--appshell-bg)',
      },
      navbar: {
        backgroundColor: 'var(--navbar-bg)',
        borderRight: '1px solid var(--navbar-border-color)',
        padding: 'var(--navbar-padding)',
      },
      header: {
        backgroundColor: 'var(--header-bg)',
        borderBottom: '1px solid var(--header-border-color)',
        height: 'var(--header-height)',
        padding: 'var(--header-padding)',
      },
      aside: {
        backgroundColor: 'var(--aside-bg)',
        borderLeft: '1px solid var(--aside-border-color)',
        padding: 'var(--aside-padding)',
      },
      footer: {
        backgroundColor: 'var(--footer-bg)',
        borderTop: '1px solid var(--footer-border-color)',
        padding: 'var(--footer-padding)',
      },
    },
  },

  // Menu's theme-dependent value (the dropdown shadow) is computed directly in `styles` rather than round-tripped through a CSS variable, since Menu declares no custom vars of its own.
  Menu: Menu.extend({
    styles: (theme) => ({
      dropdown: {
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        borderRadius: 'var(--mantine-radius-default)',
        boxShadow: theme.shadows.lg,
        padding: 'var(--mantine-spacing-xs)',
        minWidth: 'rem(180px)',
      },
      item: {
        color: 'var(--mantine-color-default-color)',
        borderRadius: 'var(--mantine-radius-sm)',
        padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
        fontSize: 'var(--mantine-font-size-sm)',
        fontWeight: 500,
        transition: 'all 0.15s ease',
        '&:hover': {
          backgroundColor: 'var(--mantine-color-default-hover)',
        },
        '&[data-selected]': {
          backgroundColor: 'var(--mantine-primary-color-light)',
          color: 'var(--mantine-primary-color-light-color)',
        },
      },
      label: {
        color: 'var(--mantine-color-dimmed)',
        fontWeight: 500,
        fontSize: 'var(--mantine-font-size-xs)',
        padding: 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
        margin: 'var(--mantine-spacing-xs) 0',
        cursor: 'default',
      },
      divider: {
        borderTop: '1px solid var(--mantine-color-default-border)',
        margin: 'var(--mantine-spacing-xs) 0',
      },
    }),
  }),

  // Tabs' own CSS variables only cover `--tabs-color`/`--tabs-radius`; the colour-derived values below are computed directly in `styles` rather than through custom (unsupported) variables.
  Tabs: Tabs.extend({
    styles: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : undefined
      const tabsColor = colorKey !== undefined ? `var(--mantine-color-${colorKey}-filled)` : 'var(--mantine-primary-color-filled)'
      const tabsColorLight = colorKey !== undefined ? `var(--mantine-color-${colorKey}-light)` : 'var(--mantine-primary-color-light)'
      const tabColorHover = colorKey !== undefined ? `var(--mantine-color-${colorKey}-light-color)` : 'var(--mantine-primary-color-light-color)'

      return {
        root: {
          display: 'flex',
          flexDirection: 'column',
        },
        list: {
          borderBottom: '1px solid var(--mantine-color-default-border)',
          display: 'flex',
          gap: 'var(--mantine-spacing-xs)',
        },
        tab: {
          color: 'var(--mantine-color-default-color)',
          fontSize: 'var(--mantine-font-size-sm)',
          fontWeight: 500,
          padding: 'var(--mantine-spacing-sm) var(--mantine-spacing-md)',
          borderRadius: 'var(--mantine-radius-default) var(--mantine-radius-default) 0 0',
          border: '1px solid transparent',
          borderBottom: 'none',
          cursor: 'pointer',
          transition: 'all 0.2s ease',
          position: 'relative',
          '&:hover': {
            color: tabColorHover,
            backgroundColor: 'var(--mantine-color-default-hover)',
          },
          '&[data-active]': {
            backgroundColor: tabsColorLight,
            color: tabsColor,
            borderColor: 'var(--mantine-color-default-border)',
            marginBottom: '-1px',
            '&::after': {
              content: '""',
              position: 'absolute',
              bottom: '-1px',
              left: 0,
              right: 0,
              height: '1px',
              backgroundColor: tabsColorLight,
            },
          },
        },
        panel: {
          backgroundColor: 'var(--mantine-color-body)',
          padding: 'var(--mantine-spacing-lg)',
          flex: 1,
        },
      }
    },
  }),

  Table: {
    vars: () => ({
      root: {
        '--table-bg': 'var(--mantine-color-body)',
        '--table-border-color': 'var(--mantine-color-default-border)',
        '--table-striped-bg': 'var(--mantine-color-default-hover)',
        '--table-radius': 'var(--mantine-radius-default)',
        '--table-font-size': 'var(--mantine-font-size-sm)',
      },
      th: {
        '--th-bg': 'var(--mantine-color-gray-0)',
        '--th-color': 'var(--mantine-color-default-color)',
        '--th-font-weight': '600',
        '--th-border-color': 'var(--table-border-color)',
        '--th-padding': 'var(--mantine-spacing-sm)',
      },
      td: {
        '--td-padding': 'var(--mantine-spacing-sm)',
        '--td-border-color': 'var(--table-border-color)',
        '--td-color': 'var(--mantine-color-default-color)',
      },
    }),
    styles: {
      root: {
        backgroundColor: 'var(--table-bg)',
        border: '1px solid var(--table-border-color)',
        borderRadius: 'var(--table-radius)',
        overflow: 'hidden',
        fontSize: 'var(--table-font-size)',
        width: '100%',
        borderCollapse: 'separate',
        borderSpacing: 0,
      },
      th: {
        backgroundColor: 'var(--th-bg)',
        color: 'var(--th-color)',
        fontWeight: 'var(--th-font-weight)',
        padding: 'var(--th-padding)',
        textAlign: 'left',
        borderBottom: '1px solid var(--th-border-color)',
        '&:first-child': {
          borderTopLeftRadius: 'var(--table-radius)',
        },
        '&:last-child': {
          borderTopRightRadius: 'var(--table-radius)',
        },
      },
      td: {
        padding: 'var(--td-padding)',
        color: 'var(--td-color)',
        borderBottom: '1px solid var(--td-border-color)',
      },
      tr: {
        '&:last-child td': {
          borderBottom: 'none',
        },
        '&[data-striped] td': {
          backgroundColor: 'var(--table-striped-bg)',
        },
        '&:hover td': {
          backgroundColor: 'var(--mantine-color-default-hover)',
        },
      },
    },
  },

  TableScrollContainer: {
    vars: () => ({
      root: {
        '--scroll-container-bg': 'var(--mantine-color-body)',
        '--scroll-container-border-color': 'var(--mantine-color-default-border)',
        '--scroll-container-radius': 'var(--mantine-radius-default)',
      },
    }),
    styles: {
      root: {
        backgroundColor: 'var(--scroll-container-bg)',
        border: '1px solid var(--scroll-container-border-color)',
        borderRadius: 'var(--scroll-container-radius)',
        overflow: 'auto',
      },
    },
  },

  CardSection: {
    vars: () => ({
      root: {
        '--section-padding': 'var(--mantine-spacing-md)',
        '--section-border-color': 'var(--mantine-color-default-border)',
      },
    }),
    styles: {
      root: {
        padding: 'var(--section-padding)',
        '&:not(:last-child)': {
          borderBottom: '1px solid var(--section-border-color)',
        },
        '&:first-child': {
          paddingTop: 0,
        },
        '&:last-child': {
          paddingBottom: 0,
        },
      },
    },
  },

  SimpleGrid: {
    vars: () => ({
      root: {
        '--grid-spacing': 'var(--mantine-spacing-md)',
        '--grid-min-width': 'rem(280px)',
      },
    }),
    styles: {
      root: {
        display: 'grid',
        gap: 'var(--grid-spacing)',
        gridTemplateColumns: 'repeat(auto-fit, minmax(var(--grid-min-width), 1fr))',
      },
    },
  },

  Divider: {
    vars: () => ({
      root: {
        '--divider-color': 'var(--mantine-color-default-border)',
        '--divider-size': '1px',
        '--divider-margin': 'var(--mantine-spacing-md)',
      },
    }),
    styles: {
      root: {
        borderTop: 'var(--divider-size) solid var(--divider-color)',
        margin: 'var(--divider-margin) 0',
      },
      horizontal: {
        borderTop: 'var(--divider-size) solid var(--divider-color)',
        margin: 'var(--divider-margin) 0',
      },
      vertical: {
        borderLeft: 'var(--divider-size) solid var(--divider-color)',
        margin: '0 var(--divider-margin)',
      },
    },
  },

  Space: {
    vars: () => ({
      root: {
        '--space-h': 'var(--mantine-spacing-md)',
        '--space-w': 'var(--mantine-spacing-md)',
      },
    }),
  },

  Center: {
    vars: () => ({
      root: {
        '--center-min-width': 'rem(100px)',
        '--center-min-height': 'rem(100px)',
      },
    }),
    styles: {
      root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        minWidth: 'var(--center-min-width)',
        minHeight: 'var(--center-min-height)',
        width: '100%',
      },
    },
  },

  Code: {
    vars: () => ({
      root: {
        '--code-bg': 'var(--mantine-color-gray-0)',
        '--code-color': 'var(--mantine-color-red-6)',
        '--code-border-color': 'var(--mantine-color-gray-3)',
        '--code-radius': 'var(--mantine-radius-sm)',
        '--code-font-size': 'var(--mantine-font-size-sm)',
        '--code-font-weight': '600',
        '--code-padding': '2px var(--mantine-spacing-xs)',
      },
    }),
    styles: {
      root: {
        backgroundColor: 'var(--code-bg)',
        color: 'var(--code-color)',
        border: '1px solid var(--code-border-color)',
        borderRadius: 'var(--code-radius)',
        fontSize: 'var(--code-font-size)',
        fontWeight: 'var(--code-font-weight)',
        padding: 'var(--code-padding)',
        fontFamily: 'var(--mantine-font-family-monospace)',
        lineHeight: 1.4,
      },
      block: {
        backgroundColor: 'var(--code-bg)',
        border: '1px solid var(--code-border-color)',
        borderRadius: 'var(--code-radius)',
        padding: 'var(--mantine-spacing-sm)',
        fontSize: 'var(--code-font-size)',
        fontFamily: 'var(--mantine-font-family-monospace)',
        lineHeight: 1.6,
        overflow: 'auto',
        whiteSpace: 'pre',
      },
    },
  },
}
