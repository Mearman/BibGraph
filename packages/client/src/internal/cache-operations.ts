/**
 * Cache Operations Module
 *
 * Functions for caching OpenAlex entities in the static data provider
 */

import { logger } from "@bibgraph/utils";

import { hasValidOpenAlexId } from "./entity-type-detection";
import { staticDataProvider } from "./static-data-provider";
import { cleanOpenAlexId, toStaticEntityType } from "./static-data-utils";

/**
 * Cache a full entity result (from single entity API responses)
 * @param entityType - The entity type (e.g., "works", "authors")
 * @param entityType.entityType
 * @param id - The entity ID
 * @param entityType.id
 * @param data - The entity data to cache
 * @param entityType.data
 */
export const cacheEntityResult = async ({
  entityType,
  id,
  data,
}: {
  entityType: string;
  id: string;
  data: unknown;
}): Promise<void> => {
  try {
    const staticEntityType = toStaticEntityType(entityType);
    await staticDataProvider.setStaticData(staticEntityType, id, data);
    logger.debug("client", "Cached entity result", { entityType, id });
  } catch (error: unknown) {
    logger.debug("client", "Failed to cache entity result", {
      entityType,
      id,
      error,
    });
  }
};

/**
 * Cache a partial entity result (from list responses)
 * Unlike cacheEntityResult, this accepts any object with a valid OpenAlex ID
 * @param entityType - The entity type
 * @param entityType.entityType
 * @param id - The entity ID
 * @param entityType.id
 * @param data - The partial entity data
 * @param entityType.data
 */
export const cachePartialEntity = async ({
  entityType,
  id,
  data,
}: {
  entityType: string;
  id: string;
  data: unknown;
}): Promise<void> => {
  try {
    const staticEntityType = toStaticEntityType(entityType);
    await staticDataProvider.setStaticData(staticEntityType, id, data);
    logger.debug("client", "Cached partial entity", { entityType, id });
  } catch (error: unknown) {
    logger.debug("client", "Failed to cache partial entity", {
      entityType,
      id,
      error,
    });
  }
};

/**
 * Cache multiple entities from list results
 * Uses loose ID validation to allow caching partial entities
 * @param results - Array of entity results
 * @param entityType - The entity type
 */
export const cacheEntitiesFromResults = async (results: unknown[], entityType: string): Promise<void> => {
  let cachedCount = 0;

  for (const result of results) {
    // Use loose check - just verify it has a valid OpenAlex ID
    // List responses may return partial entities that fail strict schema validation
    if (hasValidOpenAlexId(result)) {
      const cleanId = cleanOpenAlexId(result.id);
      try {
        await cachePartialEntity({
          entityType,
          id: cleanId,
          data: result,
        });
        cachedCount++;
      } catch {
        // Silently ignore individual cache failures
      }
    }
  }

  if (cachedCount > 0) {
    logger.debug("client", "Cached entities from list response", {
      entityType,
      count: cachedCount,
      total: results.length,
    });
  }
};
