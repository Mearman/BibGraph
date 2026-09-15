/**
 * OpenAlex API Base HTTP Client
 * Handles requests, rate limiting, error handling, and response parsing
 */

import type { OpenAlexResponse, QueryParams } from "@bibgraph/types";
import { OpenAlexResponseSchema, validateWithSchema } from "@bibgraph/types";
import { validateApiResponse } from "@bibgraph/utils";
import type { z } from "zod";

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

const HTTP_SERVER_ERROR_THRESHOLD = 500;
const HTTP_TOO_MANY_REQUESTS = 429;
const ERROR_BODY_PREVIEW_LENGTH = 200;
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
  private readonly rateLimitState: RateLimitState;

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
   */
  private async handleRateLimitResponse(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
  ): Promise<Response> {
    const retryAfter = response.headers.get("Retry-After");
    const retryAfterMs = retryAfter !== null
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
      message: `Rate limit exceeded (HTTP 429) after ${String(maxRateLimitAttempts)} attempts`,
      retryAfter: retryAfterMs,
    });
  }

  /**
   * Handle server error (5xx) with retry logic
   */
  private async handleServerError(
    response: Response,
    url: string,
    options: RequestInit,
    retryCount: number,
    maxServerRetries: number,
  ): Promise<Response> {
    if (response.status >= HTTP_SERVER_ERROR_THRESHOLD && retryCount < maxServerRetries) {
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
   */
  protected async cacheResponseEntities(_params: {
    url: string;
    responseData: unknown;
  }): Promise<void> {
    // Base implementation does nothing - override in subclasses
  }

  /**
   * Reset the daily rate-limit counters once the current UTC day has rolled over, so a stale yesterday count cannot trip the daily limit
   */
  private resetDailyRateLimitCounters(): void {
    if (Date.now() >= this.rateLimitState.dailyResetTime) {
      this.rateLimitState.requestsToday = 0;
      this.rateLimitState.dailyResetTime = getNextMidnightUTC();
    }
  }

  /**
   * Record a permitted request in the rate-limit state after enforcement has passed
   */
  private recordRateLimitRequest(): void {
    this.rateLimitState.requestsToday++;
    this.rateLimitState.lastRequestTime = Date.now();
  }

  /**
   * Make a request with retries and error handling
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
      this.resetDailyRateLimitCounters();
      await enforceRateLimit(this.config, this.rateLimitState);
      this.recordRateLimitRequest();

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

      if (response.status === HTTP_TOO_MANY_REQUESTS) {
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
   * GET request that returns schema-validated JSON. Every response is parsed against the caller-provided schema, so an API response that does not match the expected shape fails loudly here instead of flowing downstream as an unvalidated value.
   */
  public async get<T = unknown>(
    endpoint: string,
    params: QueryParams = {},
    schema: Readonly<ValidationSchema<T>>,
  ): Promise<T> {
    const url = buildUrl(endpoint, params, this.config);
    const response = await this.makeRequest({ url });

    // Validate content-type before parsing JSON
    const contentType = response.headers.get("content-type");
    if (contentType?.includes("application/json") !== true) {
      const text = await response.text();
      throw new OpenAlexApiError({
        message: `Expected JSON response but got ${contentType ?? "unknown content-type"}. Response: ${text.slice(0, ERROR_BODY_PREVIEW_LENGTH)}...`,
        statusCode: response.status,
      });
    }

    const data: unknown = await response.json();
    const validatedData = validateApiResponse(data);
    return validateWithSchema({ data: validatedData, schema });
  }

  /**
   * GET request that returns an OpenAlex response with results and metadata, validating each result against the provided entity schema
   */
  public async getResponse<T>(
    endpoint: string,
    params: QueryParams = {},
    resultSchema: z.ZodType<T>,
  ): Promise<OpenAlexResponse<T>> {
    return this.get(endpoint, params, OpenAlexResponseSchema(resultSchema));
  }

  /**
   * GET request for a single entity by ID, validated against the provided schema
   */
  public async getById<T = unknown>({
    endpoint,
    id,
    params = {},
    schema,
  }: {
    endpoint: string;
    id: string;
    params?: QueryParams;
    schema: ValidationSchema<T>;
  }): Promise<T> {
    return this.get(`${endpoint}/${encodeURIComponent(id)}`, params, schema);
  }

  /**
   * Stream all results using cursor pagination, validating each result against the provided entity schema
   */
  public async *stream<T>(
    endpoint: string,
    params: QueryParams = {},
    resultSchema: z.ZodType<T>,
    batchSize = 200,
  ): AsyncGenerator<T[], void, unknown> {
    let cursor: string | undefined;
    const streamParameters = { ...params };

    // Only set per_page if not already provided in params
    streamParameters.per_page ??= batchSize;

    do {
      if (cursor !== undefined) {
        streamParameters.cursor = cursor;
      }

      const response = await this.getResponse<T>(endpoint, streamParameters, resultSchema);

      if (response.results.length === 0) {
        break;
      }

      yield response.results;

      // Extract cursor from next page URL if available
      cursor = this.extractCursorFromResponse();
    } while (cursor !== undefined);
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
   */
  public async getAll<T>(
    endpoint: string,
    params: QueryParams = {},
    resultSchema: z.ZodType<T>,
    maxResults?: number,
  ): Promise<T[]> {
    const results: T[] = [];
    let count = 0;

    for await (const batch of this.stream<T>(endpoint, params, resultSchema)) {
      for (const item of batch) {
        if (maxResults !== undefined && count >= maxResults) {
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

