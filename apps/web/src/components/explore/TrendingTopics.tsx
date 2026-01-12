/**
 * Trending Topics Component
 *
 * Displays trending search topics based on user activity.
 * Shows most searched topics and most bookmarked entities.
 */

import { Group, Stack, Text, Title, UnstyledButton } from '@mantine/core';
import { IconHash, IconTrendingUp } from '@tabler/icons-react';
import { useNavigate } from '@tanstack/react-router';

import { ICON_SIZE } from '@/config/style-constants';
import { useActivity } from '@/contexts/ActivityContext';

import classes from './TrendingTopics.module.css';

interface TrendingTopic {
  topic: string;
  count: number;
}

const extractSearchTopics = (activities: typeof useActivity.prototype.activities): TrendingTopic[] => {
  const searchCounts = new Map<string, number>();

  activities
    .filter((activity) => activity.category === 'search' && activity.query)
    .forEach((activity) => {
      const query = activity.query ?? '';
      searchCounts.set(query, (searchCounts.get(query) || 0) + 1);
    });

  return [...searchCounts.entries()]
    .map(([topic, count]) => ({ topic, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 10);
};

export const TrendingTopics: React.FC = () => {
  const { activities } = useActivity();
  const navigate = useNavigate();

  const trendingTopics = extractSearchTopics(activities);

  const handleTopicClick = (topic: string) => {
    navigate({
      to: '/search',
      search: { q: topic, filter: undefined, search: undefined },
    });
  };

  if (trendingTopics.length === 0) {
    return null;
  }

  return (
    <div style={{ borderTop: '1px solid light-dark(var(--mantine-color-gray-3), var(--mantine-color-dark-4))' }}>
      <Stack gap="sm" p="md">
        <Group gap="xs" align="center">
          <div style={{ color: 'var(--mantine-color-orange-filled)' }}>
            <IconTrendingUp size={ICON_SIZE.SM} />
          </div>
          <Title order={5}>Trending Searches</Title>
        </Group>

        <Group gap="xs" wrap="wrap">
          {trendingTopics.map((item) => (
            <UnstyledButton
              key={item.topic}
              onClick={() => handleTopicClick(item.topic)}
              className={classes.topicButton}
            >
              <Group gap={4}>
                <IconHash size={ICON_SIZE.XXS} />
                <Text size="sm">{item.topic}</Text>
                <Text size="xs" c="dimmed">
                  ({item.count})
                </Text>
              </Group>
            </UnstyledButton>
          ))}
        </Group>
      </Stack>
    </div>
  );
};

