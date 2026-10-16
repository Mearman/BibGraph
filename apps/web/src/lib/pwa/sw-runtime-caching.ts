/**
 * Runtime cache setup for the injectManifest service worker (src/sw.ts): the same NetworkFirst/CacheFirst routes the generateSW configuration used to emit, kept here so the worker entry stays thin. Registering is idempotent.
 */

import { CacheableResponsePlugin } from "workbox-cacheable-response";
import { ExpirationPlugin } from "workbox-expiration";
import { registerRoute } from "workbox-routing";
import { CacheFirst, NetworkFirst } from "workbox-strategies";

const SECONDS_PER_MINUTE = 60;
const MINUTES_PER_HOUR = 60;
const HOURS_PER_DAY = 24;
const SECONDS_PER_DAY = SECONDS_PER_MINUTE * MINUTES_PER_HOUR * HOURS_PER_DAY;

// NetworkFirst caches for OpenAlex API responses: previously viewed entities render offline. Bounded so long browsing sessions cannot grow the cache without limit. The full request URL (including any mailto= politeness parameter) is the cache key, which is correct because identical query parameters return identical responses. Must stay in sync with OPENALEX_STATIC_DATA_CACHE_NAME in e2e/pwa-offline.e2e.test.ts, which reads this cache to prove the CacheFirst tier filled.
const OPENALEX_API_CACHE_NAME = "openalex-api-runtime";
const OPENALEX_API_CACHE_MAX_ENTRIES = 100;
const OPENALEX_API_CACHE_MAX_AGE_DAYS = 30;
const OPENALEX_API_NETWORK_TIMEOUT_SECONDS = 8;
const OPENALEX_API_URL_PATTERN = /^https:\/\/api\.openalex\.org\/.*$/;
// The dev server proxies this path to api.openalex.org (see server.proxy in vite.config.ts); the route keeps a worker enabled in development caching the identical surface.
const OPENALEX_DEV_PROXY_URL_PATTERN = /\/api\/openalex\/.*$/;

// CacheFirst caches for the committed static data tier (public/data/openalex, also deployed to mearman.github.io/BibGraph/data/openalex/ and read cross-origin from bibgraph.com). Entries are immutable per deployment, so no age limit is needed.
const OPENALEX_STATIC_DATA_CACHE_NAME = "openalex-static-data";
const OPENALEX_STATIC_DATA_CACHE_MAX_ENTRIES = 500;
const OPENALEX_STATIC_DATA_URL_PATTERN = /^https:\/\/mearman\.github\.io\/BibGraph\/data\/openalex\/.*$/;
const OPENALEX_LOCAL_STATIC_DATA_URL_PATTERN = /^https?:\/\/[^/]+\/data\/openalex\/.*$/;

// Status 0 covers opaque cross-origin responses (bibgraph.com reading the GitHub Pages data tier); 200 is the ordinary success the strategies cache.
const OPAQUE_RESPONSE_STATUS = 0;
const HTTP_SUCCESS_STATUS = 200;
const CACHEABLE_STATUSES = [OPAQUE_RESPONSE_STATUS, HTTP_SUCCESS_STATUS];

const openAlexApiStrategy = new NetworkFirst({
  cacheName: OPENALEX_API_CACHE_NAME,
  networkTimeoutSeconds: OPENALEX_API_NETWORK_TIMEOUT_SECONDS,
  plugins: [
    new ExpirationPlugin({
      maxEntries: OPENALEX_API_CACHE_MAX_ENTRIES,
      maxAgeSeconds: OPENALEX_API_CACHE_MAX_AGE_DAYS * SECONDS_PER_DAY,
    }),
    new CacheableResponsePlugin({ statuses: CACHEABLE_STATUSES }),
  ],
});

const staticDataStrategy = new CacheFirst({
  cacheName: OPENALEX_STATIC_DATA_CACHE_NAME,
  plugins: [
    new ExpirationPlugin({ maxEntries: OPENALEX_STATIC_DATA_CACHE_MAX_ENTRIES }),
    new CacheableResponsePlugin({ statuses: CACHEABLE_STATUSES }),
  ],
});

export const registerOpenAlexRuntimeCaches = (): void => {
  registerRoute(OPENALEX_API_URL_PATTERN, openAlexApiStrategy);
  registerRoute(OPENALEX_DEV_PROXY_URL_PATTERN, openAlexApiStrategy);
  registerRoute(OPENALEX_STATIC_DATA_URL_PATTERN, staticDataStrategy);
  registerRoute(OPENALEX_LOCAL_STATIC_DATA_URL_PATTERN, staticDataStrategy);
};
