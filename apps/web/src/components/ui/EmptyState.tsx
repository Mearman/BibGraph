/**
 * EmptyState component
 * Provides consistent empty state visuals across the application
 * @module EmptyState
 */

import {
  Box,
  Button,
  ButtonProps,
  Card,
  Group,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconAlertCircle,
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconDatabase,
  IconFilter,
  IconSearch,
  IconX,
} from '@tabler/icons-react';

import { ICON_SIZE } from '@/config/style-constants';

export type EmptyStateVariant =
  | 'no-data'          // No data exists at all
  | 'no-results'       // Data exists but filters returned nothing
  | 'error'           // Error state
  | 'loading';        // Loading state (for skeleton screens)

export interface EmptyStateAction extends Omit<ButtonProps, 'children'> {
  label: string;
}

export interface EmptyStateProps {
  /** Which empty state variant to display */
  variant: EmptyStateVariant;
  /** Icon to display (defaults based on variant) */
  icon?: React.ReactNode;
  /** Headline text */
  title: string;
  /** Optional description text */
  description?: string;
  /** Optional action buttons */
  actions?: EmptyStateAction[];
  /** Optional tips/suggestions to display */
  tips?: string[];
  /** Optional quick start guide steps */
  quickStart?: { step: string; detail: string }[];
}

/**
 * Large decorative icon with a subtle background
 * @param root0
 * @param root0.children
 * @param root0.color
 */
const DecorativeIcon = ({ children, color = 'blue' }: { children: React.ReactNode; color?: 'blue' | 'gray' | 'red' }) => (
  <Box
    style={{
      width: 120,
      height: 120,
      borderRadius: '50%',
      backgroundColor: `var(--mantine-color-${color}-light)`,
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
    }}
  >
    <ThemeIcon
      variant="light"
      color={color}
      size={80}
      radius="xl"
      style={{ border: 'none', background: 'transparent' }}
    >
      {children}
    </ThemeIcon>
  </Box>
);

/**
 * Default icons for each variant
 */
const DEFAULT_ICONS: Record<EmptyStateVariant, React.ReactNode> = {
  'no-data': <IconDatabase size={ICON_SIZE.HERO_LG} stroke={1.2} />,
  'no-results': <IconFilter size={ICON_SIZE.HERO_LG} stroke={1.2} />,
  'error': <IconAlertCircle size={ICON_SIZE.HERO_LG} stroke={1.2} />,
  'loading': <IconSearch size={ICON_SIZE.HERO_LG} stroke={1.2} />,
};

const DEFAULT_COLORS: Record<EmptyStateVariant, 'blue' | 'gray' | 'red'> = {
  'no-data': 'blue',
  'no-results': 'gray',
  'error': 'red',
  'loading': 'blue',
};

/**
 * EmptyState displays consistent, helpful empty states throughout the application
 * @param root0
 * @param root0.variant
 * @param root0.icon
 * @param root0.title
 * @param root0.description
 * @param root0.actions
 * @param root0.tips
 * @param root0.quickStart
 */
