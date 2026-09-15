/**
 * Hook to resolve entity display names from OpenAlex
 * Used primarily for sidebar components to show human-readable names
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { EntityType } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";

import { MS_PER_DAY, MS_PER_HOUR } from "./time-constants";

/**
 * A display-name fetch selects only id and display_name, so it validates against exactly those fields
 */
const displayNameStubSchema = z.object({ id: z.string(), display_name: z.string() });


interface UseEntityDisplayNameOptions {
  entityId: string;
  entityType: EntityType;
  enabled?: boolean;
}

interface UseEntityDisplayNameResult {
  displayName: string | null;
  isLoading: boolean;
  isError: boolean;
}

/**
 * Fetches and returns the display_name for an OpenAlex entity
 * Uses minimal field selection to reduce bandwidth
 */
export const useEntityDisplayName = ({
  entityId,
  entityType,
  enabled = true,
}: UseEntityDisplayNameOptions): UseEntityDisplayNameResult => {
  // Skip for special entity IDs (search-, list-, etc.)
  const isSpecialId = entityId.startsWith("search-") || entityId.startsWith("list-");
  const shouldFetch = Boolean(enabled && !isSpecialId && entityId && entityType);

  const query = useQuery<string | null>({
    queryKey: ["entity-display-name", entityType, entityId] as const,
    queryFn: async (): Promise<string | null> => {
      logger.debug(
        "sidebar",
        "Fetching entity display name",
        { entityType, entityId },
        "useEntityDisplayName"
      );

      try {
        // Fetch only the display_name field to minimize bandwidth
        const result = await cachedOpenAlex.getById({
          endpoint: entityType,
          id: entityId,
          params: {
            select: ["id", "display_name"],
          },
          schema: displayNameStubSchema,
        });

        return result.display_name;
      } catch (error) {
        logger.error(
          "sidebar",
          "Failed to fetch entity display name",
          { entityType, entityId, error },
          "useEntityDisplayName"
        );
        return null;
      }
    },
    enabled: shouldFetch,
    staleTime: MS_PER_HOUR, // display names rarely change
    gcTime: MS_PER_DAY,
    retry: 1, // Only retry once for display names
  });

  return {
    displayName: query.data ?? null,
    isLoading: query.isLoading,
    isError: query.isError,
  };
};

