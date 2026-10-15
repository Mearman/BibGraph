// @vitest-environment jsdom
/**
 * Regression test for the search page's false-empty and contradictory-status defect (verified 2026-10-15): executing a typed query showed "No entities found" beside "Ready to search" for the same term. The no-results state must only appear after a completed search returned zero results, the ready status must disappear once a search has executed, Enter must execute the search, and a completed search with matches must render them.
 */

import type { AutocompleteResult } from '@bibgraph/types';
import type * as BibgraphUtils from '@bibgraph/utils';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as ReactRouterModule from '@tanstack/react-router';
import { useSearch } from '@tanstack/react-router';
import { cleanup, fireEvent, render, screen, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

// Mock browser APIs Mantine relies on before importing any component code
global.ResizeObserver = vi.fn().mockImplementation(() => ({
  observe: vi.fn(),
  unobserve: vi.fn(),
  disconnect: vi.fn(),
}));

Object.defineProperty(window, 'matchMedia', {
  writable: true,
  value: vi.fn().mockImplementation((query: string) => ({
    matches: false,
    media: query,
    onchange: null,
    addListener: vi.fn(),
    removeListener: vi.fn(),
    addEventListener: vi.fn(),
    removeEventListener: vi.fn(),
    dispatchEvent: vi.fn(),
  })),
});

import SearchPage from '@/routes/search.lazy';

// Mock the OpenAlex client at the autocomplete boundary so the real search-utils, useSearchPage and route wiring run
const mockedAutocompleteGeneral = vi.hoisted(() =>
  vi.fn<(query: string) => Promise<AutocompleteResult[]>>(),
);
vi.mock('@bibgraph/client', () => ({
  cachedOpenAlex: {
    client: {
      autocomplete: {
        autocompleteGeneral: mockedAutocompleteGeneral,
      },
    },
  },
}));

// Mock router hooks: the lazy route module registers itself without a live router instance
vi.mock('@tanstack/react-router', async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterModule>();
  return {
    ...actual,
    useSearch: vi.fn(),
    // The page now writes the executed query into the route URL; without a live router there is nothing to navigate, so the call is a no-op stub.
    useNavigate: vi.fn(() => vi.fn()),
    Link: ({ children }: { children: ReactNode }) => <span>{children}</span>,
  };
});

vi.mock('@/contexts/ActivityContext', () => ({
  useActivity: () => ({ addActivity: vi.fn() }),
}));

vi.mock('@/hooks/useGraphList', () => ({
  useGraphList: () => ({
    nodes: [],
    addNode: vi.fn(),
    removeNode: vi.fn(),
    loading: false,
  }),
}));

vi.mock('@/hooks/user-interactions', () => ({
  useUserInteractions: () => ({
    isBookmarked: false,
    bookmarkSearch: vi.fn(),
    unbookmarkSearch: vi.fn(),
  }),
}));

vi.mock('@/hooks/useSearchHistory', () => ({
  useSearchHistory: () => ({
    addSearchQuery: vi.fn(),
    searchHistory: [],
    clearSearchHistory: vi.fn(),
    removeSearchQuery: vi.fn(),
    isLoading: false,
  }),
}));

// The results header's Mantine SegmentedControl loops on ref updates in jsdom; it is presentational chrome outside the execute-path defect, so it is stubbed out here
vi.mock('@/components/search/SearchResultsHeader', () => ({
  SearchResultsHeader: () => null,
}));

// Neutralise the typing-debounce so the Enter-key test discriminates the Enter handler rather than the delayed debounced call
vi.mock('@bibgraph/utils', async (importOriginal: () => Promise<typeof BibgraphUtils>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    debouncedSearch: vi.fn(),
  };
});

const TEAHAN_RESULT: AutocompleteResult = {
  id: 'https://openalex.org/A5025875274',
  display_name: 'William J. Teahan',
  hint: null,
  cited_by_count: 1327,
  works_count: 115,
  entity_type: 'author',
  external_id: null,
  filter_key: 'authorships.author.id',
};

const TestWrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return (
    <QueryClientProvider client={queryClient}>
      <MantineProvider>{children}</MantineProvider>
    </QueryClientProvider>
  );
};

const executeSearch = async (query: string) => {
  const searchInput = screen.getByTestId('search-input');
  fireEvent.change(searchInput, { target: { value: query } });
  fireEvent.click(screen.getByTestId('search-button'));
  await waitFor(() => {
    expect(mockedAutocompleteGeneral).toHaveBeenCalledWith('teahan');
  });
};

describe('search page execute path', () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({ q: '' });
    vi.mocked(mockedAutocompleteGeneral).mockReset();
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('executes the search and renders matched results for a query with live matches', async () => {
    vi.mocked(mockedAutocompleteGeneral).mockResolvedValue([TEAHAN_RESULT]);

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    await executeSearch('Teahan');

    await waitFor(() => {
      expect(screen.getByText('William J. Teahan')).toBeInTheDocument();
    });
    expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
  });

  it('does not show the no-results state while the search is still in flight', async () => {
    vi.mocked(mockedAutocompleteGeneral).mockImplementation(
      async () => await new Promise<AutocompleteResult[]>(() => undefined),
    );

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    await executeSearch('Teahan');

    expect(screen.queryByTestId('no-results')).not.toBeInTheDocument();
  });

  it('shows the no-results state without the ready status after a completed zero-result search', async () => {
    vi.mocked(mockedAutocompleteGeneral).mockResolvedValue([]);

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    await executeSearch('Teahan');

    await waitFor(() => {
      expect(screen.getByTestId('no-results')).toBeInTheDocument();
    });
    expect(
      screen.queryByText(/Ready to search for "teahan"/),
    ).not.toBeInTheDocument();
  });

  it('executes the search when Enter is pressed in the search input', async () => {
    vi.mocked(mockedAutocompleteGeneral).mockResolvedValue([TEAHAN_RESULT]);

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    const searchInput = screen.getByTestId('search-input');
    fireEvent.change(searchInput, { target: { value: 'Teahan' } });
    fireEvent.keyDown(searchInput, { key: 'Enter' });

    await waitFor(() => {
      expect(mockedAutocompleteGeneral).toHaveBeenCalledWith('teahan');
    });
  });
});
