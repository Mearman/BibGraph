/**
 * Request Pipeline - Composable middleware system for API requests
 * Provides cache lookup, deduplication, retry, logging, and error classification
 */

import { logger } from "@bibgraph/utils";

import { calculateRetryDelay,RETRY_CONFIG } from "../internal/rate-limit";

// Time conversion factors
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;

// Default pipeline tuning values
const CACHE_TTL_MINUTES = 5;
const DEDUPE_WINDOW_MINUTES = 5;
const DEFAULT_MAX_DEDUPE_ENTRIES = 1000;
const DEFAULT_MAX_RETRIES = 3;

// Generated request ID shape: `req_<timestamp>_<random substring>`
const REQUEST_ID_RADIX = 36;
const REQUEST_ID_RANDOM_LENGTH = 11;

// Logging and networking limits
const URL_LOG_TRUNCATE_LENGTH = 100;
const REQUEST_TIMEOUT_MS = 30_000;

// HTTP status thresholds used for error classification
const HTTP_STATUS_TOO_MANY_REQUESTS = 429;
const HTTP_STATUS_CLIENT_ERROR_MIN = 400;
const HTTP_STATUS_SERVER_ERROR_MIN = 500;

/**
 * Request context passed through the pipeline
 */
export interface RequestContext {
  /**
  Unique request identifier
   */
  requestId: string;
  /**
  Request URL
   */
  url: string;
  /**
  HTTP method
   */
  method: string;
  /**
  Request options
   */
  options: RequestInit;
  /**
  Request start timestamp
   */
  startTime: number;
  /**
  Request metadata
   */
  metadata: Record<string, unknown>;
}

/**
 * Response context from pipeline execution
 */
export interface ResponseContext {
  /**
  Response object
   */
  response: Response;
  /**
  Response time in milliseconds
   */
  responseTime: number;
  /**
  Whether response came from cache
   */
  fromCache: boolean;
  /**
  Error if request failed
   */
  error?: Error;
  /**
  Error classification if applicable
   */
  errorClassification?: ErrorClassification;
  /**
  Additional metadata
   */
  metadata?: Record<string, unknown>;
}

/**
 * Error classification types
 */
export enum ErrorType {
  NETWORK = "network",
  RATE_LIMIT = "rate_limit",
  SERVER = "server",
  CLIENT = "client",
  TIMEOUT = "timeout",
  UNKNOWN = "unknown",
}

/**
 * Error classification result
 */
export interface ErrorClassification {
  type: ErrorType;
  retryable: boolean;
  retryDelay?: number;
  userMessage: string;
  internalMessage: string;
}

/**
 * Pipeline middleware function signature
 */
export type PipelineMiddleware = (
  context: RequestContext,
  next: () => Promise<ResponseContext>,
) => Promise<ResponseContext>;

/**
 * Cache entry for request caching
 */
interface CacheEntry {
  response: Response;
  timestamp: number;
  ttl: number;
}

/**
 * Request deduplication entry
 */
interface DeduplicationEntry {
  cacheKey: string;
  timestamp: number;
  count: number;
  lastRequestId: string;
}

type MiddlewareFunction = (arguments_: {
  context: RequestContext;
  next: () => Promise<ResponseContext>;
}) => Promise<ResponseContext>;

/**
 * Pipeline configuration options
 */
export interface PipelineOptions {
  /**
  Enable caching
   */
  enableCache?: boolean;
  /**
  Cache TTL in milliseconds
   */
  cacheTtl?: number;
  /**
  Enable request deduplication
   */
  enableDedupe?: boolean;
  /**
  Deduplication window in milliseconds
   */
  dedupeWindow?: number;
  /**
  Maximum deduplication entries
   */
  maxDedupeEntries?: number;
  /**
  Enable retry logic
   */
  enableRetry?: boolean;
  /**
  Maximum retry attempts
   */
  maxRetries?: number;
  /**
  Enable logging
   */
  enableLogging?: boolean;
  /**
  Enable error classification
   */
  enableErrorClassification?: boolean;
  /**
  Custom cache key generator
   */
  cacheKeyGenerator?: (context: RequestContext) => string;
  /**
  Custom error classifier
   */
  errorClassifier?: (error: Error, response?: Response) => ErrorClassification;
}

/**
 * Classify an error into categories with retry recommendations
 */
