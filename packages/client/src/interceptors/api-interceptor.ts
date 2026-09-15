/**
 * OpenAlex API Request/Response Interceptor
 * Captures API requests and responses in development mode for caching analysis
 */

import type { EntityType, QueryParams } from "@bibgraph/types";

import { logger } from "../internal/logger";

/**
 * Represents an intercepted OpenAlex API request
 */
export interface InterceptedRequest {
  /**
  Full request URL
   */
  url: string;
  /**
  Final URL after redirects (if different from original)
   */
  finalUrl?: string;
  /**
  HTTP method (typically GET for OpenAlex)
   */
  method: string;
  /**
  Request headers
   */
  headers: Record<string, string>;
  /**
  Query parameters parsed from URL
   */
  params: QueryParams;
  /**
  Entity type extracted from URL (works, authors, etc.)
   */
  entityType?: EntityType;
  /**
  Entity ID if this is a single entity request
   */
  entityId?: string;
  /**
  Timestamp when request was made
   */
  timestamp: number;
  /**
  Unique request identifier
   */
  requestId: string;
}

/**
 * Represents an intercepted OpenAlex API response
 */
export interface InterceptedResponse {
  /**
  Response status code
   */
  status: number;
  /**
  Response headers
   */
  headers: Record<string, string>;
  /**
  Response body as JSON
   */
  data: unknown;
  /**
  Response size in bytes
   */
  size: number;
  /**
  Response time in milliseconds
   */
  responseTime: number;
  /**
  Timestamp when response was received
   */
  timestamp: number;
  /**
  Associated request identifier
   */
  requestId: string;
}

/**
 * Complete intercepted API call with request and response
 */
export interface InterceptedApiCall {
  /**
  Request data
   */
  request: InterceptedRequest;
  /**
  Response data
   */
  response: InterceptedResponse;
  /**
  Generated cache key for this request
   */
  cacheKey: string;
  /**
  Total round-trip time
   */
  totalTime: number;
}

/**
 * Cache key components for generating unique identifiers
 */
export interface CacheKeyComponents {
  /**
  Entity type (works, authors, etc.)
   */
  entityType?: EntityType;
  /**
  Entity ID for single entity requests
   */
  entityId?: string;
  /**
  Sorted query parameters
   */
  params: Record<string, unknown>;
  /**
  Base URL
   */
  baseUrl: string;
}

/**
 * Request deduplication entry
 */
interface DeduplicationEntry {
  /**
  Cache key for the request
   */
  cacheKey: string;
  /**
  Timestamp when first captured
   */
  timestamp: number;
  /**
  Number of times this request was deduplicated
   */
  count: number;
}

/**
 * Configuration for the API interceptor
 */
export interface ApiInterceptorConfig {
  /**
  Whether to enable interception (development mode only)
   */
  enabled?: boolean;
  /**
  Deduplication window in milliseconds (default: 5 minutes)
   */
  deduplicationWindow?: number;
  /**
  Maximum number of deduplicated entries to keep
   */
  maxDeduplicationEntries?: number;
  /**
  Callback for handling intercepted API calls
   */
  onApiCall?: (call: InterceptedApiCall) => void;
}

/**
 * OpenAlex API Request/Response Interceptor
 * Only active in development mode
 */
/**
Default deduplication window: 5 minutes, expressed in milliseconds
 */
const DEDUPLICATION_WINDOW_MINUTES = 5;
const SECONDS_PER_MINUTE = 60;
const MILLISECONDS_PER_SECOND = 1000;
const DEFAULT_DEDUPLICATION_WINDOW_MS = DEDUPLICATION_WINDOW_MINUTES * SECONDS_PER_MINUTE * MILLISECONDS_PER_SECOND;

const DEFAULT_MAX_DEDUPLICATION_ENTRIES = 1000;

/**
Inclusive lower bound of a successful HTTP status range
 */
const HTTP_SUCCESS_STATUS_MIN = 200;
/**
Exclusive upper bound of a successful HTTP status range
 */
const HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE = 300;

/**
Maximum characters of a URL shown in a debug log line before truncating
 */
const DEBUG_URL_PREVIEW_LENGTH = 100;
/**
Maximum characters of a cache key shown in a debug log line before truncating
 */
