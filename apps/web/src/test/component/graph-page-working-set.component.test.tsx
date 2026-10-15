/**
 * Component test for the /graph surface with a populated working set: when an enabled source (the system-managed graph list) holds an entity, the page must render the graph surface that shows the node count, not the no-entities empty state. This is the offline-degraded path the live app takes when the entity fetch fails but the working set is populated: the source still yields the node with its stored label. The regression this guards: the progressive-loading restart loop re-rendered the page thousands of times per second and starved the canvas of paint.
 */

import type * as ClientModule from '@bibgraph/client';
import { InMemoryStorageProvider } from '@bibgraph/utils';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as ReactRouterModule from '@tanstack/react-router';
import { cleanup, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { GraphVisualizationProvider } from '@/contexts/GraphVisualizationContext';
import { StorageProviderWrapper } from '@/contexts/storage-provider-context';
import EntityGraphPage from '@/routes/graph.lazy';

// The page renders router links; the test renders destinations as plain anchors so no live router instance is needed.
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterModule>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  };
});

// The entity hydration fetches would hit the live API; the offline-degraded path under test is exactly what the app does when they fail, so they are mocked to reject. Everything else the page pulls from the client stays real.
vi.mock('@bibgraph/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientModule>();
  return {
    ...actual,
    getWorksByIds: async () => {
      await Promise.reject(new Error('offline: no entity hydration in tests'));
    },
  };
});

// The optimised force graph draws to a canvas, which jsdom does not implement; the page contract under test is that node data reaches the surface, so the visualisation is stubbed.
vi.mock('@/components/graph/OptimizedForceGraphVisualization', () => ({
  OptimizedForceGraphVisualization: () => <div data-testid="force-graph-stub" />,
}));

const WORKING_SET_WORK_ID = 'https://openalex.org/W2741809807';

const buildPopulatedProvider = async () => {
  const provider = new InMemoryStorageProvider();
  await provider.initializeSpecialLists();
  await provider.addToGraphList({
    entityType: 'works',
    entityId: WORKING_SET_WORK_ID,
    provenance: 'user',
    label: 'The state of OA',
  });
  return provider;
};

describe('EntityGraphPage with a populated working set', () => {
  afterEach(() => {
    cleanup();
    window.localStorage.clear();
  });

  it('renders the graph surface with the working set node count', async () => {
    window.localStorage.setItem('bibgraph:graph-source-toggles', JSON.stringify(['catalogue:graph-list']));
    const provider = await buildPopulatedProvider();
    const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });

    render(
      <QueryClientProvider client={queryClient}>
        <MantineProvider>
          <StorageProviderWrapper provider={provider}>
            <GraphVisualizationProvider>
              <EntityGraphPage />
            </GraphVisualizationProvider>
          </StorageProviderWrapper>
        </MantineProvider>
      </QueryClientProvider>,
    );

    await waitFor(() => {
      expect(screen.getByText(/1 nodes/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('force-graph-stub')).toBeInTheDocument();
    expect(screen.queryByText(/No Entities to Display/i)).toBeNull();
  });
});
