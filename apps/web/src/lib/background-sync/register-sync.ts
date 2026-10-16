/**
 * Background Sync registration, guarded for the browsers that lack it: Safari and Firefox ship no SyncManager, where the queue drains from the open page instead. Both the page (through navigator.serviceWorker.ready) and the service worker (through its own registration object) funnel through registerSyncTag.
 */

import { logger } from "@bibgraph/utils";

import { BACKGROUND_SYNC_TAG } from "./queue-schema";

/**
The slice of the platform SyncManager the queue uses.
 */
interface SyncManagerLike {
  register: (tag: string) => Promise<void>;
}

const isSyncManager = (value: unknown): value is SyncManagerLike =>
  typeof value === "object" &&
  value !== null &&
  "register" in value &&
  typeof value.register === "function";

/**
Register the shared sync tag on a held registration; false when the API is absent or rejects.
 */
export const registerSyncTag = async (
  registration: ServiceWorkerRegistration,
): Promise<boolean> => {
  if (!("sync" in registration) || !isSyncManager(registration.sync)) {
    return false;
  }
  try {
    await registration.sync.register(BACKGROUND_SYNC_TAG);
    return true;
  } catch (error: unknown) {
    logger.debug("background-queue", "sync.register rejected", { error });
    return false;
  }
};

/**
Page-side wake request: resolves once an active worker holds the tag.
 */
export const requestBackgroundSyncDrain = async (): Promise<boolean> => {
  const container = typeof navigator === "undefined" ? undefined : navigator.serviceWorker;
  if (container === undefined) {
    return false;
  }
  const registration = await container.ready;
  return registerSyncTag(registration);
};

/**
Feature detection for the Settings copy: does this browser ship Background Sync at all?
 */
export const isBackgroundSyncSupported = (): boolean =>
  typeof ServiceWorkerRegistration !== "undefined" &&
  "sync" in ServiceWorkerRegistration.prototype;
