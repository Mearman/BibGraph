/**
 * Unit tests for the author-works query hook: it queries the works endpoint filtered by author id with the shared page size, follows the page state, and derives the page count from the API's total count.
 */

import type { Work } from "@bibgraph/types";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it, vi } from "vitest";

const { getWorks } = vi.hoisted(() => ({ getWorks: vi.fn() }));

vi.mock("@bibgraph/client", () => ({
  cachedOpenAlex: {
    client: {
      works: {
        getWorks,
      },
    },
  },
}));

import { AUTHOR_WORKS_PAGE_SIZE, useAuthorWorks } from "./use-author-works";

const makeResponse = (count: number, page: number) => ({
  results: [
    {
      id: `https://openalex.org/W${String(page)}`,
      display_name: `Work page ${String(page)}`,
    },
  ] as Work[],
  meta: { count, db_response_time_ms: 5, page, per_page: AUTHOR_WORKS_PAGE_SIZE },
});

const wrapper = ({ children }: { children: ReactNode }) => {
  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
};

describe("useAuthorWorks", () => {
  it("queries works filtered by author id at the shared page size", async () => {
    getWorks.mockResolvedValue(makeResponse(1, 1));

    const { result } = renderHook(() => useAuthorWorks("A5017898742", true), { wrapper });

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(getWorks).toHaveBeenCalledWith(
      expect.objectContaining({
        filter: "author.id:A5017898742",
        per_page: AUTHOR_WORKS_PAGE_SIZE,
        page: 1,
      }),
    );
    expect(result.current.works).toHaveLength(1);
  });

  it("derives the page count from the reported total", async () => {
    // Two full pages plus one work spills onto a third page.
    const totalWorks = AUTHOR_WORKS_PAGE_SIZE * 2 + 1;
    const expectedPageCount = 3;
    getWorks.mockResolvedValue(makeResponse(totalWorks, 1));

    const { result } = renderHook(() => useAuthorWorks("A5017898742", true), { wrapper });

    await waitFor(() => { expect(result.current.isLoading).toBe(false); });

    expect(result.current.totalWorks).toBe(totalWorks);
    expect(result.current.pageCount).toBe(expectedPageCount);
  });

  it("does not query while disabled", async () => {
    getWorks.mockClear();

    renderHook(() => useAuthorWorks("A5017898742", false), { wrapper });

    await Promise.resolve();
    expect(getWorks).not.toHaveBeenCalled();
  });
});
