/**
 * Key parsing utilities for OpenAlex URLs and identifiers
 */
import { logger } from "@bibgraph/utils";

import type { ParsedKey } from "./types";
import { inferEntityTypeFromId } from "./types";

/**
 * Detect malformed filenames that should be removed from filesystem
 * Returns true if the filename represents a malformed double-encoded URL
 * @param filename
 */
export const detectMalformedFilename = (filename: string): boolean => {
  // Pattern 1: Triple slashes in URL-encoded format (corrupted double-encoding)
  // Example: https%2F%2F%2Fapi%2Eopenalex%2Eorg (should be https%2F%2Fapi.openalex.org)
  if (filename.includes("%2F%2F%2F")) {
    return true;
  }

  // Pattern 2: Double-encoded URLs embedded in paths
  // Example: https%3A%2F%2Fapi.openalex.org%2Fauthors%2FAhttps%252F%252F
  if (filename.includes("https%252F%252F")) {
    return true;
  }

  // Pattern 3: Entity ID starting with encoded URL prefix
  // Example: Ahttps%2F%2F (entity ID should not start with URL)
  if (/^[A-Z]https%2F%2F/.test(filename)) {
    return true;
  }

  return false;
};

/**
 * Detect and clean malformed double-encoded keys
 * Handles cases like: "https://api.openalex.org/authors/Ahttps%2F%2F%2Fapi%2Eopenalex%2Eorg%2Fauthors%2FA5025875274"
 * @param key
 */
