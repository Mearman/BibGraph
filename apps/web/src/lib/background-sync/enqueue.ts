/**
 * Producer side of the background queue: hydration surfaces that fail call queueHydrationRetry instead of only degrading, so the failed lookup is retried later (Background Sync in an installed Chromium PWA, the app-open drain elsewhere).
 */

import { logger } from "@bibgraph/utils";

import type { BackgroundQueueDB} from "./queue-db";
import { getBackgroundQueueDB } from "./queue-db";
import type { StoredBackgroundJob } from "./queue-schema";
import { requestBackgroundSyncDrain } from "./register-sync";

const newJobId = (): string =>
  crypto.randomUUID();

/**
 * Persist a hydrate-entities job, merging the ids into the pending job of the same kind when one exists (one row per outstanding batch keeps the queue compact and the drain FIFO). Attempts and lastError are preserved: merging new ids into an already-attempted job must not reset its attempt budget.
 */
export const enqueueHydrationJob = async (
  db: BackgroundQueueDB,
  entityType: "works",
  ids: readonly string[],
): Promise<void> => {
  if (ids.length === 0) {
    return;
  }

  const pending = await db.jobs.where("kind").equals("hydrate-entities").first();
  if (pending === undefined) {
    const job: StoredBackgroundJob = {
      id: newJobId(),
      kind: "hydrate-entities",
      payload: { entityType, ids: [...new Set(ids)].sort() },
      enqueuedAt: Date.now(),
      attempts: 0,
      lastError: null,
    };
    await db.jobs.add(job);
    return;
  }

  pending.payload.ids = [...new Set([...pending.payload.ids, ...ids])].sort();
  await db.jobs.put(pending);
};

/**
 * Best-effort enqueue for failure paths: the surface has already degraded, so a queueing failure is logged, never rethrown. Requests a Background Sync wake so an installed Chromium PWA starts draining without the app open; browsers without the API simply never get the wake.
 */
export const queueHydrationRetry = async (
  entityType: "works",
  ids: readonly string[],
): Promise<void> => {
  try {
    await enqueueHydrationJob(getBackgroundQueueDB(), entityType, ids);
  } catch (error: unknown) {
    logger.warn("background-queue", "Failed to queue hydration retry", { error, ids: ids.length });
    return;
  }

  const requested = await requestBackgroundSyncDrain();
  if (!requested) {
    logger.debug("background-queue", "Hydration retry queued; no Background Sync wake (drains on app open)", {
      ids: ids.length,
    });
  }
};
