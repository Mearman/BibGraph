/**
 * Comprehensive OpenAlex Data Management Plugin
 * - Downloads missing entity files when entities exist in index but files are missing
 * - Executes missing queries when query definitions exist but result files are missing
 * - Populates missing metadata in both entity and query index files
 * - Generates and maintains complete index files for all entity types
 * - Always runs at build time to ensure complete data availability
 */
import {
  access,
  mkdir,
  readdir,
  readFile,
  stat,
  unlink,
  writeFile,
} from "node:fs/promises";
import { join } from "node:path";

import { logger } from "@bibgraph/utils";
import {
  generateContentHash,
  type UnifiedIndexEntry,
} from "@bibgraph/utils/static-data/cache-utilities";
import type { Plugin } from "vite";
import { z } from "zod";

/**
 * Simple fetch function for OpenAlex API queries
 * This is a minimal implementation for use in the build plugin
 * @param url
 */
const fetchOpenAlexQuery = async (url: string): Promise<unknown> => {
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

// Import additional utilities for direct filename control

// Unified Index Structure
interface IndexEntry {
  lastModified?: string;
  contentHash?: string;
}

// Unified index: keys can be queries, entities, or URLs in various formats
interface UnifiedIndex {
  [key: string]: UnifiedIndexEntry;
}

// Extended index entry with metadata for build plugin
interface ExtendedIndexEntry extends UnifiedIndexEntry {
  lastModified?: string;
  contentHash?: string;
}

// Zod schemas for type validation
const IndexEntrySchema = z.object({
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
});

// Helper function to convert IndexEntry to ExtendedIndexEntry
const indexEntryToUnified = (indexEntry: IndexEntry, $ref?: string): ExtendedIndexEntry => {
  const result: ExtendedIndexEntry = {
    type: "file",
    lastModified: indexEntry.lastModified,
    contentHash: indexEntry.contentHash,
  };
  return result;
};

const QueryParamsSchema = z.record(z.string(), z.unknown());

const QueryDefinitionSchema = z.object({
  params: QueryParamsSchema.optional(),
  url: z.string().optional(),
  lastModified: z.string().optional(),
  contentHash: z.string().optional(),
});

const OldEntityIndexSchema = z.object({
  entityType: z.string(),
  entities: z.array(z.string()),
});

const OldQueryIndexSchema = z.object({
  entityType: z.string().optional(),
  queries: z.union([
    z.array(
      z.object({
        query: QueryDefinitionSchema,
        lastModified: z.string().optional(),
        contentHash: z.string().optional(),
      }),
    ),
    z.record(z.string(), QueryDefinitionSchema),
  ]),
});

const RequestsWrapperSchema = z.object({
  requests: z.record(
    z.string(),
    z.object({
      $ref: z.string().optional(),
      lastModified: z.string().optional(),
      contentHash: z.string().optional(),
    }),
  ),
});

const FlatIndexSchema = z.record(z.string(), IndexEntrySchema);

const ENTITY_TYPES = [
  "works",
  "authors",
  "institutions",
  "topics",
  "sources",
  "publishers",
  "funders",
  "concepts",
  "autocomplete",
];

/**
 * Get the OpenAlex ID prefix for a given entity type
 * @param entityType
 */
const getEntityPrefix = (entityType: string): string => {
  const prefixMap: Record<string, string> = {
    works: "W",
    authors: "A",
    institutions: "I",
    topics: "T",
    sources: "S",
    publishers: "P",
    funders: "F",
    concepts: "C",
    autocomplete: "", // Autocomplete doesn't use entity prefixes, only queries
  };
  return prefixMap[entityType] ?? "";
};

/**
 * Parse a unified index key to determine what type of resource it represents
 */
interface ParsedKey {
  type: "entity" | "query";
  entityType: string;
  entityId?: string;
  queryParams?: Record<string, unknown>;
  originalKey: string;
  canonicalUrl: string;
}

/**
 * Detect malformed filenames that should be removed from filesystem
 * Returns true if the filename represents a malformed double-encoded URL
 * @param filename
 */
const detectMalformedFilename = (filename: string): boolean => {
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
const detectAndCleanMalformedKey = (key: string): string => {
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
const parseIndexKey = (key: string): ParsedKey | null => {
  // Note: Malformed key detection is now handled at the caller level
  // to avoid recursive cleaning that masks the original malformed state

  // Handle full OpenAlex URLs
  if (key.startsWith("https://api.openalex.org/")) {
    return parseOpenAlexApiUrl(key);
  }

  if (key.startsWith("https://openalex.org/")) {
    return parseOpenAlexUrlForPlugin(key);
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

const parseOpenAlexUrlForPlugin = (url: string): ParsedKey | null => {
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

/**
 * Infer entity type from OpenAlex ID prefix
 * @param id
 */
const inferEntityTypeFromId = (id: string): string => {
  if (id.startsWith("W")) return "works";
  if (id.startsWith("A")) return "authors";
  if (id.startsWith("I")) return "institutions";
  if (id.startsWith("T")) return "topics";
  if (id.startsWith("S")) return "sources";
  if (id.startsWith("P")) return "publishers";
  if (id.startsWith("F")) return "funders";
  if (id.startsWith("C")) return "concepts";

  // Default fallback
  return "works";
};

/**
 * Download entity directly with encoded filename (avoids temporary file creation)
 * Returns: true for success, false for non-404 errors, "not_found" for 404 errors,
 * or { redirected: true, finalUrl: string } for redirected URLs
 * @param entityType
 * @param entityId
 * @param targetFilePath
 */
const downloadEntityWithEncodedFilename = async (entityType: string, entityId: string, targetFilePath: string): Promise<boolean | "not_found" | { redirected: true; finalUrl: string }> => {
  try {
    // Entity type mapping (same as in openalex-downloader)
    const ENTITY_TYPE_TO_ENDPOINT: Record<string, string> = {
      authors: "authors",
      works: "works",
      institutions: "institutions",
      topics: "topics",
      publishers: "publishers",
      funders: "funders",
      sources: "sources",
      concepts: "concepts",
    };

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
      if (response.status >= 300 && response.status < 400) {
        const location = response.headers.get("Location");
        if (!location) {
          logger.error("general", "Redirect response missing Location header", {
            entityType,
            entityId,
            status: response.status,
            currentUrl,
          });
          return false;
        }

        // Resolve relative URLs
        const redirectUrl = new URL(location, currentUrl).toString();
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
        if (response.status === 404) {
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
      } else {
        logger.debug("general", "Downloaded and saved entity", {
          entityType,
          entityId,
        });
        return true;
      }
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

export const openalexDataPlugin = (): Plugin => ({
    name: "openalex-data-management",
    buildStart: {
      order: "pre",
      handler: async () => {
        logger.debug(
          "general",
          "Starting comprehensive OpenAlex data management",
        );

        const dataPath = "apps/web/public/data/openalex";

        for (const entityType of ENTITY_TYPES) {
          try {
            logger.debug("general", "Processing entity type", { entityType });

            // 1. Load or create unified index
            let index = await loadUnifiedIndex(dataPath, entityType);

            // 2. Seed missing data based on index entries and get updates to apply
            const { keysToRemove, redirectUpdates } = await seedMissingData(
              dataPath,
              entityType,
              index,
            );

            // 3. Apply index updates: remove 404 entries and update redirected entries
            if (keysToRemove.size > 0 || redirectUpdates.length > 0) {
              logger.debug("general", "Applying index updates", {
                removals: keysToRemove.size,
                redirects: redirectUpdates.length,
                entityType,
              });

              // Create new index without removed keys and with updated redirected keys
              const updatedIndex: Record<string, ExtendedIndexEntry> = {};

              for (const [key, metadata] of Object.entries(index)) {
                // Skip keys marked for removal
                if (keysToRemove.has(key)) {
                  continue;
                }

                // Check if this key has a redirect update
                const redirectUpdate = redirectUpdates.find(
                  (update) => update.oldKey === key,
                );
                if (redirectUpdate) {
                  // Use new key with updated metadata
                  const fixedMetadata = { ...redirectUpdate.metadata };
                  updatedIndex[redirectUpdate.newKey] = indexEntryToUnified(fixedMetadata);
                } else {
                  // Keep existing key
                  updatedIndex[key] = indexEntryToUnified(metadata);
                }
              }

              index = updatedIndex;

              logger.debug("general", "Applied index updates", {
                removedCount: keysToRemove.size,
                redirectedCount: redirectUpdates.length,
                totalCount: Object.keys(index).length,
                entityType,
              });
            }

            // 4. Reformat existing files for consistency
            await reformatExistingFiles(dataPath, entityType);

            // 5. Migrate query files from queries subdirectory to entity directory
            await migrateQueryFilesToEntityDirectory(dataPath, entityType);

            // 6. Scan and update unified index with both entities and queries
            const unifiedIndex = await updateUnifiedIndex(
              dataPath,
              entityType,
              index,
            );

            // 7. Save unified index
            await saveUnifiedIndex(dataPath, entityType, unifiedIndex);
          } catch (error) {
            logger.error("general", "Error processing entity type", {
              entityType,
              error: error instanceof Error ? error.message : String(error),
            });
          }
        }

        // Generate main index with JSON $ref structure
        try {
          logger.debug(
            "general",
            "Generating main index with JSON $ref structure",
          );
          await generateMainIndex(dataPath);
        } catch (error) {
          logger.error("general", "Error generating main index", {
            error: error instanceof Error ? error.message : String(error),
          });
        }

        logger.debug("general", "OpenAlex data management completed");
      },
    },
  });

/**
 * Load unified index for an entity type
 * @param dataPath
 * @param entityType
 */
const loadUnifiedIndex = async (dataPath: string, entityType: string): Promise<Record<string, ExtendedIndexEntry>> => {
  const indexPath = join(dataPath, entityType, "index.json");

  try {
    const indexContent = await readFile(indexPath, "utf-8");
    const parsed: unknown = JSON.parse(indexContent);

    // Try parsing as requests wrapper format first
    const requestsWrapper = RequestsWrapperSchema.safeParse(parsed);
    if (requestsWrapper.success) {
      // Clean and normalize existing unified format from requests
      const cleaned: Record<string, ExtendedIndexEntry> = {};
      for (const [key, entry] of Object.entries(
        requestsWrapper.data.requests,
      )) {
        // Validate entry structure
        const validatedEntry = IndexEntrySchema.safeParse(entry);
        if (!validatedEntry.success) continue;

        // Parse the key and get its canonical form
        const parsedKey = parseIndexKey(key);
        if (parsedKey && parsedKey.type === "entity") {
          // Only include entity entries in the entity index
          // Normalize the canonical URL to decoded form
          const canonicalKey = normalizeUrlForDeduplication(
            parsedKey.canonicalUrl,
          );
          const cleanEntry: IndexEntry = {};
          if (validatedEntry.data.lastModified) {
            cleanEntry.lastModified = validatedEntry.data.lastModified;
          }
          if (validatedEntry.data.contentHash) {
            cleanEntry.contentHash = validatedEntry.data.contentHash;
          }

          // Merge with existing entry if duplicate canonical keys exist
          if (cleaned[canonicalKey]) {
            // Keep the most recent lastModified
            if (
              cleanEntry.lastModified &&
              (!cleaned[canonicalKey].lastModified ||
                cleanEntry.lastModified >
                  (cleaned[canonicalKey].lastModified ?? ""))
            ) {
              cleaned[canonicalKey] = indexEntryToUnified(cleanEntry);
            }
          } else {
            cleaned[canonicalKey] = indexEntryToUnified(cleanEntry);
          }
        }
        // Skip query entries - they will be handled by the separate query index
      }
      return cleaned;
    }

    // Try parsing as flat index format
    const flatIndex = FlatIndexSchema.safeParse(parsed);
    if (flatIndex.success) {
      logger.debug(
        "general",
        "Converting flat index format to requests wrapper format",
      );
      // Clean and normalize existing unified format from flat structure
      const cleaned: Record<string, ExtendedIndexEntry> = {};
      for (const [key, entry] of Object.entries(flatIndex.data)) {
        // Parse the key and get its canonical form
        const parsedKey = parseIndexKey(key);
        if (parsedKey) {
          // Normalize the canonical URL to decoded form
          const canonicalKey = normalizeUrlForDeduplication(
            parsedKey.canonicalUrl,
          );
          const cleanEntry: IndexEntry = {};
          if (entry.lastModified) {
            cleanEntry.lastModified = entry.lastModified;
          }
          if (entry.contentHash) {
            cleanEntry.contentHash = entry.contentHash;
          }

          // Merge with existing entry if duplicate canonical keys exist
          if (cleaned[canonicalKey]) {
            // Keep the most recent lastModified
            if (
              cleanEntry.lastModified &&
              (!cleaned[canonicalKey].lastModified ||
                cleanEntry.lastModified >
                  (cleaned[canonicalKey].lastModified ?? ""))
            ) {
              cleaned[canonicalKey] = indexEntryToUnified(cleanEntry);
            }
          } else {
            cleaned[canonicalKey] = indexEntryToUnified(cleanEntry);
          }
        }
      }
      return cleaned;
    }

    // Convert from old format if needed
    logger.debug("general", "Converting old index format to unified format");
    return convertOldIndexToUnified(parsed);
  } catch {
    logger.debug("general", "Creating new unified index");
    return {};
  }
};

/**
 * Convert old index formats to unified format
 * @param oldIndex
 */
const convertOldIndexToUnified = (oldIndex: unknown): UnifiedIndex => {
  const unified: UnifiedIndex = {};

  // Try parsing as old entity index format
  const entityIndex = OldEntityIndexSchema.safeParse(oldIndex);
  if (entityIndex.success) {
    for (const entityId of entityIndex.data.entities) {
      // Ensure entityId has proper OpenAlex prefix
      const prefix = getEntityPrefix(entityIndex.data.entityType);
      const fullEntityId = entityId.startsWith(prefix)
        ? entityId
        : prefix + entityId;

      // Create canonical URL entry
      const canonicalKey = `https://api.openalex.org/${entityIndex.data.entityType}/${fullEntityId}`;
      unified[canonicalKey] = indexEntryToUnified({
        lastModified: new Date().toISOString(),
        contentHash: "",
      });
    }
  }

  // Try parsing as old query index format
  const queryIndex = OldQueryIndexSchema.safeParse(oldIndex);
  if (queryIndex.success) {
    const entityType = queryIndex.data.entityType ?? "works";

    if (Array.isArray(queryIndex.data.queries)) {
      // New flexible query format
      for (const queryEntry of queryIndex.data.queries) {
        const canonicalKey = generateCanonicalQueryKey(
          queryEntry.query,
          entityType,
        );
        if (canonicalKey) {
          const cleanEntry: IndexEntry = {
            lastModified: queryEntry.lastModified,
            contentHash: queryEntry.contentHash,
          };
          unified[canonicalKey] = indexEntryToUnified(cleanEntry, `./${urlToEncodedKey(canonicalKey)}.json`);
        }
      }
    } else {
      // Old object-based query format
      for (const [, entry] of Object.entries(queryIndex.data.queries)) {
        // Generate canonical key from the old entry
        const canonicalKey = generateCanonicalQueryKeyFromEntry(
          entry,
          entityType,
        );
        if (canonicalKey) {
          // Parse the entry with Zod to ensure type safety
          const parsedEntry = QueryDefinitionSchema.safeParse(entry);
          if (parsedEntry.success) {
            const cleanEntry: IndexEntry = {};
            if (parsedEntry.data.lastModified) {
              cleanEntry.lastModified = parsedEntry.data.lastModified;
            }
            if (parsedEntry.data.contentHash) {
              cleanEntry.contentHash = parsedEntry.data.contentHash;
            }
            unified[canonicalKey] = indexEntryToUnified(cleanEntry, `./${urlToEncodedKey(canonicalKey)}.json`);
          }
        }
      }
    }
  }

  return unified;
};

/**
 * Generate canonical query key from a query definition
 * @param query
 * @param entityType
 */
const generateCanonicalQueryKey = (query: unknown, entityType: string): string | null => {
  const parsed = QueryDefinitionSchema.safeParse(query);
  if (!parsed.success) {
    return null;
  }

  const { params, url } = parsed.data;

  if (params) {
    // Generate canonical query URL
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

  if (url?.startsWith("https://api.openalex.org/")) {
    return url;
  }

  return null;
};

/**
 * Generate canonical query key from old entry format
 * @param entry
 * @param entityType
 */
const generateCanonicalQueryKeyFromEntry = (entry: unknown, entityType: string): string | null => {
  const parsed = QueryDefinitionSchema.safeParse(entry);
  if (!parsed.success) {
    return null;
  }

  const { params, url } = parsed.data;

  if (params) {
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

  if (url?.startsWith("https://api.openalex.org/")) {
    return url;
  }

  return null;
};

/**
 * Seed missing data based on unified index entries
 * Returns updates to be applied to the index: removals and redirects
 * @param dataPath
 * @param entityType
 * @param index
 */
const seedMissingData = async (dataPath: string, entityType: string, index: Record<string, ExtendedIndexEntry>): Promise<{
  keysToRemove: Set<string>;
  redirectUpdates: Array<{
    oldKey: string;
    newKey: string;
    metadata: IndexEntry;
  }>;
}> => {
  let downloadedEntities = 0;
  let executedQueries = 0;
  const keysToRemove = new Set<string>();
  const redirectUpdates: Array<{
    oldKey: string;
    newKey: string;
    metadata: IndexEntry;
  }> = [];

  for (const [key, metadata] of Object.entries(index)) {
    // Check if this key contains malformed patterns and can be cleaned
    const cleanKey = detectAndCleanMalformedKey(key);
    if (cleanKey !== key) {
      // This is a malformed key that got cleaned
      logger.warn("general", "Found malformed index key - will fix", {
        entityType,
        originalKey: key,
        cleanedKey: cleanKey,
      });

      // Parse the cleaned key to verify it's valid and belongs to this entity type
      const cleanedParsed = parseIndexKey(cleanKey);
      if (
        cleanedParsed &&
        cleanedParsed.entityType === entityType &&
        cleanedParsed.type === "entity"
      ) {
        // Valid cleaned key - add to redirect updates
        redirectUpdates.push({
          oldKey: key,
          newKey: cleanKey,
          metadata: {
            ...metadata,
            lastModified: new Date().toISOString(),
          },
        });
        logger.warn(
          "general",
          "Will replace malformed key with cleaned version",
          {
            entityType,
            oldKey: key,
            newKey: cleanKey,
          },
        );
      } else {
        // Cleaned key is still invalid or doesn't belong to this entity type
        logger.warn("general", "Cleaned key is still invalid - will remove", {
          entityType,
          originalKey: key,
          cleanedKey: cleanKey,
          ...(cleanedParsed?.entityType !== undefined && {
            cleanedEntityType: cleanedParsed.entityType,
          }),
          ...(cleanedParsed?.type !== undefined && {
            cleanedType: cleanedParsed.type,
          }),
        });
        keysToRemove.add(key);
      }
      continue; // Skip normal processing for malformed keys
    }

    const parsed = parseIndexKey(key);
    if (!parsed) {
      // If we can't parse it even after cleaning, mark for removal
      logger.warn("general", "Unparseable index key - will remove", {
        entityType,
        key,
      });
      keysToRemove.add(key);
      continue;
    }

    // Only process entries that belong to this entity type
    if (parsed.entityType !== entityType) continue;

    if (parsed.type === "entity") {
      // Check if entity file exists using encoded filename format
      const encodedFilename = urlToEncodedKey(parsed.canonicalUrl) + ".json";
      const entityFilePath = join(dataPath, entityType, encodedFilename);

      try {
        await access(entityFilePath);
      } catch {
        // File doesn't exist - download it
        try {
          logger.debug("general", "Downloading entity", {
            entityType,
            entityId: parsed.entityId,
          });
          await mkdir(join(dataPath, entityType), { recursive: true });
          if (parsed.entityId) {
            const result = await downloadEntityWithEncodedFilename(
              entityType,
              parsed.entityId,
              entityFilePath,
            );

            if (result === true) {
              logger.debug("general", "Downloaded entity file", {
                encodedFilename,
              });
              downloadedEntities++;
            } else if (result === "not_found") {
              logger.warn("general", "Entity not found - removing from index", {
                entityId: parsed.entityId,
                key,
              });
              keysToRemove.add(key);
            } else if (typeof result === "object" && "redirected" in result) {
              logger.warn("general", "Entity redirected - updating index key", {
                entityId: parsed.entityId,
                oldKey: key,
                newKey: result.finalUrl,
              });

              // Add redirect update
              redirectUpdates.push({
                oldKey: key,
                newKey: result.finalUrl,
                metadata: {
                  ...metadata,
                  lastModified: new Date().toISOString(),
                },
              });
              downloadedEntities++;
            } else {
              logger.warn(
                "general",
                "Failed to download entity: no data returned",
                { entityId: parsed.entityId },
              );
            }
          }
        } catch (downloadError) {
          logger.error("general", "Error downloading entity", {
            entityId: parsed.entityId,
            error:
              downloadError instanceof Error
                ? downloadError.message
                : String(downloadError),
          });
        }
      }
    } else {
      // Check if query result file exists in the entity directory
      const filename = generateFilenameFromParsedKey(parsed);
      if (!filename) continue;

      const queryFilePath = join(dataPath, entityType, filename);

      try {
        await access(queryFilePath);
      } catch {
        // File doesn't exist - execute query
        try {
          logger.debug("general", "Executing query", { key });

          const queryUrl = parsed.canonicalUrl;
          const queryResult = await fetchOpenAlexQuery(queryUrl);

          if (queryResult) {
            const entityDir = join(dataPath, entityType);
            await mkdir(entityDir, { recursive: true });
            // Write the query result directly to entity directory
            await writeFile(
              join(entityDir, filename),
              JSON.stringify(queryResult, null, 2),
            );
            logger.debug("general", "Executed and cached query", { filename });
            executedQueries++;
          } else {
            logger.warn(
              "general",
              "Failed to execute query: no data returned",
              { key },
            );
          }
        } catch (queryError) {
          logger.error("general", "Error executing query", {
            key,
            error:
              queryError instanceof Error
                ? queryError.message
                : String(queryError),
          });
        }
      }
    }
  }

  if (downloadedEntities > 0 || executedQueries > 0) {
    logger.debug("general", "Downloaded entities and executed queries", {
      downloadedEntities,
      executedQueries,
    });
  } else {
    logger.debug("general", "All referenced data files present");
  }

  if (keysToRemove.size > 0) {
    logger.debug("general", "Found invalid entities to remove from index", {
      count: keysToRemove.size,
      entityType,
    });
  }

  if (redirectUpdates.length > 0) {
    logger.debug("general", "Found redirected entities to update in index", {
      count: redirectUpdates.length,
      entityType,
    });
  }

  return { keysToRemove, redirectUpdates };
};

/**
 * Ensure consistent JSON formatting for all files
 * @param jsonContent
 */
const formatJsonConsistently = (jsonContent: string): string => {
  try {
    const parsed: unknown = JSON.parse(jsonContent);
    return JSON.stringify(parsed, null, 2);
  } catch {
    // If parsing fails, return original content
    logger.warn("general", "Could not parse JSON for formatting");
    return jsonContent;
  }
};

/**
 * Reformat existing JSON files for consistency
 * @param dataPath
 * @param entityType
 */
const reformatExistingFiles = async (dataPath: string, entityType: string): Promise<void> => {
  const entityDir = join(dataPath, entityType);

  try {
    const files = await readdir(entityDir);
    let reformattedCount = 0;

    for (const file of files) {
      if (file.endsWith(".json") && file !== "index.json") {
        const filePath = join(entityDir, file);

        try {
          const originalContent = await readFile(filePath, "utf-8");
          const formattedContent = formatJsonConsistently(originalContent);

          // Only write if content changed
          if (originalContent !== formattedContent) {
            await writeFile(filePath, formattedContent);
            reformattedCount++;
          }
        } catch {
          logger.warn("general", "Could not reformat file", { file });
        }
      }
    }

    if (reformattedCount > 0) {
      logger.debug("general", "Reformatted files for consistent formatting", {
        reformattedCount,
      });
    }
  } catch {
    // Directory doesn't exist or other error - skip silently
  }
};

/**
 * Convert a canonical URL to the encoded key format for consistent indexing
 * Uses standard URL encoding for safe filename generation
 * @param url
 */
const urlToEncodedKey = (url: string): string => encodeURIComponent(url)
      // Remove extra dot encoding - encodeURIComponent already handles URL safety
      // .replace(/\./g, "%2E")  // Don't double-encode dots
      .replaceAll('!', "%21") // Encode exclamation marks
      .replaceAll('\'', "%27") // Encode single quotes
      .replaceAll('(', "%28") // Encode parentheses
      .replaceAll(')', "%29")
      .replaceAll('*', "%2A");

/**
 * Generate filename from parsed key using URL encoding
 * @param parsed
 */
const generateFilenameFromParsedKey = (parsed: ParsedKey): string | null => {
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
 * Update unified index with both entity and query file metadata
 * @param dataPath
 * @param entityType
 * @param index
 */
const updateUnifiedIndex = async (dataPath: string, entityType: string, index: Record<string, ExtendedIndexEntry>): Promise<Record<string, ExtendedIndexEntry>> => {
  // Scan entity files
  const entityDir = join(dataPath, entityType);
  try {
    const entityFiles = await readdir(entityDir);
    for (const file of entityFiles) {
      if (file.endsWith(".json") && file !== "index.json") {
        const entityId = file.replace(".json", "");
        const filePath = join(entityDir, file);

        // Check if this is a malformed file that should be removed
        const isMalformed = detectMalformedFilename(entityId);
        if (isMalformed) {
          logger.warn("general", "Removing malformed file", {
            entityType,
            file,
            entityId,
            filePath,
          });
          try {
            await unlink(filePath);
            logger.debug("general", "Successfully removed malformed file", {
              filePath,
            });
            continue; // Skip processing this file
          } catch (error) {
            logger.error("general", "Failed to remove malformed file", {
              filePath,
              error: error instanceof Error ? error.message : String(error),
            });
            // Continue processing even if removal failed
          }
        }

        try {
          const fileStat = await stat(filePath);
          const fileContent = await readFile(filePath, "utf-8");
          const contentHash = await generateContentHash(
            JSON.parse(fileContent),
          );

          // Determine file type based on content structure only
          let fileType: "entity" | "query" = "entity";

          try {
            const parsed: unknown = JSON.parse(fileContent);
            if (
              Array.isArray(parsed) ||
              (parsed &&
                typeof parsed === "object" &&
                "results" in parsed &&
                Array.isArray(parsed.results))
            ) {
              // Query results: either direct array or wrapped in object with results property
              fileType = "query";
            }
          } catch {
            // If we can't parse, assume it's an entity file
          }

          const metadata: ExtendedIndexEntry = {
            type: "file",
            lastModified: fileStat.mtime.toISOString(),
            contentHash,
          };

          if (fileType === "entity") {
            // This is an entity file
            let canonicalUrl: string;

            // Try URL decoding for new format
            try {
              const decodedUrl = decodeURIComponent(entityId);
              if (decodedUrl.startsWith("https://")) {
                canonicalUrl = decodedUrl;
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
                withoutProtocol = withoutProtocol.replaceAll(':', "/");

                // Replace hyphens with equals signs
                withoutProtocol = withoutProtocol.replaceAll('-', "=");

                // Reconstruct the full URL
                canonicalUrl = "https://" + withoutProtocol;
                canonicalUrl = canonicalUrl.replaceAll('%22', '"');
              } else {
                // This is a simple entity ID - construct the canonical URL
                const prefix = getEntityPrefix(entityType);
                const fullEntityId = entityId.startsWith(prefix)
                  ? entityId
                  : prefix + entityId;
                canonicalUrl = `https://api.openalex.org/${entityType}/${fullEntityId}`;
              }
            }
            // Use canonical URL as index key

            if (index[canonicalUrl]) {
              // Merge properties
              index[canonicalUrl] = { ...index[canonicalUrl], ...metadata };
            } else {
              index[canonicalUrl] = metadata;
            }
          } else {
            // This is a query file
            const canonicalQueryUrl = determineCanonicalQueryUrl(
              entityType,
              entityId,
              fileContent,
            );
            if (canonicalQueryUrl) {
              // Use canonical URL as index key

              // Check for duplicates with same content hash
              let isDuplicate = false;
              for (const [existingKey, existingEntry] of Object.entries(
                index,
              )) {
                if (existingEntry.contentHash === contentHash) {
                  isDuplicate = true;
                  logger.debug("general", "Skipping duplicate query", {
                    canonicalQueryUrl,
                    matchesKey: existingKey,
                  });
                  break;
                }
              }

              if (!isDuplicate) {
                if (index[canonicalQueryUrl]) {
                  // Merge properties
                  index[canonicalQueryUrl] = { ...index[canonicalQueryUrl], ...metadata };
                } else {
                  index[canonicalQueryUrl] = metadata;
                }
                logger.debug("general", "Added query to index", {
                  canonicalQueryUrl,
                });
              }
            } else {
              logger.warn(
                "general",
                "Could not determine canonical URL for query file",
                { file },
              );
            }
          }
        } catch {
          logger.warn("general", "Error reading file", { file });
        }
      }
    }
  } catch {
    logger.debug("general", "No entity directory found");
  }

  // Deduplicate entries that may have both prefixed and non-prefixed versions
  index = deduplicateIndexEntries(index, entityType);

  logger.debug("general", "Updated unified index with entities and queries", {
    entityType,
    entryCount: Object.keys(index).length,
  });
  return index;
};

/**
 * Determine the canonical query URL for a query file
 * This tries multiple approaches to decode the filename and reconstruct the original query
 * @param entityType
 * @param filename
 * @param fileContent
 */
const determineCanonicalQueryUrl = (entityType: string, filename: string, fileContent: string): string | null => {
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
        .replaceAll(':', "/") // : → /
        .replaceAll('-', "=") // - → =
        .replaceAll('%22', '"'); // %22 → "
      const decodedUrl = `https://${withoutProtocol}`;
      logger.debug("general", "Legacy decoded to", { decodedUrl });
      return decodedUrl;
    }
  } catch {
    logger.debug("general", "Failed to decode legacy custom URL encoding");
  }

  // Approach 2: Try base64url decoding (old format)
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

  // Approach 3: Try hex decoding
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

  // Approach 4: Check if the query result contains the original URL
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

  // Approach 5: Try to reverse-engineer from query results
  try {
    const queryResult: unknown = JSON.parse(fileContent);
    if (
      queryResult &&
      typeof queryResult === "object" &&
      "results" in queryResult &&
      Array.isArray(queryResult.results)
    ) {
      const reconstructedUrl = reverseEngineerQueryUrl(
        entityType,
        queryResult,
      );
      if (reconstructedUrl) {
        return reconstructedUrl;
      }
    }
  } catch {
    // Continue to next approach
  }

  // Approach 6: Fallback - decode filename to reconstruct URL
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
const reverseEngineerQueryUrl = (entityType: string, queryResult: unknown): string | null => {
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
 * Remove duplicate entries where both prefixed and non-prefixed versions exist
 * Keep the prefixed version (canonical) and remove the non-prefixed version
 * @param index
 * @param entityType
 */
const deduplicateIndexEntries = (index: UnifiedIndex, entityType: string): UnifiedIndex => {
  const prefix = getEntityPrefix(entityType);
  const keysToRemove: string[] = [];

  // Skip if no prefix for this entity type
  if (!prefix) {
    return index;
  }

  for (const key of Object.keys(index)) {
    // Check if this is a non-prefixed entity URL
    const match = key.match(/https:\/\/api\.openalex\.org\/[^/]+\/([^?]+)$/);
    if (match) {
      const entityId = match[1];

      // If this ID doesn't start with the expected prefix
      if (!entityId.startsWith(prefix)) {
        // Check if the prefixed version exists
        const prefixedKey = key.replace(entityId, `${prefix}${entityId}`);
        if (index[prefixedKey]) {
          // Both versions exist, mark the non-prefixed one for removal
          keysToRemove.push(key);
          logger.debug("general", "Removing duplicate non-prefixed entry", {
            entityId,
            keeping: `${prefix}${entityId}`,
          });
        }
      }
    }
  }

  // Remove the duplicate entries by creating new object
  const filteredEntries = Object.entries(index).filter(
    ([key]) => !keysToRemove.includes(key),
  );
  return Object.fromEntries(filteredEntries);
};

/**
 * Save unified index to file with requests wrapper
 * @param dataPath
 * @param entityType
 * @param index
 */
const saveUnifiedIndex = async (dataPath: string, entityType: string, index: Record<string, ExtendedIndexEntry>) => {
  const indexPath = join(dataPath, entityType, "index.json");

  try {
    await mkdir(join(dataPath, entityType), { recursive: true });

    // Convert the index to use $ref pointers while preserving metadata
    const refIndex: Record<
      string,
      { $ref: string; lastModified: string; contentHash: string }
    > = {};

    for (const [canonicalUrl, metadata] of Object.entries(index)) {
      // Generate encoded filename from canonical URL
      const encodedFilename = urlToEncodedKey(canonicalUrl) + ".json";

      // Create $ref pointer to the actual data file with metadata
      refIndex[canonicalUrl] = {
        $ref: `./${encodedFilename}`,
        lastModified: metadata.lastModified ?? new Date().toISOString(),
        contentHash: metadata.contentHash ?? "",
      };
    }

    // Write the flattened index directly (no requests wrapper)
    await writeFile(indexPath, JSON.stringify(refIndex, null, 2));
    logger.debug(
      "general",
      "Saved unified index with $ref pointers and metadata",
    );
  } catch (error) {
    logger.error("general", "Error saving unified index", error);
  }
};

/**
 * Normalize URL by decoding URL-encoded characters for deduplication
 * @param url
 */
const normalizeUrlForDeduplication = (url: string): string => {
  try {
    // Decode URL-encoded characters for comparison
    return decodeURIComponent(url);
  } catch {
    return url;
  }
};

/**
 * Migrate query files from queries subdirectory to entity directory with simplified names
 * @param dataPath
 * @param entityType
 */
const migrateQueryFilesToEntityDirectory = async (dataPath: string, entityType: string) => {
  logger.debug("general", "Migrating query files to entity directory", {
    entityType,
  });

  const entityDir = join(dataPath, entityType);
  const queriesDir = join(dataPath, entityType, "queries");
  let movedFiles = 0;

  try {
    const queryFiles = await readdir(queriesDir);

    for (const file of queryFiles) {
      if (file.endsWith(".json") && file !== "index.json") {
        const queryFilePath = join(queriesDir, file);

        try {
          const fileContent = await readFile(queryFilePath, "utf-8");

          // Determine if this is a query file and get its canonical URL
          const canonicalUrl = determineCanonicalQueryUrl(
            entityType,
            file.replace(".json", ""),
            fileContent,
          );

          if (canonicalUrl) {
            // Generate the simplified filename
            const newFilename = generateDescriptiveFilename(canonicalUrl);

            if (newFilename) {
              const newFilePath = join(entityDir, newFilename);

              // Check if the target file already exists
              try {
                await stat(newFilePath);
                logger.debug("general", "File already exists, skipping", {
                  newFilename,
                });
                continue;
              } catch {
                // File doesn't exist, proceed with move
              }

              try {
                // Write to new location with consistent formatting
                const formattedContent = formatJsonConsistently(fileContent);
                await writeFile(newFilePath, formattedContent);
                // Remove from old location
                await unlink(queryFilePath);

                logger.debug("general", "Moved query file", {
                  from: file,
                  to: newFilename,
                });
                movedFiles++;
              } catch {
                logger.warn("general", "Failed to move file", { file });
              }
            } else {
              logger.warn("general", "Could not generate filename for file", {
                file,
              });
            }
          } else {
            logger.warn(
              "general",
              "Could not determine canonical URL for file",
              { file },
            );
          }
        } catch {
          logger.warn("general", "Could not process query file", { file });
        }
      }
    }
  } catch {
    logger.debug("general", "No queries directory found or error accessing it");
  }

  if (movedFiles > 0) {
    logger.debug("general", "Moved query files to entity directory", {
      movedFiles,
    });
  } else {
    logger.debug("general", "No query files found to move");
  }
};

/**
 * Generate a descriptive filename from a canonical URL using proper URL encoding
 * @param canonicalUrl
 */
const generateDescriptiveFilename = (canonicalUrl: string): string | null => {
  try {
    // Use the same URL encoding approach as urlToEncodedKey for consistency
    return urlToEncodedKey(canonicalUrl) + ".json";
  } catch {
    return null;
  }
};

/**
 * Generate the main OpenAlex index with JSON $ref structure
 * @param dataPath
 */
const generateMainIndex = async (dataPath: string): Promise<void> => {
  const mainIndexPath = join(dataPath, "index.json");

  // Discover entity types by scanning directories with index.json files
  const discoveredEntityTypes: string[] = [];

  try {
    const entries = await readdir(dataPath, { withFileTypes: true });

    for (const entry of entries) {
      if (entry.isDirectory()) {
        const entityType = entry.name;
        const entityIndexPath = join(dataPath, entityType, "index.json");

        try {
          await stat(entityIndexPath);
          // Entity index exists
          discoveredEntityTypes.push(entityType);
        } catch {
          // Directory exists but no index.json - skip
        }
      }
    }
  } catch {
    logger.warn("general", "Error discovering entity types");
    return;
  }

  // Sort entity types for consistent output
  discoveredEntityTypes.sort();

  // Create JSON Schema compliant main index that references and spreads all entity indexes
  const entityRefs = discoveredEntityTypes.map((entityType) => ({
    $ref: `./${entityType}/index.json`,
  }));

  // Check if main index exists and compare content structure (excluding lastModified)
  let existingMainIndex: {
    lastModified?: string;
    [key: string]: unknown;
  } | null = null;
  try {
    const existingContent = await readFile(mainIndexPath, "utf-8");
    const parsed: unknown = JSON.parse(existingContent);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      // Safe property access without type assertion
      const hasLastModified = "lastModified" in parsed;
      const lastModifiedValue =
        hasLastModified && typeof parsed.lastModified === "string"
          ? parsed.lastModified
          : undefined;

      existingMainIndex = {
        lastModified: lastModifiedValue,
        ...Object.fromEntries(Object.entries(parsed)),
      };
    }
  } catch {
    // File doesn't exist or is invalid - will create new
  }

  // Create new main index structure
  const newMainIndexContent = {
    $schema: "https://json-schema.org/draft/2020-12/schema",
    $id: "https://api.openalex.org/schema/index",
    title: "OpenAlex Static Data Index",
    description:
      "Root index merging all entity-specific data via JSON Schema references",
    entityType: "object",
    version: "1.0.0",
    allOf: entityRefs,
  };

  // Compare content structure (excluding lastModified) to determine if update is needed
  let contentChanged = true;
  if (existingMainIndex) {
    // Create a copy without lastModified for comparison
    const existingContentCopy = { ...existingMainIndex };
    delete existingContentCopy.lastModified;
    const contentMatches =
      JSON.stringify(existingContentCopy) === JSON.stringify(newMainIndexContent);
    contentChanged = !contentMatches;
  }

  // Preserve existing lastModified if content hasn't changed, otherwise use current timestamp
  const mainIndex = {
    ...newMainIndexContent,
    lastModified: contentChanged
      ? new Date().toISOString()
      : (existingMainIndex?.lastModified ?? new Date().toISOString()),
  };

  // Only write if content has changed
  if (contentChanged) {
    await writeFile(mainIndexPath, JSON.stringify(mainIndex, null, 2), "utf-8");
    logger.debug(
      "general",
      "Updated main index with JSON Schema $ref structure",
      {
        entityTypeCount: discoveredEntityTypes.length,
        contentChanged,
      },
    );
  } else {
    logger.debug("general", "Main index content unchanged - skipping write", {
      entityTypeCount: discoveredEntityTypes.length,
    });
  }
};
