/**
 * Regression tests: LoadingState fabricates progress forever when the origin is unreachable. The simulated bar parks at its cap with "Estimated: 3.0s" while elapsed time climbs, never admitting the request has stalled. The wait must be bounded: past a named timeout the fabricated progress stops and an honest offline message with a Retry action takes its place.
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

  it("shows the simulated loading UI before the stall timeout", () => {
    renderLoadingState();

    act(() => {
      vi.advanceTimersByTime(PRE_STALL_TICK_COUNT * LOADING_CONSTANTS.PROGRESS_UPDATE_INTERVAL_MS);
    });

    expect(screen.getByText(/Estimated:/i)).toBeInTheDocument();
    expect(screen.queryByTestId("loading-stalled-state")).not.toBeInTheDocument();
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
