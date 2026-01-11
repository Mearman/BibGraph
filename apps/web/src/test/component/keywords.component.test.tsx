import { cachedOpenAlex } from '@bibgraph/client';
import { InMemoryStorageProvider } from '@bibgraph/utils';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { useParams, useSearch } from '@tanstack/react-router';
import { cleanup,render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

import { StorageProviderWrapper } from '@/contexts/storage-provider-context';

// Mock cachedOpenAlex client
vi.mock('@bibgraph/client', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@bibgraph/client')>();
  return {
    ...actual,
    cachedOpenAlex: {
      client: {
        keywords: {
          getKeyword: vi.fn(),
        },
      },
    },
  };
});

// Mock router hooks and Link component
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof import('@tanstack/react-router')>();
  return {
    ...actual,
    useParams: vi.fn(),
    useSearch: vi.fn(),
    useLocation: vi.fn().mockReturnValue({ pathname: '/keywords/artificial-intelligence', search: '' }),
    Link: ({ children, ...props }: any) => <a {...props}>{children}</a>,
  };
});

// Mock the relationship hooks used by the components
vi.mock('@/hooks/use-entity-relationship-queries', () => ({
  useEntityRelationshipQueries: vi.fn(() => ({
    incoming: [
      {
        id: 'authorship',
        type: 'authorship',
        label: 'Authorship',
        description: 'Authors who created works with this keyword',
        items: [],
        totalCount: 5,
        isPartialData: false,
        direction: 'incoming',
        pagination: {
          currentPage: 0,
          pageSize: 25,
          totalPages: 1,
        },
      },
    ],
    outgoing: [
      {
        id: 'work_has_keyword',
        type: 'work_has_keyword',
        label: 'Has Keyword',
        description: 'Works tagged with this keyword',
        items: [],
        totalCount: 10,
        isPartialData: false,
        direction: 'outgoing',
        pagination: {
          currentPage: 0,
          pageSize: 25,
          totalPages: 1,
        },
      },
    ],
    incomingCount: 5,
    outgoingCount: 10,
    loading: false,
    error: undefined,
    // Pagination controls
    loadMore: vi.fn(),
    goToPage: vi.fn(),
    setPageSize: vi.fn(),
    isLoadingMore: vi.fn(() => false),
  })),
}));

vi.mock('@/hooks/use-entity-relationships-from-data', () => ({
  useEntityRelationshipsFromData: vi.fn(() => ({
    incoming: [],
    outgoing: [],
    incomingCount: 0,
    outgoingCount: 0,
  })),
}));

import KeywordRoute from '@/routes/keywords/$keywordId.lazy';

// Synthetic mock data for keyword
const mockKeyword = {
  id: 'https://openalex.org/keywords/artificial-intelligence',
  display_name: 'Artificial Intelligence',
  cited_by_count: 50_000,
  works_count: 10_000,
  counts_by_year: [],
};

describe('Keywords Route - EntityDetailLayout Migration', () => {
  let queryClient: QueryClient;
  let storage: InMemoryStorageProvider;

  beforeEach(async () => {
    queryClient = new QueryClient({
      defaultOptions: {
        queries: { retry: false, staleTime: Infinity },
        mutations: { retry: false },
      },
    });

    storage = new InMemoryStorageProvider();
    await storage.initializeSpecialLists();

    // Mock useParams
    vi.mocked(useParams).mockReturnValue({ keywordId: 'artificial-intelligence' });

    // Mock useSearch
    vi.mocked(useSearch).mockReturnValue({});

    // Mock successful API response by default
    vi.mocked(cachedOpenAlex.client.keywords.getKeyword).mockResolvedValue(
      mockKeyword as any
    );
  });

  const TestWrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <StorageProviderWrapper provider={storage}>
        <MantineProvider>
          {children}
        </MantineProvider>
      </StorageProviderWrapper>
    </QueryClientProvider>
  );

  afterEach(() => {
    cleanup();
    queryClient.clear();
    vi.clearAllMocks();
  });

  describe('T003: EntityDetailLayout Component', () => {
    it('should use EntityDetailLayout component', async () => {
      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      // Wait for data to load
      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Artificial Intelligence' })).toBeInTheDocument();
      });

      // Verify the route uses EntityDetailLayout by checking for expected structure
      // EntityDetailLayout renders the display name as an h1
      expect(screen.getByRole('heading', { name: 'Artificial Intelligence' })).toBeInTheDocument();
    });

    it('should use LoadingState component during fetch', async () => {
      // Setup slow-resolving mock
      vi.mocked(cachedOpenAlex.client.keywords.getKeyword).mockImplementation(
        () => new Promise(() => {}) // Never resolves
      );

      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      // Expect LoadingState component to be rendered
      expect(screen.getByText('Loading Keyword...')).toBeInTheDocument();
      expect(screen.getByText('artificial-intelligence')).toBeInTheDocument();
    });

    it('should use ErrorState component on error', async () => {
      // Setup error mock
      vi.mocked(cachedOpenAlex.client.keywords.getKeyword).mockRejectedValue(
        new Error('Network error')
      );

      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      // Wait for error to be handled
      await waitFor(() => {
        expect(screen.getByText('Error Loading Keyword')).toBeInTheDocument();
      });

      expect(screen.getByText('artificial-intelligence')).toBeInTheDocument();
      expect(screen.getByText(/Error:.*Network error/)).toBeInTheDocument();
    });

    it('should render RelationshipCounts component', async () => {
      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Artificial Intelligence' })).toBeInTheDocument();
      });

      // RelationshipCounts should display the counts (mocked as 5 incoming, 10 outgoing)
      // The component renders badges with "5 Incoming" and "10 Outgoing"
      expect(screen.getByText('5 Incoming')).toBeInTheDocument();
      expect(screen.getByText('10 Outgoing')).toBeInTheDocument();
      expect(screen.getByText('15 Total')).toBeInTheDocument();
    });

    it('should render IncomingRelationships component', async () => {
      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Artificial Intelligence' })).toBeInTheDocument();
      });

      // IncomingRelationships should be rendered
      // When there are no relationships, it renders nothing, so we verify by checking the section exists
      // Look for the "Incoming Relationships" heading
      expect(screen.getByText('Incoming Relationships')).toBeInTheDocument();
    });

    it('should render OutgoingRelationships component', async () => {
      render(
        <TestWrapper>
          <KeywordRoute />
        </TestWrapper>
      );

      await waitFor(() => {
        expect(screen.getByRole('heading', { name: 'Artificial Intelligence' })).toBeInTheDocument();
      });

      // OutgoingRelationships should be rendered
      // Look for the "Outgoing Relationships" heading
      expect(screen.getByText('Outgoing Relationships')).toBeInTheDocument();
    });
  });
});
