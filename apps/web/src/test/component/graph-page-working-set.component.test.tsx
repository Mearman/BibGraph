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

// The entity hydration fetches would hit the live API; the offline-degraded path under test is exactly what the app does when they fail, so they are mocked. `pending` holds the promise open forever, which is the live app's state while the transport retries a throttled batched works fetch (HTTP 429 with long backoff). Everything else the page pulls from the client stays real.
const worksByIdsBehaviour = vi.hoisted(() => ({ mode: 'reject' }));
vi.mock('@bibgraph/client', async (importOriginal) => {
  const actual = await importOriginal<typeof ClientModule>();
  return {
    ...actual,
    getWorksByIds: async () => {
      if (worksByIdsBehaviour.mode === 'pending') {
        // A sustained-throttle retry chain: no settlement within any observation window.
        await new Promise(() => {
          return undefined;
        });
      }
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
    worksByIdsBehaviour.mode = 'reject';
  });

  const renderPage = (provider: InMemoryStorageProvider) => {
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
  };

  it('renders the graph surface with the working set node count', async () => {
    window.localStorage.setItem('bibgraph:graph-source-toggles', JSON.stringify(['catalogue:graph-list']));
    const provider = await buildPopulatedProvider();
    renderPage(provider);

    await waitFor(() => {
      expect(screen.getByText(/1 nodes/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('force-graph-stub')).toBeInTheDocument();
    expect(screen.queryByText(/No Entities to Display/i)).toBeNull();
  });

  it('renders working-set nodes while entity hydration is still pending, so a throttled network cannot blank the canvas', async () => {
    // The live failure: under sustained HTTP 429 the batched works fetch retries with long backoff, so its promise stays pending far past any observation window. The working set is storage-backed and must reach the canvas without waiting for that settlement.
    worksByIdsBehaviour.mode = 'pending';
    window.localStorage.setItem('bibgraph:graph-source-toggles', JSON.stringify(['catalogue:graph-list']));
    const provider = await buildPopulatedProvider();
    renderPage(provider);

    await waitFor(() => {
      expect(screen.getByText(/1 nodes/i)).toBeInTheDocument();
    });
    expect(screen.getByTestId('force-graph-stub')).toBeInTheDocument();
    expect(screen.queryByText(/No Entities to Display/i)).toBeNull();
  });

  it('does not claim enabled sources are empty when a populated source loaded zero entities', async () => {
    // A bookmarked work whose hydration fails is dropped by the bookmarks source, so the panel reports 1 entity while the canvas holds none. The settled surface must not tell the user their sources "don't contain any entities".
    window.localStorage.setItem('bibgraph:graph-source-toggles', JSON.stringify(['catalogue:bookmarks']));
    const provider = new InMemoryStorageProvider();
    await provider.initializeSpecialLists();
    await provider.addBookmark({ entityType: 'works', entityId: WORKING_SET_WORK_ID });
    renderPage(provider);

    await waitFor(() => {
      expect(screen.getByText(/could not be loaded/i)).toBeInTheDocument();
    });
    expect(screen.queryByText(/don't contain any entities/i)).toBeNull();
  });
});
