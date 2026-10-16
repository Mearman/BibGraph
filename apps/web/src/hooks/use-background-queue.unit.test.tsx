/**
 * Unit tests for the Settings affordance hook: queue depth from the Dexie store and the honest retry copy selected by Background Sync support.
 */

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useBackgroundQueueStatus } from "./use-background-queue";

const queryClient = new QueryClient({
  defaultOptions: { queries: { retry: false } },
});

/**
 * Every async fake awaits one microtask: the repo's require-await and promise-function-async rules demand it.
 */
const tick = async (): Promise<void> => {
  await Promise.resolve();
};

const wrapper = ({ children }: { children: ReactNode }) => (
  <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
);

describe("useBackgroundQueueStatus", () => {
  beforeEach(() => {
    queryClient.clear();
  });

  it("reads the queue depth and reports the supported-browser retry copy", async () => {
    const { result } = renderHook(
      () =>
        useBackgroundQueueStatus({
          countJobs: vi.fn(async () => {
            await tick();
            return 2;
          }),
          isSupported: () => true,
        }),
      { wrapper },
    );

    await waitFor(() => { expect(result.current.depth).toBe(2); });
    expect(result.current.supported).toBe(true);
    expect(result.current.retryCopy).toMatch(/background/i);
    expect(result.current.retryCopy).toMatch(/Chrome/i);
  });

  it("reports the open-app retry copy when Background Sync is unavailable", async () => {
    const { result } = renderHook(
      () =>
        useBackgroundQueueStatus({
          countJobs: vi.fn(async () => {
            await tick();
            return 0;
          }),
          isSupported: () => false,
        }),
      { wrapper },
    );

    await waitFor(() => { expect(result.current.depth).toBe(0); });
    expect(result.current.retryCopy).toMatch(/when the app is open/i);
  });
});
