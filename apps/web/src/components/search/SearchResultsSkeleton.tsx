/**
 * Search Results Loading Skeleton
 *
 * Provides skeleton loading states for search results with proper structure
 * that matches the actual search results layout for smooth transitions.
 */

import { Box, Group, Stack, Text } from '@mantine/core';

import { CardSkeleton, DataTableSkeleton, ListSkeleton, Skeleton } from '@/components/ui/LoadingSkeleton';

interface SearchResultsSkeletonProperties {
  viewType?: 'list' | 'grid' | 'table';
  items?: number;
  title?: string;
}

/**
 * Skeleton for search results loading state
 */
export const SearchResultsSkeleton = ({
  viewType = 'list',
  items = 8,
  title = 'Loading search results...'
}: SearchResultsSkeletonProperties) => {
  const renderListSkeleton = () => (
    <Box>
      <Text
        size="sm"
        c="var(--mantine-color-dimmed)"
        ta="center"
        py="md"
      >
        {title}
      </Text>
      <ListSkeleton items={items} />
    </Box>
  );

  const renderGridSkeleton = () => (
    <Box>
      <Text
        size="sm"
        c="var(--mantine-color-dimmed)"
        ta="center"
        py="md"
      >
        {title}
      </Text>
      <div
        style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fill, minmax(300px, 1fr))',
          gap: '16px',
          padding: '0 16px',
        }}
      >
        {Array.from({ length: items }).map((_, index) => (
          <CardSkeleton key={index} />
        ))}
      </div>
    </Box>
  );

  const renderTableSkeleton = () => (
    <Box>
      <Text
        size="sm"
        c="var(--mantine-color-dimmed)"
        ta="center"
        py="md"
      >
        {title}
      </Text>
      <Box px="md">
        <DataTableSkeleton rows={items} columns={5} />
      </Box>
    </Box>
  );

  switch (viewType) {
    case 'grid':
      return renderGridSkeleton();
    case 'table':
      return renderTableSkeleton();
    case 'list':
    default:
      return renderListSkeleton();
  }
};

/**
 * Filter results skeleton for search filters
 */
export const FilterResultsSkeleton = () => (
  <Box
    p="md"
    style={{
      border: '1px solid var(--mantine-color-gray-2)',
      borderRadius: '8px',
      backgroundColor: 'var(--mantine-color-body)',
    }}
  >
    <Stack gap="md">
      {/* Filter header */}
      <Group justify="space-between">
        <Skeleton width={120} height={24} />
        <Skeleton width={80} height={24} />
      </Group>

      {/* Filter categories */}
      <Stack gap="sm">
        <Group gap="xs" style={{ flexWrap: 'wrap' }}>
          <Skeleton width={60} height={24} />
          <Skeleton width={80} height={24} />
          <Skeleton width={45} height={24} />
        </Group>
        <Group gap="xs" style={{ flexWrap: 'wrap' }}>
          <Skeleton width={70} height={24} />
          <Skeleton width={90} height={24} />
        </Group>
      </Stack>
    </Stack>
  </Box>
);