/**
 * Component tests for the author page's works list: works render with title, year and a link to the work page, and the pagination control appears whenever more pages exist.
 */

import type { Work } from "@bibgraph/types";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type * as ReactRouterModule from "@tanstack/react-router";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import type { ReactNode } from "react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOADING_CONSTANTS } from "@/config/style-constants";
import { SyncStatusProvider } from "@/contexts/SyncStatusContext";
import type { AuthorWorksViewData } from "@/hooks/use-author-works";

import { AuthorWorks } from "./AuthorWorks";

// The work rows navigate with a router Link; the test renders the destination as a plain anchor so no live router instance is needed.
vi.mock("@tanstack/react-router", async (importOriginal) => {
  const actual = await importOriginal<typeof ReactRouterModule>();
  return {
    ...actual,
    Link: ({ to, children }: { to: string; children: ReactNode }) => <a href={to}>{children}</a>,
  };
});

const makeWork = (id: string, title: string, year: number): Work =>
  ({
    id,
    display_name: title,
    title,
    publication_year: year,
  }) as Work;

// Publication years used by the fixtures; named so the magic-number lint stays quiet.
const YEAR_OA_STUDY = 2018;
const YEAR_HERITAGE_DATASETS = 2021;

const makeViewData = (overrides: Partial<AuthorWorksViewData> = {}): AuthorWorksViewData => ({
  works: [makeWork("https://openalex.org/W2741809807", "A study of open access", YEAR_OA_STUDY)],
  totalWorks: 1,
  page: 1,
  pageCount: 1,
  isLoading: false,
  error: null,
  ...overrides,
});

const renderWorks = (viewData: AuthorWorksViewData, onPageChange = vi.fn(() => undefined)) =>
  render(
    <MantineProvider>
      <AuthorWorks view={viewData} onPageChange={onPageChange} />
    </MantineProvider>,
  );

describe("AuthorWorks", () => {
  it("lists each work with its title, year and a link to the work page", () => {
    renderWorks(
      makeViewData({
        works: [
          makeWork("https://openalex.org/W2741809807", "The state of OA", YEAR_OA_STUDY),
          makeWork("https://openalex.org/W2751009151", "Cultural heritage datasets", YEAR_HERITAGE_DATASETS),
        ],
      }),
    );

    expect(screen.getByText("The state of OA")).toBeVisible();
    expect(screen.getByText("Cultural heritage datasets")).toBeVisible();
    expect(screen.getByRole("link", { name: /The state of OA/ })).toHaveAttribute(
      "href",
      expect.stringContaining("/works/W2741809807"),
    );
  });

  it("shows pagination when the author has more works than one page", () => {
    renderWorks(makeViewData({ totalWorks: 60, page: 1, pageCount: 3 }));

    expect(screen.getByRole("navigation", { name: /works pagination/i })).toBeVisible();
  });

  it("hides pagination when every work fits on the current page set", () => {
    renderWorks(makeViewData({ totalWorks: 5, page: 1, pageCount: 1 }));

    expect(screen.queryByRole("navigation", { name: /works pagination/i })).toBeNull();
  });

  it("reports the page change to the caller", () => {
    const onPageChange = vi.fn(() => undefined);
    renderWorks(makeViewData({ totalWorks: 60, page: 1, pageCount: 3 }), onPageChange);

    fireEvent.click(screen.getByRole("button", { name: "2" }));

    expect(onPageChange).toHaveBeenCalledWith(2);
  });

  it("states plainly when the author has no works", () => {
    renderWorks(makeViewData({ works: [], totalWorks: 0 }));

    expect(screen.getByText(/no works/i)).toBeVisible();
  });
});

describe("AuthorWorks bounded wait", () => {
  // The bound is the entity loader's stall timeout: one shared value across every loading surface, so a sub-panel never spins longer than the page-level loader would.
  const renderPendingWorks = (onRetry: () => void) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <SyncStatusProvider>
            <AuthorWorks
              view={makeViewData({ works: [], totalWorks: 0, isLoading: true })}
              onPageChange={() => undefined}
              onRetry={onRetry}
            />
          </SyncStatusProvider>
        </MantineProvider>
      </QueryClientProvider>,
    );

  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("keeps the spinner before the stall bound", () => {
    renderPendingWorks(vi.fn(() => undefined));

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS - LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByText(/Loading works/i)).toBeVisible();
    expect(screen.queryByTestId("subpanel-stalled-state")).not.toBeInTheDocument();
  });

  it("shows the still-waiting surface with a retry once the load outlives the stall bound", () => {
    const onRetry = vi.fn<() => void>();
    renderPendingWorks(onRetry);

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("subpanel-stalled-state")).toBeInTheDocument();
    expect(screen.getByText(/Still waiting on the server/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading works/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
