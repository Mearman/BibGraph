/**
 * OpenAlex API Base HTTP Client
 * Handles requests, rate limiting, error handling, and response parsing
 */

import type { OpenAlexResponse, QueryParams } from "@bibgraph/types";
import { validateWithSchema } from "@bibgraph/types";

import { apiInterceptor, type InterceptedRequest } from "./interceptors/api-interceptor";
// Import from extracted modules
import type {
  FullyConfiguredClient,
  OpenAlexClientConfig,
  RateLimitState,
} from "./internal/client-config";
import {
  DEFAULT_RATE_LIMIT,
  DEFAULT_RETRIES,
  DEFAULT_RETRY_DELAY_MS,
  DEFAULT_TIMEOUT_MS,
} from "./internal/client-config";
import { isDevelopmentMode } from "./internal/environment-detection";
import { OpenAlexApiError, OpenAlexRateLimitError } from "./internal/errors";
import { calculateRetryDelay, RETRY_CONFIG } from "./internal/rate-limit";
import {
  buildRequestOptions,
  checkHostCooldown,
  createFetchWithTimeout,
  enforceRateLimit,
  getCleanOptions,
  getMaxRetries,
  getNextMidnightUTC,
  getRetryDelay,
  logRealApiCall,
  parseRetryAfterToMs,
  setHostCooldown,
  sleep,
} from "./internal/request-handler";
import {
  handleResponseInterception,
  parseError,
} from "./internal/response-handler";
import { validateApiResponse } from "./internal/type-helpers";
import { buildUrl } from "./internal/url-builder";

// Re-export types and errors for external use - see index.ts

/**
 * Schema interface that matches Zod-like validation
 */
export interface ValidationSchema<T> {
  parse: (data: unknown) => T;
}

export class OpenAlexBaseClient {
  private config: Required<FullyConfiguredClient>;
  private rateLimitState: RateLimitState;

  constructor(config: OpenAlexClientConfig = {}) {
    // Create a fully-specified config with all required properties
    const defaultConfig: Required<FullyConfiguredClient> = {
      baseUrl: isDevelopmentMode()
        ? "/api/openalex"
        : "https://api.openalex.org",
      userEmail: undefined,
      apiKey: undefined,
      includeXpac: false,
      dataVersion: undefined,
      rateLimit: DEFAULT_RATE_LIMIT,
      timeout: DEFAULT_TIMEOUT_MS,
      retries: DEFAULT_RETRIES,
      retryDelay: DEFAULT_RETRY_DELAY_MS,
      headers: {},
    };

    this.config = {
      ...defaultConfig,
      ...config,
      rateLimit: {
        ...defaultConfig.rateLimit,
        ...config.rateLimit,
      },
    };

    // Initialize rate limiting state
    this.rateLimitState = {
      requestsToday: 0,
      lastRequestTime: 0,
      dailyResetTime: getNextMidnightUTC(),
    };
  }

  /**
   * Handle rate limit (429) response with retry logic
   * @param response
   * @param url
   * @param options
   * @param retryCount
   */
  private async handleRateLimitResponse(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
  ): Promise<Response> {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterMs = retryAfter
      ? parseRetryAfterToMs(retryAfter)
      : undefined;

    const maxRateLimitAttempts = RETRY_CONFIG.rateLimited.maxAttempts;
    if (retryCount < maxRateLimitAttempts) {
      const waitTime = calculateRetryDelay(
        retryCount,
        RETRY_CONFIG.rateLimited,
        retryAfterMs,
      );
      await sleep(waitTime);
      return await this.makeRequest({
        url,
        options: getCleanOptions(options),
        retryCount: retryCount + 1,
      });
    }

    // Set host cooldown and throw error
    setHostCooldown(url, retryAfterMs);

    throw new OpenAlexRateLimitError({
      message: `Rate limit exceeded (HTTP 429) after ${maxRateLimitAttempts} attempts`,
      retryAfter: retryAfterMs,
    });
  }

