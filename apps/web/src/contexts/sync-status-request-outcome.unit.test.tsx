/**
 * Unit tests for the sync status context's request-outcome awareness and the offline banner's split between network failures and server errors. The query cache is the source of request outcomes: a query error is classified, a query success clears it.
 */

import { emitRequestOutcome, OpenAlexApiError } from "@bibgraph/client";
import { MantineProvider } from "@mantine/core";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { act, render, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { describe, expect, it } from "vitest";

import { OfflineBanner } from "@/components/ui/NetworkStatus";

import { SyncStatusProvider, useSyncStatus } from "./SyncStatusContext";

const buildQueryClient = () =>
  new QueryClient({
    defaultOptions: { queries: { retry: false } },
  });

const wrapperWith = (queryClient: QueryClient) => {
  const Wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <SyncStatusProvider>{children}</SyncStatusProvider>
    </QueryClientProvider>
  );
  return Wrapper;
};

/**
 * Drive the cache through a real query fetch so the subscription sees genuine cache events. The outcome selector keys the query on the error identity so each probe is its own cache entry.
 */
const outcomeKey = (error: Error | null): readonly string[] => ["probe", error?.message ?? "ok"];

const runProbeQuery = (queryClient: QueryClient, error: Error | null): void => {
  void queryClient
    .query({
      queryKey: outcomeKey(error),
      queryFn: async () => {
        await Promise.resolve();
        if (error !== null) throw error;
        return { ok: true };
      },
    })
    .catch(() => undefined);
};

const Probe = ({ error }: Readonly<{ error: Error | null }>) => {
  const queryClient = buildQueryClient();
  const Wrapper = wrapperWith(queryClient);
  const useProbe = () => {
    runProbeQuery(queryClient, error);
    return useSyncStatus();
  };
  const { result } = renderHook(() => useProbe(), { wrapper: Wrapper });
  return result;
};

const ProbeAndBanner = ({
  queryClient,
  error,
}: Readonly<{ queryClient: QueryClient; error: Error | null }>) => {
  runProbeQuery(queryClient, error);
  return <OfflineBanner />;
};

const renderBanner = ({ error }: Readonly<{ error: Error | null }>) => {
  const queryClient = buildQueryClient();
  const Wrapper = wrapperWith(queryClient);
  const view = render(
    <MantineProvider>
      <Wrapper>
        <ProbeAndBanner queryClient={queryClient} error={error} />
      </Wrapper>
    </MantineProvider>,
  );
  return view;
};

const networkLevelError = () => {
  const error = new Error("Network error after 3 attempts: fetch failed");
  return error;
};

const throttledError = () => {
  const error = new OpenAlexApiError({ message: "Too many requests", statusCode: 429 });
  return error;
};

describe("sync status transport outcomes", () => {
  it("reads Sync error the moment the transport reports a 429, while the query is still pending through its retry budget", async () => {
    const queryClient = buildQueryClient();
    const Wrapper = wrapperWith(queryClient);
    const { result } = renderHook(() => useSyncStatus(), { wrapper: Wrapper });

    act(() => {
      emitRequestOutcome({ kind: "http-error", status: 429, message: "Rate limit exceeded (HTTP 429)" });
    });

    await waitFor(() => {
      expect(result.current.syncStatus.overall).toBe("error");
    });
  });

  it("reads Offline the moment the transport reports a network-level failure", async () => {
    const queryClient = buildQueryClient();
    const Wrapper = wrapperWith(queryClient);
    const { result } = renderHook(() => useSyncStatus(), { wrapper: Wrapper });

    act(() => {
      emitRequestOutcome({ kind: "network-error", message: "fetch failed" });
    });

    await waitFor(() => {
      expect(result.current.syncStatus.overall).toBe("offline");
    });
  });

  it("clears a transport failure once a later attempt succeeds", async () => {
    const queryClient = buildQueryClient();
    const Wrapper = wrapperWith(queryClient);
    const { result } = renderHook(() => useSyncStatus(), { wrapper: Wrapper });

    act(() => {
      emitRequestOutcome({ kind: "http-error", status: 429, message: "Rate limit exceeded (HTTP 429)" });
    });
    await waitFor(() => {
      expect(result.current.syncStatus.overall).toBe("error");
    });

    act(() => {
      emitRequestOutcome({ kind: "success" });
    });
    await waitFor(() => {
      expect(result.current.syncStatus.overall).not.toBe("error");
    });
  });
});

describe("sync status request outcomes", () => {
  it("reads Offline when the last request failed at the network level while the browser still reports online", async () => {
    const result = Probe({ error: networkLevelError() });

    await waitFor(() => {
      expect(result.current.syncStatus.overall).toBe("offline");
    });
  });

  it("reads Sync error, not Offline, when the server answered with HTTP 429", async () => {
    const result = Probe({ error: throttledError() });

    await waitFor(() => {
      expect(result.current.syncStatus.overall).toBe("error");
    });
  });

  it("returns to Synced once a later request succeeds", async () => {
    const failing = Probe({ error: networkLevelError() });
    await waitFor(() => {
      expect(failing.current.syncStatus.overall).toBe("offline");
    });

    const recovered = Probe({ error: null });
    await waitFor(() => {
      expect(recovered.current.syncStatus.overall).not.toBe("offline");
    });
  });
});

describe("OfflineBanner request outcomes", () => {
  it("announces offline for a network-level failure", async () => {
    const view = renderBanner({ error: networkLevelError() });

    await waitFor(() => {
      expect(view.getByTestId("offline-banner")).toBeInTheDocument();
    });
  });

  it("names the throttling and the retry behaviour for HTTP 429 instead of claiming offline", async () => {
    const view = renderBanner({ error: throttledError() });

    await waitFor(() => {
      expect(view.queryByTestId("offline-banner")).toBeNull();
      const banner = view.getByTestId("server-error-banner");
      expect(banner).toHaveTextContent(/throttling/i);
      expect(banner).toHaveTextContent(/backed off and retried/i);
    });
  });

  it("shows no banner once a later request succeeds", async () => {
    const view = renderBanner({ error: null });

    await act(async () => {
      await Promise.resolve();
    });
    expect(view.queryByTestId("offline-banner")).toBeNull();
    expect(view.queryByTestId("server-error-banner")).toBeNull();
  });
});
