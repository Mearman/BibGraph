import { Card } from '@mantine/core'

// Shadcn-inspired component overrides These components add shadcn/ui styling patterns on top of Mantine base components

export const shadcnComponents = {
  // Shadcn Button with hover transforms and cubic-bezier transitions
  Button: {
    styles: {
      root: {
        fontWeight: 500,
        transition: "all 0.15s cubic-bezier(0.4, 0, 0.2, 1)",
        '&:hover': {
          transform: 'translateY(-1px)',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.15)',
        },
        '&:active': {
          transform: 'translateY(0)',
        },
      },
    },
  },

  // Shadcn Card with semantic colors and shadows
  Card: Card.extend({
    defaultProps: {
      p: 'xl',
      shadow: 'xl',
      withBorder: true,
    },
    styles: {
      root: {
        backgroundColor: 'hsl(var(--shadcn-card))',
        border: '1px solid hsl(var(--shadcn-border))',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
        borderRadius: 'var(--mantine-radius-default)',
        padding: 'var(--mantine-spacing-xl)',
        position: 'relative',
        overflow: 'hidden',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
        '&:hover': {
          boxShadow: '0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06)',
        },
      },
    },
  }),

  // Shadcn Input with focus states and ring effects
  Input: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "40px", // h-10 in shadcn
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
        '&:focus': {
          borderColor: 'hsl(var(--shadcn-ring))',
          boxShadow: '0 0 0 3px hsl(var(--shadcn-ring) / 0.1)',
          outline: 'none',
        },
        '&:focus-visible': {
          outline: '2px solid hsl(var(--shadcn-ring))',
          outlineOffset: '2px',
        },
      },
    },
  },

  // Shadcn Select with matching focus states
  Select: {
    styles: {
      input: {
        fontSize: "14px",
        lineHeight: "1.5",
        minHeight: "40px", // h-10 in shadcn
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
        '&:focus': {
          borderColor: 'hsl(var(--shadcn-ring))',
          boxShadow: '0 0 0 3px hsl(var(--shadcn-ring) / 0.1)',
          outline: 'none',
        },
        '&:focus-visible': {
          outline: '2px solid hsl(var(--shadcn-ring))',
          outlineOffset: '2px',
        },
      },
    },
  },

  // Shadcn Textarea with matching focus states
  Textarea: {
    styles: {
      textarea: {
        fontSize: "14px",
        lineHeight: "1.5",
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
        '&:focus': {
          borderColor: 'hsl(var(--shadcn-ring))',
          boxShadow: '0 0 0 3px hsl(var(--shadcn-ring) / 0.1)',
          outline: 'none',
        },
        '&:focus-visible': {
          outline: '2px solid hsl(var(--shadcn-ring))',
          outlineOffset: '2px',
        },
      },
    },
  },

  // Shadcn Switch with custom styling
  Switch: {
    styles: {
      thumb: {
        backgroundColor: "var(--mantine-color-default)",
        borderColor: "var(--mantine-color-default-border)",
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      track: {
        borderColor: "hsl(var(--shadcn-border))",
        backgroundColor: 'hsl(var(--shadcn-background))',
        transition: 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
    },
  },

  // Shadcn Paper with shadcn background
  Paper: {
    defaultProps: {
      shadow: 'xl',
    },
    styles: {
      root: {
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
      },
    },
  },

  // Shadcn Modal with shadcn styling
  Modal: {
    defaultProps: {
      withBorder: true,
    },
    styles: {
      content: {
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
      },
    },
  },

  // Shadcn Drawer with shadcn styling
  Drawer: {
    styles: {
      content: {
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
      },
    },
  },

  // Shadcn Popover with shadcn styling
  Popover: {
    vars: () => ({
      dropdown: {
        'popover-bg': 'hsl(var(--shadcn-background))',
        'popover-shadow': '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    }),
    styles: {
      dropdown: {
        backgroundColor: 'hsl(var(--shadcn-background))',
        border: '1px solid hsl(var(--shadcn-border))',
        boxShadow: '0 1px 3px 0 rgba(0, 0, 0, 0.1), 0 1px 2px 0 rgba(0, 0, 0, 0.06)',
      },
    },
  },

  // Shadcn Tooltip with shadcn colors
  Tooltip: {
    vars: () => ({
      tooltip: {
        '--tooltip-bg': 'hsl(var(--shadcn-popover))',
        '--tooltip-color': 'hsl(var(--shadcn-popover-foreground))',
      },
    }),
    styles: {
      tooltip: {
        backgroundColor: 'hsl(var(--shadcn-popover))',
        color: 'hsl(var(--shadcn-popover-foreground))',
        border: '1px solid hsl(var(--shadcn-border))',
      },
    },
  },

  // Shadcn AppShell with shadcn backgrounds
  AppShell: {
    vars: () => ({
      root: {
        '--appshell-bg': 'hsl(var(--shadcn-background))',
        '--appshell-border-color': 'hsl(var(--shadcn-border))',
      },
      navbar: {
        '--navbar-bg': 'hsl(var(--shadcn-background))',
        '--navbar-border-color': 'hsl(var(--shadcn-border))',
        '--navbar-padding': 'var(--mantine-spacing-md)',
      },
      header: {
        '--header-bg': 'hsl(var(--shadcn-background))',
        '--header-border-color': 'hsl(var(--shadcn-border))',
        '--header-height': 'rem(60px)',
        '--header-padding': 'var(--mantine-spacing-md)',
      },
      aside: {
        '--aside-bg': 'hsl(var(--shadcn-background))',
        '--aside-border-color': 'hsl(var(--shadcn-border))',
        '--aside-padding': 'var(--mantine-spacing-md)',
      },
      footer: {
        '--footer-bg': 'hsl(var(--shadcn-background))',
        '--footer-border-color': 'hsl(var(--shadcn-border))',
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

  // Shadcn Accordion with shadcn styling
  Accordion: {
    vars: () => ({
      root: {
        '--accordion-border-color': 'hsl(var(--shadcn-border))',
        '--accordion-radius': 'var(--mantine-radius-default)',
      },
      item: {
        '--accordion-item-bg': 'hsl(var(--shadcn-background))',
        '--accordion-item-border-color': 'var(--accordion-border-color)',
        '--accordion-item-transition': 'all 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
      },
      control: {
        '--accordion-control-color': 'hsl(var(--shadcn-foreground))',
        '--accordion-control-bg-hover': 'hsl(var(--shadcn-accent))',
        '--accordion-control-padding': 'var(--mantine-spacing-md)',
        '--accordion-control-font-weight': '500',
        '--accordion-control-transition': 'var(--accordion-item-transition)',
      },
      content: {
        '--accordion-content-padding': 'var(--accordion-control-padding)',
        '--accordion-content-bg': 'hsl(var(--shadcn-background))',
      },
      chevron: {
        '--accordion-chevron-color': 'hsl(var(--shadcn-muted-foreground))',
        '--accordion-chevron-size': 'rem(16px)',
        '--accordion-chevron-transition': 'transform 0.15s cubic-bezier(0.4, 0, 0.2, 1)',
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
}