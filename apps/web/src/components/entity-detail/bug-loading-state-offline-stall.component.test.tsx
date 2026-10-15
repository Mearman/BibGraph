/**
 * Regression tests: LoadingState must stay honest at both ends of a slow load. While the load is unresolved it shows only what it knows (the operation, the entity id, a skeleton), never a fabricated percentage, processing steps or elapsed/estimated times; past a named timeout it admits the stall with an honest offline message and a Retry action.
 */

import { emitRequestOutcome } from "@bibgraph/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOADING_CONSTANTS } from "@/config/style-constants";
import { SyncStatusProvider } from "@/contexts/SyncStatusContext";

import { ENTITY_TYPE_CONFIGS } from "./EntityTypeConfig";
import { LoadingState } from "./LoadingState";

// Ticks to advance for the "still genuinely loading" check: comfortably past first paint, comfortably short of the stall timeout.
const PRE_STALL_TICK_COUNT = 20;

const renderLoadingState = (onRetry?: () => void) => {
  return render(
    <QueryClientProvider client={new QueryClient()}>
      <MantineProvider>
        <SyncStatusProvider>
          <LoadingState
            entityType="Work"
            entityId="W123"
            config={ENTITY_TYPE_CONFIGS.works}
            onRetry={onRetry}
          />
        </SyncStatusProvider>
      </MantineProvider>
    </QueryClientProvider>,
  );
};

describe("LoadingState bounded wait", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });

  afterEach(() => {
    vi.useRealTimers();
    cleanup();
  });

  it("shows the loading UI before the stall timeout, without fabricated progress, steps or time readouts", () => {
    renderLoadingState();

    act(() => {
      vi.advanceTimersByTime(PRE_STALL_TICK_COUNT * LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("loading-state")).toBeInTheDocument();
    expect(screen.getByText(/Loading Work/i)).toBeInTheDocument();
    expect(screen.queryByTestId("loading-stalled-state")).not.toBeInTheDocument();
    // The component cannot know real progress, so none of these may appear at any point before the stall
    expect(screen.queryByText(/Time elapsed:/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Estimated:/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
    expect(screen.queryByText(/Finalizing display/i)).not.toBeInTheDocument();
  });

  it("replaces the loading panel with an offline message once the stall timeout passes with no transport failure reported", () => {
    renderLoadingState();

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("loading-stalled-state")).toBeInTheDocument();
    // The panel title and the screen-reader announcement both carry the wording
    expect(screen.getAllByText(/not available offline/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/Estimated:/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
  });

  it("stalls with the server-error wording, never the offline claim, when the transport is being answered with HTTP 429", () => {
    renderLoadingState();

    act(() => {
      emitRequestOutcome({ kind: "http-error", status: 429, message: "Rate limit exceeded (HTTP 429)" });
    });
    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("loading-stalled-state")).toBeInTheDocument();
    expect(screen.getAllByText(/server could not serve this record/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.getAllByText(/throttling/i).length).toBeGreaterThanOrEqual(1);
    expect(screen.queryByText(/not available offline/i)).toBeNull();
  });

  it("offers a Retry action on the stalled state", () => {
    const onRetry = vi.fn();
    renderLoadingState(() => {
      onRetry();
    });

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    fireEvent.click(screen.getByRole("button", { name: /retry/i }));
    expect(onRetry).toHaveBeenCalledTimes(1);
  });
});
