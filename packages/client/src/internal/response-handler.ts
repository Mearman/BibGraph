/**
 * Response Handler Utilities
 * Handles HTTP response parsing, error extraction, and response interception
 */

import type { OpenAlexError } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import { apiInterceptor, type InterceptedRequest } from "../interceptors/api-interceptor";
import { OpenAlexApiError } from "./errors";

/**
Inclusive lower bound of a successful HTTP status range
 */
const HTTP_SUCCESS_STATUS_MIN = 200;
/**
Exclusive upper bound of a successful HTTP status range
 */
const HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE = 300;

/**
 * Type guard for OpenAlexError response
 */
const isOpenAlexError = (data: unknown): data is OpenAlexError => {
  return (
    typeof data === "object" &&
    data !== null &&
    ("message" in data || "error" in data)
  );
};

/**
 * Parse error response from OpenAlex API
 */
export const parseError = async (response: Response): Promise<OpenAlexApiError> => {
  try {
    const errorData: unknown = await response.json();

    return isOpenAlexError(errorData)
      ? new OpenAlexApiError({
          message:
            errorData.message ||
            errorData.error ||
            `HTTP ${response.status.toString()}`,
          statusCode: response.status,
          response,
        })
      : new OpenAlexApiError({
          message: `HTTP ${response.status.toString()} ${response.statusText}`,
          statusCode: response.status,
          response,
        });
  } catch {
    return new OpenAlexApiError({
      message: `HTTP ${response.status.toString()} ${response.statusText}`,
      statusCode: response.status,
      response,
    });
  }
};

/**
 * Parameters for response interception handling
 */
export interface ResponseInterceptionParams {
  interceptedRequest: InterceptedRequest | null;
  response: Response;
  responseTime: number;
  cacheResponseEntities: (parameters: { url: string; responseData: unknown }) => Promise<void>;
}

/**
 * Handle response interception for caching and logging
 */
export const handleResponseInterception = async ({
  interceptedRequest,
  response,
  responseTime,
  cacheResponseEntities,
}: ResponseInterceptionParams): Promise<void> => {
  if (interceptedRequest && response.status >= HTTP_SUCCESS_STATUS_MIN && response.status < HTTP_SUCCESS_STATUS_MAX_EXCLUSIVE) {
    try {
      const responseClone = response.clone();
      let responseData: unknown;

      try {
        responseData = await responseClone.json();
      } catch (jsonError) {
        logger.debug(
          "client",
          "Failed to parse response as JSON for interception",
          {
            error: jsonError,
            contentType: response.headers.get("content-type"),
            status: response.status,
          },
        );
        return;
      }

      const interceptedCall = apiInterceptor.interceptResponse(
        interceptedRequest,
        response,
        responseData,
        responseTime,
      );

      // Call hook for entity caching
      await cacheResponseEntities({
        url: interceptedRequest.url,
        responseData,
      });

      const isDiskCacheEnabled =
        process.env.BIBGRAPH_DISK_CACHE_ENABLED !== "false";

      // No separate Node-runtime check is needed here: the try/catch below already handles the browser case (the dynamic import simply fails there).
      if (interceptedCall && isDiskCacheEnabled) {
        try {
          const { defaultDiskWriter } = await import("../cache/disk");
          await defaultDiskWriter.writeToCache({
            url: interceptedCall.request.url,
            finalUrl: interceptedCall.request.finalUrl,
            method: interceptedCall.request.method,
            requestHeaders: interceptedCall.request.headers,
            responseData: interceptedCall.response.data,
            statusCode: interceptedCall.response.status,
            responseHeaders: interceptedCall.response.headers,
            timestamp: new Date(interceptedCall.response.timestamp).toISOString(),
          });
        } catch (diskError: unknown) {
          logger.debug(
            "client",
            "Disk caching unavailable (browser environment)",
            { error: diskError },
          );
        }
      }
    } catch (interceptError: unknown) {
      logger.debug("client", "Response interception failed", {
        error: interceptError,
      });
    }
  }
};
