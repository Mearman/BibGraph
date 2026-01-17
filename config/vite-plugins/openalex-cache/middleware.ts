import type { Connect } from "vite";
import { parseOpenAlexUrl } from "../../../packages/utils/src/static-data/cache";
import type { CacheContext } from "./types";
import { createLogVerbose } from "./utils";
import {
  getCachePath,
  getCachedResponse,
  saveToCache,
  fetchFromAPI,
} from "./cache-operations";
import { performDirectoryIndexUpdates } from "./index-operations";

/**
 * Creates redirect middleware for OpenAlex API URL normalization
 */
export function createRedirectMiddleware(
  logVerbose: (message: string) => void,
): Connect.NextHandleFunction {
  return (req, res, next) => {
    const url = req.url || "";

    // Skip if already canonical
    if (url.startsWith("/api/openalex/")) {
      return next();
    }

    // Define redirect patterns for various URL formats
    const patterns = [
      {
        regex: /^\/api\/https:\/\/api\.openalex\.org\/(.*)/,
        replacement: "/api/openalex/$1",
      },
      {
        regex: /^\/api\/https:\/\/openalex\.org\/(.*)/,
        replacement: "/api/openalex/$1",
      },
      {
        regex: /^\/api\/api\.openalex\.org\/(.*)/,
        replacement: "/api/openalex/$1",
      },
      {
        regex: /^\/api\/openalex\.org\/(.*)/,
        replacement: "/api/openalex/$1",
      },
      { regex: /^\/api\/([A-Z]\d+.*)/, replacement: "/api/openalex/$1" },
      {
        regex:
          /^\/api\/(works|authors|sources|institutions|topics|publishers|funders|keywords|concepts|autocomplete|text|domains|fields|subfields)/,
        replacement: "/api/openalex/$1",
      },
    ];

    // Check each pattern for a match
    for (const pattern of patterns) {
      if (pattern.regex.test(url)) {
        const redirectUrl = url.replace(pattern.regex, pattern.replacement);
        logVerbose(`Redirecting ${url} -> ${redirectUrl}`);

        // Perform internal redirect
        req.url = redirectUrl;
        return next();
      }
    }

    // No redirect needed, continue
    next();
  };
}

/**
 * Creates cache middleware for OpenAlex API requests
 */
export function createCacheMiddleware(
  context: CacheContext,
  debounceManager: {
    debounce: (
      key: string,
      fn: (...args: any[]) => any,
      ...args: any[]
    ) => void;
    clear: (key: string) => void;
  },
  staticDataDir: string,
): Connect.NextHandleFunction {
  const logVerbose = createLogVerbose(context.verbose);

  /**
   * Debounced update for directory indexes
   */
  const updateDirectoryIndexes = async (
    cachePath: string,
    url: string,
    fileName: string,
    retrieved_at?: string,
    contentHash?: string,
  ): Promise<void> => {
    const updateKey = `${cachePath}:${fileName}`;

    debounceManager.debounce(updateKey, async () => {
      try {
        await performDirectoryIndexUpdates(
          cachePath,
          { ...context, debounceManager }
        );
      } catch (error) {
        console.error(`[openalex-cache] Failed in debounced update: ${error}`);
      }
    });
  };

  return async (req, res, next) => {
    try {
      const fullUrl = `https://api.openalex.org${req.url}`;
      const parsedUrl = parseOpenAlexUrl(fullUrl);

      if (!parsedUrl) {
        return next();
      }

      // Check if cache exists and is valid
      const cachePath = getCachePath(fullUrl, context);
      if (cachePath) {
        const cached = await getCachedResponse(cachePath);
        if (cached) {
          logVerbose(`Cache hit for ${req.url}`);
          res.setHeader("Content-Type", "application/json");
          res.setHeader("Cache-Control", "public, max-age=3600");
          res.end(JSON.stringify(cached.data));
          return;
        }
      }

      // Cache miss - fetch from API
      logVerbose(`Cache miss for ${req.url} - fetching from API`);

      // Auto-inject git email if mailto placeholder is present
      let finalUrl = fullUrl;
      if (fullUrl.includes("mailto=you@example.com")) {
        try {
          const { execSync } = await import("child_process");
          const gitEmail = execSync("git config user.email", {
            encoding: "utf8",
          }).trim();
          finalUrl = fullUrl.replace(
            "mailto=you@example.com",
            `mailto=${gitEmail}`,
          );
          logVerbose(`Auto-injected git email: ${gitEmail}`);
        } catch (error) {
          logVerbose(`Failed to get git email, keeping placeholder: ${error}`);
        }
      }

      const data = await fetchFromAPI(finalUrl);

      // Save to cache
      await saveToCache(
        cachePath,
        data,
        {}, // Empty headers object for now
        fullUrl,
        context
      );
      logVerbose(`Cached response for ${req.url}`);

      // Send response
      res.setHeader("Content-Type", "application/json");
      res.setHeader("Cache-Control", "public, max-age=3600");
      res.end(JSON.stringify(data));
    } catch (error) {
      console.error(`[openalex-cache] Error handling request: ${error}`);
      next();
    }
  };
}
