/**
 * The app-open fallback drain: browsers without Background Sync (Safari, Firefox) and every development session get today-plus-retry behaviour, since the queue is the same Dexie store the sync handler drains. Fire-and-forget by design so app startup never waits on the network.
 */

import { logger } from "@bibgraph/utils";

import { drainBackgroundQueue } from "./drain-queue";
import { createDexieJobStore, getBackgroundQueueDB } from "./queue-db";
import { requestBackgroundSyncDrain } from "./register-sync";
import { runHydrateJob } from "./run-hydrate-job";

export const drainBackgroundQueueOnOpen = (): void => {
  const drain = async (): Promise<void> => {
    try {
      const summary = await drainBackgroundQueue({
        store: createDexieJobStore(getBackgroundQueueDB()),
        runJob: runHydrateJob,
        requestWake: requestBackgroundSyncDrain,
      });
      if (summary.completed > 0 || summary.failed > 0 || summary.dropped > 0) {
        logger.info("background-queue", "App-open drain finished", { ...summary });
      }
    } catch (error: unknown) {
      // Overlap with a concurrently draining service worker is safe: deletes and failure-bookkeeping writes on rows the other context already removed are Dexie no-ops, so the worst case is one duplicate fetch.
      logger.warn("background-queue", "App-open drain failed", { error });
    }
  };
  void drain();
};
