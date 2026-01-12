import { Container, Paper, Stack, Text, Title } from '@mantine/core';
import { createLazyFileRoute } from '@tanstack/react-router';

import { FeaturedCollections } from '@/components/explore/FeaturedCollections';
import { RandomExplorer } from '@/components/explore/RandomExplorer';
import { TrendingTopics } from '@/components/explore/TrendingTopics';
import { pageDescription, pageTitle } from '@/styles/layout.css';

const ExplorePage = () => (
  <Container size="xl" py="md">
    <Stack gap="xl">
      {/* Page Header */}
      <div>
        <Title className={pageTitle}>Explore</Title>
        <Text className={pageDescription}>
          Discover academic literature through featured collections, trending topics, and serendipitous exploration
        </Text>
      </div>

      {/* Trending Topics Bar */}
      <TrendingTopics />

      {/* Featured Collections */}
      <Paper shadow="xs" p="md" withBorder>
        <FeaturedCollections />
      </Paper>

      {/* Random Explorer */}
      <Paper shadow="xs" p="md" withBorder>
        <RandomExplorer />
      </Paper>
    </Stack>
  </Container>
);

export const Route = createLazyFileRoute('/explore')({
  component: ExplorePage,
});

export default ExplorePage;
