/**
 * Request normalization utilities for OpenAlex API requests
 * Provides consistent request representation for caching and visit tracking
 */

import { isRecord } from "@bibgraph/types";

/**
 * Simple synchronous hash function that works in both browser and Node.js
 * Uses FNV-1a hash algorithm (fast, deterministic, collision-resistant for our use case)
 */
// Bit-shift amounts that together multiply by the FNV prime (16777619) using only shifts and adds.
const FNV_PRIME_SHIFT_A = 1;
const FNV_PRIME_SHIFT_B = 4;
const FNV_PRIME_SHIFT_C = 7;
const FNV_PRIME_SHIFT_D = 8;
const FNV_PRIME_SHIFT_E = 24;
const HEX_RADIX = 16;
const HEX_HASH_LENGTH = 8;

const simpleHash = (str: string): string => {
  let hash = 2_166_136_261; // FNV offset basis

  for (let index = 0; index < str.length; index++) {
    hash ^= str.charCodeAt(index);
    hash +=
      (hash << FNV_PRIME_SHIFT_A) +
      (hash << FNV_PRIME_SHIFT_B) +
      (hash << FNV_PRIME_SHIFT_C) +
      (hash << FNV_PRIME_SHIFT_D) +
      (hash << FNV_PRIME_SHIFT_E);
  }

  // Convert to unsigned 32-bit and then to hex
  const unsigned = hash >>> 0;
  return unsigned.toString(HEX_RADIX).padStart(HEX_HASH_LENGTH, "0");
};

export interface OpenAlexRequest {
  /**
  Normalized endpoint path (e.g., "/works", "/authors/A123")
   */
  endpoint: string;

  /**
  Query parameters in canonical form
   */
  params: {
    select?: string[];
    filter?: Record<string, unknown>;
    search?: string;
    sort?: string;
    page?: number;
    per_page?: number;
    seed?: number;
    [key: string]: unknown;
  };
}

export interface NormalizedRequest {
  /**
  Cache key derived from request (used for cache lookups)
   */
  cacheKey: string;

  /**
  Original request
   */
  request: OpenAlexRequest;

  /**
  Request hash for deduplication (short hash for comparisons)
   */
  hash: string;
}

/**
 * Type guard narrowing to `unknown[]` rather than the `any[]` that `Array.isArray` itself narrows to, so downstream array operations stay type-safe instead of silently becoming `any`.
 */
const isUnknownArray = (value: unknown): value is unknown[] => Array.isArray(value);

/**
 * Convert an arbitrary value to a string suitable for sorting/serialization comparisons.
 */
const toComparableString = (value: unknown): string => {
  if (typeof value === "string") return value;
  if (
    typeof value === "number" ||
    typeof value === "boolean" ||
    typeof value === "bigint"
  ) {
    return String(value);
  }
  return JSON.stringify(value);
};

/**
 * Normalize an object's keys and values recursively for consistent comparison
 */
const normalizeObject = (obj: Record<string, unknown>): Record<string, unknown> => Object.keys(obj)
    .sort()
    .reduce<Record<string, unknown>>((accumulator, key) => {
      const value = obj[key];

      if (isUnknownArray(value)) {
        // Sort array elements for consistent ordering, comparing by string representation
        accumulator[key] = [...value].sort((a: unknown, b: unknown) =>
          toComparableString(a).localeCompare(toComparableString(b)),
        );
      } else if (isRecord(value)) {
        accumulator[key] = normalizeObject(value);
      } else {
        accumulator[key] = value;
      }

      return accumulator;
    }, {});

/**
 * Convert params object to URL query string
 */
const parametersToQueryString = (params: Record<string, unknown>): string => {
  const entries: [string, string][] = [];

  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null) {
      continue;
    }

    if (isUnknownArray(value)) {
      entries.push([key, value.join(",")]);
    } else if (isRecord(value)) {
      // For complex objects (like filters), serialize to JSON
      entries.push([key, JSON.stringify(value)]);
    } else if (
      typeof value === "string" ||
      typeof value === "number" ||
      typeof value === "boolean" ||
      typeof value === "bigint"
    ) {
      entries.push([key, String(value)]);
    } else {
      entries.push([key, toComparableString(value)]);
    }
  }

  return new URLSearchParams(entries).toString();
};

/**
 * Normalize an OpenAlex API request for consistent caching and comparison
 *
 * This function:
 * - Sorts all parameter keys for consistent ordering
 * - Normalizes arrays by sorting their elements
 * - Recursively normalizes nested objects
 * - Generates a cache key suitable for storage lookups
 * - Creates a short hash for quick deduplication checks
 * @param request - The OpenAlex API request to normalize
 * @returns Normalized request with cache key and hash
 */
export const normalizeRequest = (request: OpenAlexRequest): NormalizedRequest => {
  // Normalize the params object
  const normalizedParameters = normalizeObject(request.params);

  const normalized: OpenAlexRequest = {
    endpoint: request.endpoint,
    params: normalizedParameters,
  };

  // Generate cache key from normalized request
  const queryString = parametersToQueryString(normalizedParameters);
  const cacheKey = queryString
    ? `${normalized.endpoint}?${queryString}`
    : normalized.endpoint;

  // Generate short hash for deduplication using simple hash
  const hash = simpleHash(JSON.stringify(normalized));

  return {
    cacheKey,
    request: normalized,
    hash,
  };
};

/**
 * Compare two normalized requests for equality
 */
export const requestsEqual = (a: NormalizedRequest, b: NormalizedRequest): boolean => a.hash === b.hash;

/**
 * Check if a request is a duplicate of a recent request (within time window)
 */
export const isDuplicateRequest = (request: NormalizedRequest, recentRequests: readonly { request: NormalizedRequest; timestamp: number }[], windowMs = 1000): boolean => {
  const now = Date.now();

  return recentRequests.some(
    (recent) =>
      requestsEqual(request, recent.request) &&
      now - recent.timestamp < windowMs,
  );
};
