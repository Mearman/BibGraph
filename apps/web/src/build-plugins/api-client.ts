/**
 * OpenAlex API client utilities for fetching and downloading data
 */
import { writeFile } from "node:fs/promises";

import { logger } from "@bibgraph/utils";

import { ENTITY_TYPE_TO_ENDPOINT } from "./types";

/**
 * Lower bound (inclusive) of the HTTP status range that indicates a redirect response.
 */
const HTTP_REDIRECT_STATUS_MIN = 300;
/**
 * Upper bound (exclusive) of the HTTP status range that indicates a redirect response.
 */
const HTTP_REDIRECT_STATUS_MAX = 400;
/**
 * HTTP status code indicating the requested entity does not exist.
 */
const HTTP_STATUS_NOT_FOUND = 404;

// Download result types
export type DownloadResult =
  | boolean
  | "not_found"
  | { redirected: true; finalUrl: string };

/**
 * Simple fetch function for OpenAlex API queries
 * This is a minimal implementation for use in the build plugin
 */
export const fetchOpenAlexQuery = async (url: string): Promise<unknown> => {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      logger.error("general", "OpenAlex query failed", {
        url,
        status: response.status,
        statusText: response.statusText,
      });
      return null;
    }
    return await response.json();
  } catch (error) {
    logger.error("general", "Error fetching OpenAlex query", {
      url,
      error: error instanceof Error ? error.message : String(error),
    });
    return null;
  }
};

/**
 * Download entity directly with encoded filename (avoids temporary file creation). Returns `true` for success, `false` for non-404 errors, `"not_found"` for 404 errors, or an object of the form `{ redirected: true, finalUrl: string }` for redirected URLs.
 */
export const downloadEntityWithEncodedFilename = async (
  entityType: string,
  entityId: string,
  targetFilePath: string,
): Promise<DownloadResult> => {
  try {
    const endpoint = ENTITY_TYPE_TO_ENDPOINT[entityType];
    if (!endpoint) {
      logger.error("general", "Unknown entity type", { entityType });
      return false;
    }

    // Construct API URL using same config as openalex-downloader
    const apiUrl = `https://api.openalex.org/${endpoint}/${entityId}`;

    logger.debug("general", "Downloading entity from OpenAlex", {
      entityType,
      entityId,
    });

    // Follow redirects manually to handle chains and track final URL
    let currentUrl = apiUrl;
    let finalUrl = apiUrl;
    const maxRedirects = 10; // Prevent infinite redirect loops
    let redirectCount = 0;
    const redirectChain: string[] = [apiUrl];

    while (redirectCount < maxRedirects) {
      logger.debug("general", "Fetching URL", { currentUrl, redirectCount });

      const response = await fetch(currentUrl, { redirect: "manual" });

      // Handle redirects (302, 301, etc.)
      if (response.status >= HTTP_REDIRECT_STATUS_MIN && response.status < HTTP_REDIRECT_STATUS_MAX) {
        const location = response.headers.get("Location");
        if (location === null) {
          logger.error("general", "Redirect response missing Location header", {
            entityType,
            entityId,
            status: response.status,
            currentUrl,
          });
          return false;
        }

        // Resolve relative URLs
        const redirectUrl = new URL(location, currentUrl).href;
        redirectChain.push(redirectUrl);

        logger.debug("general", "Following redirect", {
          entityType,
          entityId,
          status: response.status,
          from: currentUrl,
          to: redirectUrl,
          redirectCount: redirectCount + 1,
        });

        currentUrl = redirectUrl;
        finalUrl = redirectUrl;
        redirectCount++;
        continue; // Follow the redirect
      }

      // Non-redirect response - process it
      if (!response.ok) {
        if (response.status === HTTP_STATUS_NOT_FOUND) {
          logger.warn(
            "general",
            "Entity not found (404) after redirect chain - will remove from index",
            {
              entityType,
              entityId,
              status: response.status,
              finalUrl,
              redirectChain:
                redirectChain.length > 1 ? redirectChain : undefined,
            },
          );
          return "not_found";
        }

        logger.error(
          "general",
          "Failed to download entity after redirect chain",
          {
            entityType,
            entityId,
            status: response.status,
            statusText: response.statusText,
            finalUrl,
            redirectChain: redirectChain.length > 1 ? redirectChain : undefined,
          },
        );
        return false;
      }

      // Success - process the response
      const rawJsonText = await response.text();
      if (!rawJsonText) {
        logger.error("general", "Failed to download entity: empty response", {
          entityType,
          entityId,
          finalUrl,
        });
        return false;
      }

      // Parse and re-stringify for consistent formatting
      const parsedData: unknown = JSON.parse(rawJsonText);
      const prettyJson = JSON.stringify(parsedData, null, 2);

      // Save directly to target path with encoded filename
      await writeFile(targetFilePath, prettyJson);

      // Determine if this was redirected
      const wasRedirected = redirectCount > 0;

      if (wasRedirected) {
        logger.debug(
          "general",
          "Downloaded and saved redirected entity after chain",
          {
            entityType,
            entityId,
            originalUrl: apiUrl,
            finalUrl,
            redirectCount,
            redirectChain,
          },
        );
        return { redirected: true, finalUrl };
      }
      logger.debug("general", "Downloaded and saved entity", {
        entityType,
        entityId,
      });
      return true;
    }

    // If we get here, we hit the redirect limit
    logger.error("general", "Too many redirects - redirect loop detected", {
      entityType,
      entityId,
      maxRedirects,
      redirectChain,
    });
    return false;
  } catch (error) {
    logger.error("general", "Error downloading entity", {
      entityType,
      entityId,
      error: error instanceof Error ? error.message : String(error),
    });
    return false;
  }
};
