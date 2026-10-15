/**
 * Component tests for the Collaboration Network section's response to the works query's state: an errored works query shows the classified error copy, never the no-co-authors empty state, because the empty state claims the author has no co-authors when the truth is the works failed to load.
 */

import { emitRequestOutcome, OpenAlexApiError } from "@bibgraph/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOADING_CONSTANTS } from "@/config/style-constants";
import { SyncStatusProvider } from "@/contexts/SyncStatusContext";

import { CollaborationNetwork } from "./CollaborationNetwork";

const renderSection = (properties: { works?: []; isLoading?: boolean; error?: Error | null }) =>
  render(
    <MantineProvider>
      <CollaborationNetwork
        authorId="https://openalex.org/A5017898742"
        works={properties.works ?? []}
        isLoading={properties.isLoading ?? false}
        error={properties.error ?? null}
      />
    </MantineProvider>,
  );

describe("CollaborationNetwork error state", () => {
  it("shows the classified error copy when the works query errored", () => {
    renderSection({ error: new OpenAlexApiError({ message: "Too many requests", statusCode: 429 }) });

    expect(screen.getByText("Collaboration Network")).toBeVisible();
    expect(screen.getByText(/could not be loaded/i)).toBeVisible();
    expect(screen.queryByText(/No co-authors appear/i)).toBeNull();
  });

  it("keeps the empty state when the works query succeeded with no co-authors", () => {
    renderSection({ error: null });

    expect(screen.getByText(/No co-authors appear/i)).toBeVisible();
  });

  it("keeps the loading state ahead of the error state while the query is in flight", () => {
    renderSection({ isLoading: true, error: new Error("boom") });

    expect(screen.getByText(/Loading co-authors/i)).toBeVisible();
  });
});

describe("CollaborationNetwork bounded wait", () => {
  // The bound is the entity loader's stall timeout: one shared value across every loading surface, so a sub-panel never spins longer than the page-level loader would.
  const renderPendingSection = (onRetry: () => void) =>
    render(
      <QueryClientProvider client={new QueryClient()}>
        <MantineProvider>
          <SyncStatusProvider>
            <CollaborationNetwork
              authorId="https://openalex.org/A5017898742"
              works={[]}
              isLoading={true}
              error={null}
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
    renderPendingSection(vi.fn(() => undefined));

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS - LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByText(/Loading co-authors/i)).toBeVisible();
    expect(screen.queryByTestId("subpanel-stalled-state")).not.toBeInTheDocument();
  });

  it("shows the still-waiting surface with a retry once the load outlives the stall bound", () => {
    const onRetry = vi.fn<() => void>();
    renderPendingSection(onRetry);

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("subpanel-stalled-state")).toBeInTheDocument();
    expect(screen.getByText(/Still waiting on the server/i)).toBeInTheDocument();
    expect(screen.queryByText(/Loading co-authors/i)).toBeNull();

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });

  it("names throttling on the stalled surface when the transport is being answered with HTTP 429", () => {
    renderPendingSection(vi.fn(() => undefined));

    act(() => {
      emitRequestOutcome({ kind: "http-error", status: 429, message: "Rate limit exceeded (HTTP 429)" });
    });
    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("subpanel-stalled-state")).toBeInTheDocument();
    expect(screen.getByText(/throttling/i)).toBeInTheDocument();
  });
});
