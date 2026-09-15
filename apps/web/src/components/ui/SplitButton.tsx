import type { ActionIconProps, ButtonProps, GroupProps } from '@mantine/core';
import { ActionIcon, Button, Group, Menu } from '@mantine/core'
import { IconChevronDown } from '@tabler/icons-react'

import {
  ICON_SIZE,
  MANTINE_THEME_BORDER_RADIUS,
  SPLIT_BUTTON_HEIGHT,
  SPLIT_BUTTON_MIN_WIDTH,
} from '@/config/style-constants'
import { useTheme } from '@/contexts/theme-context'

// The real Mantine styling props merged with the native `button` element's attributes, rather than a hand-rolled subset with a `[key: string]: unknown` catch-all - this keeps every prop properly typed and lets a caller pass any genuine Button/ActionIcon prop without an escape hatch. (`ComponentProps<typeof Button>` doesn't work here: Mantine's polymorphic factory type resolves to the wrong overload and loses most of ButtonProps.)
type SplitButtonMainButtonProps = ButtonProps & React.ComponentPropsWithoutRef<'button'> & { children: React.ReactNode }
type SplitButtonDropdownButtonProps = ActionIconProps & React.ComponentPropsWithoutRef<'button'>

interface SplitButtonProperties {
  mainButtonProps: SplitButtonMainButtonProps
  dropdownButtonProps?: SplitButtonDropdownButtonProps
  groupProps?: GroupProps
  dropdownItems?: React.ReactNode
  height?: number
}

// Splits `children` out of a props bag so it can be rendered as real JSX content instead of spread as a prop, matching how Mantine's own components expect it.
const omitChildren = <T extends { children?: React.ReactNode },>(props: T): Omit<T, 'children'> => {
  const { children: _children, ...rest } = props
  return rest
}

