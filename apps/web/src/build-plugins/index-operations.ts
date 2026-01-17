/**
 * Index loading, saving, updating, and management operations
 */
import { createHash } from "node:crypto";
import { mkdir, readdir, readFile, stat, unlink, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "@bibgraph/utils";

import { detectMalformedFilename,parseIndexKey  } from "./key-parsing";
import {
  type ExtendedIndexEntry,
  FlatIndexSchema,
  getEntityPrefix,
  type IndexEntry,
  IndexEntrySchema,
  indexEntryToUnified,
  OldEntityIndexSchema,
  OldQueryIndexSchema,
  QueryDefinitionSchema,
  RequestsWrapperSchema,
  type UnifiedIndex,
} from "./types";
import {
  decodeEntityFilename,
  determineCanonicalQueryUrl,
  normalizeUrlForDeduplication,
  urlToEncodedKey,
} from "./url-encoding";

/**
 * Type guard to check if value is a record object
 * @param value
 */
const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === "object" && value !== null && !Array.isArray(value);
};

/**
 * Generate content hash for cache invalidation
 * Excludes volatile metadata fields for stable hashing
 * @param data
 */
const generateContentHash = async (data: unknown): Promise<string> => {
  try {
    let cleanContent: unknown = data;

    if (isRecord(data)) {
      // Create a copy without meta field
      const entries = Object.entries(data).filter(([key]) => key !== "meta");
      cleanContent = Object.fromEntries(entries);
    }

    // Generate stable hash using sorted keys for consistency
    const sortedKeys = isRecord(cleanContent)
      ? Object.keys(cleanContent).sort()
      : [];
    const jsonString = JSON.stringify(cleanContent, sortedKeys);
    return createHash("sha256").update(jsonString).digest("hex").slice(0, 16);
  } catch (error) {
    logger.warn("general", "Failed to generate content hash", { error });
    return "hash-error";
  }
};

/**
 * Load unified index for an entity type
 * @param dataPath
 * @param entityType
 */
export const loadUnifiedIndex = async (
  dataPath: string,
  entityType: string,
): Promise<Record<string, ExtendedIndexEntry>> => {
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
          unified[canonicalKey] = indexEntryToUnified(
            cleanEntry,
            `./${urlToEncodedKey(canonicalKey)}.json`,
          );
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
            unified[canonicalKey] = indexEntryToUnified(
              cleanEntry,
              `./${urlToEncodedKey(canonicalKey)}.json`,
            );
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
const generateCanonicalQueryKey = (
  query: unknown,
  entityType: string,
): string | null => {
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
const generateCanonicalQueryKeyFromEntry = (
  entry: unknown,
  entityType: string,
): string | null => {
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
 * Update unified index with both entity and query file metadata
 * @param dataPath
 * @param entityType
 * @param index
 */
export const updateUnifiedIndex = async (
  dataPath: string,
  entityType: string,
  index: Record<string, ExtendedIndexEntry>,
): Promise<Record<string, ExtendedIndexEntry>> => {
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
            const canonicalUrl = decodeEntityFilename(entityId, entityType);

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
                  index[canonicalQueryUrl] = {
                    ...index[canonicalQueryUrl],
                    ...metadata,
                  };
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
  const deduplicatedIndex = deduplicateIndexEntries(index, entityType);

  logger.debug("general", "Updated unified index with entities and queries", {
    entityType,
    entryCount: Object.keys(deduplicatedIndex).length,
  });
  return deduplicatedIndex;
};

/**
 * Remove duplicate entries where both prefixed and non-prefixed versions exist
 * Keep the prefixed version (canonical) and remove the non-prefixed version
 * @param index
 * @param entityType
 */
const deduplicateIndexEntries = (
  index: UnifiedIndex,
  entityType: string,
): UnifiedIndex => {
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
export const saveUnifiedIndex = async (
  dataPath: string,
  entityType: string,
  index: Record<string, ExtendedIndexEntry>,
): Promise<void> => {
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
 * Generate the main OpenAlex index with JSON $ref structure
 * @param dataPath
 */
export const generateMainIndex = async (dataPath: string): Promise<void> => {
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
      JSON.stringify(existingContentCopy) ===
      JSON.stringify(newMainIndexContent);
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
