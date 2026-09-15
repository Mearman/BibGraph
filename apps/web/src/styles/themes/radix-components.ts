import { Card } from '@mantine/core'

// Radix-inspired component overrides These components provide minimal styling, staying close to browser defaults Radix is unstyled by default - minimal styling only

export const radixComponents = {
  // Radix Button - minimal styling, focus-visible only
  Button: {
    styles: {
      root: {
        fontWeight: 400,
        transition: "all 0.1s ease",
        fontFamily: 'inherit',
        // Radix is unstyled by default - minimal browser styling
        // Use backgroundColor (not background shorthand) for consistency with other themes
        backgroundColor: 'transparent',
        border: '1px solid transparent',
        cursor: 'pointer',
        '&:disabled': {
          opacity: '0.5',
          cursor: 'not-allowed',
        },
        '&:focus-visible': {
          outline: '2px solid var(--mantine-color-blue-6)',
          outlineOffset: '2px',
        },
      },
    },
  },

  // Radix Card - absolutely minimal styling
  Card: Card.extend({
    styles: {
      root: {
        // Radix is unstyled - absolutely minimal Use backgroundColor (not background shorthand) for consistency with other themes
        backgroundColor: 'transparent', // Radix is unstyled
        border: 'none',
        boxShadow: 'none',
        borderRadius: 'var(--mantine-radius-default)',
        padding: 'var(--mantine-spacing-xl)',
        position: 'relative',
        overflow: 'hidden',
      },
    },
  }),

  // Radix Input - minimal browser styling
  Input: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "32px", // More compact for Radix
        // Radix is unstyled - use Mantine body color for proper theme support
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: '0 8px',
        '&:focus': {
          outline: '2px solid var(--mantine-color-blue-6)',
          outlineOffset: '2px',
          borderColor: 'var(--mantine-color-blue-6)',
        },
        '&:disabled': {
          opacity: '0.5',
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Radix Select - minimal browser styling
  Select: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "32px", // More compact for Radix
        // Radix is unstyled - use Mantine body color for proper theme support
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: '0 8px',
        '&:focus': {
          outline: '2px solid var(--mantine-color-blue-6)',
          outlineOffset: '2px',
          borderColor: 'var(--mantine-color-blue-6)',
        },
        '&:disabled': {
          opacity: '0.5',
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Radix Textarea - minimal browser styling
  Textarea: {
    styles: {
      textarea: {
        fontSize: "14px",
        lineHeight: "1.5",
        // Radix is unstyled - use Mantine body color for proper theme support
        backgroundColor: 'var(--mantine-color-body)',
        border: '1px solid var(--mantine-color-default-border)',
        padding: '8px',
        resize: 'vertical',
        '&:focus': {
          outline: '2px solid var(--mantine-color-blue-6)',
          outlineOffset: '2px',
          borderColor: 'var(--mantine-color-blue-6)',
        },
        '&:disabled': {
          opacity: '0.5',
          cursor: 'not-allowed',
          backgroundColor: 'var(--mantine-color-gray-1)',
        },
      },
    },
  },

  // Radix Switch - minimal styling
  Switch: {
    styles: {
      thumb: {
        backgroundColor: "var(--mantine-color-white)",
        borderColor: "var(--mantine-color-default-border)",
        border: '1px solid',
      },
      track: {
        borderColor: "var(--mantine-color-default-border)",
        border: '1px solid',
        backgroundColor: 'var(--mantine-color-gray-1)',
      },
    },
  },

  // Radix Paper - minimal styling
  Paper: {
    defaultProps: {
      shadow: undefined, // No shadow for Radix
    },
    vars: () => ({
      root: {
        'paper-bg': 'transparent', // Radix is unstyled
        'paper-shadow': 'none', // Radix is unstyled
      },
    }),
    styles: {
      root: {
        backgroundColor: 'transparent',
        border: 'none',
        boxShadow: 'none',
      },
    },
  },

  // Radix Modal - minimal styling
  Modal: {
    defaultProps: {
      withBorder: false, // No border for Radix
    },
    vars: () => ({
      content: {
        'modal-bg': 'var(--mantine-color-body)', // Use theme-aware body color
        'modal-shadow': 'none', // No shadow for Radix
      },
    }),
    styles: {
      content: {
        backgroundColor: 'var(--modal-bg)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: 'none',
      },
    },
  },

  // Radix Drawer - minimal styling
  Drawer: {
    vars: () => ({
      content: {
        'drawer-bg': 'var(--mantine-color-body)', // Use theme-aware body color
        'drawer-shadow': 'none', // No shadow for Radix
      },
    }),
    styles: {
      content: {
        backgroundColor: 'var(--drawer-bg)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: 'none',
      },
    },
  },

  // Radix Popover - minimal styling
  Popover: {
    vars: () => ({
      dropdown: {
        'popover-bg': 'var(--mantine-color-body)', // Use theme-aware body color
        'popover-shadow': 'none', // No shadow for Radix
      },
    }),
    styles: {
      dropdown: {
        backgroundColor: 'var(--popover-bg)',
        border: '1px solid var(--mantine-color-default-border)',
        boxShadow: 'none',
      },
    },
  },

  // Radix Tooltip - minimal styling
  Tooltip: {
    vars: () => ({
      tooltip: {
        '--tooltip-bg': 'var(--mantine-color-gray-9)', // Dark tooltip using theme color
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

  // Radix AppShell - minimal backgrounds
  AppShell: {
    vars: () => ({
      root: {
        '--appshell-bg': 'transparent',
        '--appshell-border-color': 'var(--mantine-color-default-border)',
      },
      navbar: {
        '--navbar-bg': 'transparent',
        '--navbar-border-color': 'var(--mantine-color-default-border)',
        '--navbar-padding': 'var(--mantine-spacing-md)',
      },
      header: {
        '--header-bg': 'transparent',
        '--header-border-color': 'var(--mantine-color-default-border)',
        '--header-height': 'rem(60px)',
        '--header-padding': 'var(--mantine-spacing-md)',
      },
      aside: {
        '--aside-bg': 'transparent',
        '--aside-border-color': 'var(--mantine-color-default-border)',
        '--aside-padding': 'var(--mantine-spacing-md)',
      },
      footer: {
        '--footer-bg': 'transparent',
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

  // Radix Accordion - minimal styling
  Accordion: {
    vars: () => ({
      root: {
        '--accordion-border-color': 'var(--mantine-color-default-border)',
        '--accordion-radius': 'var(--mantine-radius-default)',
      },
      item: {
        '--accordion-item-bg': 'transparent',
        '--accordion-item-border-color': 'var(--accordion-border-color)',
        '--accordion-item-transition': 'all 0.1s ease',
      },
      control: {
        '--accordion-control-color': 'var(--mantine-color-text)',
        '--accordion-control-bg-hover': 'var(--mantine-color-gray-1)',
        '--accordion-control-padding': 'var(--mantine-spacing-md)',
        '--accordion-control-font-weight': '400',
        '--accordion-control-transition': 'var(--accordion-item-transition)',
      },
      content: {
        '--accordion-content-padding': 'var(--accordion-control-padding)',
        '--accordion-content-bg': 'transparent',
      },
      chevron: {
        '--accordion-chevron-color': 'var(--mantine-color-dimmed)',
        '--accordion-chevron-size': 'rem(16px)',
        '--accordion-chevron-transition': 'transform 0.1s ease',
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
          outline: '2px solid var(--mantine-color-blue-6)',
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

  // Radix Title - minimal styling with Mantine text color
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
        fontWeight: 400, // Radix is more minimal
      },
    },
  },

  // Radix Text - minimal styling with Mantine text color
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