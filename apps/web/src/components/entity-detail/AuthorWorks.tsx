/**
 * Author page works list: the paginated works of one author, each row linking to the work's own page. Presentational; the author route owns the query through useAuthorWorks.
 */

import { Anchor, Badge, Group, List, Loader, Pagination, Paper, Stack, Text, Title } from '@mantine/core';
import { IconWriting } from '@tabler/icons-react';
import { Link } from '@tanstack/react-router';

import { ICON_SIZE } from '@/config/style-constants';
import type { AuthorWorksViewData } from '@/hooks/use-author-works';
import { useLoadStall } from '@/hooks/use-load-stall';

import { toShortOpenAlexId } from './collaboration-data';
import { StalledLoadNotice } from './StalledLoadNotice';

interface AuthorWorksProperties {
  /**
  Query result rendered by this list
   */
  view: AuthorWorksViewData;
  /**
  Moves the query to another page (1-based)
   */
  onPageChange: (page: number) => void;
  /**
  Re-run the works query; offered on the stalled surface once the load outlives the stall bound
   */
  onRetry?: () => void;
}

export const AuthorWorks = ({ view, onPageChange, onRetry }: AuthorWorksProperties) => {
  const { works, totalWorks, page, pageCount, isLoading, error } = view;
  // Sustained throttling holds the works query pending through the transport's retries; past the shared stall bound the spinner yields to the honest still-waiting surface
  const isStalled = useLoadStall(isLoading);

  return (
    <Paper p="xl" radius="xl">
      <Stack gap="lg">
        <Group justify="space-between" align="center">
          <Group gap="sm">
            <IconWriting size={ICON_SIZE.XL} color="var(--mantine-color-blue-6)" />
            <Title order={3}>Works</Title>
          </Group>
          <Badge variant="light" size="sm">{totalWorks.toLocaleString()} works</Badge>
        </Group>

        {isLoading && isStalled ? (
          <StalledLoadNotice onRetry={onRetry} />
        ) : isLoading ? (
          <Group gap="sm" justify="center" py="xl">
            <Loader size="sm" />
            <Text size="sm" c="dimmed">Loading works...</Text>
          </Group>
        ) : error !== null ? (
          <Text size="sm" c="dimmed" py="xl">
            Works could not be loaded: {error.message}
          </Text>
        ) : works.length === 0 ? (
          <Text size="sm" c="dimmed" ta="center" py="xl">
            OpenAlex reports no works for this author.
          </Text>
        ) : (
          <>
            <List listStyleType="none" spacing="sm" data-testid="author-works-list">
              {works.map((work) => (
                <List.Item key={work.id}>
                  <Group justify="space-between" gap="sm" wrap="nowrap">
                    <Anchor
                      component={Link}
                      to={`/works/${toShortOpenAlexId(work.id)}`}
                      size="sm"
                      style={{ wordBreak: 'break-word' }}
                    >
                      {work.display_name}
                    </Anchor>
                    {work.publication_year !== null && work.publication_year !== undefined && (
                      <Text size="xs" c="dimmed" style={{ flexShrink: 0 }}>
                        {work.publication_year}
                      </Text>
                    )}
                  </Group>
                </List.Item>
              ))}
            </List>

            {pageCount > 1 && (
              <nav aria-label="Works pagination">
                <Group justify="center">
                  <Pagination
                    value={page}
                    total={pageCount}
                    onChange={onPageChange}
                  />
                </Group>
              </nav>
            )}
          </>
        )}
      </Stack>
    </Paper>
  );
};
