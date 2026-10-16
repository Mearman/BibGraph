/**
 * The service worker entry (vite-plugin-pwa injectManifest strategy; see the pwaPlugin configuration in vite.config.ts). This file stays thin: precaching and the navigation fallback come from workbox, the OpenAlex runtime caches live in src/lib/pwa/sw-runtime-caching.ts, and the Background Sync wiring lives in src/lib/background-sync/sw-sync-handler.ts over the tested drain.
 *
 * Registration (registerSW in src/lib/service-worker.ts) is unchanged: the plugin still emits sw.js at the deployment base, and the page registers it with autoUpdate semantics, mirrored here by skipWaiting + clients.claim.
 */

import {
  cleanupOutdatedCaches,
  createHandlerBoundToURL,
  precacheAndRoute,
  type PrecacheEntry,
} from "workbox-precaching";
import { NavigationRoute, registerRoute } from "workbox-routing";

import { drainBackgroundQueue } from "./lib/background-sync/drain-queue";
import { createDexieJobStore, getBackgroundQueueDB } from "./lib/background-sync/queue-db";
import { registerSyncTag } from "./lib/background-sync/register-sync";
import { runHydrateJob } from "./lib/background-sync/run-hydrate-job";
import {
  registerBackgroundSyncHandlers,
  type ServiceWorkerGlobalLike,
} from "./lib/background-sync/sw-sync-handler";
import { registerOpenAlexRuntimeCaches } from "./lib/pwa/sw-runtime-caching";

/**
 * The slice of the service worker global this entry uses. Declared locally (never through a coercion): the app's tsconfig compiles against the DOM lib, and pulling in the webworker lib for one file would conflict with it project-wide. The event-listener half comes from sw-sync-handler's scope interface; the DOM lib types ServiceWorkerRegistration, while Clients lives only in the webworker lib, so claim() is declared inline.
 */
declare const self: ServiceWorkerGlobalLike & {
  /**
   * The precache manifest vite-plugin-pwa injects at build time, replacing this property access with the literal entries of the build output.
   */
  readonly __WB_MANIFEST: readonly PrecacheEntry[];
  readonly clients: { claim: () => Promise<unknown> };
  skipWaiting: () => Promise<void>;
};

cleanupOutdatedCaches();
precacheAndRoute([...self.__WB_MANIFEST]);

// With hash routing (createHashHistory in main.tsx) every route is the same document, so the precached shell is the fallback for every navigation request (verified by e2e/pwa-offline.e2e.test.ts).
registerRoute(new NavigationRoute(createHandlerBoundToURL("index.html")));

registerOpenAlexRuntimeCaches();

const drainQueueFromWorker = async (): Promise<unknown> =>
  drainBackgroundQueue({
    store: createDexieJobStore(getBackgroundQueueDB()),
    runJob: runHydrateJob,
    requestWake: async () => registerSyncTag(self.registration),
  });

const countQueuedJobs = async (): Promise<number> =>
  createDexieJobStore(getBackgroundQueueDB()).countJobs();

registerBackgroundSyncHandlers(self, {
  drain: drainQueueFromWorker,
  queueDepth: countQueuedJobs,
  reregister: async () => registerSyncTag(self.registration),
});

// autoUpdate semantics: a new worker takes over immediately and claims open pages (parity with the plugin's generateSW defaults).
void self.skipWaiting();
void self.clients.claim();
