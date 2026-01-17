/**
 * Data seeding operations for downloading missing entities and executing missing queries
 */
import { access, mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import { logger } from "@bibgraph/utils";

import { downloadEntityWithEncodedFilename, fetchOpenAlexQuery } from "./api-client";
import { detectAndCleanMalformedKey, parseIndexKey } from "./key-parsing";
import type { ExtendedIndexEntry, RedirectUpdate, SeedMissingDataResult } from "./types";
import { generateFilenameFromParsedKey, urlToEncodedKey } from "./url-encoding";

/**
 * Seed missing data based on unified index entries
 * Returns updates to be applied to the index: removals and redirects
 * @param dataPath
 * @param entityType
 * @param index
 */
export const seedMissingData = async (
  dataPath: string,
  entityType: string,
  index: Record<string, ExtendedIndexEntry>,
): Promise<SeedMissingDataResult> => {
  let downloadedEntities = 0;
  let executedQueries = 0;
  const keysToRemove = new Set<string>();
  const redirectUpdates: RedirectUpdate[] = [];

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