const DEBUG_CACHE_KEY_PREVIEW_LENGTH = 50;

export class ApiInterceptor {
  private readonly config: Required<ApiInterceptorConfig>;
  private readonly deduplicationMap = new Map<string, DeduplicationEntry>();
  private requestIdCounter = 0;

  constructor(config: Readonly<ApiInterceptorConfig> = {}) {
    this.config = {
      enabled: config.enabled ?? this.isDevelopmentMode(),
      deduplicationWindow: config.deduplicationWindow ?? DEFAULT_DEDUPLICATION_WINDOW_MS,
      maxDeduplicationEntries: config.maxDeduplicationEntries ?? DEFAULT_MAX_DEDUPLICATION_ENTRIES,
      // Deliberate no-op default: callers that don't care about intercepted calls needn't supply one.
      onApiCall: config.onApiCall ?? ((): void => { /* no-op */ }),
    };

    if (this.config.enabled) {
      logger.debug("API interceptor enabled in development mode");
    }
  }

  /**
   * Check NODE_ENV for development mode
   */
  private checkNodeEnv(): boolean | null {
    const nodeEnvironmentValue = process.env.NODE_ENV;
    if (nodeEnvironmentValue === undefined) {
      return null;
    }
    const nodeEnvironment = nodeEnvironmentValue.toLowerCase();
    if (nodeEnvironment === "development" || nodeEnvironment === "dev") return true;
    if (nodeEnvironment === "production") return false;
    return null;
  }

  /**
   * Check Vite's __DEV__ flag
   */
  private checkViteDevFlag(): boolean | null {
    try {
      if ("__DEV__" in globalThis) {
        const developmentFlag: unknown = globalThis.__DEV__;
        if (typeof developmentFlag === "boolean") {
          return developmentFlag;
        }
      }
    } catch {
      // Ignore errors if __DEV__ is not accessible
    }
    return null;
  }

  /**
   * Check browser-based development indicators
   */
  private checkBrowserDevIndicators(): boolean | null {
    try {
      if (typeof window === "undefined") {
        return null;
      }
      const { hostname } = window.location;
      // Local development indicators
      if (
        hostname === "localhost" ||
        hostname === "127.0.0.1" ||
        hostname.endsWith(".local")
      ) {
        return true;
      }
    } catch {
      // Ignore errors in browser detection
    }
    return null;
  }

  /**
   * Check if running in development mode
   */
  private isDevelopmentMode(): boolean {
    // Check NODE_ENV first (most reliable)
    const nodeEnvironmentResult = this.checkNodeEnv();
    if (nodeEnvironmentResult !== null) return nodeEnvironmentResult;

    // Check Vite's __DEV__ flag
    const viteResult = this.checkViteDevFlag();
    if (viteResult !== null) return viteResult;

    // Check browser-based indicators
    const browserResult = this.checkBrowserDevIndicators();
    if (browserResult !== null) return browserResult;

    // Default to development if uncertain (fail-safe for dev mode)
    return true;
  }

  /**
   * Generate a unique request ID
   */
  private generateRequestId(): string {
    return `req_${String(Date.now())}_${String(++this.requestIdCounter)}`;
  }

  /**
   * Extract entity type from OpenAlex URL
   */
  private extractEntityType(url: string): EntityType | undefined {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname.split("/").filter(Boolean);

    // OpenAlex URLs typically follow pattern: /entity_type/id or /entity_type
    const entityTypes: EntityType[] = [
      "works",
      "authors",
      "sources",
      "institutions",
      "topics",
      "concepts",
      "publishers",
      "funders",
      "keywords",
    ];

    for (const segment of pathSegments) {
      const matchedType = entityTypes.find((type) => type === segment);
      if (matchedType) {
        return matchedType;
      }
    }

    return undefined;
  }

  /**
   * Extract entity ID from OpenAlex URL
   */
  private extractEntityId(url: string): string | undefined {
    const urlObject = new URL(url);
    const pathSegments = urlObject.pathname.split("/").filter(Boolean);

    // Look for OpenAlex ID pattern (starts with entity letter + number)
    for (const segment of pathSegments) {
      if (/^[ACFIKPSTW]\d+/.test(segment)) {
        return segment;
      }
    }

    return undefined;
  }