export const classifyError = (error: Error, response?: Response): ErrorClassification => {
  // Network errors
  if (error.name === "TypeError" && error.message.includes("fetch")) {
    return {
      type: ErrorType.NETWORK,
      retryable: true,
      retryDelay: calculateRetryDelay(0, RETRY_CONFIG.network),
      userMessage:
        "Network connection error. Please check your internet connection.",
      internalMessage: "Fetch network error - likely connectivity issue",
    };
  }

  // Timeout errors
  if (error.name === "AbortError" || error.message.includes("timeout")) {
    return {
      type: ErrorType.TIMEOUT,
      retryable: true,
      retryDelay: calculateRetryDelay(0, RETRY_CONFIG.network),
      userMessage: "Request timed out. Please try again.",
      internalMessage: "Request timeout - abort signal triggered",
    };
  }

  // Rate limit errors
  if (response?.status === HTTP_STATUS_TOO_MANY_REQUESTS) {
    const retryAfter = response.headers.get("Retry-After");
    const retryDelay =
      retryAfter !== null
        ? Number.parseInt(retryAfter, 10) * MILLISECONDS_PER_SECOND
        : undefined;

    return {
      type: ErrorType.RATE_LIMIT,
      retryable: true,
      retryDelay:
        retryDelay ?? calculateRetryDelay(0, RETRY_CONFIG.rateLimited),
      userMessage:
        "Too many requests. Please wait a moment before trying again.",
      internalMessage: `Rate limited (HTTP 429) - retry after ${retryAfter ?? "unknown"} seconds`,
    };
  }

  // Server errors (5xx)
  if (response && response.status >= HTTP_STATUS_SERVER_ERROR_MIN) {
    return {
      type: ErrorType.SERVER,
      retryable: true,
      retryDelay: calculateRetryDelay(0, RETRY_CONFIG.server),
      userMessage: "Server error. Please try again later.",
      internalMessage: `Server error (HTTP ${String(response.status)})`,
    };
  }

  // Client errors (4xx)
  if (
    response &&
    response.status >= HTTP_STATUS_CLIENT_ERROR_MIN &&
    response.status < HTTP_STATUS_SERVER_ERROR_MIN
  ) {
    return {
      type: ErrorType.CLIENT,
      retryable: false,
      userMessage: "Request error. Please check your request parameters.",
      internalMessage: `Client error (HTTP ${String(response.status)})`,
    };
  }

  // Unknown errors
  return {
    type: ErrorType.UNKNOWN,
    retryable: false,
    userMessage: "An unexpected error occurred. Please try again.",
    internalMessage: `Unknown error: ${error.message}`,
  };
};

/**
 * Default pipeline options
 */
const DEFAULT_OPTIONS: Required<PipelineOptions> = {
  enableCache: true,
  cacheTtl: CACHE_TTL_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
  enableDedupe: true,
  dedupeWindow: DEDUPE_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND,
  maxDedupeEntries: DEFAULT_MAX_DEDUPE_ENTRIES,
  enableRetry: true,
  maxRetries: DEFAULT_MAX_RETRIES,
  enableLogging: true,
  enableErrorClassification: true,
  cacheKeyGenerator: (context: RequestContext) => {
    // Generate cache key from URL and relevant options
    const url = new URL(context.url);
    const parameters = new URLSearchParams(url.search);
    // Sort params for consistent keys
    const sortedParameters = [...parameters].sort(([a], [b]) =>
      a.localeCompare(b),
    );
    const parameterString = sortedParameters.map(([k, v]) => `${k}=${v}`).join("&");
    return `${context.method}:${url.origin}${url.pathname}?${parameterString}`;
  },
  errorClassifier: (error: Error, response?: Response) => classifyError(error, response),
};

/**
 * Request pipeline with composable middleware
 */
export class RequestPipeline {
  private readonly cache = new Map<string, CacheEntry>();
  private readonly dedupeMap = new Map<string, DeduplicationEntry>();
  private readonly options: Required<PipelineOptions>;

  constructor(options: Readonly<PipelineOptions> = {}) {
    this.options = { ...DEFAULT_OPTIONS, ...options };
  }