  /**
   * Handle server error (5xx) with retry logic
   * @param response
   * @param url
   * @param options
   * @param retryCount
   * @param maxServerRetries
   */
  private async handleServerError(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
    maxServerRetries: number,
  ): Promise<Response> {
    if (response.status >= 500 && retryCount < maxServerRetries) {
      const waitTime = getRetryDelay(
        retryCount,
        this.config.retries,
        this.config.retryDelay,
        RETRY_CONFIG.server,
      );
      await sleep(waitTime);
      return await this.makeRequest({
        url,
        options: getCleanOptions(options),
        retryCount: retryCount + 1,
      });
    }
    throw await parseError(response);
  }

  /**
   * Handle response interception for caching and logging
   * Protected to allow subclasses to extend caching behavior
   * @param root0
   * @param root0.interceptedRequest
   * @param root0.response
   * @param root0.responseTime
   */
  protected async handleResponseInterception({
    interceptedRequest,
    response,
    responseTime,
  }: {
    interceptedRequest: InterceptedRequest | null;
    response: Response;
    responseTime: number;
  }): Promise<void> {
    await handleResponseInterception({
      interceptedRequest,
      response,
      responseTime,
      cacheResponseEntities: this.cacheResponseEntities.bind(this),
    });
  }

  /**
   * Hook for caching entities from response data
   * Override in subclasses to implement entity-level caching
   * @param _params
   * @param _params.url
   * @param _params.responseData
   */
  protected async cacheResponseEntities(_params: {
    url: string;
    responseData: unknown;
  }): Promise<void> {
    // Base implementation does nothing - override in subclasses
  }

