/**
 * Service worker event wiring for the background queue: maps Background Sync and activation events onto the drain, with every dependency injected so jsdom can drive the adapter without a real worker. The sw.ts entry passes the production wiring; this module holds no imports of its own.
 */

import { BACKGROUND_SYNC_TAG } from "./queue-schema";

/**
The event shape a sync listener receives (the platform's SyncEvent).
 */
export interface SyncEventLike {
  readonly tag: string;
  waitUntil: (promise: Readonly<Promise<unknown>>) => void;
}

/**
The event shape an activation listener receives.
 */
export interface ExtendableEventLike {
  waitUntil: (promise: Readonly<Promise<unknown>>) => void;
}

/**
The slice of the worker global scope these handlers need.
 */
export interface ServiceWorkerGlobalLike {
  readonly registration: ServiceWorkerRegistration;
  addEventListener: ((type: "sync", listener: (event: Readonly<SyncEventLike>) => void) => void) & ((type: "activate", listener: (event: Readonly<ExtendableEventLike>) => void) => void);
}

export interface BackgroundSyncHandlerDeps {
  /**
  Drains the queue; the entry wires this over drainBackgroundQueue.
   */
  readonly drain: () => Promise<unknown>;
  /**
  Pending job count, for the activation check below.
   */
  readonly queueDepth: () => Promise<number>;
  /**
  Re-register the sync tag on the worker's own registration.
   */
  readonly reregister: () => Promise<boolean>;
}

/**
 * Covers installs that closed before connectivity returned: a non-empty queue on activation asks Chrome to schedule its first wake.
 */
const reregisterWhenPending = async (deps: BackgroundSyncHandlerDeps): Promise<void> => {
  const depth = await deps.queueDepth();
  if (depth > 0) {
    await deps.reregister();
  }
};

export const registerBackgroundSyncHandlers = (
  workerScope: ServiceWorkerGlobalLike,
  deps: BackgroundSyncHandlerDeps,
): void => {
  workerScope.addEventListener("sync", (event) => {
    if (event.tag !== BACKGROUND_SYNC_TAG) {
      return;
    }
    // waitUntil keeps the worker alive while the bounded drain runs; the drain itself re-registers the tag when jobs remain, so a mid-wake kill only loses the current job, never the rest of the queue.
    event.waitUntil(deps.drain());
  });

  workerScope.addEventListener("activate", (event) => {
    event.waitUntil(reregisterWhenPending(deps));
  });
};