export const SplitButton = ({ ref, mainButtonProps, dropdownButtonProps, groupProps, dropdownItems, height = SPLIT_BUTTON_HEIGHT }: SplitButtonProperties & { ref?: React.RefObject<HTMLDivElement | null> }) => {
    const { config } = useTheme()

    // Get current theme border radius value from centralized constants
    const getThemeBorderRadius = () => {
      return MANTINE_THEME_BORDER_RADIUS[config.borderRadius]
    }

    const defaultDropdownProperties = {
      variant: 'outline' as const,
      size: 'sm' as const,
      w: height,
      h: height,
      'aria-label': 'More options' as const,
      children: <IconChevronDown size={ICON_SIZE.SM} />
    }

    const defaultGroupProperties: GroupProps = {
      gap: 0,
      miw: SPLIT_BUTTON_MIN_WIDTH,
      style: {
        height: `${String(height)}px`,
        boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1), 0 1px 2px rgba(0, 0, 0, 0.06)'
      }
    }

    const mergedDropdownProperties = { ...defaultDropdownProperties, ...dropdownButtonProps }
    const dropdownChildren = mergedDropdownProperties.children
    const dropdownProperties = omitChildren(mergedDropdownProperties)
    const mainButtonChildren = mainButtonProps.children
    const mainButtonProperties = omitChildren(mainButtonProps)
    const mergedGroupProperties = { ...defaultGroupProperties, ...groupProps }

    // Use the main button color or fallback to primary, then apply to dropdown
    const mainButtonColor = mainButtonProps.color ?? 'primary'
    const dropdownColor = mergedDropdownProperties.color ?? mainButtonColor

    // If no dropdown items provided, render as simple grouped buttons
    if (dropdownItems === undefined) {
      return (
        <Group ref={ref} {...mergedGroupProperties}>
          {/* Main button */}
          <Button
            {...mainButtonProperties}
            h={height}
            color={mainButtonColor}
            styles={() => {
              const currentRadius = getThemeBorderRadius()
              return {
                root: {
                  borderRadius: `${currentRadius} 0 0 ${currentRadius}`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                  borderTopRightRadius: '0px !important',
                  borderBottomRightRadius: '0px !important',
                  borderRight: 'none',
                  flex: 1,
                  height: `${String(height)}px`,
                  borderStyle: 'solid',
                  transition: 'all 0.15s ease-in-out',
                  marginRight: '-1px', // Compensate for border overlap
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-blue-light-hover)',
                    borderColor: 'var(--mantine-color-blue-light-hover)',
                    zIndex: 1
                  }
                },
                inner: {
                  justifyContent: 'flex-start',
                  height: `${String(height - 2)}px`, // Account for borders
                  paddingLeft: '8px',
                  padding: '0 8px'
                }
              }
            }}
          >
            {mainButtonChildren}
          </Button>

          {/* Dropdown arrow button */}
          <ActionIcon
            {...dropdownProperties}
            w={height}
            h={height}
            color={dropdownColor}
            styles={() => {
              const currentRadius = getThemeBorderRadius()
              return {
                root: {
                  borderRadius: `0 ${currentRadius} ${currentRadius} 0`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                  borderTopLeftRadius: '0px !important',
                  borderBottomLeftRadius: '0px !important',
                  borderLeftWidth: '1px',
                  height: `${String(height)}px`,
                  width: `${String(height)}px`,
                  borderStyle: 'solid',
                  backgroundColor: 'transparent',
                  transition: 'all 0.15s ease-in-out',
                  flexShrink: 0, // Prevent button from shrinking
                  position: 'relative',
                  zIndex: 2, // Ensure dropdown button is on top
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-' + dropdownColor + '-light-hover)',
                    transform: 'scale(1.05)',
                    zIndex: 3
                  },
                  '&:active': {
                    transform: 'scale(0.95)'
                  }
                }
              }
            }}
          >
            {dropdownChildren}
          </ActionIcon>
        </Group>
      )
    }

    // Render with dropdown menu if items are provided
    return (
      <>
        <Group ref={ref} {...mergedGroupProperties}>
          {/* Main button */}
          <Button
            {...mainButtonProperties}
            h={height}
            color={mainButtonColor}
            styles={() => {
              const currentRadius = getThemeBorderRadius()
              return {
                root: {
                  borderRadius: `${currentRadius} 0 0 ${currentRadius}`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                  borderTopRightRadius: '0px !important',
                  borderBottomRightRadius: '0px !important',
                  borderRight: 'none',
                  flex: 1,
                  height: `${String(height)}px`,
                  borderStyle: 'solid',
                  transition: 'all 0.15s ease-in-out',
                  marginRight: '-1px', // Compensate for border overlap
                  '&:hover': {
                    backgroundColor: 'var(--mantine-color-blue-light-hover)',
                    borderColor: 'var(--mantine-color-blue-light-hover)',
                    zIndex: 1
                  }
                },
                inner: {
                  justifyContent: 'flex-start',
                  height: `${String(height - 2)}px`, // Account for borders
                  paddingLeft: '8px',
                  padding: '0 8px'
                }
              }
            }}
          >
            {mainButtonChildren}
          </Button>

          {/* Dropdown arrow button */}
          <Menu position="bottom-end" closeOnItemClick={false}>
            <Menu.Target>
              <ActionIcon
                {...dropdownProperties}
                w={height}
                h={height}
                color={dropdownColor}
                styles={() => {
                  const currentRadius = getThemeBorderRadius()
                  return {
                    root: {
                      borderRadius: `0 ${currentRadius} ${currentRadius} 0`, // Use theme radius: top-left, top-right, bottom-right, bottom-left
                      borderTopLeftRadius: '0px !important',
                      borderBottomLeftRadius: '0px !important',
                      borderLeftWidth: '1px',
                      height: `${String(height)}px`,
                      width: `${String(height)}px`,
                      borderStyle: 'solid',
                      backgroundColor: 'transparent',
                      transition: 'all 0.15s ease-in-out',
                      flexShrink: 0, // Prevent button from shrinking
                      position: 'relative',
                      zIndex: 2, // Ensure dropdown button is on top
                      '&:hover': {
                        backgroundColor: 'var(--mantine-color-' + dropdownColor + '-light-hover)',
                        transform: 'scale(1.05)',
                        zIndex: 3
                      },
                      '&:active': {
                        transform: 'scale(0.95)'
                      }
                    }
                  }
                }}
              >
                {dropdownChildren}
              </ActionIcon>
            </Menu.Target>
            <Menu.Dropdown>
              {dropdownItems}
            </Menu.Dropdown>
          </Menu>
        </Group>
      </>
    )
  }

SplitButton.displayName = 'SplitButton'