export const EmptyState = ({
  variant,
  icon,
  title,
  description,
  actions,
  tips,
  quickStart,
}: EmptyStateProps) => {
  const displayIcon = icon ?? DEFAULT_ICONS[variant];
  const iconColor = DEFAULT_COLORS[variant];

  return (
    <Stack align="center" gap="xl" py="xl">
      <DecorativeIcon color={iconColor}>{displayIcon}</DecorativeIcon>

      <Stack align="center" gap="xs" maw={600}>
        <Title order={2} ta="center">
          {title}
        </Title>
        {description && (
          <Text c="dimmed" ta="center" size="lg">
            {description}
          </Text>
        )}
      </Stack>

      {/* Quick start guide */}
      {quickStart && quickStart.length > 0 && (
        <Card withBorder radius="md" p="lg" maw={500} w="100%">
          <Stack gap="md">
            <Text fw={500} size="sm" c="dimmed" tt="uppercase">
              Quick Start
            </Text>
            <Stack gap="sm">
              {quickStart.map((item, index) => (
                <Group key={index} gap="sm">
                  <ThemeIcon color="blue" size={24} radius="xl">
                    {index === 0 && <IconCircleNumber1 size={ICON_SIZE.MD} />}
                    {index === 1 && <IconCircleNumber2 size={ICON_SIZE.MD} />}
                    {index === 2 && <IconCircleNumber3 size={ICON_SIZE.MD} />}
                    {index > 2 && <Text size="sm" fw={700}>{index + 1}</Text>}
                  </ThemeIcon>
                  <Text size="sm">
                    <Text span fw={500}>
                      {item.step}
                    </Text>
                    {item.detail && (
                      <>
                        {' '}– {item.detail}
                      </>
                    )}
                  </Text>
                </Group>
              ))}
            </Stack>
          </Stack>
        </Card>
      )}

      {/* Action buttons */}
      {actions && actions.length > 0 && (
        <Group gap="sm">
          {actions.map((action, index) => (
            <Button
              key={index}
              {...action}
            >
              {action.label}
            </Button>
          ))}
        </Group>
      )}

      {/* Tips */}
      {tips && tips.length > 0 && (
        <Card withBorder radius="md" p="md" maw={500} w="100%" bg="var(--mantine-color-gray-light)">
          <Stack gap="xs">
            {tips.map((tip, index) => (
              <Group key={index} gap="xs">
                <ThemeIcon variant="light" color="blue" size="sm" radius="xl">
                  <IconSearch size={ICON_SIZE.XS} />
                </ThemeIcon>
                <Text size="xs" c="dimmed">
                  {tip}
                </Text>
              </Group>
            ))}
          </Stack>
        </Card>
      )}
    </Stack>
  );
};

/**
 * Preset configurations for common empty states
 */
export const EmptyStatePresets = {
  /**
   * No data in bookmarks/history/catalogue
   * @param props
   */
  noBookmarks: (props?: Partial<EmptyStateProps>): EmptyStateProps => ({
    variant: 'no-data',
    title: 'No Bookmarks Yet',
    description: 'Bookmark entities to build your research collection.',
    quickStart: [
      { step: 'Search for entities', detail: 'Find authors, works, or institutions' },
      { step: 'Click bookmark icon', detail: 'Add to your collection' },
      { step: 'Access anytime', detail: 'View in Bookmarks or Catalogue' },
    ],
    ...props,
  }),

  /**
   * No results after filtering
   * @param filterCount
   */
  noFilteredResults: (filterCount = 0): EmptyStateProps => ({
    variant: 'no-results',
    title: 'No Matching Results',
    description: filterCount > 0
      ? `Adjust your ${filterCount} filter${filterCount > 1 ? 's' : ''} to see more results.`
      : 'Try adjusting your search or filters.',
    actions: [
      { label: 'Clear Filters', variant: 'light', color: 'gray', leftSection: <IconX size={ICON_SIZE.SM} /> },
    ],
  }),

  /**
   * No search results
   * @param query
   */
  noSearchResults: (query?: string): EmptyStateProps => ({
    variant: 'no-results',
    title: 'No Results Found',
    description: query
      ? `No matches found for "${query}"`
      : 'Try different keywords or check your spelling.',
    tips: [
      'Use fewer words to broaden your search',
      'Check for typos or alternate spellings',
      'Try searching by ID instead',
    ],
  }),

  /** Empty catalogue */
  noCatalogue: (): EmptyStateProps => ({
    variant: 'no-data',
    title: 'Your Catalogue is Empty',
    description: 'Entities you view are automatically cached for offline access.',
    quickStart: [
      { step: 'Browse OpenAlex', detail: 'Explore the academic database' },
      { step: 'View entity details', detail: 'Pages are cached automatically' },
      { step: 'Access offline', detail: 'View cached entities anytime' },
    ],
  }),

  /** Graph no entities */
  noGraphEntities: (): EmptyStateProps => ({
    variant: 'no-data',
    title: 'No Entities to Display',
    description: 'Enable data sources to populate your graph visualization.',
    quickStart: [
      { step: 'Toggle sources', detail: 'Enable bookmarks, history, or catalogue' },
      { step: 'Entities appear', detail: 'Nodes show your data sources' },
      { step: 'Explore relationships', detail: 'Click nodes to visualize connections' },
    ],
  }),
};
