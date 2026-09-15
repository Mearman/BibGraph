/**
 * IncomingRelationships Component Tests
 * Tests for incoming relationship display with error handling and retry functionality
 */

import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { cleanup,render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach,beforeEach, describe, expect, it, vi } from 'vitest';

// Mock the hooks
vi.mock('@/hooks/use-entity-relationship-queries', () => ({
  useEntityRelationshipQueries: vi.fn(),
}));

vi.mock('@/hooks/use-entity-relationships-from-data', () => ({
  useEntityRelationshipsFromData: vi.fn(),
}));

// Import after mocking
import { useEntityRelationshipQueries } from '@/hooks/use-entity-relationship-queries';
import { useEntityRelationshipsFromData } from '@/hooks/use-entity-relationships-from-data';

import { IncomingRelationships } from './IncomingRelationships';

// Helper to render with providers
const renderWithProvider = (component: React.ReactElement) => {
  const queryClient = new QueryClient({
    defaultOptions: {
      queries: {
        retry: false,
      },
    },
  });

  return render(
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{component}</MantineProvider>
    </QueryClientProvider>
  );
};

describe('IncomingRelationships', () => {
  const mockEntityId = 'W123456789';
  const mockEntityType = 'works';

  beforeEach(() => {
    // Clear all mocks before each test
    vi.clearAllMocks();

    // Reset window.location.reload mock
    Object.defineProperty(window, 'location', {
      value: { reload: vi.fn() },
      writable: true,
      configurable: true,
    });

    // Set default mock return values for the additional hooks
    vi.mocked(useEntityRelationshipQueries).mockReturnValue({
      incoming: [],
      outgoing: [],
      incomingCount: 0,
      outgoingCount: 0,
      loading: false,
      error: undefined,
      loadMore: vi.fn(),
      goToPage: vi.fn(),
      setPageSize: vi.fn(),
      isLoadingMore: vi.fn(() => false),
    });

    vi.mocked(useEntityRelationshipsFromData).mockReturnValue({
      incoming: [],
      outgoing: [],
      incomingCount: 0,
      outgoingCount: 0,
    });
  });

  afterEach(() => {
    cleanup();
    vi.restoreAllMocks();
  });

  describe('Error State with Retry', () => {
    it('should render error message when error occurs', () => {
      // Mock hook to return error state
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Network error occurred'),
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('incoming-relationships-error')).toBeInTheDocument();
      expect(screen.getByText(/Failed to load relationships: Network error occurred/i)).toBeInTheDocument();
    });

    it('should render retry button when error occurs', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Network error'),
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const retryButton = screen.getByTestId('incoming-relationships-retry-button');
      expect(retryButton).toBeInTheDocument();
      expect(retryButton).toHaveTextContent('Retry');
    });

    it('should call window.location.reload when retry button is clicked', async () => {
      const user = userEvent.setup();
      const reloadSpy = vi.fn(() => { /* no-op */ });
      window.location.reload = reloadSpy;

      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Failed to load relationships'),
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const retryButton = screen.getByTestId('incoming-relationships-retry-button');
      await user.click(retryButton);

      await waitFor(() => {
        expect(reloadSpy).toHaveBeenCalledOnce();
      });
    });

    it('should render error with proper styling', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: new Error('Failed to load relationships'),
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      const errorContainer = screen.getByTestId('incoming-relationships-error');
      expect(errorContainer).toHaveClass('mantine-Paper-root');
    });
  });

  describe('Loading State', () => {
    it('should render loading skeleton when loading is true', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: true,
        error: undefined,
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      expect(screen.getByTestId('incoming-relationships-loading')).toBeInTheDocument();
      expect(screen.getByText('Incoming Relationships')).toBeInTheDocument();
    });
  });

  describe('Empty State', () => {
    it('should render nothing when no incoming relationships and no error', () => {
      vi.mocked(useEntityRelationshipQueries).mockReturnValue({
        incoming: [],
        outgoing: [],
        incomingCount: 0,
        outgoingCount: 0,
        loading: false,
        error: undefined,
        loadMore: vi.fn(),
        goToPage: vi.fn(),
        setPageSize: vi.fn(),
        isLoadingMore: vi.fn(() => false),
      });

      renderWithProvider(<IncomingRelationships entityId={mockEntityId} entityType={mockEntityType} />);

      // Component should not render its sections when there are no relationships
      expect(screen.queryByTestId('incoming-relationships')).not.toBeInTheDocument();
      expect(screen.queryByTestId('incoming-relationships-error')).not.toBeInTheDocument();
      expect(screen.queryByTestId('incoming-relationships-loading')).not.toBeInTheDocument();
    });
  });
});
