/**
 * Hook for fetching specific fields of an entity on demand
 * Uses the OpenAlex `select` parameter to fetch only requested fields
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { OpenAlexEntity } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useCallback,useState } from "react";

import type { CacheKeyType } from "../config/cache";

interface UseFieldFetchOptions {
  entityId: string;
  entityType: CacheKeyType;
  onSuccess?: (data: Partial<OpenAlexEntity>) => void;
}

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
        const result = await cachedOpenAlex.getById<OpenAlexEntity>({
          endpoint: entityType,
          id: entityId,
          params: {
            select: [fieldName],
          },
        });

        logger.debug("api", "Successfully fetched field", {
          entityId,
          entityType,
          fieldName,
          hasData: !!result,
        });

        if (result && onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch field");
        logger.error("api", "Failed to fetch field", {
          entityId,
          entityType,
          fieldName,
          error: error.message,
        });
        setError(error);
        throw error;
      } finally {
        setIsFetching(false);
      }
    },
    [entityId, entityType, onSuccess]
  );

  const fetchFields = useCallback(
    async (fieldNames: string[]) => {
      setIsFetching(true);
      setError(null);

      try {
        logger.debug("api", "Fetching multiple fields", {
          entityId,
          entityType,
          fieldNames,
        });

        // Fetch entity with multiple fields
        const result = await cachedOpenAlex.getById<OpenAlexEntity>({
          endpoint: entityType,
          id: entityId,
          params: {
            select: fieldNames,
          },
        });

        logger.debug("api", "Successfully fetched fields", {
          entityId,
          entityType,
          fieldNames,
          hasData: !!result,
        });

        if (result && onSuccess) {
          onSuccess(result);
        }

        return result;
      } catch (err) {
        const error = err instanceof Error ? err : new Error("Failed to fetch fields");
        logger.error("api", "Failed to fetch fields", {
          entityId,
          entityType,
          fieldNames,
          error: error.message,
        });
        setError(error);
        throw error;
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
