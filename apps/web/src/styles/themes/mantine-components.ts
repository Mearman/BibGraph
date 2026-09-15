import { Card } from '@mantine/core'

// Mantine-native component overrides These components explicitly reset styles that might persist from other themes (radix, shadcn) All values use Mantine CSS variables for proper theme integration

export const mantineComponents = {
  // Reset Button styles to Mantine defaults
  Button: {
    styles: {
      root: {
        fontWeight: 500,
        transition: 'background-color 150ms ease, border-color 150ms ease',
        fontFamily: 'inherit',
        background: undefined, // Let Mantine handle this
        border: undefined, // Let Mantine handle this
        cursor: 'pointer',
        '&:disabled': {
          opacity: undefined, // Let Mantine handle this
          cursor: 'not-allowed',
        },
        '&:focus-visible': {
          outline: '2px solid var(--mantine-primary-color-filled)',
          outlineOffset: '2px',
        },
      },
    },
  },

  // Reset Card styles to Mantine defaults
  Card: Card.extend({
    styles: (theme) => ({
      root: {
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: theme.shadows.sm,
        borderRadius: 'var(--mantine-radius-default)',
        padding: 'var(--mantine-spacing-xl)',
        position: 'relative',
        overflow: 'hidden',
      },
    }),
  }),

  // Reset Input styles to Mantine defaults
  Input: {
    styles: {
      input: {
        fontSize: '14px',
        lineHeight: '1.5',
        minHeight: '36px',
        background: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: '0 var(--mantine-spacing-sm)',
        '&:focus': {
          borderColor: 'var(--mantine-primary-color-filled)',
          outline: 'none',
        },
        '&:disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Reset Select styles to Mantine defaults
  Select: {
    styles: {
      input: {
        fontSize: '14px',
        lineHeight: '1.5',
        minHeight: '36px',
        background: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: '0 var(--mantine-spacing-sm)',
        '&:focus': {
          borderColor: 'var(--mantine-primary-color-filled)',
          outline: 'none',
        },
        '&:disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Reset Textarea styles to Mantine defaults
  Textarea: {
    styles: {
      textarea: {
        fontSize: '14px',
        lineHeight: '1.5',
        background: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: 'var(--mantine-spacing-sm)',
        resize: 'vertical',
        '&:focus': {
          borderColor: 'var(--mantine-primary-color-filled)',
          outline: 'none',
        },
        '&:disabled': {
          opacity: 0.6,
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Reset Switch styles to Mantine defaults
  Switch: {
    styles: {
      thumb: {
        backgroundColor: 'var(--mantine-color-white)',
        borderColor: 'var(--mantine-color-default-border)',
        border: '1px solid',
      },
      track: {
        borderColor: 'var(--mantine-color-default-border)',
        border: '1px solid',
        backgroundColor: 'var(--mantine-color-gray-2)',
      },
    },
  },

  // Reset Paper styles to Mantine defaults
  Paper: {
    styles: {
      root: {
        backgroundColor: 'var(--mantine-color-body)',
        border: 'none',
        boxShadow: undefined, // Let Mantine handle via props
      },
    },
  },

  // Reset Modal styles to Mantine defaults
  Modal: {
    styles: {
      content: {
        backgroundColor: 'var(--mantine-color-body)',
        border: 'none',
        boxShadow: undefined, // Let Mantine handle via props
      },
    },
  },

  // Reset Drawer styles to Mantine defaults
  Drawer: {
    styles: {
      content: {
        backgroundColor: 'var(--mantine-color-body)',
        border: 'none',
        boxShadow: undefined, // Let Mantine handle via props
      },
    },
  },

  // Reset Popover styles to Mantine defaults
  Popover: {
    styles: {
      dropdown: {
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: undefined, // Let Mantine handle via props
      },
    },
  },

  // Reset Tooltip styles to Mantine defaults
  Tooltip: {
    vars: () => ({
      tooltip: {
        '--tooltip-bg': 'var(--mantine-color-gray-9)',
        '--tooltip-color': 'var(--mantine-color-white)',
      },
    }),
    styles: {
      tooltip: {
        backgroundColor: 'var(--tooltip-bg)',
        color: 'var(--tooltip-color)',
        border: 'none',
        fontSize: '12px',
        padding: '4px 8px',
      },
    },
  },

  // Reset AppShell styles to Mantine defaults
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

  // Reset Accordion styles to Mantine defaults
  Accordion: {
    vars: () => ({
      root: {
        '--accordion-border-color': 'var(--mantine-color-default-border)',
        '--accordion-radius': 'var(--mantine-radius-default)',
      },
      item: {
        '--accordion-item-bg': 'var(--mantine-color-body)',
        '--accordion-item-border-color': 'var(--accordion-border-color)',
        '--accordion-item-transition': 'all 150ms ease',
      },
      control: {
        '--accordion-control-color': 'var(--mantine-color-text)',
        '--accordion-control-bg-hover': 'var(--mantine-color-gray-1)',
        '--accordion-control-padding': 'var(--mantine-spacing-md)',
        '--accordion-control-font-weight': '500',
        '--accordion-control-transition': 'var(--accordion-item-transition)',
      },
      content: {
        '--accordion-content-padding': 'var(--accordion-control-padding)',
        '--accordion-content-bg': 'var(--mantine-color-body)',
      },
      chevron: {
        '--accordion-chevron-color': 'var(--mantine-color-dimmed)',
        '--accordion-chevron-size': 'rem(16px)',
        '--accordion-chevron-transition': 'transform 150ms ease',
      },
    }),
    styles: {
      root: {
        borderRadius: 'var(--accordion-radius)',
        overflow: 'hidden',
      },
      item: {
        backgroundColor: 'var(--accordion-item-bg)',
        border: '1px solid var(--accordion-item-border-color)',
        borderRadius: 'var(--accordion-radius)',
        marginBottom: 'var(--mantine-spacing-xs)',
        transition: 'var(--accordion-item-transition)',
        '&:last-child': {
          marginBottom: 0,
        },
      },
      control: {
        color: 'var(--accordion-control-color)',
        backgroundColor: 'transparent',
        border: 'none',
        padding: 'var(--accordion-control-padding)',
        fontWeight: 'var(--accordion-control-font-weight)',
        transition: 'var(--accordion-control-transition)',
        cursor: 'pointer',
        width: '100%',
        textAlign: 'left',
        '&:hover': {
          backgroundColor: 'var(--accordion-control-bg-hover)',
        },
        '&:focus-visible': {
          outline: '2px solid var(--mantine-primary-color-filled)',
          outlineOffset: '2px',
        },
      },
      content: {
        padding: 'var(--accordion-content-padding)',
        backgroundColor: 'var(--accordion-content-bg)',
      },
      chevron: {
        color: 'var(--accordion-chevron-color)',
        width: 'var(--accordion-chevron-size)',
        height: 'var(--accordion-chevron-size)',
        transition: 'var(--accordion-chevron-transition)',
        '[data-open]': {
          transform: 'rotate(180deg)',
        },
      },
    },
  },

  // Reset Title styles to Mantine defaults - ensures color inheritance is overridden
  Title: {
    vars: () => ({
      root: {
        '--title-color': 'var(--mantine-color-text)',
        '--title-line-height': '1.3',
      },
    }),
    styles: {
      root: {
        color: 'var(--title-color)',
        lineHeight: 'var(--title-line-height)',
      },
    },
  },

  // Reset Text styles to Mantine defaults - ensures color inheritance is overridden
  Text: {
    vars: () => ({
      root: {
        '--text-color': 'var(--mantine-color-text)',
      },
    }),
    styles: {
      root: {
        color: 'var(--text-color)',
      },
    },
  },
}
