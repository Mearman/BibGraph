/**
 * OpenAlex Data Management Plugin
 * - Downloads missing entity files when entities exist in index but files are missing
 * - Executes missing queries when query definitions exist but result files are missing
 * - Populates missing metadata in both entity and query index files
 * - Generates and maintains complete index files for all entity types
 * - Always runs at build time to ensure complete data availability
 *
 * This is a thin orchestrator that coordinates the work done by specialized modules:
 * - types.ts: Type definitions, schemas, and constants
 * - key-parsing.ts: URL and key parsing utilities
 * - url-encoding.ts: URL encoding/decoding utilities
 * - api-client.ts: OpenAlex API fetch and download operations
 * - index-operations.ts: Index loading, saving, and updating
 * - file-operations.ts: File reformatting and migration
 * - data-seeding.ts: Missing data download and query execution
 */
import { logger } from "@bibgraph/utils";
import type { Plugin } from "vite";

import { seedMissingData } from "./data-seeding";
import { migrateQueryFilesToEntityDirectory, reformatExistingFiles } from "./file-operations";
import {
  generateMainIndex,
  loadUnifiedIndex,
  saveUnifiedIndex,
  updateUnifiedIndex,
} from "./index-operations";
import { ENTITY_TYPES, type ExtendedIndexEntry, indexEntryToUnified } from "./types";

/**
 * Apply index updates from seeding results
 * Removes 404 entries and updates redirected entries
 * @param index
 * @param keysToRemove
 * @param redirectUpdates
 * @param entityType
 */
const applyIndexUpdates = (
  index: Record<string, ExtendedIndexEntry>,
  keysToRemove: Set<string>,
  redirectUpdates: Array<{
    oldKey: string;
    newKey: string;
    metadata: { lastModified?: string; contentHash?: string };
  }>,
  entityType: string,
): Record<string, ExtendedIndexEntry> => {
  if (keysToRemove.size === 0 && redirectUpdates.length === 0) {
    return index;
  }

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

  logger.debug("general", "Applied index updates", {
    removedCount: keysToRemove.size,
    redirectedCount: redirectUpdates.length,
    totalCount: Object.keys(updatedIndex).length,
    entityType,
  });

  return updatedIndex;
};

/**
 * Process a single entity type through the complete data management pipeline
 * @param dataPath
 * @param entityType
 */
const processEntityType = async (
  dataPath: string,
  entityType: string,
): Promise<void> => {
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
  index = applyIndexUpdates(index, keysToRemove, redirectUpdates, entityType);

  // 4. Reformat existing files for consistency
  await reformatExistingFiles(dataPath, entityType);

  // 5. Migrate query files from queries subdirectory to entity directory
  await migrateQueryFilesToEntityDirectory(dataPath, entityType);

  // 6. Scan and update unified index with both entities and queries
  const unifiedIndex = await updateUnifiedIndex(dataPath, entityType, index);

  // 7. Save unified index
  await saveUnifiedIndex(dataPath, entityType, unifiedIndex);
};

/**
 * Vite plugin for OpenAlex data management
 * Runs at build start to ensure all data is available and properly indexed
 */
export const openalexDataPlugin = (): Plugin => ({
  name: "openalex-data-management",
  buildStart: {
    order: "pre",
    handler: async () => {
      logger.debug("general", "Starting OpenAlex data management");

      const dataPath = "apps/web/public/data/openalex";

      // Process each entity type
      for (const entityType of ENTITY_TYPES) {
        try {
          await processEntityType(dataPath, entityType);
        } catch (error) {
          logger.error("general", "Error processing entity type", {
            entityType,
            error: error instanceof Error ? error.message : String(error),
          });
        }
      }

      // Generate main index with JSON $ref structure
      try {
        logger.debug("general", "Generating main index with JSON $ref structure");
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
