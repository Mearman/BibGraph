/**
 * Request Handler Utilities
 * Handles HTTP request execution, retries, rate limiting, and error handling
 */

import { logger } from "@bibgraph/utils";

import type { FullyConfiguredClient, RateLimitState } from "./client-config";
import { isTestEnvironment } from "./environment-detection";
import { OpenAlexRateLimitError } from "./errors";
import { calculateRetryDelay, RETRY_CONFIG } from "./rate-limit";

/**
 * Global cooldown map per host to avoid repeated bursts after 429s
 */
export const hostCooldowns: Map<string, number> = new Map();

/**
 * Sleep for the specified number of milliseconds
 * @param ms
 */
export const sleep = (ms: number): Promise<void> => {
  return new Promise((resolve) => setTimeout(resolve, ms));
};

/**
 * Get the next midnight UTC timestamp for rate limit reset
 */
export const getNextMidnightUTC = (): number => {
  const now = new Date();
  const tomorrow = new Date(now);
  tomorrow.setUTCDate(tomorrow.getUTCDate() + 1);
  tomorrow.setUTCHours(0, 0, 0, 0);
  return tomorrow.getTime();
};

/**
 * Parse Retry-After header value into milliseconds
 * Accepts either integer seconds or HTTP-date formats
 * @param value
 */
export const parseRetryAfterToMs = (value: string | null | undefined): number | undefined => {
  if (!value) return undefined;
  // If it's an integer number of seconds
  const seconds = Number(value);
  if (!Number.isNaN(seconds) && Number.isFinite(seconds)) {
    return Math.max(0, Math.floor(seconds)) * 1000;
  }

  // Try parsing as HTTP-date
  const parsed = Date.parse(value);
  if (!Number.isNaN(parsed)) {
    const diff = parsed - Date.now();
    return Math.max(diff, 0);
  }

  return undefined;
};

/**
 * Log warning when making real API calls in test environment
 * @param root0
 * @param root0.url
 * @param root0.options
 * @param root0.retryCount
 */
export const logRealApiCall = ({
  url,
  options,
  retryCount,
}: {
  url: string;
  options: RequestInit;
  retryCount: number;
}): void => {
  // Only warn if we're actually in a test environment (NODE_ENV=test or VITEST)
  const isTestEnv = Boolean(
    globalThis.process?.env?.VITEST ??
      globalThis.process?.env?.NODE_ENV === "test",
  );

  if (isTestEnv && url.includes("api.openalex.org")) {
    logger.warn(
      "client",
      "Making real OpenAlex API call in test environment",
      {
        url: url.slice(0, 100), // Truncate for readability
        method: options.method ?? "GET",
        retryCount,
      },
    );
  }
};

/**
 * Get maximum retry counts for different error types
 * @param configRetries
 */
export const getMaxRetries = (configRetries: number): { server: number; network: number } => {
  return {
    server:
      configRetries === 3
        ? RETRY_CONFIG.server.maxAttempts
        : configRetries,
    network:
      configRetries === 3
        ? RETRY_CONFIG.network.maxAttempts
        : configRetries,
  };
};

/**
 * Check if a host is in cooldown period after rate limiting
 * @param url
 */
export const checkHostCooldown = (url: string): void => {
  try {
    const host = new URL(url).hostname;
    const cooldownUntil = hostCooldowns.get(host);
    if (cooldownUntil && Date.now() < cooldownUntil) {
      throw new OpenAlexRateLimitError({
        message: `Host ${host} is in cooldown until ${new Date(cooldownUntil).toISOString()}`,
        retryAfter: cooldownUntil - Date.now(),
      });
    }
  } catch (error) {
    // If it's already a rate limit error, rethrow it
    if (error instanceof OpenAlexRateLimitError) {
      throw error;
    }
    // Otherwise ignore URL parsing failures
  }
};

/**
 * Build request options with default headers
 * @param options
 * @param config
 */
export const buildRequestOptions = (
  options: RequestInit,
  config: FullyConfiguredClient,
): RequestInit => {
  // Filter out signal entirely - we'll handle it separately to prevent test environment errors
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signal, ...filteredOptions } = options;

  return {
    ...filteredOptions,
    headers: {
      Accept: "application/json",
      "User-Agent": "OpenAlex-TypeScript-Client/1.0",
      ...config.headers,
      ...(options.headers &&
      typeof options.headers === "object" &&
      !Array.isArray(options.headers) &&
      !(options.headers instanceof Headers)
        ? options.headers
        : {}),
    },
  };
};