  /**
   * Make a request with retries and error handling
   * @param root0
   * @param root0.url
   * @param root0.options
   * @param root0.retryCount
   */
  private async makeRequest({
    url,
    options = {},
    retryCount = 0,
  }: {
    url: string;
    options?: RequestInit;
    retryCount?: number;
  }): Promise<Response> {
    logRealApiCall({ url, options, retryCount });
    const { server: maxServerRetries, network: maxNetworkRetries } =
      getMaxRetries(this.config.retries);

    try {
      checkHostCooldown(url);
      await enforceRateLimit(this.config, this.rateLimitState);

      const requestStartTime = Date.now();
      const requestOptions = buildRequestOptions(options, this.config);
      const interceptedRequest = apiInterceptor.interceptRequest(
        url,
        requestOptions,
      );

      const { fetchOptions, timeoutId } = createFetchWithTimeout(
        url,
        requestOptions,
        options,
        this.config.timeout,
      );

      const response = await fetch(url, fetchOptions);

      clearTimeout(timeoutId);
      const responseTime = Date.now() - requestStartTime;

      if (response.status === 429) {
        return await this.handleRateLimitResponse(
          response,
          url,
          options,
          retryCount,
        );
      }

      if (!response.ok) {
        return await this.handleServerError(
          response,
          url,
          options,
          retryCount,
          maxServerRetries,
        );
      }

      await this.handleResponseInterception({
        interceptedRequest,
        response,
        responseTime,
      });
      return response;
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        throw new OpenAlexApiError({
          message: `Request timeout after ${this.config.timeout.toString()}ms`,
        });
      }

      if (error instanceof OpenAlexApiError) {
        throw error;
      }

      if (retryCount < maxNetworkRetries) {
        const waitTime = getRetryDelay(
          retryCount,
          this.config.retries,
          this.config.retryDelay,
          RETRY_CONFIG.network,
        );
        await sleep(waitTime);
        return this.makeRequest({
          url,
          options: getCleanOptions(options),
          retryCount: retryCount + 1,
        });
      }

      throw new OpenAlexApiError({
        message: `Network error after ${String(maxNetworkRetries)} attempts: ${error instanceof Error ? error.message : "Unknown error"}`,
      });
    }
  }

  /**
   * GET request that returns parsed JSON with schema-based validation
   * @param endpoint
   * @param params
   * @param schema
   */
  public async get<T = unknown>(
    endpoint: string,
    params: QueryParams = {},
    schema?: ValidationSchema<T>,
  ): Promise<T> {
    const url = buildUrl(endpoint, params, this.config);
    const response = await this.makeRequest({ url });

    // Validate content-type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (!contentType?.includes("application/json")) {
      const text = await response.text();
      throw new OpenAlexApiError({
        message: `Expected JSON response but got ${contentType ?? "unknown content-type"}. Response: ${text.slice(0, 200)}...`,
        statusCode: response.status,
      });
    }

    const data: unknown = await response.json();
    const validatedData = validateApiResponse(data);

    // If schema is provided, use it for type-safe validation
    if (schema) {
      return validateWithSchema({ data: validatedData, schema });
    }

    // Return validated data - callers must handle typing
    return validatedData as T;
  }

  /**
   * GET request that returns an OpenAlex response with results and metadata
   * @param endpoint
   * @param params
   */
  public async getResponse<T>(
    endpoint: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<T>> {
    return this.get<OpenAlexResponse<T>>(endpoint, params);
  }

  /**
   * GET request for a single entity by ID
   * @param endpointOrParams
   * @param id
   * @param params
   * @param schema
   */
  public async getById<T = unknown>(
    endpointOrParams: string | { endpoint: string; id: string; params?: QueryParams; schema?: ValidationSchema<T> },
    id?: string,
    params?: QueryParams,
    schema?: ValidationSchema<T>
  ): Promise<T> {
    // Handle legacy signature: getById(endpoint, id, params, schema)
    if (typeof endpointOrParams === 'string') {
      const endpoint = endpointOrParams;
      if (!id) {
        throw new Error('ID is required for legacy getById signature');
      }
      return this.get(`${endpoint}/${encodeURIComponent(id)}`, params, schema);
    }

    // Handle new signature: getById({ endpoint, id, params, schema })
    const { endpoint, id: entityId, params: newParams = {}, schema: newSchema } = endpointOrParams;
    return this.get(`${endpoint}/${encodeURIComponent(entityId)}`, newParams, newSchema);
  }

  /**
   * Stream all results using cursor pagination
   * @param endpoint
   * @param params
   * @param batchSize
   */
  public async *stream<T>(
    endpoint: string,
    params: QueryParams = {},
    batchSize = 200,
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    const streamParams = { ...params };

    // Only set per_page if not already provided in params
    streamParams.per_page ??= batchSize;

    do {
      if (cursor) {
        streamParams.cursor = cursor;
      }

      const response = await this.getResponse<T>(endpoint, streamParams);

      if (response.results.length === 0) {
        break;
      }

      yield response.results;

      // Extract cursor from next page URL if available
      cursor = this.extractCursorFromResponse();
    } while (cursor);
  }

  /**
   * Extract cursor from OpenAlex response metadata
   */
  private extractCursorFromResponse(): string | undefined {
    // OpenAlex typically includes pagination info in meta
    // This is a placeholder - actual implementation depends on OpenAlex response format
    return undefined;
  }

  /**
   * Get all results (use with caution for large datasets)
   * @param endpoint
   * @param params
   * @param maxResults
   */
  public async getAll<T>(
    endpoint: string,
    params: QueryParams = {},
    maxResults?: number,
  ): Promise<T[]> {
    const results: T[] = [];
    let count = 0;

    for await (const batch of this.stream<T>(endpoint, params)) {
      for (const item of batch) {
        if (maxResults && count >= maxResults) {
          return results;
        }
        results.push(item);
        count++;
      }
    }

    return results;
  }

  /**
   * Update client configuration
   * @param config
   */
  public updateConfig(config: Partial<OpenAlexClientConfig>): void {
    this.config = {
      ...this.config,
      ...config,
      rateLimit: {
        ...this.config.rateLimit,
        ...config.rateLimit,
      },
    };
  }

  /**
   * Get current client configuration (read-only)
   */
  public getConfig(): Readonly<Required<FullyConfiguredClient>> {
    return this.config;
  }

  /**
   * Get current rate limit status
   */
  public getRateLimitStatus(): {
    requestsToday: number;
    requestsRemaining: number;
    dailyResetTime: Date;
  } {
    return {
      requestsToday: this.rateLimitState.requestsToday,
      requestsRemaining:
        this.config.rateLimit.requestsPerDay -
        this.rateLimitState.requestsToday,
      dailyResetTime: new Date(this.rateLimitState.dailyResetTime),
    };
  }
}

// Default client instance
export const defaultClient = new OpenAlexBaseClient();

