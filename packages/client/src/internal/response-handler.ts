/**
 * Response Handler Utilities
 * Handles HTTP response parsing, error extraction, and response interception
 */

import type { OpenAlexError } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import { apiInterceptor, type InterceptedRequest } from "../interceptors/api-interceptor";
import { OpenAlexApiError } from "./errors";

/**
 * Type guard for OpenAlexError response
 * @param data
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
 * @param response
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
  cacheResponseEntities: (params: { url: string; responseData: unknown }) => Promise<void>;
}

/**
 * Handle response interception for caching and logging
 * @param root0
 * @param root0.interceptedRequest
 * @param root0.response
 * @param root0.responseTime
 * @param root0.cacheResponseEntities
 */
export const handleResponseInterception = async ({
  interceptedRequest,
  response,
  responseTime,
  cacheResponseEntities,
}: ResponseInterceptionParams): Promise<void> => {
  if (interceptedRequest && response.status >= 200 && response.status < 300) {
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

      const diskCacheEnabled =
        globalThis.process?.env?.BIBGRAPH_DISK_CACHE_ENABLED !== "false";

      if (
        interceptedCall &&
        globalThis.process?.versions?.node &&
        diskCacheEnabled
      ) {
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
