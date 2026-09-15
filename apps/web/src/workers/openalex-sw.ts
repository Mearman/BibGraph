/**
 * Service Worker for OpenAlex API Request Interception Intercepts requests to https://api.openalex.org and handles caching transparently
 */

const CACHE_NAME = "openalex-cache-v1";
const OPENALEX_DOMAIN = "api.openalex.org";

/**
 * Parse OpenAlex URL into structured information
 */
interface ParsedOpenAlexUrl {
  isQuery: boolean;
  entityId?: string;
}

// Cast self for service worker functionality
interface ServiceWorkerGlobalScope {
  addEventListener: (
    type: string,
    listener: (event: ExtendableEvent | FetchEvent) => void,
  ) => void;
  skipWaiting: () => void;
  clients: { claim: () => Promise<void> };
  location: { hostname: string; port: string };
}

// Extend global self with Workbox manifest placeholder
declare const self: ServiceWorkerGlobalScope & {
  __WB_MANIFEST: { url: string; revision: string | null }[];
};

// Workbox precache manifest injection point Workbox will replace this array with the actual precache manifest Note: precacheManifest contains the list of files to cache const precacheManifest = self.__WB_MANIFEST;

// Service worker initialized with precache manifest Note: precacheManifest contains the list of files to cache

// Service worker event types
interface ExtendableEvent extends Event {
  waitUntil: (promise: Readonly<Promise<unknown>>) => void;
}

interface FetchEvent extends ExtendableEvent {
  request: Request;
  respondWith: (response: Promise<Response> | Response) => void;
}

/**
 * Narrows a service worker event to a {@link FetchEvent}: only the "fetch" listener receives an event carrying a `request`, which {@link ExtendableEvent} does not.
 */
const isFetchEvent = (event: ExtendableEvent | FetchEvent): event is FetchEvent => "request" in event;

/**
 * Validate that data appears to be a valid OpenAlex entity
 */
const isValidOpenAlexEntity = (data: unknown): boolean => {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("id" in data) || !("display_name" in data)) {
    return false;
  }

  // OpenAlex entities should have id and display_name
  return typeof data.id === "string" && typeof data.display_name === "string";
};

/**
 * Validate that data appears to be a valid OpenAlex query result
 */
const isValidOpenAlexQueryResult = (data: unknown): boolean => {
  if (typeof data !== "object" || data === null) {
    return false;
  }
  if (!("results" in data) || !("meta" in data)) {
    return false;
  }

  // OpenAlex query results should have results array and meta object
  return Array.isArray(data.results) && typeof data.meta === "object";
};

const parseOpenAlexUrl = (url: string): ParsedOpenAlexUrl | null => {
  try {
    const urlObject = new URL(url);
    if (urlObject.hostname !== "api.openalex.org") {
      return null;
    }

    const pathSegments = urlObject.pathname.split("/").filter(Boolean);
    const hasQuery = urlObject.searchParams.toString().length > 0;

    // Check if it's an entity request (has entity ID in path)
    const entityId = pathSegments.length === 2 ? pathSegments[1] : undefined;

    return {
      isQuery: hasQuery || pathSegments.length === 1,
      entityId,
    };
  } catch {
    return null;
  }
};

/**
 * Check if we're in development environment
 */
const isDevelopmentEnvironment = (): boolean => self.location.hostname === "localhost" ||
    self.location.hostname === "127.0.0.1" ||
    self.location.port === "5173";

/**
 * Handle development proxy requests
 */
const handleDevelopmentRequest = async ({
  request,
  url: devUrl,
}: {
  request: Request;
  url: URL;
}): Promise<Response> => {
  const proxyUrl = `/api/openalex${devUrl.pathname}${devUrl.search}`;
  // In development, proxy OpenAlex API requests to local development server

  const proxyRequest = new Request(proxyUrl, {
    method: request.method,
    headers: request.headers,
    body: request.body,
  });

  return fetch(proxyRequest);
};

/**
 * Try to serve static data file
 */
const tryStaticFile = async (url: URL): Promise<Response | null> => {
  const staticPath = `/data/openalex${url.pathname}.json`;
  try {
    // Attempt to fetch pre-generated static JSON file for this OpenAlex endpoint
    const staticResponse = await fetch(staticPath);
    if (staticResponse.ok) {
      // Static file found and served successfully
      return staticResponse;
    }
  } catch {
    // Static file not available or failed to load
  }
  return null;
};

/**
 * Try to get cached response
 */
const tryCache = async ({
  request,
}: {
  request: Request;
  url?: URL;
}): Promise<Response | null> => {
  const cache = await caches.open(CACHE_NAME);
  const cachedResponse = await cache.match(request);
  if (cachedResponse) {
    // Found cached response for this OpenAlex API request
    return cachedResponse;
  }
  return null;
};

/**
 * Validate OpenAlex response structure
 */
const isValidOpenAlexResponse = ({
  data,
  parsedUrl,
}: {
  data: unknown;
  parsedUrl: ParsedOpenAlexUrl;
}): boolean => {
  const isEntity = parsedUrl.entityId !== undefined;
  return isEntity
    ? isValidOpenAlexEntity(data)
    : isValidOpenAlexQueryResult(data);
};

/**
 * Validate and cache response if valid
 */
const validateAndCacheResponse = async ({
  request,
  response,
}: {
  request: Request;
  response: Response;
  url?: URL;
}): Promise<Response> => {
  if (!response.ok) return response;

  try {
    const responseClone = response.clone();
    const data: unknown = await responseClone.json();

    const parsedUrl = parseOpenAlexUrl(request.url);
    if (parsedUrl && !isValidOpenAlexResponse({ data, parsedUrl })) {
      // Invalid response structure detected, not caching this response Reason: Invalid response format for the request
      return response;
    }

    // Cache valid response
    const cache = await caches.open(CACHE_NAME);
    await cache.put(request, response.clone());
    // Successfully cached validated OpenAlex response
  } catch {
    // Response validation failed, not caching this response Error details captured in service worker debugging
  }

  return response;
};

/**
 * Handle OpenAlex API requests with caching
 */
const handleOpenAlexRequest = async (request: Request): Promise<Response> => {
  try {
    const url = new URL(request.url);
    // Intercepting OpenAlex API request for caching and optimization

    if (isDevelopmentEnvironment()) {
      return await handleDevelopmentRequest({ request, url });
    }

    // Try static file first
    const staticResponse = await tryStaticFile(url);
    if (staticResponse) return staticResponse;

    // Try cache
    const cachedResponse = await tryCache({ request, url });
    if (cachedResponse) return cachedResponse;

    // Fetch from API No cached response available, fetching from live OpenAlex API
    const response = await fetch(request);

    return await validateAndCacheResponse({ request, response, url });
  } catch {
    // Error in service worker, falling back to direct network request Fallback to normal fetch
    return fetch(request);
  }
};

// Install event - set up the service worker
self.addEventListener("install", () => {
  // Service worker installation starting - activating immediately
  self.skipWaiting(); // Activate immediately
});

// Activate event - clean up old caches
self.addEventListener("activate", (event) => {
  // Service worker activation starting - claiming all clients
  event.waitUntil(self.clients.claim()); // Take control immediately
});

// Fetch event - intercept network requests
self.addEventListener("fetch", (event) => {
  if (!isFetchEvent(event)) {
    return;
  }
  const { request } = event;
  const url = new URL(request.url);

  // Only intercept OpenAlex API requests
  if (url.hostname === OPENALEX_DOMAIN) {
    event.respondWith(handleOpenAlexRequest(request));
  }
});
