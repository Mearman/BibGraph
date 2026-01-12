/**
 * Random Explorer Component
 *
 * Provides "Surprise Me" functionality to discover random entities.
 * Fetches a random work from OpenAlex and navigates to its detail page.
 */

import { cachedOpenAlex } from '@bibgraph/client';
import { logger } from '@bibgraph/utils';
import { Button, Container, Group, Stack, Text, Title } from '@mantine/core';
import { notifications } from '@mantine/notifications';
import { IconRefresh, IconSparkles } from '@tabler/icons-react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from '@tanstack/react-router';
import { useState } from 'react';

import { ICON_SIZE } from '@/config/style-constants';

interface RandomWork {
  id: string;
  title: string;
  type: string;
}

const fetchRandomWork = async (): Promise<RandomWork> => {
  try {
    // Use a random page to get different results each time
    const randomPage = Math.floor(Math.random() * 1000) + 1;
    const results = await cachedOpenAlex.client.works.searchWorks('', {
      // Random filters to get variety
      filters: {
        'has-fulltext:true': true,
        'from-publication-year': '2020',
      },
      per_page: 50,
      page: randomPage,
    });

    if (results.results.length === 0) {
      throw new Error('No works found');
    }

    // Pick a random work from the results
    const randomIndex = Math.floor(Math.random() * results.results.length);
    const work = results.results[randomIndex];

    return {
      id: work.id,
      title: work.title || 'Untitled',
      type: 'work',
    };
  } catch (error) {
    logger.error('random-explorer', 'Failed to fetch random work', { error });
    throw error;
  }
};

export const RandomExplorer: React.FC = () => {
  const navigate = useNavigate();
  const [isFetching, setIsFetching] = useState(false);

  const { data: randomWork, refetch } = useQuery({
    queryKey: ['random-work'],
    queryFn: fetchRandomWork,
    enabled: false, // Don't fetch automatically
    retry: false,
  });

  const handleSurpriseMe = async () => {
    setIsFetching(true);
    try {
      const result = await refetch();
      if (result.data) {
        navigate({
          to: `/works/${result.data.id.replace('https://openalex.org/', '')}`,
        });
      }
    } catch {
      notifications.show({
        title: 'Failed to load random work',
        message: 'Please try again',
        color: 'red',
      });
    } finally {
      setIsFetching(false);
    }
  };

  const handleRefreshRandom = async () => {
    setIsFetching(true);
    try {
      await refetch();
      notifications.show({
        title: 'New random work loaded',
        message: randomWork ? randomWork.title : 'Click Surprise Me to explore',
        color: 'green',
      });
    } catch {
      notifications.show({
        title: 'Failed to load random work',
        message: 'Please try again',
        color: 'red',
      });
    } finally {
      setIsFetching(false);
    }
  };

  return (
    <Container size="xl">
      <Stack gap="md">
        <div>
          <Title order={3}>Random Explorer</Title>
          <Text c="dimmed">Discover something new by chance</Text>
        </div>

        <Group gap="md">
          <Button
            leftSection={<IconSparkles size={ICON_SIZE.SM} />}
            onClick={handleSurpriseMe}
            loading={isFetching}
            size="lg"
            variant="gradient"
            gradient={{ from: 'blue', to: 'cyan' }}
          >
            Surprise Me
          </Button>

          <Button
            leftSection={<IconRefresh size={ICON_SIZE.SM} />}
            onClick={handleRefreshRandom}
            loading={isFetching}
            variant="light"
          >
            Load New Random
          </Button>

          {randomWork && (
            <Text c="dimmed" size="sm" style={{ flex: 1 }}>
              Ready: <Text span inherit fw={500}>{randomWork.title}</Text>
            </Text>
          )}
        </Group>

        <Text c="dimmed" size="sm">
          Click "Surprise Me" to navigate to a randomly selected research work, or "Load New Random" to preview first.
        </Text>
      </Stack>
    </Container>
  );
};

