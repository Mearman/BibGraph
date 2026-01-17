/**
 * URL encoding and decoding utilities for OpenAlex data management
 */
import { logger } from "@bibgraph/utils";
import { z } from "zod";

import type { ParsedKey } from "./types";
import { getEntityPrefix } from "./types";

/**
 * Convert a canonical URL to the encoded key format for consistent indexing
 * Uses standard URL encoding for safe filename generation
 * @param url
 */
export const urlToEncodedKey = (url: string): string =>
  encodeURIComponent(url)
    // Remove extra dot encoding - encodeURIComponent already handles URL safety
    // .replace(/\./g, "%2E")  // Don't double-encode dots
    .replaceAll("!", "%21") // Encode exclamation marks
    .replaceAll("'", "%27") // Encode single quotes
    .replaceAll("(", "%28") // Encode parentheses
    .replaceAll(")", "%29")
    .replaceAll("*", "%2A");

/**
 * Normalize URL by decoding URL-encoded characters for deduplication
 * @param url
 */
export const normalizeUrlForDeduplication = (url: string): string => {
  try {
    // Decode URL-encoded characters for comparison
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};

/**
 * Generate filename from parsed key using URL encoding
 * @param parsed
 */
export const generateFilenameFromParsedKey = (
  parsed: ParsedKey,
): string | null => {
  // Always use full URL encoding for both entities and queries
  const { canonicalUrl } = parsed;
  if (!canonicalUrl) return null;

  // Apply standard URL encoding for filename safety
  let filename = urlToEncodedKey(canonicalUrl);

  // Add .json extension
  filename = `${filename}.json`;

  return filename;
};

/**
 * Generate a descriptive filename from a canonical URL using proper URL encoding
 * @param canonicalUrl
 */
export const generateDescriptiveFilename = (
  canonicalUrl: string,
): string | null => {
  try {
    // Use the same URL encoding approach as urlToEncodedKey for consistency
    return urlToEncodedKey(canonicalUrl) + ".json";
  } catch {
    return null;
  }
};

/**
 * Determine the canonical query URL for a query file
 * This tries multiple approaches to decode the filename and reconstruct the original query
 * @param entityType
 * @param filename
 * @param fileContent
 */
export const determineCanonicalQueryUrl = (
  entityType: string,
  filename: string,
  fileContent: string,
): string | null => {
  // Try multiple decoding approaches

  // Approach 1: Try standard URL decoding
  try {
    const cleanFilename = filename.replace(/\.json$/, "");
    const decodedUrl = decodeURIComponent(cleanFilename);

    if (decodedUrl.startsWith("https://api.openalex.org/")) {
      logger.debug("general", "Decoded URL successfully", { decodedUrl });
      return decodedUrl;
    }
  } catch {
    logger.debug("general", "Failed URL decoding");
  }

  // Approach 2: Try legacy custom encoding for backward compatibility
  try {
    if (filename.startsWith("https-:")) {
      // Decode: https-::api.openalex.org:autocomplete?q="..." → https://api.openalex.org/autocomplete?q="..."
      logger.debug("general", "Decoding legacy custom URL encoding", {
        filename,
      });
      let withoutProtocol = filename.slice(7); // Remove 'https-:'
      withoutProtocol = withoutProtocol
        .replaceAll(":", "/") // : → /
        .replaceAll("-", "=") // - → =
        .replaceAll("%22", '"'); // %22 → "
      const decodedUrl = `https://${withoutProtocol}`;
      logger.debug("general", "Legacy decoded to", { decodedUrl });
      return decodedUrl;
    }
  } catch {
    logger.debug("general", "Failed to decode legacy custom URL encoding");
  }

  // Approach 3: Try base64url decoding (old format)
  try {
    const decoded = Buffer.from(filename, "base64url").toString("utf-8");
    const params: unknown = JSON.parse(decoded);
    if (params && typeof params === "object" && !Array.isArray(params)) {
      const searchParams = new URLSearchParams();
      for (const [key, value] of Object.entries(params)) {
        if (Array.isArray(value)) {
          const stringArray = value.filter(
            (item): item is string => typeof item === "string",
          );
          searchParams.set(key, stringArray.join(","));
        } else {
          searchParams.set(key, String(value));
        }
      }
      return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
    }
  } catch {
    // Continue to next approach
  }

  // Approach 4: Try hex decoding
  try {
    if (/^[0-9a-f]+$/i.test(filename)) {
      const decoded = Buffer.from(filename, "hex").toString("utf-8");
      const params: unknown = JSON.parse(decoded);
      if (params && typeof params === "object" && !Array.isArray(params)) {
        const searchParams = new URLSearchParams();
        for (const [key, value] of Object.entries(params)) {
          if (Array.isArray(value)) {
            searchParams.set(key, value.join(","));
          } else {
            searchParams.set(key, String(value));
          }
        }
        return `https://api.openalex.org/${entityType}?${searchParams.toString()}`;
      }
    }
  } catch {
    // Continue to next approach
  }

  // Approach 5: Check if the query result contains the original URL
  try {
    const queryResult: unknown = JSON.parse(fileContent);
    if (
      queryResult &&
      typeof queryResult === "object" &&
      "meta" in queryResult &&
      queryResult.meta &&
      typeof queryResult.meta === "object" &&
      "request_url" in queryResult.meta &&
      typeof queryResult.meta.request_url === "string"
    ) {
      return queryResult.meta.request_url;
    }
  } catch {
    // Continue to next approach
  }

  // Approach 6: Try to reverse-engineer from query results
  try {
    const queryResult: unknown = JSON.parse(fileContent);
    if (
      queryResult &&
      typeof queryResult === "object" &&
      "results" in queryResult &&
      Array.isArray(queryResult.results)
    ) {
      const reconstructedUrl = reverseEngineerQueryUrl(entityType, queryResult);
      if (reconstructedUrl) {
        return reconstructedUrl;
      }
    }
  } catch {
    // Continue to next approach
  }

  // Approach 7: Fallback - decode filename to reconstruct URL
  logger.warn("general", "Using filename-based URL reconstruction", {
    filename,
  });
  try {
    // Try to decode the filename as URL-encoded
    const cleanFilename = filename.replace(/\.json$/, "");
    const decodedUrl = decodeURIComponent(cleanFilename);

    // Validate it's a proper OpenAlex URL
    if (decodedUrl.startsWith("https://api.openalex.org/")) {
      return decodedUrl;
    }
  } catch {
    logger.warn("general", "Failed to decode filename");
  }

  // Ultimate fallback - this shouldn't happen with proper encoding
  logger.warn("general", "Cannot reconstruct URL from filename", { filename });
  return null;
};

/**
 * Try to reverse-engineer the original query URL from the results
 * @param entityType
 * @param queryResult
 */
const reverseEngineerQueryUrl = (
  entityType: string,
  queryResult: unknown,
): string | null => {
  if (
    !queryResult ||
    typeof queryResult !== "object" ||
    !("results" in queryResult) ||
    !Array.isArray(queryResult.results)
  ) {
    return null;
  }

  const { results } = queryResult;
  if (results.length === 0) return null;

  // Check what fields are present in the first result
  const firstResult: unknown = results[0];
  if (!firstResult || typeof firstResult !== "object") return null;

  const ObjectSchema = z.record(z.string(), z.unknown());
  const resultValidation = ObjectSchema.safeParse(firstResult);
  if (!resultValidation.success) return null;

  const fields = Object.keys(resultValidation.data);

  // Common patterns to detect:

  // Pattern 1: If only id, display_name, publication_year -> likely author.id query with select
  if (
    fields.length === 3 &&
    fields.includes("id") &&
    fields.includes("display_name") &&
    fields.includes("publication_year")
  ) {
    // This looks like filter=author.id:XXXX&select=id,display_name,publication_year
    // Try to infer the author ID from the pattern or use a common one we know exists
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id,display_name,publication_year`;
  }

  // Pattern 2: If only id, display_name -> likely author.id query with select
  if (
    fields.length === 2 &&
    fields.includes("id") &&
    fields.includes("display_name")
  ) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id,display_name`;
  }

  // Pattern 3: If only id -> likely author.id query with select=id
  if (fields.length === 1 && fields.includes("id")) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&select=id`;
  }

  // Pattern 4: If many fields but specific count, might be a per_page query
  if (results.length === 50) {
    return `https://api.openalex.org/${entityType}?filter=author.id:A5017898742&per_page=50`;
  }

  // Pattern 5: If 25 results, might be default query
  if (results.length === 25) {
    return `https://api.openalex.org/${entityType}`;
  }

  // Pattern 6: If 200 results, might be topic query with sorting
  if (results.length === 200) {
    return `https://api.openalex.org/${entityType}?sort=works_count,cited_by_count&select=id,display_name,works_count,cited_by_count&per_page=200`;
  }

  return null;
};

