/**
 * Activity Feed Component
 *
 * Displays recent user activities in a scrollable list.
 * Integrates with ActivityContext for real-time updates.
 */

import { useActivity } from '@/contexts/ActivityContext';
import { ICON_SIZE } from '@/config/style-constants';
import type { ActivityCategory } from '@/types/activity';
import {
  Avatar,
  Box,
  Center,
  Group,
  Stack,
  Text,
  Tooltip,
  UnstyledButton,
} from '@mantine/core';
import {
  IconArrowRight,
  IconDatabaseImport,
  IconDatabaseExport,
  IconEdit,
  IconList,
  IconPlus,
  IconSearch,
  IconTrash,
  IconX,
} from '@tabler/icons-react';
import { memo } from 'react';
import { formatDistanceToNow } from 'date-fns';

const CATEGORY_ICONS: Record<ActivityCategory, React.ReactNode> = {
  create: <IconPlus size={ICON_SIZE.SM} />,
  update: <IconEdit size={ICON_SIZE.SM} />,
  delete: <IconTrash size={ICON_SIZE.SM} />,
  navigate: <IconArrowRight size={ICON_SIZE.SM} />,
  search: <IconSearch size={ICON_SIZE.SM} />,
  export: <IconDatabaseExport size={ICON_SIZE.SM} />,
  import: <IconDatabaseImport size={ICON_SIZE.SM} />,
};

const CATEGORY_COLORS: Record<ActivityCategory, string> = {
  create: 'teal',
  update: 'blue',
  delete: 'red',
  navigate: 'gray',
  search: 'yellow',
  export: 'green',
  import: 'cyan',
} as const;

interface ActivityItemProps {
  activity: {
    id: string;
    timestamp: Date;
    category: ActivityCategory;
    description: string;
  };
}

const ActivityItem = memo(({ activity }: ActivityItemProps) => {
  const timeAgo = formatDistanceToNow(activity.timestamp, { addSuffix: true });

  return (
    <UnstyledButton
      p="xs"
      style={{
        width: '100%',
        textAlign: 'left',
        borderBottom: '1px solid var(--mantine-color-gray-3)',
      }}
    >
      <Group gap="sm" wrap="nowrap">
        <Avatar
          size="sm"
          radius="xl"
          color={CATEGORY_COLORS[activity.category]}
        >
          {CATEGORY_ICONS[activity.category]}
        </Avatar>

        <Box style={{ flex: 1, minWidth: 0 }}>
          <Text size="sm" lineClamp={2}>
            {activity.description}
          </Text>
          <Text size="xs" c="dimmed">
            {timeAgo}
          </Text>
        </Box>
      </Group>
    </UnstyledButton>
  );
});

ActivityItem.displayName = 'ActivityItem';

interface ActivityFeedProps {
  maxItems?: number;
  filter?: {
    categories?: ActivityCategory[];
  };
}

export const ActivityFeed = memo(({ maxItems = 20, filter }: ActivityFeedProps) => {
  const { activities, clearActivities, getActivityCount } = useActivity();

  // Filter activities if filter provided
  const filteredActivities = filter?.categories && filter.categories.length > 0
    ? activities.filter(a => filter.categories!.includes(a.category))
    : activities;

  // Limit to maxItems
  const displayedActivities = filteredActivities.slice(0, maxItems);

  const activityCount = filter?.categories && filter.categories.length === 1
    ? getActivityCount(filter.categories[0])
    : getActivityCount();

  if (displayedActivities.length === 0) {
    return (
      <Center p="xl">
        <Stack align="center" gap="sm">
          <Box c="dimmed">
            <IconList size={ICON_SIZE.EMPTY_STATE_SM} />
          </Box>
          <Text size="sm" c="dimmed">
            No recent activity
          </Text>
        </Stack>
      </Center>
    );
  }

  return (
    <Stack gap={0}>
      <Group justify="space-between" px="xs" py="sm">
        <Text size="sm" fw={500}>
          Recent Activity
        </Text>
        <Tooltip label="Clear activity feed">
          <UnstyledButton
            onClick={clearActivities}
            disabled={activityCount === 0}
          >
            <Box c="dimmed">
              <IconX size={ICON_SIZE.SM} />
            </Box>
          </UnstyledButton>
        </Tooltip>
      </Group>

      <Box
        style={{
          maxHeight: 400,
          overflowY: 'auto',
        }}
      >
        <Stack gap={0}>
          {displayedActivities.map((activity) => (
            <ActivityItem key={activity.id} activity={activity} />
          ))}
        </Stack>
      </Box>
    </Stack>
  );
});

ActivityFeed.displayName = 'ActivityFeed';

export default ActivityFeed;
