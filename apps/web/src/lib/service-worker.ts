/**
 * Service worker registration for the PWA.
 *
 * The worker is bundled at build time from src/sw.ts by vite-plugin-pwa's injectManifest strategy (see the pwaPlugin configuration in vite.config.ts): the app shell is precached, `index.html` is the navigation fallback for the hash-history SPA, OpenAlex requests are served from the NetworkFirst/CacheFirst runtime caches registered in src/lib/pwa/sw-runtime-caching.ts, and the Background Sync queue drains through the handler wired in src/lib/background-sync/sw-sync-handler.ts.
 *
 * Registration runs only in production builds. The dev server serves no sw.js and vite-plugin-pwa replaces `virtual:pwa-register` with a no-op stub in development, so this module has no effect there.
 */

import { logger } from "@bibgraph/utils";
/*
 * The virtual module is provided by vite-plugin-pwa at build time and has no path on disk; eslint's import resolver ignores the virtual: prefix by configuration.
 */
import { registerSW } from "virtual:pwa-register";

/**
 * Register the PWA service worker with auto-update behaviour: the worker activates immediately and new versions take over on the next load without user action.
 */
export const registerPwaServiceWorker = (): void => {
  if (!import.meta.env.PROD) {
    logger.debug("sw", "Service worker registration skipped in development");
    return;
  }

  registerSW({
    immediate: true,
    onRegisteredSW: (swScriptUrl, registration) => {
      logger.debug("sw", "Service worker registered", {
        swScriptUrl,
        scope: registration?.scope,
      });
    },
    onRegisterError: (error: unknown) => {
      logger.error("sw", "Failed to register service worker", { error });
    },
  });
};
