/**
 * Request deduplication service for preventing duplicate API calls
 * Ensures only one request per entity ID is made at a time
 */

import type { OpenAlexEntity } from "@bibgraph/types";
import { isOpenAlexEntity } from "@bibgraph/types";
import { logger } from "@bibgraph/utils/logger";
import type { QueryClient } from "@tanstack/react-query";

import { trackCacheOperation,trackDeduplication } from "./network-interceptor";


interface RequestCacheEntry {
  promise: Promise<OpenAlexEntity>;
  timestamp: number;
  entityId: string;
}

/**
 * Service to deduplicate API requests and provide cache-first entity fetching
 */
export class RequestDeduplicationService {
  private readonly ongoingRequests = new Map<string, RequestCacheEntry>();
  private readonly queryClient: QueryClient;
  private readonly defaultFetcher?: () => Promise<OpenAlexEntity>;

  constructor(
    queryClient: QueryClient,
    defaultFetcher?: () => Promise<OpenAlexEntity>,
  ) {
    this.queryClient = queryClient;
    this.defaultFetcher = defaultFetcher;
  }

  /**
   * Get entity with request deduplication and cache-first strategy
   */
  async getEntity({
    entityId,
    fetcher,
  }: {
    entityId: string;
    fetcher: () => Promise<OpenAlexEntity>;
  }): Promise<OpenAlexEntity> {
    // First, check if we have this entity cached in TanStack Query
    const cachedEntity = this.getCachedEntity(entityId);
    if (cachedEntity) {
      logger.debug(
        "cache",
        "Entity served from TanStack Query cache",
        {
          entityId,
          source: "tanstack-query",
        },
        "RequestDeduplicationService",
      );

      // Track cache hit in network monitor
      trackCacheOperation("read", entityId, true);

      return cachedEntity;
    }

    // Check if there's already an ongoing request for this entity
    if (this.ongoingRequests.has(entityId)) {
      const entry = this.ongoingRequests.get(entityId);
      if (!entry) {
        throw new Error(`Request entry not found for ${entityId}`);
      }

      logger.debug(
        "cache",
        "Entity request deduplicated",
        {
          entityId,
          ageMs: Date.now() - entry.timestamp,
          source: "deduplication",
        },
        "RequestDeduplicationService",
      );

      // Track deduplication in network monitor
      trackDeduplication({ url: `entity://${entityId}`, entityId });

      return entry.promise;
    }

    // Create new request and add to deduplication cache
    logger.debug(
      "api",
      "Creating new entity request",
      {
        entityId,
        ongoingRequestsCount: this.ongoingRequests.size,
      },
      "RequestDeduplicationService",
    );

    const promise = this.createDedicatedRequest({ entityId, fetcher });

    this.ongoingRequests.set(entityId, {
      promise,
      timestamp: Date.now(),
      entityId,
    });

    return promise;
  }