/**
 * Check and enforce rate limits before making a request
 * @param config
 * @param rateLimitState
 */
export const enforceRateLimit = async (
  config: FullyConfiguredClient,
  rateLimitState: RateLimitState,
): Promise<void> => {
  const now = Date.now();

  // Reset daily counter if it's a new day
  if (now >= rateLimitState.dailyResetTime) {
    rateLimitState.requestsToday = 0;
    rateLimitState.dailyResetTime = getNextMidnightUTC();
  }

  // Check daily limit
  if (rateLimitState.requestsToday >= config.rateLimit.requestsPerDay) {
    const resetTime = new Date(rateLimitState.dailyResetTime);
    throw new OpenAlexRateLimitError({
      message: `Daily request limit of ${config.rateLimit.requestsPerDay} exceeded. Resets at ${resetTime.toISOString()}`,
      retryAfter: rateLimitState.dailyResetTime - now,
    });
  }

  // Check per-second limit
  const minTimeBetweenRequests = 1000 / config.rateLimit.requestsPerSecond;
  const timeSinceLastRequest = now - rateLimitState.lastRequestTime;

  if (timeSinceLastRequest < minTimeBetweenRequests) {
    const waitTime = minTimeBetweenRequests - timeSinceLastRequest;
    await sleep(waitTime);
  }

  // Update state
  rateLimitState.requestsToday++;
  rateLimitState.lastRequestTime = Date.now();
};

/**
 * Set host cooldown after rate limit errors
 * @param url
 * @param retryAfterMs
 */
export const setHostCooldown = (url: string, retryAfterMs?: number): void => {
  try {
    const host = new URL(url).hostname;
    const DEFAULT_COOLDOWN_MS = 10_000;
    if (retryAfterMs) {
      hostCooldowns.set(host, Date.now() + retryAfterMs);
    } else {
      hostCooldowns.set(host, Date.now() + DEFAULT_COOLDOWN_MS);
    }
  } catch {
    // ignore URL parsing failures
  }
};

/**
 * Create a fetch request with timeout and abort signal handling
 * @param url
 * @param requestOptions
 * @param options
 * @param timeoutMs
 */
export const createFetchWithTimeout = (
  url: string,
  requestOptions: RequestInit,
  options: RequestInit,
  timeoutMs: number,
): { fetchOptions: RequestInit; timeoutId: ReturnType<typeof setTimeout>; controller: AbortController } => {
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    controller.abort();
  }, timeoutMs);

  // Handle signal merging - if original request has a signal, abort both
  if (options.signal && typeof options.signal === 'object' && options.signal !== null) {
    try {
      if (options.signal.aborted) {
        throw new DOMException("The operation was aborted.", "AbortError");
      }
      options.signal.addEventListener("abort", () => {
        controller.abort();
      });
    } catch {
      // Signal is not a valid AbortSignal (e.g., polyfill issues), continue without signal merging
    }
  }

  // Only add signal if it's a valid AbortSignal (fixes test environment issues)
  const fetchOptions: RequestInit = {
    ...requestOptions,
  };

  // Check if we're in a test environment - disable AbortSignal usage entirely in tests
  if (
    controller.signal &&
    typeof controller.signal === 'object' &&
    controller.signal !== null &&
    !isTestEnvironment()
  ) {
    // Only use AbortSignal in non-test environments to avoid polyfill compatibility issues
    fetchOptions.signal = controller.signal;
  }

  return { fetchOptions, timeoutId, controller };
};

/**
 * Remove signal from options to prevent AbortSignal issues in retries
 * @param options
 */
export const getCleanOptions = (options: RequestInit): RequestInit => {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { signal, ...cleanOptions } = options;
  return cleanOptions;
};

/**
 * Calculate retry delay based on configuration and attempt number
 * @param retryCount
 * @param configRetries
 * @param configRetryDelay
 * @param retryConfig
 * @param retryAfterMs
 */
export const getRetryDelay = (
  retryCount: number,
  configRetries: number,
  configRetryDelay: number,
  retryConfig: typeof RETRY_CONFIG.server | typeof RETRY_CONFIG.network,
  retryAfterMs?: number,
): number => {
  if (configRetries === 3) {
    return calculateRetryDelay(retryCount, retryConfig, retryAfterMs);
  }
  return configRetryDelay * Math.pow(2, retryCount);
};
