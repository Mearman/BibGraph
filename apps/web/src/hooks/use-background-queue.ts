/**
 * Settings affordance for the background job queue: the queued-work depth and the honest retry copy for this browser (Background Sync drains only in an installed Chromium PWA; everywhere else the queue drains when the app is open). Depth is polled rather than observed: Dexie change notifications are not wired into React Query here, and the number only needs to be approximately live for a Settings readout.
 */

import { useQuery } from "@tanstack/react-query";
import { useMemo } from "react";

import { createDexieJobStore, getBackgroundQueueDB } from "@/lib/background-sync/queue-db";
import { isBackgroundSyncSupported } from "@/lib/background-sync/register-sync";

/**
Keeps the Settings readout fresh without Dexie live queries.
 */
const QUEUE_DEPTH_POLL_MS = 5_000;

const RETRY_COPY_SUPPORTED =
  "Queued lookups retry in the background, even with the app closed (installed app in Chrome).";
const RETRY_COPY_UNSUPPORTED =
  "Queued lookups retry when the app is open (this browser has no background sync).";

export interface BackgroundQueueStatus {
  readonly depth: number;
  readonly supported: boolean;
  readonly retryCopy: string;
}

export interface BackgroundQueueStatusDeps {
  readonly countJobs: () => Promise<number>;
  readonly isSupported: () => boolean;
}

/**
 * Production wiring as a named module constant: a stable reference for the default parameter (an inline object literal is lint-banned as a default) and for the dependency arrays below.
 */
const DEFAULT_DEPS: BackgroundQueueStatusDeps = {
  countJobs: async () => await createDexieJobStore(getBackgroundQueueDB()).countJobs(),
  isSupported: isBackgroundSyncSupported,
};

export const useBackgroundQueueStatus = (
  deps: BackgroundQueueStatusDeps = DEFAULT_DEPS,
): BackgroundQueueStatus => {
  const supported = useMemo(() => deps.isSupported(), [deps]);

  const depthQuery = useQuery({
    queryKey: ["background-queue-depth"],
    queryFn: async () => deps.countJobs(),
    refetchInterval: QUEUE_DEPTH_POLL_MS,
  });

  return {
    depth: depthQuery.data ?? 0,
    supported,
    retryCopy: supported ? RETRY_COPY_SUPPORTED : RETRY_COPY_UNSUPPORTED,
  };
};
