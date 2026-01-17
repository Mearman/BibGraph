/**
 * Client Configuration Types
 * Shared configuration interfaces for the OpenAlex client
 */

/**
 * User-provided configuration options for the OpenAlex client
 */
export interface OpenAlexClientConfig {
  baseUrl?: string;
  userEmail?: string;
  apiKey?: string;
  includeXpac?: boolean;
  dataVersion?: '1' | '2';
  rateLimit?: {
    requestsPerSecond?: number;
    requestsPerDay?: number;
  };
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  headers?: Record<string, string>;
}

/**
 * Fully resolved configuration with all required properties
 * Used internally after merging user config with defaults
 */
export interface FullyConfiguredClient {
  baseUrl: string;
  userEmail: string | undefined;
  apiKey: string | undefined;
  includeXpac: boolean;
  dataVersion: '1' | '2' | undefined;
  rateLimit: {
    requestsPerSecond: number;
    requestsPerDay: number;
  };
  timeout: number;
  retries: number;
  retryDelay: number;
  headers: Record<string, string>;
}

/**
 * Rate limit tracking state
 */
export interface RateLimitState {
  requestsToday: number;
  lastRequestTime: number;
  dailyResetTime: number;
}

/**
 * Default client configuration values
 */
export const DEFAULT_RATE_LIMIT = {
  requestsPerSecond: 10, // Conservative default
  requestsPerDay: 100_000, // OpenAlex limit
};

export const DEFAULT_TIMEOUT_MS = 30_000; // 30 seconds
export const DEFAULT_RETRIES = 3;
export const DEFAULT_RETRY_DELAY_MS = 1000; // 1 second