export const detectAndCleanMalformedKey = (key: string): string => {
  // Pattern 1: Double-encoded URLs embedded in entity paths
  // Example: "https://api.openalex.org/authors/Ahttps%2F%2F%2Fapi%2Eopenalex%2Eorg%2Fauthors%2FA5025875274"
  const doubleEncodedPattern =
    /^https:\/\/api\.openalex\.org\/\w+\/[A-Z]https%2F%2F/;
  if (doubleEncodedPattern.test(key)) {
    // Extract the embedded encoded URL and decode it
    const match = key.match(
      /^https:\/\/api\.openalex\.org\/\w+\/[A-Z](https%2F%2F.+)$/,
    );
    if (match) {
      try {
        let embeddedUrl = decodeURIComponent(match[1]);
        // Fix malformed protocol separator
        embeddedUrl = embeddedUrl.replace(/^https\/\/\//, "https://");
        logger.debug("general", "Extracted embedded URL from malformed key", {
          original: key,
          extracted: embeddedUrl,
        });
        return embeddedUrl;
      } catch {
        // Decoding failed, continue with other patterns
      }
    }
  }

  // Pattern 2: Entity ID starting with encoded URL
  // Example: "Ahttps%2F%2F%2Fapi%2Eopenalex%2Eorg%2Fauthors%2FA5025875274"
  const encodedEntityPattern = /^[A-Z]https%2F%2F/;
  if (encodedEntityPattern.test(key)) {
    try {
      // Remove the prefix letter and decode
      const withoutPrefix = key.slice(1);
      let decodedUrl = decodeURIComponent(withoutPrefix);
      // Fix malformed protocol separator
      decodedUrl = decodedUrl.replace(/^https\/\/\//, "https://");
      logger.debug("general", "Decoded malformed entity ID", {
        original: key,
        decoded: decodedUrl,
      });
      return decodedUrl;
    } catch {
      // Decoding failed, continue
    }
  }

  // Pattern 3: Multiple URL encoding layers
  // Try progressive decoding until we get a valid URL or stop changing
  let current = key;
  let previous = "";
  let attempts = 0;
  const maxDecodeAttempts = 5;

  while (current !== previous && attempts < maxDecodeAttempts) {
    previous = current;
    try {
      const decoded = decodeURIComponent(current);
      if (
        decoded !== current &&
        (decoded.startsWith("https://") || /^[A-Z]\d+$/.test(decoded))
      ) {
        current = decoded;
        attempts++;
      } else {
        break;
      }
    } catch {
      break;
    }
  }

  if (current !== key && attempts > 0) {
    logger.debug("general", "Progressive decoding cleaned malformed key", {
      original: key,
      cleaned: current,
      attempts,
    });
  }

  return current;
};

/**
 * Parse various key formats into a standardized structure
 * @param key
 */
export const parseIndexKey = (key: string): ParsedKey | null => {
  // Note: Malformed key detection is now handled at the caller level
  // to avoid recursive cleaning that masks the original malformed state

  // Handle full OpenAlex URLs
  if (key.startsWith("https://api.openalex.org/")) {
    return parseOpenAlexApiUrl(key);
  }

  if (key.startsWith("https://openalex.org/")) {
    return parseOpenAlexUrl(key);
  }

  // Handle relative paths and entity IDs
  if (key.includes("?")) {
    // Query format like "works?per_page=30&page=1" or "autocomplete?q=foo"
    return parseRelativeQuery(key);
  }

  if (key.includes("/")) {
    // Entity path format like "works/W2241997964"
    return parseEntityPath(key);
  }

  // Direct entity ID like "W1234"
  return parseDirectEntityId(key);
};

const parseOpenAlexApiUrl = (url: string): ParsedKey | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length === 1) {
      // Query: https://api.openalex.org/works?per_page=30&page=1
      const entityType = pathParts[0];
      const queryParams: Record<string, unknown> = {};

      for (const [key, value] of urlObj.searchParams.entries()) {
        queryParams[key] = value;
      }

      return {
        type: "query",
        entityType,
        queryParams,
        originalKey: url,
        canonicalUrl: url,
      };
    } else if (pathParts.length === 2) {
      // Entity: https://api.openalex.org/works/W2241997964
      const entityType = pathParts[0];
      const entityId = pathParts[1];

      const queryParams: Record<string, unknown> = {};
      for (const [key, value] of urlObj.searchParams.entries()) {
        queryParams[key] = value;
      }

      if (Object.keys(queryParams).length > 0) {
        // Entity with query params
        return {
          type: "query",
          entityType,
          entityId,
          queryParams,
          originalKey: url,
          canonicalUrl: url,
        };
      } else {
        // Pure entity
        return {
          type: "entity",
          entityType,
          entityId,
          originalKey: url,
          canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`,
        };
      }
    }
  } catch {
    return null;
  }
  return null;
};

const parseOpenAlexUrl = (url: string): ParsedKey | null => {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter(Boolean);

    if (pathParts.length === 1) {
      // Direct entity: https://openalex.org/W2241997964
      const entityId = pathParts[0];
      const entityType = inferEntityTypeFromId(entityId);

      return {
        type: "entity",
        entityType,
        entityId,
        originalKey: url,
        canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`,
      };
    } else if (pathParts.length === 2) {
      // Entity with entityType: https://openalex.org/works/W2241997964
      const entityType = pathParts[0];
      const entityId = pathParts[1];

      return {
        type: "entity",
        entityType,
        entityId,
        originalKey: url,
        canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`,
      };
    }
  } catch {
    return null;
  }
  return null;
};

const parseRelativeQuery = (key: string): ParsedKey | null => {
  const [path, queryString] = key.split("?");

  try {
    const queryParams: Record<string, unknown> = {};
    const searchParams = new URLSearchParams(queryString);

    for (const [paramKey, value] of searchParams.entries()) {
      queryParams[paramKey] = value;
    }

    return {
      type: "query",
      entityType: path,
      queryParams,
      originalKey: key,
      canonicalUrl: `https://api.openalex.org/${path}?${queryString}`,
    };
  } catch {
    return null;
  }
};

const parseEntityPath = (key: string): ParsedKey | null => {
  const parts = key.split("/");
  if (parts.length === 2) {
    const [entityType, entityId] = parts;

    return {
      type: "entity",
      entityType,
      entityId,
      originalKey: key,
      canonicalUrl: `https://api.openalex.org/${entityType}/${entityId}`,
    };
  }
  return null;
};

const parseDirectEntityId = (key: string): ParsedKey | null => {
  const entityType = inferEntityTypeFromId(key);

  return {
    type: "entity",
    entityType,
    entityId: key,
    originalKey: key,
    canonicalUrl: `https://api.openalex.org/${entityType}/${key}`,
  };
};
