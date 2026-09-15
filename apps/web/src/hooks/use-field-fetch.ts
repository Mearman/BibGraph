/**
 * Hook for fetching specific fields of an entity on demand
 * Uses the OpenAlex `select` parameter to fetch only requested fields
 */

import { cachedOpenAlex } from "@bibgraph/client";
import { logger } from "@bibgraph/utils";
import { useCallback,useState } from "react";
import { z } from "zod";

import type { CacheKeyType } from "../config/cache";

interface UseFieldFetchOptions {
  entityId: string;
  entityType: CacheKeyType;
  onSuccess?: (data: Record<string, unknown>) => void;
}

/**
 * A select-limited fetch returns only the requested fields, so its honest shape is a string-keyed record rather than a full entity
 */
const partialEntitySchema = z.record(z.string(), z.unknown());

export const useFieldFetch = ({
  entityId,
  entityType,
  onSuccess,
}: UseFieldFetchOptions) => {
  const [isFetching, setIsFetching] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const fetchField = useCallback(
    async (fieldName: string) => {
      setIsFetching(true);
      setError(null);

      try {
        logger.debug("api", "Fetching specific field", {
          entityId,
          entityType,
          fieldName,
        });

        // Fetch entity with only the requested field
        const result = await cachedOpenAlex.getById({
          endpoint: entityType,
          id: entityId,
          params: {
            select: [fieldName],
          },
          schema: partialEntitySchema,
        });

        logger.debug("api", "Successfully fetched field", {
          entityId,
          entityType,
          fieldName,
          hasData: true,
        });

        if (onSuccess !== undefined) {
          onSuccess(result);
        }

        return result;
      } catch (error_) {
        const resolvedError = error_ instanceof Error ? error_ : new Error("Failed to fetch field");
        logger.error("api", "Failed to fetch field", {
          entityId,
          entityType,
          fieldName,
          error: resolvedError.message,
        });
        setError(resolvedError);
        throw resolvedError;
      } finally {
        setIsFetching(false);
      }
    },
    [entityId, entityType, onSuccess]
  );

  const fetchFields = useCallback(
    async (fieldNames: readonly string[]) => {
      setIsFetching(true);
      setError(null);

      try {
        logger.debug("api", "Fetching multiple fields", {
          entityId,
          entityType,
          fieldNames,
        });

        // Fetch entity with multiple fields
        const result = await cachedOpenAlex.getById({
          endpoint: entityType,
          id: entityId,
          params: {
            select: [...fieldNames],
          },
          schema: partialEntitySchema,
        });

        logger.debug("api", "Successfully fetched fields", {
          entityId,
          entityType,
          fieldNames,
          hasData: true,
        });

        if (onSuccess !== undefined) {
          onSuccess(result);
        }

        return result;
      } catch (error_) {
        const resolvedError = error_ instanceof Error ? error_ : new Error("Failed to fetch fields");
        logger.error("api", "Failed to fetch fields", {
          entityId,
          entityType,
          fieldNames,
          error: resolvedError.message,
        });
        setError(resolvedError);
        throw resolvedError;
      } finally {
        setIsFetching(false);
      }
    },
    [entityId, entityType, onSuccess]
  );

  return {
    fetchField,
    fetchFields,
    isFetching,
    error,
  };
};