  /**
   * Execute a request through the pipeline
   */
  async execute(url: string, options: RequestInit = {}): Promise<Response> {
    const context: RequestContext = {
      requestId: `req_${String(Date.now())}_${Math.random().toString(REQUEST_ID_RADIX).slice(2, REQUEST_ID_RANDOM_LENGTH)}`,
      url,
      method: options.method ?? "GET",
      options,
      startTime: Date.now(),
      metadata: {},
    };

    const middlewares: MiddlewareFunction[] = [];

    if (this.options.enableLogging) {
      middlewares.push(this.loggingMiddleware.bind(this));
    }
    if (this.options.enableCache) {
      middlewares.push(this.cacheMiddleware.bind(this));
    }
    if (this.options.enableDedupe) {
      middlewares.push(this.dedupeMiddleware.bind(this));
    }
    if (this.options.enableRetry) {
      middlewares.push(this.retryMiddleware.bind(this));
    }
    if (this.options.enableErrorClassification) {
      middlewares.push(this.errorClassificationMiddleware.bind(this));
    }

    const dispatch = async (index: number): Promise<ResponseContext> => {
      if (index === middlewares.length) {
        return await this.executionMiddleware({ context });
      }

      const middleware = middlewares[index];
      return await middleware({
        context,
        next: async () => await dispatch(index + 1),
      });
    };

    const result = await dispatch(0);

    if (result.error) {
      throw result.error;
    }

    return result.response;
  }