  /**
   * Parse query parameters from URL
   */
  private parseQueryParams(url: string): QueryParams {
    const urlObject = new URL(url);
    const parameters: QueryParams = {};

    urlObject.searchParams.forEach((value, key) => {
      if (key === "select" && value) {
        // Handle select parameter as array
        parameters[key] = value.split(",");
      } else if (
        key === "per_page" ||
        key === "page" ||
        key === "sample" ||
        key === "seed"
      ) {
        // Handle numeric parameters
        const numberValue = Number.parseInt(value, 10);
        if (!Number.isNaN(numberValue)) {
          parameters[key] = numberValue;
        }
      } else {
        parameters[key] = value;
      }
    });

    return parameters;
  }

  /**
   * Generate cache key from request components
   */
  private generateCacheKey(components: CacheKeyComponents): string {
    const { entityType, entityId, params, baseUrl } = components;

    // Sort parameters for consistent key generation
    const sortedParameters = Object.keys(params)
      .sort()
      .reduce((result, key) => {
        result[key] = params[key];
        return result;
      }, {});

    const keyParts = [
      baseUrl,
      entityType ?? "unknown",
      entityId ?? "list",
      JSON.stringify(sortedParameters),
    ];

    return keyParts.join("|");
  }

  /**
   * Check if request should be deduplicated
   */
  private shouldDeduplicate(cacheKey: string): boolean {
    const now = Date.now();
    const entry = this.deduplicationMap.get(cacheKey);

    if (!entry) {
      return false;
    }

    // Check if within deduplication window
    if (now - entry.timestamp < this.config.deduplicationWindow) {
      entry.count++;
      return true;
    }

    // Entry is expired, remove it
    this.deduplicationMap.delete(cacheKey);
    return false;
  }

  /**
   * Add request to deduplication map
   */
  private addToDeduplication(cacheKey: string): void {
    const now = Date.now();

    // Clean up expired entries if map is getting large
    if (this.deduplicationMap.size >= this.config.maxDeduplicationEntries) {
      this.cleanupExpiredEntries();
    }

    this.deduplicationMap.set(cacheKey, {
      cacheKey,
      timestamp: now,
      count: 1,
    });
  }

  /**
   * Clean up expired deduplication entries
   */
  private cleanupExpiredEntries(): void {
    const now = Date.now();
    const expired: string[] = [];

    this.deduplicationMap.forEach((entry, key) => {
      if (now - entry.timestamp >= this.config.deduplicationWindow) {
        expired.push(key);
      }
    });

    for (const key of expired) {
      this.deduplicationMap.delete(key);
    }

    logger.debug(`Cleaned up ${String(expired.length)} expired deduplication entries`);
  }

  /**
   * Intercept an outgoing request
   */
  public interceptRequest(
    url: string,
    options: RequestInit = {},
  ): InterceptedRequest | null {
    if (!this.config.enabled) {
      return null;
    }

    try {
      const requestId = this.generateRequestId();
      const entityType = this.extractEntityType(url);
      const entityId = this.extractEntityId(url);
      const parameters = this.parseQueryParams(url);
      const timestamp = Date.now();

      // Extract headers
      const headers: Record<string, string> = {};
      if (options.headers) {
        if (options.headers instanceof Headers) {
          options.headers.forEach((value, key) => {
            headers[key] = value;
          });
        } else if (Array.isArray(options.headers)) {
          // Handle [string, string][] format
          for (const [key, value] of options.headers) {
            headers[key] = value;
          }
        } else {
          // Handle Record<string, string> format
          for (const [key, value] of Object.entries(options.headers)) {
            headers[key] = value;
          }
        }
      }

      const interceptedRequest: InterceptedRequest = {
        url,
        method: options.method ?? "GET",
        headers,
        params: parameters,
        entityType,
        entityId,
        timestamp,
        requestId,
      };

      logger.debug("Intercepted request", {
        requestId,
        entityType,
        entityId,
        url: url.slice(0, DEBUG_URL_PREVIEW_LENGTH) + (url.length > DEBUG_URL_PREVIEW_LENGTH ? "..." : ""),
      });

      return interceptedRequest;
    } catch (error: unknown) {
      logger.error("Failed to intercept request", { error, url });
      return null;
    }
  }

