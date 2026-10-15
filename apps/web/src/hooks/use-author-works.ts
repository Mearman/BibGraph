/**
 * Author works query: the author page's works list and collaboration network both consume the same paginated works query, so one page of works is fetched once per page view.
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { Work } from "@bibgraph/types";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";

/**
Works per page for the author page's works list.
 */
export const AUTHOR_WORKS_PAGE_SIZE = 25;

export interface AuthorWorksViewData {
  works: Work[];
  totalWorks: number;
  page: number;
  pageCount: number;
  isLoading: boolean;
  error: Error | null;
}

export interface AuthorWorksResult extends AuthorWorksViewData {
  /**
  Moves the works query to another page (1-based).
   */
  setPage: (page: number) => void;
  /**
  Re-runs the works query, offered by the sub-panels' stalled surface once a load outlives the stall bound.
   */
  retry: () => void;
}

/**
 * Fetch one page of the author's works, most recent first, and expose pagination state for the works list.
 */
export const useAuthorWorks = (authorId: string, enabled: boolean): AuthorWorksResult => {
  const [page, setPage] = useState(1);
  const queryClient = useQueryClient();

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ["author-works", authorId, page],
    queryFn: async () =>
      cachedOpenAlex.client.works.getWorks({
        filter: `author.id:${authorId}`,
        per_page: AUTHOR_WORKS_PAGE_SIZE,
        page,
        sort: "publication_date:desc",
      }),
    enabled: enabled && authorId !== "",
  });

  const totalWorks = data?.meta.count ?? 0;
  const pageCount =
    totalWorks === 0 ? 1 : Math.ceil(totalWorks / (data?.meta.per_page ?? AUTHOR_WORKS_PAGE_SIZE));

  return {
    works: data?.results ?? [],
    totalWorks,
    page,
    pageCount,
    isLoading,
    error: error ?? null,
    setPage,
    // Cancel-then-refetch: react-query cannot restart a fetch that is still in flight (the final walk found Retry on the stalled surface a no-op while the transport's backoff loop held the query pending), so cancel first to make the button take effect immediately.
    retry: () => {
      void (async () => {
        await queryClient.cancelQueries({ queryKey: ["author-works", authorId] });
        await refetch();
      })();
    },
  };
};
