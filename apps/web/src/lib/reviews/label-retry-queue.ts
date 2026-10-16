/**
 * The review screens' label fetcher wrapped for the background queue: when a label batch fails (the screens degrade to showing ids, as before), the ids are queued as a hydrate-entities job so Background Sync or the app-open drain retries them, and the rejection still propagates.
 */

import type { WorkLabel, WorkLabelFetcher } from "@/lib/algorithms/work-labels";
import { queueHydrationRetry } from "@/lib/background-sync/enqueue";
import type { BackgroundQueueDB } from "@/lib/background-sync/queue-db";

export const withHydrationRetryQueue = (
  db: BackgroundQueueDB,
  fetchLabels: WorkLabelFetcher,
): WorkLabelFetcher => async (ids: readonly string[]): Promise<ReadonlyMap<string, WorkLabel>> => {
  try {
    return await fetchLabels(ids);
  } catch (error: unknown) {
    await queueHydrationRetry("works", ids);
    throw error;
  }
};