  /**
   * Logging middleware
   */
  private async loggingMiddleware({
    context,
    next,
  }: {
    context: RequestContext;
    next: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    logger.debug("pipeline", "Request started", {
      requestId: context.requestId,
      method: context.method,
      url: context.url.slice(0, URL_LOG_TRUNCATE_LENGTH),
    });

    const result = await next();

    logger.debug("pipeline", "Request completed", {
      requestId: context.requestId,
      status: result.response.status,
      responseTime: result.responseTime,
      fromCache: result.fromCache,
      error: result.error?.message,
    });

    return result;
  }

  /**
   * Cache lookup middleware
   */
  private async cacheMiddleware({
    context,
    next,
  }: {
    context: RequestContext;
    next: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    const cacheKey = this.options.cacheKeyGenerator(context);
    const cached = this.cache.get(cacheKey);

    if (cached && Date.now() - cached.timestamp < cached.ttl) {
      logger.debug("pipeline", "Cache hit", {
        requestId: context.requestId,
        cacheKey,
      });

      // Clone the cached response since Response can only be read once
      const clonedResponse = new Response(cached.response.body, {
        status: cached.response.status,
        statusText: cached.response.statusText,
        headers: cached.response.headers,
      });

      return {
        response: clonedResponse,
        responseTime: 0, // Cached response has no network time
        fromCache: true,
      };
    }

    const result = await next();

    // Cache successful responses
    if (result.response.ok && !result.fromCache) {
      this.cache.set(cacheKey, {
        response: result.response.clone(), // Clone to preserve the original
        timestamp: Date.now(),
        ttl: this.options.cacheTtl,
      });

      logger.debug("pipeline", "Response cached", {
        requestId: context.requestId,
        cacheKey,
      });
    }

    return result;
  }

  /**
   * Request deduplication middleware
   */
  private async dedupeMiddleware({
    context,
    next,
  }: {
    context: RequestContext;
    next: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    const cacheKey = this.options.cacheKeyGenerator(context);
    const now = Date.now();
    const entry = this.dedupeMap.get(cacheKey);

    if (
      entry &&
      entry.lastRequestId !== context.requestId &&
      now - entry.timestamp < this.options.dedupeWindow
    ) {
      entry.count++;
      logger.debug("pipeline", "Request deduplicated", {
        requestId: context.requestId,
        cacheKey,
        dedupeCount: entry.count,
      });

      // Return a synthetic response indicating deduplication
      const dedupeResponse = Response.json(
        { message: "Request deduplicated", deduplicated: true },
        {
          status: 200,
          headers: { "Content-Type": "application/json" },
        },
      );

      return {
        response: dedupeResponse,
        responseTime: 0,
        fromCache: false,
        metadata: { deduplicated: true, dedupeCount: entry.count },
      };
    }

    // Clean up expired entries
    this.cleanupExpiredDedupeEntries();

    // Add to deduplication map
    this.dedupeMap.set(cacheKey, {
      cacheKey,
      timestamp: now,
      count: 1,
      lastRequestId: context.requestId,
    });

    // Limit deduplication map size
    if (this.dedupeMap.size > this.options.maxDedupeEntries) {
      this.cleanupExpiredDedupeEntries();
    }

    const result = await next();

    const storedEntry = this.dedupeMap.get(cacheKey);
    if (storedEntry) {
      storedEntry.timestamp = Date.now();
      storedEntry.lastRequestId = context.requestId;
    }

    return result;
  }

  /**
   * Retry middleware with exponential backoff
   */
  private async retryMiddleware({
    context,
    next,
  }: {
    context: RequestContext;
    next: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    let lastResult: ResponseContext | undefined;
    let attempt = 0;

    while (attempt <= this.options.maxRetries) {
      try {
        const result = await next();

        if (result.error) {
          throw result.error;
        }

        // If we get here, the request succeeded
        if (attempt > 0) {
          logger.debug("pipeline", "Retry successful", {
            requestId: context.requestId,
            attempt: attempt + 1,
          });
        }

        return result;
      } catch (error) {
        const pipelineError =
          error instanceof Error ? error : new Error("Unknown error");

        // Classify the error to determine if it's retryable
        const classification = classifyError(pipelineError);

        if (!classification.retryable || attempt >= this.options.maxRetries) {
          logger.debug("pipeline", "Retry exhausted or non-retryable error", {
            requestId: context.requestId,
            attempt: attempt + 1,
            errorType: classification.type,
            retryable: classification.retryable,
          });

          // Return error result
          return {
            response: new Response(null, { status: 0 }),
            responseTime: 0,
            fromCache: false,
            error: pipelineError,
            errorClassification: classification,
          };
        }

        // Calculate retry delay
        const delay =
          classification.retryDelay ??
          calculateRetryDelay(attempt, RETRY_CONFIG.network);

        logger.debug("pipeline", "Retrying request", {
          requestId: context.requestId,
          attempt: attempt + 1,
          delay,
          errorType: classification.type,
        });

        await this.sleep(delay);
        attempt++;
      }
    }

    throw lastResult?.error ?? new Error("Retry logic failed");
  }

  /**
   * Error classification middleware
   */
  private async errorClassificationMiddleware({
    context,
    next,
  }: {
    context: RequestContext;
    next: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    const result = await next();

    if (result.error) {
      const classification = this.options.errorClassifier(result.error);

      logger.debug("pipeline", "Error classified", {
        requestId: context.requestId,
        errorType: classification.type,
        retryable: classification.retryable,
        userMessage: classification.userMessage,
      });

      result.errorClassification = classification;
    }

    return result;
  }

  /**
   * Actual request execution middleware
   */
  private async executionMiddleware({
    context,
  }: {
    context: RequestContext;
    next?: () => Promise<ResponseContext>;
  }): Promise<ResponseContext> {
    const startTime = Date.now();

    try {
      logger.debug("pipeline", "Executing request", {
        requestId: context.requestId,
        method: context.method,
        url: context.url.slice(0, URL_LOG_TRUNCATE_LENGTH),
      });

      const controller = new AbortController();
      const timeoutId = setTimeout(() => {
        controller.abort();
      }, REQUEST_TIMEOUT_MS); // 30 second timeout

      const response = await fetch(context.url, {
        ...context.options,
        method: context.method,
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      const responseTime = Date.now() - startTime;

      return {
        response,
        responseTime,
        fromCache: false,
      };
    } catch (error) {
      const responseTime = Date.now() - startTime;
      const pipelineError =
        error instanceof Error ? error : new Error("Request failed");

      return {
        response: new Response(null, { status: 0 }), // Empty response for errors
        responseTime,
        fromCache: false,
        error: pipelineError,
      };
    }
  }

  /**
   * Clean up expired deduplication entries
   */
  private cleanupExpiredDedupeEntries(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.dedupeMap.forEach((entry, key) => {
      if (now - entry.timestamp >= this.options.dedupeWindow) {
        expired.push(key);
      }
    });

    for (const key of expired) this.dedupeMap.delete(key);

    if (expired.length > 0) {
      logger.debug("pipeline", "Cleaned up expired deduplication entries", {
        count: expired.length,
      });
    }
  }

  /**
   * Sleep utility for delays
   */
  private async sleep(ms: number): Promise<void> {
    await new Promise<void>((resolve) => {
      setTimeout(resolve, ms);
    });
  }

  /**
   * Clear all caches
   */
  clearCache(): void {
    this.cache.clear();
    this.dedupeMap.clear();
    logger.debug("pipeline", "All caches cleared");
  }

  /**
   * Get cache statistics
   */
  getCacheStats(): {
    cacheEntries: number;
    dedupeEntries: number;
  } {
    return {
      cacheEntries: this.cache.size,
      dedupeEntries: this.dedupeMap.size,
    };
  }
}

/**
 * Create a new request pipeline with the specified options
 */
export const createRequestPipeline = (options: Readonly<PipelineOptions> = {}): RequestPipeline => new RequestPipeline(options);

/**
 * Default pipeline instance
 */
export const defaultPipeline = createRequestPipeline();
