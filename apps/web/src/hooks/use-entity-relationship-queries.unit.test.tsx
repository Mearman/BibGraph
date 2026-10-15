// @vitest-environment jsdom

/**
 * Unit tests for the entity relationship queries hook: refetch must re-invoke the relationship loader so the relationships panel's Retry button actually refires the API requests (2026-10-15: retry used to reload the page, which cleared the error without refetching).
 */

import type * as BibgraphTypesModule from '@bibgraph/types';
import { type RelationshipQueryConfig,RelationType } from '@bibgraph/types';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { act, renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

vi.mock('@bibgraph/types', async (importOriginal) => {
  const actual = await importOriginal<typeof BibgraphTypesModule>();
  return {
    ...actual,
    getInboundQueries: vi.fn(),
    getOutboundQueries: vi.fn(),
  };
});

vi.mock('./relationship-query-execution', () => ({
  executeRelationshipQuery: vi.fn(),
}));

vi.mock('./relationship-query-prefetch', () => ({
  prefetchEntity: vi.fn(),
}));

import { getInboundQueries, getOutboundQueries } from '@bibgraph/types';

import { executeRelationshipQuery } from './relationship-query-execution';
import { useEntityRelationshipQueries } from './use-entity-relationship-queries';

const INBOUND_CONFIG: RelationshipQueryConfig = {
  source: 'api',
  type: RelationType.AUTHORSHIP,
  targetType: 'works',
  label: 'Works Authored',
  buildFilter: (id: string) => `author.id:${id}`,
  pageSize: 25,
  select: ['id', 'display_name', 'publication_year', 'type', 'cited_by_count'],
};

const QUERY_RESULT = {
  results: [{ id: 'https://openalex.org/W2741809807', display_name: 'The state of OA' }],
  totalCount: 1,
  page: 1,
  perPage: 25,
};

const createWrapper = () => {
  const queryClient = new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });
  return ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
};

describe('useEntityRelationshipQueries', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    vi.mocked(getInboundQueries).mockReturnValue([INBOUND_CONFIG]);
    vi.mocked(getOutboundQueries).mockReturnValue([]);
    vi.mocked(executeRelationshipQuery).mockResolvedValue(QUERY_RESULT);
  });

  it('refetch re-invokes the relationship loader instead of leaving the failed result in place', async () => {
    const { result } = renderHook(() => useEntityRelationshipQueries('A5017898742', 'authors'), {
      wrapper: createWrapper(),
    });

    await waitFor(() => {
      expect(result.current.loading).toBe(false);
    });
    expect(executeRelationshipQuery).toHaveBeenCalledTimes(1);

    await act(async () => {
      await result.current.refetch();
    });

    await waitFor(() => {
      expect(executeRelationshipQuery).toHaveBeenCalledTimes(2);
    });
  });
});