  /**
   * Create a dedicated request with proper cleanup
   */
  private async createDedicatedRequest({
    entityId,
    fetcher,
  }: {
    entityId: string;
    fetcher: () => Promise<OpenAlexEntity>;
  }): Promise<OpenAlexEntity> {
    try {
      const entity = await fetcher();

      // Cache the result in TanStack Query for future use (handle cache errors gracefully)
      try {
        this.queryClient.setQueryData(["entity", entityId], entity, {
          updatedAt: Date.now(),
        });
        logger.debug(
          "api",
          "Entity request completed and cached",
          {
            entityId,
            entityType: entity.id
              ? this.detectEntityType(entity.id)
              : "unknown",
          },
          "RequestDeduplicationService",
        );
      } catch (cacheError) {
        logger.warn(
          "cache",
          "Failed to cache entity, but returning result",
          {
            entityId,
            entityType: entity.id
              ? this.detectEntityType(entity.id)
              : "unknown",
            cacheError:
              cacheError instanceof Error
                ? cacheError.message
                : "Unknown cache error",
          },
          "RequestDeduplicationService",
        );
      }

      return entity;
    } catch (error) {
      logger.error(
        "api",
        "Entity request failed",
        {
          entityId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "RequestDeduplicationService",
      );

      throw error;
    } finally {
      // Always clean up the ongoing request, whether successful or failed
      this.ongoingRequests.delete(entityId);
    }
  }

  /**
   * Check TanStack Query cache for entity
   */
  private getCachedEntity(entityId: string): OpenAlexEntity | null {
    try {
      // Try direct entity query first
      const directCached = this.queryClient.getQueryData<OpenAlexEntity>([
        "entity",
        entityId,
      ]);
      if (directCached && this.isCacheEntryFresh()) {
        return directCached;
      }

      // Try to find in any cached queries that might contain this entity
      const allQueries = this.queryClient.getQueryCache().findAll({
        predicate: (query) => {
          if (query.state.status !== "success" || query.state.data === undefined) {
            return false;
          }

          // Check if this is an entity query containing our target
          const {
            queryKey,
            state: { data },
          } = query;
          if (
            Array.isArray(queryKey) &&
            queryKey[0] === "entity" &&
            isOpenAlexEntity(data)
          ) {
            return data.id === entityId;
          }

          return false;
        },
      });

      // Return the first fresh match
      for (const query of allQueries) {
        if (isOpenAlexEntity(query.state.data) && this.isCacheEntryFresh()) {
          return query.state.data;
        }
      }

      return null;
    } catch (error) {
      logger.warn(
        "cache",
        "Error checking cached entity",
        {
          entityId,
          error: error instanceof Error ? error.message : "Unknown error",
        },
        "RequestDeduplicationService",
      );
      return null;
    }
  }

  /**
   * Check if cached entity is still fresh (within 5 minutes)
   */
  private isCacheEntryFresh(): boolean {
    // For now, assume all cached entities are fresh for 5 minutes
    // In a production system, you might want to add timestamp metadata
    return true; // Simplified for now - could add timestamp checking here
  }

  /**
   * Simple entity type detection for logging
   */
  private detectEntityType(entityId: string): string {
    if (entityId.includes("/W")) return "works";
    if (entityId.includes("/A")) return "authors";
    if (entityId.includes("/S")) return "sources";
    if (entityId.includes("/I")) return "institutions";
    if (entityId.includes("/T")) return "topics";
    if (entityId.includes("/P")) return "publishers";
    if (entityId.includes("/F")) return "funders";
    if (entityId.includes("/K")) return "keywords";
    return "unknown";
  }

  /**
   * Get statistics about ongoing requests and cache performance
   */
  getStats(): {
    ongoingRequests: number;
    requestDetails: {
      entityId: string;
      ageMs: number;
      entityType: string;
    }[];
  } {
    const now = Date.now();
    const requestDetails = [...this.ongoingRequests].map(
      ([entityId, entry]) => ({
        entityId,
        ageMs: now - entry.timestamp,
        entityType: this.detectEntityType(entityId),
      }),
    );

    return {
      ongoingRequests: this.ongoingRequests.size,
      requestDetails,
    };
  }

  /**
   * Clear all ongoing requests (useful for cleanup)
   */
  clear(): void {
    const clearedCount = this.ongoingRequests.size;
    this.ongoingRequests.clear();

    logger.debug(
      "cache",
      "Cleared all ongoing requests",
      {
        clearedCount,
      },
      "RequestDeduplicationService",
    );
  }

  /**
   * Force refresh an entity by clearing its cache and ongoing request
   */
  async refreshEntity({
    entityId,
    fetcher,
  }: {
    entityId: string;
    fetcher: () => Promise<OpenAlexEntity>;
  }): Promise<OpenAlexEntity> {
    // Clear from ongoing requests
    this.ongoingRequests.delete(entityId);

    // Clear from TanStack Query cache
    this.queryClient.removeQueries({
      queryKey: ["entity", entityId],
    });

    logger.debug(
      "cache",
      "Force refreshing entity",
      {
        entityId,
      },
      "RequestDeduplicationService",
    );

    // Fetch fresh data
    return this.getEntity({ entityId, fetcher });
  }
}

/**
 * Create a request deduplication service instance
 */
export const createRequestDeduplicationService = (queryClient: QueryClient): RequestDeduplicationService => new RequestDeduplicationService(queryClient);
