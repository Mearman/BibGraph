// @vitest-environment jsdom
/**
 * Regression test for the search page dropping its executed query from the route URL (verified 2026-10-15): a search executed from the page left `#/search?q=` empty, so results were not shareable and a reload lost them. Executing a search must write the query into the route URL, and arriving with `?q=` must run that search straight away.
 */

import type { AutocompleteResult } from '@bibgraph/types';
import type * as BibgraphUtils from '@bibgraph/utils';
import { MantineProvider } from '@mantine/core';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import type * as ReactRouterModule from '@tanstack/react-router';
import { useNavigate, useSearch } from '@tanstack/react-router';
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
const navigate = vi.hoisted(() => vi.fn());

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
    useNavigate: vi.fn(),
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

// The results header's Mantine SegmentedControl loops on ref updates in jsdom; it is presentational chrome outside the URL-state defect, so it is stubbed out here
vi.mock('@/components/search/SearchResultsHeader', () => ({
  SearchResultsHeader: () => null,
}));

// Neutralise the typing-debounce so assertions discriminate the execute handler rather than a delayed debounced call
vi.mock('@bibgraph/utils', async (importOriginal: () => Promise<typeof BibgraphUtils>) => {
  const actual = await importOriginal();
  return {
    ...actual,
    debouncedSearch: vi.fn(),
  };
});

const RESULT: AutocompleteResult = {
  id: 'https://openalex.org/W2741809807',
  display_name: 'A malaria paper',
  hint: null,
  cited_by_count: 10,
  works_count: 1,
  entity_type: 'work',
  external_id: null,
  filter_key: 'ids.openalex',
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

const executeSearch = (query: string) => {
  const searchInput = screen.getByTestId('search-input');
  fireEvent.change(searchInput, { target: { value: query } });
  fireEvent.click(screen.getByTestId('search-button'));
};

describe('search page URL state', () => {
  beforeEach(() => {
    vi.mocked(useSearch).mockReturnValue({ q: '' });
    vi.mocked(useNavigate).mockReturnValue(navigate);
    vi.mocked(navigate).mockReset();
    vi.mocked(mockedAutocompleteGeneral).mockReset();
    vi.mocked(mockedAutocompleteGeneral).mockResolvedValue([RESULT]);
  });

  afterEach(() => {
    cleanup();
    vi.clearAllMocks();
  });

  it('writes the executed query into the route URL', async () => {
    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    executeSearch('malaria');
    await waitFor(() => {
      expect(mockedAutocompleteGeneral).toHaveBeenCalledWith('malaria');
    });

    expect(navigate).toHaveBeenCalledWith({
      to: '/search',
      search: { q: 'malaria', filter: undefined, search: undefined },
    });
  });

  it('runs the query already present in the route URL on arrival', async () => {
    vi.mocked(useSearch).mockReturnValue({ q: 'malaria' });

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    expect(await screen.findByText('A malaria paper')).toBeInTheDocument();
  });

  it('writes a quick search into the route URL too', async () => {
    vi.mocked(useSearch).mockReturnValue({ q: '' });

    render(
      <TestWrapper>
        <SearchPage />
      </TestWrapper>,
    );

    fireEvent.click(screen.getAllByRole('button', { name: 'Climate Science' })[0]);
    await waitFor(() => {
      expect(mockedAutocompleteGeneral).toHaveBeenCalledWith('climate change');
    });

    expect(navigate).toHaveBeenCalledWith({
      to: '/search',
      search: { q: 'climate change', filter: undefined, search: undefined },
    });
  });
});