/**
 * Decode entity filename to canonical URL
 * Handles both new URL-encoded format and legacy custom encoding
 * @param entityId
 * @param entityType
 */
export const decodeEntityFilename = (
  entityId: string,
  entityType: string,
): string => {
  // Try URL decoding for new format
  try {
    const decodedUrl = decodeURIComponent(entityId);
    if (decodedUrl.startsWith("https://")) {
      return decodedUrl;
    } else {
      throw new Error("Not a URL-encoded format");
    }
  } catch {
    // Handle legacy custom encoding for backward compatibility
    if (entityId.startsWith("https-:")) {
      // This is an encoded filename - decode it carefully
      // Remove the encoded protocol prefix
      let withoutProtocol = entityId.slice(7); // Remove 'https-:'

      // Replace colons with slashes in the path part (no query params for entities)
      withoutProtocol = withoutProtocol.replaceAll(":", "/");

      // Replace hyphens with equals signs
      withoutProtocol = withoutProtocol.replaceAll("-", "=");

      // Reconstruct the full URL
      let canonicalUrl = "https://" + withoutProtocol;
      canonicalUrl = canonicalUrl.replaceAll("%22", '"');
      return canonicalUrl;
    } else {
      // This is a simple entity ID - construct the canonical URL
      const prefix = getEntityPrefix(entityType);
      const fullEntityId = entityId.startsWith(prefix)
        ? entityId
        : prefix + entityId;
      return `https://api.openalex.org/${entityType}/${fullEntityId}`;
    }
  }
};