  /**
   * Intercept a response
   */
  public interceptResponse(
    request: InterceptedRequest,
    response: Response,
    data: unknown,
    responseTime: number,
  ): InterceptedApiCall | null {
    if (!this.config.enabled) {
      return null;
    }

    try {
      // Check if response is successful (2xx status)
      if (response.status < HTTP_SUCCESS_STATUS_MIN || response.status >= HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE) {
        logger.debug("Skipping non-2xx response", {
          requestId: request.requestId,
          status: response.status,
        });
        return null;
      }

      const timestamp = Date.now();

      // Capture final URL after redirects
      if (response.url !== "" && response.url !== request.url) {
        request.finalUrl = response.url;

        // Re-extract entity info from final URL for correct cache key generation
        const finalEntityType = this.extractEntityType(response.url);
        const finalEntityId = this.extractEntityId(response.url);

        if (finalEntityType !== undefined) request.entityType = finalEntityType;
        if (finalEntityId !== undefined && finalEntityId !== "") request.entityId = finalEntityId;

        logger.debug("Request redirected", {
          requestId: request.requestId,
          originalUrl: request.url,
          finalUrl: response.url,
          originalEntityId: this.extractEntityId(request.url),
          finalEntityId,
        });
      }

      // Extract response headers
      const headers: Record<string, string> = {};
      response.headers.forEach((value, key) => {
        headers[key] = value;
      });

      // Calculate response size
      const responseText = JSON.stringify(data);
      const { size } = new Blob([responseText]);

      const interceptedResponse: InterceptedResponse = {
        status: response.status,
        headers,
        data,
        size,
        responseTime,
        timestamp,
        requestId: request.requestId,
      };

      // Generate cache key - use final URL if redirected, otherwise original URL
      const effectiveUrl = request.finalUrl ?? request.url;
      const urlObject = new URL(effectiveUrl);
      const cacheKeyComponents: CacheKeyComponents = {
        entityType: request.entityType,
        entityId: request.entityId,
        params: request.params,
        baseUrl: `${urlObject.protocol}//${urlObject.host}`,
      };

      const cacheKey = this.generateCacheKey(cacheKeyComponents);

      // Check for deduplication
      if (this.shouldDeduplicate(cacheKey)) {
        logger.debug("Request deduplicated", {
          requestId: request.requestId,
          cacheKey: cacheKey.slice(0, DEBUG_CACHE_KEY_PREVIEW_LENGTH) + "...",
        });
        return null;
      }

      // Add to deduplication map
      this.addToDeduplication(cacheKey);

      const totalTime = timestamp - request.timestamp;

      const interceptedCall: InterceptedApiCall = {
        request,
        response: interceptedResponse,
        cacheKey,
        totalTime,
      };

      logger.debug("Intercepted API call", {
        requestId: request.requestId,
        entityType: request.entityType,
        status: response.status,
        responseTime,
        totalTime,
        size,
      });

      // Call the configured callback
      this.config.onApiCall(interceptedCall);

      return interceptedCall;
    } catch (error: unknown) {
      logger.error("Failed to intercept response", {
        error,
        requestId: request.requestId,
      });
      return null;
    }
  }

  /**
   * Get deduplication statistics
   */
  public getDeduplicationStats(): {
    totalEntries: number;
    totalDeduplicated: number;
    windowMs: number;
  } {
    let totalDeduplicated = 0;
    this.deduplicationMap.forEach((entry) => {
      totalDeduplicated += entry.count - 1; // Subtract 1 for the original request
    });

    return {
      totalEntries: this.deduplicationMap.size,
      totalDeduplicated,
      windowMs: this.config.deduplicationWindow,
    };
  }

  /**
   * Clear deduplication map
   */
  public clearDeduplication(): void {
    this.deduplicationMap.clear();
    logger.debug("Cleared deduplication map");
  }

  /**
   * Check if interceptor is enabled
   */
  public isEnabled(): boolean {
    return this.config.enabled;
  }
}

/**
 * Default API interceptor instance
 */
export const apiInterceptor = new ApiInterceptor();
