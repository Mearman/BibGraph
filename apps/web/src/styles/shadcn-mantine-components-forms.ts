import { MultiSelect, NumberInput, Progress, RingProgress } from '@mantine/core'

const PROGRESS_FALLBACK_COLOR = 'primary'

// Form and progress component overrides. NumberInput/MultiSelect read `properties.error`, and Progress/RingProgress read `properties.color`, so those four are built via `.extend()` for a properly typed callback; their custom CSS variables are delivered through `styles` (which accepts arbitrary custom properties) rather than `vars` (which only accepts each component's own small, fixed set of official variable names).
export const shadcnMantineComponentsForms = {
  NumberInput: NumberInput.extend({
    styles: (theme, properties) => {
      const hasError = properties.error !== undefined && properties.error !== null && properties.error !== false

      return {
        root: {
          position: 'relative',
        },
        input: {
          '--number-input-bg': 'var(--mantine-color-body)',
          '--number-input-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          '--number-input-placeholder-color': 'var(--mantine-color-placeholder)',
          '--number-input-color': 'var(--mantine-color-default-color)',
          backgroundColor: 'var(--number-input-bg)',
          borderColor: 'var(--number-input-border-color)',
          color: 'var(--number-input-color)',
          '&::placeholder': {
            color: 'var(--number-input-placeholder-color)',
          },
        },
        controls: {
          '--controls-bg': 'var(--mantine-color-default-hover)',
          '--controls-color': 'var(--mantine-color-default-color)',
          '--controls-hover-bg': 'var(--mantine-color-primary-filled)',
          '--controls-hover-color': 'var(--mantine-color-primary-contrast)',
          backgroundColor: 'var(--controls-bg)',
          color: 'var(--controls-color)',
          '&:hover': {
            backgroundColor: 'var(--controls-hover-bg)',
            color: 'var(--controls-hover-color)',
          },
        },
      }
    },
  }),

  MultiSelect: MultiSelect.extend({
    defaultProps: {
      checkIconPosition: "left",
      searchable: true,
      clearable: true,
    },
    styles: (theme, properties) => {
      const hasError = properties.error !== undefined && properties.error !== null && properties.error !== false

      return {
        input: {
          '--multi-select-bg': 'var(--mantine-color-body)',
          '--multi-select-border-color': hasError
            ? theme.colors.red[6]
            : 'var(--mantine-color-default-border)',
          '--multi-select-placeholder-color': 'var(--mantine-color-placeholder)',
          '--multi-select-color': 'var(--mantine-color-default-color)',
          backgroundColor: 'var(--multi-select-bg)',
          borderColor: 'var(--multi-select-border-color)',
          color: 'var(--multi-select-color)',
          '&::placeholder': {
            color: 'var(--multi-select-placeholder-color)',
          },
        },
        dropdown: {
          '--multi-select-dropdown-bg': 'var(--mantine-color-body)',
          '--multi-select-dropdown-border-color': 'var(--mantine-color-default-border)',
          '--multi-select-dropdown-shadow': theme.shadows.lg,
          backgroundColor: 'var(--multi-select-dropdown-bg)',
          border: '1px solid var(--multi-select-dropdown-border-color)',
          borderRadius: 'var(--mantine-radius-default)',
          boxShadow: 'var(--multi-select-dropdown-shadow)',
          padding: 'var(--mantine-spacing-xs)',
        },
        item: {
          '--multi-select-item-color': 'var(--mantine-color-default-color)',
          '--multi-select-item-bg-hover': 'var(--mantine-color-default-hover)',
          '--multi-select-item-bg-selected': 'var(--mantine-primary-color-light)',
          '--multi-select-item-padding': 'var(--mantine-spacing-xs) var(--mantine-spacing-sm)',
          color: 'var(--multi-select-item-color)',
          padding: 'var(--multi-select-item-padding)',
          borderRadius: 'var(--mantine-radius-sm)',
          fontSize: 'var(--mantine-font-size-sm)',
          fontWeight: 500,
          transition: 'all 0.15s ease',
          '&:hover': {
            backgroundColor: 'var(--multi-select-item-bg-hover)',
          },
          '&[data-selected]': {
            backgroundColor: 'var(--multi-select-item-bg-selected)',
            color: 'var(--mantine-primary-color-light-color)',
          },
        },
      }
    },
  }),

  Progress: Progress.extend({
    styles: (theme, properties) => {
      const colorKey = properties.color !== undefined && Object.keys(theme.colors).includes(properties.color) ? properties.color : PROGRESS_FALLBACK_COLOR

      return {
        root: {
          borderRadius: 'var(--mantine-radius-default)',
          height: 'var(--mantine-spacing-md)',
          backgroundColor: 'var(--mantine-color-default-hover)',
          overflow: 'hidden',
          position: 'relative',
        },
        section: {
          backgroundColor: `var(--mantine-color-${colorKey}-filled)`,
          transition: 'width 0.3s ease',
          height: '100%',
        },
        label: {
          color: 'var(--mantine-color-default-color)',
          fontSize: 'var(--mantine-font-size-xs)',
          fontWeight: 500,
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textShadow: '0 1px 2px rgba(0, 0, 0, 0.3)',
        },
      }
    },
  }),

  // RingProgress has no root-level `color` prop (colour is set per-section via `sections[].color`), so unlike Progress there is no theme-dependent value to compute here.
  RingProgress: RingProgress.extend({
    styles: () => ({
      root: {
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        position: 'relative',
      },
      svg: {
        transform: 'rotate(-90deg)',
      },
      label: {
        color: 'var(--mantine-color-default-color)',
        fontSize: 'var(--mantine-font-size-lg)',
        fontWeight: 600,
        position: 'absolute',
        textAlign: 'center',
      },
    }),
  }),

  // Additional utility components
  Stack: {
    vars: () => ({
      root: {
        '--stack-spacing': 'var(--mantine-spacing-md)',
        '--stack-align': 'stretch',
        '--stack-justify': 'flex-start',
        '--stack-gap': 'var(--mantine-spacing-md)',
      },
    }),
    styles: {
      root: {
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'var(--stack-align)',
        justifyContent: 'var(--stack-justify)',
        gap: 'var(--stack-gap)',
      },
    },
  },

  Group: {
    vars: () => ({
      root: {
        '--group-spacing': 'var(--mantine-spacing-md)',
        '--group-align': 'center',
        '--group-justify': 'flex-start',
        '--group-wrap': 'nowrap',
        '--group-gap': 'var(--mantine-spacing-md)',
      },
    }),
    styles: {
      root: {
        display: 'flex',
        alignItems: 'var(--group-align)',
        justifyContent: 'var(--group-justify)',
        flexWrap: 'var(--group-wrap)',
        gap: 'var(--group-gap)',
      },
    },
  },

  Title: {
    vars: () => ({
      root: {
        '--title-color': 'var(--mantine-color-default-color)',
        '--title-font-weight': '700',
        '--title-line-height': '1.2',
        '--title-margin-bottom': 'var(--mantine-spacing-sm)',
      },
    }),
    styles: {
      root: {
        color: 'var(--title-color)',
        fontWeight: 'var(--title-font-weight)',
        lineHeight: 'var(--title-line-height)',
        marginBottom: 'var(--title-margin-bottom)',
      },
    },
  },

  // Critical Missing Components (Actively Used)

  Accordion: {
    vars: () => ({
      root: {
        '--accordion-border-color': 'var(--mantine-color-default-border)',
        '--accordion-radius': 'var(--mantine-radius-default)',
      },
      item: {
        '--accordion-item-bg': 'var(--mantine-color-body)',
        '--accordion-item-border-color': 'var(--accordion-border-color)',
        '--accordion-item-transition': 'all 0.2s ease',
      },
      control: {
        '--accordion-control-color': 'var(--mantine-color-default-color)',
        '--accordion-control-bg-hover': 'var(--mantine-color-default-hover)',
        '--accordion-control-padding': 'var(--mantine-spacing-md)',
        '--accordion-control-font-weight': '600',
        '--accordion-control-transition': 'var(--accordion-item-transition)',
      },
      content: {
        '--accordion-content-padding': 'var(--accordion-control-padding)',
        '--accordion-content-bg': 'var(--mantine-color-body)',
      },
      chevron: {
        '--accordion-chevron-color': 'var(--mantine-color-dimmed)',
        '--accordion-chevron-size': 'rem(16px)',
        '--accordion-chevron-transition': 'transform 0.2s ease',
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

  Slider: {
    vars: () => ({
      root: {
        '--slider-size': 'rem(6px)',
        '--slider-track-size': 'rem(4px)',
        '--slider-color': 'var(--mantine-color-primary-filled)',
        '--slider-track-color': 'var(--mantine-color-default-hover)',
        '--slider-thumb-size': 'rem(20px)',
        '--slider-thumb-color': 'var(--mantine-color-white)',
        '--slider-thumb-border-color': 'var(--mantine-color-primary-filled)',
        '--slider-mark-size': 'rem(8px)',
        '--slider-mark-color': 'var(--mantine-color-dimmed)',
        '--slider-transition': 'all 0.2s ease',
      },
      marks: {
        '--slider-mark-active-color': 'var(--slider-color)',
      },
    }),
    styles: {
      root: {
        position: 'relative',
        height: 'var(--slider-size)',
      },
      track: {
        height: 'var(--slider-track-size)',
        backgroundColor: 'var(--slider-track-color)',
        borderRadius: 'var(--mantine-radius-sm)',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '100%',
      },
      bar: {
        height: 'var(--slider-track-size)',
        backgroundColor: 'var(--slider-color)',
        borderRadius: 'var(--mantine-radius-sm)',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        transition: 'var(--slider-transition)',
      },
      thumb: {
        width: 'var(--slider-thumb-size)',
        height: 'var(--slider-thumb-size)',
        backgroundColor: 'var(--slider-thumb-color)',
        border: '2px solid var(--slider-thumb-border-color)',
        borderRadius: '50%',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'grab',
        transition: 'var(--slider-transition)',
        '&:active': {
          cursor: 'grabbing',
        },
      },
      marksContainer: {
        position: 'absolute',
        top: '100%',
        left: 0,
        right: 0,
        marginTop: 'var(--mantine-spacing-xs)',
      },
      mark: {
        width: 'var(--slider-mark-size)',
        height: 'var(--slider-mark-size)',
        backgroundColor: 'var(--slider-mark-color)',
        borderRadius: '50%',
        position: 'absolute',
        transform: 'translateX(-50%)',
        transition: 'var(--slider-transition)',
        '&[data-active]': {
          backgroundColor: 'var(--slider-mark-active-color)',
        },
      },
      markWrapper: {
        position: 'absolute',
        transform: 'translateX(-50%)',
      },
      markLabel: {
        color: 'var(--mantine-color-dimmed)',
        fontSize: 'var(--mantine-font-size-xs)',
        textAlign: 'center',
        whiteSpace: 'nowrap',
      },
    },
  },

  RangeSlider: {
    vars: () => ({
      root: {
        '--range-slider-size': 'rem(6px)',
        '--range-slider-track-size': 'rem(4px)',
        '--range-slider-color': 'var(--mantine-color-primary-filled)',
        '--range-slider-track-color': 'var(--mantine-color-default-hover)',
        '--range-slider-thumb-size': 'rem(20px)',
        '--range-slider-thumb-color': 'var(--mantine-color-white)',
        '--range-slider-thumb-border-color': 'var(--mantine-color-primary-filled)',
        '--range-slider-track-active-color': 'var(--range-slider-color)',
        '--range-slider-transition': 'all 0.2s ease',
      },
    }),
    styles: {
      root: {
        position: 'relative',
        height: 'var(--range-slider-size)',
      },
      track: {
        height: 'var(--range-slider-track-size)',
        backgroundColor: 'var(--range-slider-track-color)',
        borderRadius: 'var(--mantine-radius-sm)',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        width: '100%',
      },
      bar: {
        height: 'var(--range-slider-track-size)',
        backgroundColor: 'var(--range-slider-track-active-color)',
        borderRadius: 'var(--mantine-radius-sm)',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        transition: 'var(--range-slider-transition)',
      },
      thumb: {
        width: 'var(--range-slider-thumb-size)',
        height: 'var(--range-slider-thumb-size)',
        backgroundColor: 'var(--range-slider-thumb-color)',
        border: '2px solid var(--range-slider-thumb-border-color)',
        borderRadius: '50%',
        position: 'absolute',
        top: '50%',
        transform: 'translateY(-50%)',
        cursor: 'grab',
        transition: 'var(--range-slider-transition)',
        '&:active': {
          cursor: 'grabbing',
        },
      },
    },
  },

  // TextInput component - Basic text input field styling
  TextInput: {
    vars: () => ({
      input: {
        '--text-input-size': 'var(--mantine-control-size)',
        '--text-input-radius': 'var(--mantine-radius-default)',
        '--text-input-color': 'var(--mantine-color-default-color)',
        '--text-input-placeholder-color': 'var(--mantine-color-placeholder)',
        '--text-input-disabled-color': 'var(--mantine-color-disabled)',
        '--text-input-error-color': 'var(--mantine-color-error)',
        '--text-input-focused-border-color': 'var(--mantine-color-primary-6)',
        '--text-input-border-color': 'var(--mantine-color-default-border)',
        '--text-input-bg': 'var(--mantine-color-default)',
      },
    }),
    styles: () => ({
      input: {
        border: '1px solid var(--text-input-border-color)',
        backgroundColor: 'var(--text-input-bg)',
        color: 'var(--text-input-color)',
        '&:focus': {
          borderColor: 'var(--text-input-focused-border-color)',
          outline: 'none',
        },
        '&:disabled': {
          color: 'var(--text-input-disabled-color)',
          backgroundColor: 'var(--mantine-color-disabled)',
          cursor: 'not-allowed',
        },
        '&[data-error]': {
          borderColor: 'var(--text-input-error-color)',
          color: 'var(--text-input-error-color)',
        },
      },
      wrapper: {
        width: '100%',
      },
    }),
  },

  // NativeSelect component - Native browser select dropdown
  NativeSelect: {
    vars: () => ({
      input: {
        '--native-select-size': 'var(--mantine-control-size)',
        '--native-select-radius': 'var(--mantine-radius-default)',
        '--native-select-color': 'var(--mantine-color-default-color)',
        '--native-select-bg': 'var(--mantine-color-default)',
        '--native-select-border-color': 'var(--mantine-color-default-border)',
        '--native-select-focused-border-color': 'var(--mantine-color-primary-6)',
      },
    }),
    styles: () => ({
      input: {
        cursor: 'pointer',
        backgroundColor: 'var(--native-select-bg)',
        border: '1px solid var(--native-select-border-color)',
        color: 'var(--native-select-color)',
        '&:focus': {
          borderColor: 'var(--native-select-focused-border-color)',
          outline: 'none',
        },
        '&:disabled': {
          color: 'var(--mantine-color-disabled)',
          backgroundColor: 'var(--mantine-color-disabled)',
          cursor: 'not-allowed',
        },
      },
      wrapper: {
        width: '100%',
      },
    }),
  },
}
