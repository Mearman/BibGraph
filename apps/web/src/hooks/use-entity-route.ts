/**
 * Real implementation of useEntityRoute hook for entity route pages
 * This replaces the stub in @bibgraph/utils with actual data fetching
 */

import type { EntityRouteConfig, UseEntityRouteOptions, UseEntityRouteResult } from "@bibgraph/utils";
import { useParams, useSearch } from "@tanstack/react-router";
import { useCallback,useState } from "react";

import { useRawEntityData } from "./use-raw-entity-data";
import { useUserInteractions } from "./user-interactions";

export const useEntityRoute = <T = unknown>(config: EntityRouteConfig, options: UseEntityRouteOptions = {}): UseEntityRouteResult<T> => {
  const params = useParams({ strict: false }) as Record<string, string>;
  const search = useSearch({ strict: false }) as Record<string, unknown>;
  const [viewMode, setViewMode] = useState<"raw" | "rich">("rich");

  // Extract entity ID from params using the config's paramKey
  const rawId = params[config.paramKey] || "";
  // Safely clean the entity ID - handle undefined/null cases
  const cleanEntityId = rawId ? rawId.replace(/^https?:\/\/.*?openalex\.org\//, "") : "";

  // Fetch raw entity data using the real hook
  const rawEntityData = useRawEntityData({
    options: {
      entityId: cleanEntityId,
      enabled: !!cleanEntityId && !options.skipRandomEntity,
      queryParams: search as Record<string, string>,
    },
  });

  // Random entity loading was removed - define as constant false
  const isLoadingRandom = false;

  // Get user interactions
  const userInteractions = useUserInteractions();

  // Graph data - stubbed (graph store removed)
  const graphData = {
    data: null,
    isLoading: false,
    error: null,
  };

  // Mini graph data - stubbed (graph store removed)
  const miniGraphData = {
    data: null,
    isLoading: false,
    error: null,
  };

  // Stubbed load functions (graph store removed)
  const wrappedLoadEntity = useCallback(
    () => {
      // Graph store removed - no-op
    },
    []
  );

  const wrappedLoadEntityIntoGraph = useCallback(
    () => {
      // Graph store removed - no-op
    },
    []
  );

  return {
    cleanEntityId,
    entityType: config.entityType,
    viewMode,
    setViewMode,
    isLoadingRandom,
    graphData,
    miniGraphData,
    rawEntityData: {
      data: rawEntityData.data as T | undefined,
      isLoading: rawEntityData.isLoading,
      error: rawEntityData.error,
    },
    userInteractions,
    nodeCount: 0,
    loadEntity: wrappedLoadEntity,
    loadEntityIntoGraph: wrappedLoadEntityIntoGraph,
    routeSearch: search,
  };
};
