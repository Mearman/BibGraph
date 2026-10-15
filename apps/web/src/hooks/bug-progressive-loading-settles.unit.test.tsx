/**
 * Bug regression test: useProgressiveGraphLoading restarts itself forever. The load effect depends on startLoading, whose useCallback chain depends on loadingState.startTime, which every startLoading run replaces, so the effect re-fires continuously: the /graph page re-rendered thousands of times per second, re-feeding the force graph new data identities each cycle (blank canvas, "Maximum update depth exceeded"). Once the items are loaded, loading must stay settled until the items genuinely change.
 */

import { act, renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it } from "vitest";

import { useProgressiveGraphLoading } from "./useProgressiveGraphLoading";

// One batch worth of items (default batch size 50).
const ITEMS = Array.from({ length: 3 }, (_value, index) => ({ id: `node-${String(index)}` }));

// Long enough for any spurious restart to reset the batch counter (each restart schedules a fresh batch pass).
const SETTLE_OBSERVATION_MS = 200;

describe("useProgressiveGraphLoading settles", () => {
  it("stops restarting once loading completed, so the batch counter stays stable", async () => {
    const { result } = renderHook(() => useProgressiveGraphLoading(ITEMS));

    await waitFor(() => {
      expect(result.current.loadingState.isLoading).toBe(false);
      expect(result.current.visibleItems).toHaveLength(ITEMS.length);
    });

    const settledBatchCount = result.current.loadingState.currentBatch;

    await act(async () => {
      await new Promise((resolve) => {
        setTimeout(resolve, SETTLE_OBSERVATION_MS);
      });
    });

    expect(result.current.loadingState.isLoading).toBe(false);
    expect(result.current.loadingState.currentBatch).toBe(settledBatchCount);
  });
});
