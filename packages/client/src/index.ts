/**
 * BibGraph Client Package
 *
 * OpenAlex API client with caching, rate limiting, and error handling.
 */

// Main client classes
export { OpenAlexBaseClient, type ValidationSchema } from './client';
export { CachedOpenAlexClient } from './cached-client';

// Client configuration and errors
export type { OpenAlexClientConfig, FullyConfiguredClient } from './internal';
export { OpenAlexApiError, OpenAlexRateLimitError } from './internal';

// Client instances and functions
export { cachedOpenAlex, updateOpenAlexEmail, updateOpenAlexApiKey } from './cached-client';

// Utilities and helpers
export * from './helpers';
export * from './utils';

// Entity methods
export * from './entities';

// Types
export type * from './types';

// Interceptors
export * from './interceptors';

// Cache functionality
export * from './cache';



// Graph functionality
