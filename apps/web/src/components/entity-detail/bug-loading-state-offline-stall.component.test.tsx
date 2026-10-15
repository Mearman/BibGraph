/**
 * Regression tests: LoadingState must stay honest at both ends of a slow load. While the load is unresolved it shows only what it knows (the operation, the entity id, a skeleton), never a fabricated percentage, processing steps or elapsed/estimated times; past a named timeout it admits the stall with an honest offline message and a Retry action.
 */

import { MantineProvider } from "@mantine/core";
import { act, cleanup, fireEvent, render, screen } from "@testing-library/react";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { LOADING_CONSTANTS } from "@/config/style-constants";

import { ENTITY_TYPE_CONFIGS } from "./EntityTypeConfig";
import { LoadingState } from "./LoadingState";

// Ticks to advance for the "still genuinely loading" check: comfortably past first paint, comfortably short of the stall timeout.
const PRE_STALL_TICK_COUNT = 20;

const renderLoadingState = (onRetry?: () => void) => {
  return render(
    <MantineProvider>
      <LoadingState
        entityType="Work"
        entityId="W123"
        config={ENTITY_TYPE_CONFIGS.works}
        onRetry={onRetry}
      />
    </MantineProvider>,
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

  it("replaces fabricated progress with an offline message once the stall timeout passes", () => {
    renderLoadingState();

    act(() => {
      vi.advanceTimersByTime(LOADING_CONSTANTS.STALL_TIMEOUT_MS + LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByTestId("loading-stalled-state")).toBeInTheDocument();
    expect(screen.getByText(/not available offline/i)).toBeInTheDocument();
    expect(screen.queryByText(/Estimated:/i)).not.toBeInTheDocument();
    expect(screen.queryByText("Progress")).not.toBeInTheDocument();
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
