/**
 * URL Building Utilities
 * Handles URL construction, base URL resolution, and query parameter handling
 */

import type { QueryParams } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { FullyConfiguredClient } from "./client-config";

/**
 * Check if a URL is absolute (has a protocol)
 * @param url
 */
export const isAbsoluteUrl = (url: string): boolean => {
  try {
    const parsedUrl = new URL(url);
    return Boolean(parsedUrl.protocol);
  } catch {
    return false;
  }
};

/**
 * Get the origin from the current environment (browser or Node.js)
 */
export const getEnvironmentOrigin = (): string | null => {
  if (typeof window !== "undefined" && window.location?.origin) {
    return window.location.origin;
  }

  if (typeof globalThis !== "undefined") {
    const globalLocation =
      "location" in globalThis ? globalThis.location : undefined;
    if (globalLocation?.origin) {
      return globalLocation.origin;
    }
  }

  if (
    typeof process !== "undefined" &&
    typeof process.env?.VITE_ORIGIN === "string" &&
    process.env.VITE_ORIGIN.length > 0
  ) {
    return process.env.VITE_ORIGIN;
  }

  return null;
};

/**
 * Resolve a base URL to an absolute URL
 * @param baseUrl
 */
export const resolveBaseUrl = (baseUrl: string): string => {
  if (isAbsoluteUrl(baseUrl)) {
    return baseUrl.replace(/\/+$/, "");
  }

  const origin = getEnvironmentOrigin();
  if (origin) {
    const resolvedUrl = new URL(baseUrl, origin);
    return resolvedUrl.toString().replace(/\/+$/, "");
  }

  const fallbackOrigin = "https://api.openalex.org";
  const sanitizedBase = baseUrl.trim();

  if (
    sanitizedBase.startsWith("/") ||
    sanitizedBase.startsWith("./") ||
    sanitizedBase.startsWith("../")
  ) {
    return fallbackOrigin;
  }

  const resolvedUrl = new URL(sanitizedBase, `${fallbackOrigin}/`);
  return resolvedUrl.toString().replace(/\/+$/, "");
};

/**
 * Build a complete URL with query parameters
 * Handles special cases like the 'select' parameter which must not be URL-encoded
 * @param endpoint
 * @param params
 * @param config
 */
export const buildUrl = (
  endpoint: string,
  params: QueryParams,
  config: FullyConfiguredClient,
): string => {
  const normalizedEndpoint = endpoint.startsWith("/")
    ? endpoint.slice(1)
    : endpoint;
  const resolvedBaseUrl = resolveBaseUrl(config.baseUrl);
  const baseWithSlash = resolvedBaseUrl.endsWith("/")
    ? resolvedBaseUrl
    : `${resolvedBaseUrl}/`;
  const url = new URL(normalizedEndpoint, baseWithSlash);

  // Add user email if provided (recommended by OpenAlex)
  if (config.userEmail) {
    url.searchParams.set("mailto", config.userEmail);
  }

  // Add API key if provided (for higher rate limits)
  if (config.apiKey) {
    url.searchParams.set("api_key", config.apiKey);
  }

  // Add include_xpac parameter if enabled
  if (config.includeXpac) {
    url.searchParams.set("include_xpac", "true");
  }

  // Add data_version parameter if specified
  if (config.dataVersion) {
    url.searchParams.set("data_version", config.dataVersion);
  }

  // Build URL string first, then manually append select parameter to avoid encoding commas
  // OpenAlex API requires actual commas, not %2C encoded commas in select parameter
  const selectValue = params.select;
  const otherParams = { ...params };
  delete otherParams.select;

  // Add other query parameters (these can be URL-encoded normally)
  Object.entries(otherParams).forEach(([key, value]) => {
    if (value !== undefined && value !== null) {
      if (Array.isArray(value)) {
        // Handle arrays
        url.searchParams.set(key, value.join(","));
      } else if (
        typeof value === "string" ||
        typeof value === "number" ||
        typeof value === "boolean"
      ) {
        url.searchParams.set(key, String(value));
      }
      // Ignore other types (objects, functions, etc.)
    }
  });

  // Get the base URL string
  let finalUrl = url.toString();

  // Manually append select parameter with unencoded commas if present
  if (selectValue !== undefined && selectValue !== null) {
    const selectString = Array.isArray(selectValue)
      ? selectValue.join(",")
      : String(selectValue);
    const separator = finalUrl.includes("?") ? "&" : "?";
    finalUrl = `${finalUrl}${separator}select=${selectString}`;
  }

  logger.debug("client", "Built API URL", {
    endpoint,
    params,
    finalUrl,
  });
  return finalUrl;
};
