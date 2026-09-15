/**
 * GraphEmptyState component
 * Provides engaging empty state visuals with clear guidance for the graph explorer
 */

import {
  Box,
  Button,
  Card,
  Group,
  List,
  Stack,
  Text,
  ThemeIcon,
  Title,
} from '@mantine/core';
import {
  IconBookmark,
  IconCircleNumber1,
  IconCircleNumber2,
  IconCircleNumber3,
  IconGraph,
  IconHistory,
  IconSearch,
  IconSettings,
} from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';
import type { ReactNode } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

export type GraphEmptyStateVariant = 'no-sources' | 'no-entities';

export interface GraphEmptyStateProps {
  /**
  Which empty state variant to display
   */
  variant: GraphEmptyStateVariant;
  /**
  Optional: Number of sources currently available but disabled
   */
  availableSourceCount?: number;
}

/**
 * Large decorative icon with a subtle background
 */
const DecorativeIcon = ({ children }: { children: ReactNode }) => (
  <Box
    style={{
      width: 120,
      height: 120,
      borderRadius: '50%',
      backgroundColor: 'var(--mantine-color-blue-light)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      margin: '0 auto',
    }}
  >
    <ThemeIcon
      variant="light"
      color="blue"
      size={80}
      radius="xl"
      style={{ border: 'none', background: 'transparent' }}
    >
      {children}
    </ThemeIcon>
  </Box>
);

/**
 * Empty state when no data sources are enabled
 */
const NoSourcesEnabledState = ({ availableSourceCount = 0 }: { availableSourceCount?: number }) => (
  <Stack align="center" gap="xl" py="xl">
    <DecorativeIcon>
      <IconGraph size={ICON_SIZE.HERO_LG} stroke={1.2} />
    </DecorativeIcon>

    <Stack align="center" gap="xs">
      <Title order={2} ta="center">
        Enable Data Sources to Explore
      </Title>
      <Text c="dimmed" ta="center" maw={500}>
        The graph explorer visualizes entities from your bookmarks, history, and cached data.
        Enable sources from the panel on the left to get started.
      </Text>
    </Stack>

    <Card withBorder radius="md" p="lg" maw={450} w="100%">
      <Stack gap="md">
        <Text fw={500} size="sm" c="dimmed" tt="uppercase">
          Quick Start Guide
        </Text>
        <List spacing="md" size="sm" center>
          <List.Item
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                <IconCircleNumber1 size={ICON_SIZE.MD} />
              </ThemeIcon>
            }
          >
            <Text>
              <strong>Toggle sources</strong> in the left panel
              {availableSourceCount > 0 && ` (${String(availableSourceCount)} available)`}
            </Text>
          </List.Item>
          <List.Item
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                <IconCircleNumber2 size={ICON_SIZE.MD} />
              </ThemeIcon>
            }
          >
            <Text>
              Entities from enabled sources appear as <strong>nodes</strong>
            </Text>
          </List.Item>
          <List.Item
            icon={
              <ThemeIcon color="blue" size={24} radius="xl">
                <IconCircleNumber3 size={ICON_SIZE.MD} />
              </ThemeIcon>
            }
          >
            <Text>
              Click nodes to <strong>explore relationships</strong>
            </Text>
          </List.Item>
        </List>
      </Stack>
    </Card>

    <Group gap="xs">
      <ThemeIcon variant="light" color="gray" size="sm">
        <IconSettings size={ICON_SIZE.SM} />
      </ThemeIcon>
      <Text size="xs" c="dimmed">
        Tip: Use "Enable All" to quickly activate all data sources
      </Text>
    </Group>
  </Stack>
);

/**
 * Empty state when sources are enabled but contain no entities
 */
const NoEntitiesState = () => (
  <Stack align="center" gap="xl" py="xl">
    <DecorativeIcon>
      <IconGraph size={ICON_SIZE.HERO_LG} stroke={1.2} />
    </DecorativeIcon>

    <Stack align="center" gap="xs">
      <Title order={2} ta="center">
        No Entities to Display
      </Title>
      <Text c="dimmed" ta="center" maw={500}>
        Your enabled data sources don't contain any entities yet.
        Start exploring OpenAlex to build your research graph.
      </Text>
    </Stack>

    <Card withBorder radius="md" p="lg" maw={500} w="100%">
      <Stack gap="md">
        <Text fw={500} size="sm" c="dimmed" tt="uppercase">
          Build Your Graph
        </Text>
        <Group grow>
          <Button
            component={Link}
            to="/search"
            variant="light"
            leftSection={<IconSearch size={ICON_SIZE.MD} />}
          >
            Search OpenAlex
          </Button>
          <Button
            component={Link}
            to="/browse"
            variant="light"
            leftSection={<IconBookmark size={ICON_SIZE.MD} />}
          >
            Browse Entities
          </Button>
        </Group>
        <Text size="xs" c="dimmed" ta="center">
          Bookmark entities or view them to add to your history
        </Text>
      </Stack>
    </Card>

    <Card withBorder radius="md" p="md" maw={500} w="100%" bg="var(--mantine-color-gray-light)">
      <Group>
        <ThemeIcon variant="light" color="blue" size="lg" radius="md">
          <IconHistory size={ICON_SIZE.XL} />
        </ThemeIcon>
        <Stack gap={2} style={{ flex: 1 }}>
          <Text size="sm" fw={500}>
            Your activity builds the graph
          </Text>
          <Text size="xs" c="dimmed">
            Entities you view are cached locally and can be visualized here
          </Text>
        </Stack>
      </Group>
    </Card>
  </Stack>
);

/**
 * GraphEmptyState displays contextual guidance when the graph has no data to show
 */
export const GraphEmptyState = ({
  variant,
  availableSourceCount,
}: GraphEmptyStateProps) => {
  switch (variant) {
    case 'no-sources':
      return <NoSourcesEnabledState availableSourceCount={availableSourceCount} />;
    case 'no-entities':
      return <NoEntitiesState />;
    default:
      return variant satisfies never;
  }
};
