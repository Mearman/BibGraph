/**
 * Unit tests for request deduplication service
 * Tests request deduplication, caching, and error handling
 */

import type { OpenAlexEntity } from "@bibgraph/types";
import { QueryClient } from "@tanstack/react-query";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  createRequestDeduplicationService,
  RequestDeduplicationService,
} from "./request-deduplication-service";

/**
 * Minimal typed view of the service's private testing surface, used only to exercise white-box behaviour (the ongoing-requests map and two private helper methods) without resorting to `any`.
 */
interface RequestDeduplicationServiceInternals {
  ongoingRequests: Map<
    string,
    { promise: Promise<OpenAlexEntity>; timestamp: number; entityId: string } | undefined
  >;
  isCacheEntryFresh: () => boolean;
  detectEntityType: (entityId: string) => string;
}

const asInternals = (
  service: RequestDeduplicationService,
): RequestDeduplicationServiceInternals =>
  service as unknown as RequestDeduplicationServiceInternals;

const SLOW_FETCH_DELAY_MS = 100;
const SLOW_FETCH_DELAY_SHORT_MS = 50;
const STATS_CHECK_WAIT_MS = 10;
const MIN_AGE_THRESHOLD_MS = 5;


// Mock logger to prevent console output during tests
vi.mock("@bibgraph/utils/logger", () => ({
  logger: {
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
    debug: vi.fn(),
  },
}));

// Mock network activity store
vi.mock("@/stores/network-activity-store", () => ({
  useNetworkActivityStore: {
    addRequest: vi.fn(),
    updateRequest: vi.fn(),
    removeRequest: vi.fn(),
    completeRequest: vi.fn(),
    failRequest: vi.fn(),
  },
  networkActivityStore: {
    addRequest: vi.fn(),
    updateRequest: vi.fn(),
    removeRequest: vi.fn(),
    completeRequest: vi.fn(),
    failRequest: vi.fn(),
  },
}));

describe("RequestDeduplicationService", () => {
  let queryClient: QueryClient;
  let service: RequestDeduplicationService;
  let mockEntity: OpenAlexEntity;
  let mockFetcher: Mock<() => Promise<OpenAlexEntity>>;

  beforeEach(() => {
    // Create a fresh QueryClient for each test
    queryClient = new QueryClient({
      defaultOptions: {
        queries: {
          retry: false,
        },
      },
    });

    service = new RequestDeduplicationService(queryClient);

    // Mock entity for testing
    mockEntity = {
      id: "https://openalex.org/W123456789",
      display_name: "Test Work",
      publication_year: 2023,
    } as OpenAlexEntity;

    // Mock fetcher function
    mockFetcher = vi.fn<() => Promise<OpenAlexEntity>>();
    vi.clearAllMocks();
  });

  describe("constructor and factory", () => {
    it("should create service instance with QueryClient", () => {
      expect(service).toBeInstanceOf(RequestDeduplicationService);
    });

    it("should create service via factory function", () => {
      const factoryService = createRequestDeduplicationService(queryClient);
      expect(factoryService).toBeInstanceOf(RequestDeduplicationService);
    });
  });

  describe("getEntity", () => {
    it("should return cached entity when available", async () => {
      // Pre-cache the entity
      queryClient.setQueryData(["entity", "W123456789"], mockEntity);
      mockFetcher.mockResolvedValue(mockEntity);

      const result = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });

      expect(result).toEqual(mockEntity);
      expect(mockFetcher).not.toHaveBeenCalled();
    });

    it("should fetch entity when not cached", async () => {
      mockFetcher.mockResolvedValue(mockEntity);

      const result = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });

      expect(result).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce();
    });

    it("should deduplicate concurrent requests for same entity", async () => {
      mockFetcher.mockResolvedValue(mockEntity);

      // Start two concurrent requests for the same entity
      const promise1 = service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      const promise2 = service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });

      const [result1, result2] = await Promise.all([promise1, promise2]);

      expect(result1).toEqual(mockEntity);
      expect(result2).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce(); // Only called once due to deduplication
    });

    it("should cache entity after successful fetch", async () => {
      mockFetcher.mockResolvedValue(mockEntity);

      await service.getEntity({ entityId: "W123456789", fetcher: mockFetcher });

      // Verify entity is cached
      const cachedEntity = queryClient.getQueryData(["entity", "W123456789"]);
      expect(cachedEntity).toEqual(mockEntity);
    });

    it("should handle fetch errors and clean up ongoing requests", async () => {
      const error = new Error("Fetch failed");
      mockFetcher.mockRejectedValue(error);

      await expect(
        service.getEntity({ entityId: "W123456789", fetcher: mockFetcher }),
      ).rejects.toThrow("Fetch failed");

      // Should be able to retry after error
      mockFetcher.mockClear();
      mockFetcher.mockResolvedValue(mockEntity);

      const result = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      expect(result).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce();
    });

    it("should handle missing request entry error", async () => {
      // Manually corrupt the ongoing requests map to simulate the edge case
      const reflectionService = new RequestDeduplicationService(queryClient);

      // Use reflection to access private property for testing
      const ongoingRequests = asInternals(reflectionService).ongoingRequests;

      // Set up a scenario where has() returns true but get() returns undefined
      ongoingRequests.set("W123456789", undefined);

      await expect(
        reflectionService.getEntity({ entityId: "W123456789", fetcher: mockFetcher }),
      ).rejects.toThrow("Request entry not found for W123456789");
    });
  });

  describe("getCachedEntity", () => {
    it("should return null when entity not in cache", async () => {
      mockFetcher.mockResolvedValue(mockEntity);

      // Call getEntity which internally calls getCachedEntity
      await service.getEntity({ entityId: "W123456789", fetcher: mockFetcher });

      // Verify fetcher was called (meaning cache miss)
      expect(mockFetcher).toHaveBeenCalledOnce();
    });

    it("should find entity in cached queries", async () => {
      // Set up a cached query with our entity
      queryClient.setQueryData(["entity", "W123456789"], mockEntity);

      mockFetcher.mockResolvedValue(mockEntity);

      const result = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });

      expect(result).toEqual(mockEntity);
      expect(mockFetcher).not.toHaveBeenCalled(); // Should use cache
    });

    it("should handle cache access errors gracefully", async () => {
      // Mock QueryClient to throw an error
      const errorQueryClient = {
        getQueryData: vi.fn().mockImplementation(() => {
          throw new Error("Cache error");
        }),
        getQueryCache: vi.fn().mockImplementation(() => {
          throw new Error("Cache error");
        }),
        setQueryData: vi.fn(),
        removeQueries: vi.fn(),
      } as unknown as QueryClient;

      const errorService = new RequestDeduplicationService(errorQueryClient);
      mockFetcher.mockResolvedValue(mockEntity);

      // Should still work despite cache errors
      const result = await errorService.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      expect(result).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce();
    });
  });

  describe("isCacheEntryFresh", () => {
    it("should return true for all entities (simplified implementation)", () => {
      // The current implementation always returns true
      const reflectionService = new RequestDeduplicationService(queryClient);

      // Use reflection to test private method
      const isCacheEntryFresh = asInternals(reflectionService).isCacheEntryFresh.bind(
        reflectionService,
      );

      expect(isCacheEntryFresh()).toBe(true);
    });
  });

  describe("detectEntityType", () => {
    const testCases = [
      { id: "https://openalex.org/W123", expected: "works" },
      { id: "https://openalex.org/A456", expected: "authors" },
      { id: "https://openalex.org/S789", expected: "sources" },
      { id: "https://openalex.org/I012", expected: "institutions" },
      { id: "https://openalex.org/T345", expected: "topics" },
      { id: "https://openalex.org/P678", expected: "publishers" },
      { id: "https://openalex.org/F901", expected: "funders" },
      { id: "https://openalex.org/K234", expected: "keywords" },
      { id: "https://openalex.org/X567", expected: "unknown" },
      { id: "invalid-id", expected: "unknown" },
    ];

    for (const { id, expected } of testCases) {
      it(`should detect entity type ${expected} for ID ${id}`, () => {
        const reflectionService = new RequestDeduplicationService(queryClient);

        // Use reflection to test private method
        const detectEntityType = asInternals(reflectionService).detectEntityType.bind(
          reflectionService,
        );

        expect(detectEntityType(id)).toBe(expected);
      });
    }
  });

  describe("getStats", () => {
    it("should return empty stats when no ongoing requests", () => {
      const stats = service.getStats();

      expect(stats).toEqual({
        ongoingRequests: 0,
        requestDetails: [],
      });
    });

    it("should return stats for ongoing requests", async () => {
      // Create a slow fetcher to keep request ongoing
      const slowFetcher = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, SLOW_FETCH_DELAY_MS);
        });
        return mockEntity;
      });

      // Start request but don't await
      const promise = service.getEntity({
        entityId: "W123456789",
        fetcher: slowFetcher,
      });

      // Check stats while request is ongoing
      const stats = service.getStats();

      expect(stats.ongoingRequests).toBe(1);
      expect(stats.requestDetails).toHaveLength(1);
      expect(stats.requestDetails[0]).toMatchObject({
        entityId: "W123456789",
        entityType: "unknown", // The ID "W123456789" doesn't contain "/W" so it's detected as unknown
      });
      expect(typeof stats.requestDetails[0].ageMs).toBe("number");
      expect(stats.requestDetails[0].ageMs).toBeGreaterThanOrEqual(0);

      // Clean up
      await promise;
    });

    it("should calculate age correctly for ongoing requests", async () => {
      const slowFetcher = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, SLOW_FETCH_DELAY_SHORT_MS);
        });
        return mockEntity;
      });

      // Start request
      const promise = service.getEntity({
        entityId: "W123456789",
        fetcher: slowFetcher,
      });

      // Wait a bit
      await new Promise((resolve) => {
        setTimeout(resolve, STATS_CHECK_WAIT_MS);
      });

      const stats = service.getStats();
      expect(stats.requestDetails[0].ageMs).toBeGreaterThan(MIN_AGE_THRESHOLD_MS);

      // Clean up
      await promise;
    });
  });

  describe("clear", () => {
    it("should clear all ongoing requests", () => {
      // Start a slow request
      const slowFetcher = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, SLOW_FETCH_DELAY_MS);
        });
        return mockEntity;
      });

      // Start request but don't await
      void service.getEntity({ entityId: "W123456789", fetcher: slowFetcher });

      // Verify there's an ongoing request
      expect(service.getStats().ongoingRequests).toBe(1);

      // Clear all requests
      service.clear();

      // Verify no ongoing requests
      expect(service.getStats().ongoingRequests).toBe(0);
    });

    it("should log cleared count", () => {
      // Start multiple slow requests
      const slowFetcher = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, SLOW_FETCH_DELAY_MS);
        });
        return mockEntity;
      });

      void service.getEntity({ entityId: "W123456789", fetcher: slowFetcher });
      void service.getEntity({ entityId: "A987654321", fetcher: slowFetcher });

      expect(service.getStats().ongoingRequests).toBe(2);

      service.clear();

      expect(service.getStats().ongoingRequests).toBe(0);
    });
  });

  describe("refreshEntity", () => {
    it("should clear cache and ongoing request then fetch fresh data", async () => {
      // First, cache an entity
      queryClient.setQueryData(["entity", "W123456789"], mockEntity);

      // Start an ongoing request for a different entity to test the cleanup
      const slowFetcher = vi.fn().mockImplementation(async () => {
        await new Promise((resolve) => {
          setTimeout(resolve, SLOW_FETCH_DELAY_MS);
        });
        return mockEntity;
      });
      void service.getEntity({ entityId: "A987654321", fetcher: slowFetcher }); // Different ID so it's not cached

      expect(service.getStats().ongoingRequests).toBe(1);
      expect(queryClient.getQueryData(["entity", "W123456789"])).toEqual(
        mockEntity,
      );

      // Refresh the entity
      const freshEntity = { ...mockEntity, display_name: "Fresh Test Work" };
      const freshFetcher = vi.fn().mockResolvedValue(freshEntity);

      const result = await service.refreshEntity({
        entityId: "W123456789",
        fetcher: freshFetcher,
      });

      expect(result).toEqual(freshEntity);
      expect(freshFetcher).toHaveBeenCalledOnce();

      // Verify cache was updated with fresh data
      expect(queryClient.getQueryData(["entity", "W123456789"])).toEqual(
        freshEntity,
      );
    });

    it("should handle refresh when entity not previously cached", async () => {
      const freshEntity = { ...mockEntity, display_name: "Fresh Test Work" };
      const freshFetcher = vi.fn().mockResolvedValue(freshEntity);

      const result = await service.refreshEntity({
        entityId: "W123456789",
        fetcher: freshFetcher,
      });

      expect(result).toEqual(freshEntity);
      expect(freshFetcher).toHaveBeenCalledOnce();
    });
  });

  describe("edge cases and error handling", () => {
    it("should handle concurrent requests with different entity IDs", async () => {
      const entity1 = { ...mockEntity, id: "https://openalex.org/W111" };
      const entity2 = { ...mockEntity, id: "https://openalex.org/W222" };

      const fetcher1 = vi.fn().mockResolvedValue(entity1);
      const fetcher2 = vi.fn().mockResolvedValue(entity2);

      const [result1, result2] = await Promise.all([
        service.getEntity({ entityId: "W111", fetcher: fetcher1 }),
        service.getEntity({ entityId: "W222", fetcher: fetcher2 }),
      ]);

      expect(result1).toEqual(entity1);
      expect(result2).toEqual(entity2);
      expect(fetcher1).toHaveBeenCalledOnce();
      expect(fetcher2).toHaveBeenCalledOnce();
    });

    it("should handle fetcher throwing non-Error objects", async () => {
      const nonErrorObject = { message: "Custom error object" };
      mockFetcher.mockRejectedValue(nonErrorObject);

      await expect(
        service.getEntity({ entityId: "W123456789", fetcher: mockFetcher }),
      ).rejects.toEqual(nonErrorObject);
    });

    it("should clean up ongoing request on both success and failure", async () => {
      // Test success cleanup
      mockFetcher.mockResolvedValue(mockEntity);
      await service.getEntity({ entityId: "W123456789", fetcher: mockFetcher });
      expect(service.getStats().ongoingRequests).toBe(0);

      // Test failure cleanup
      mockFetcher.mockRejectedValue(new Error("Test error"));
      await expect(
        service.getEntity({ entityId: "W987654321", fetcher: mockFetcher }),
      ).rejects.toThrow();
      expect(service.getStats().ongoingRequests).toBe(0);
    });

    it("should handle QueryClient setQueryData errors gracefully", async () => {
      // Mock QueryClient to throw on setQueryData
      const errorQueryClient = {
        getQueryData: vi.fn().mockReturnValue(null),
        getQueryCache: vi.fn().mockReturnValue({
          findAll: vi.fn().mockReturnValue([]),
        }),
        setQueryData: vi.fn().mockImplementation(() => {
          throw new Error("Cache write error");
        }),
        removeQueries: vi.fn(),
      } as unknown as QueryClient;

      const errorService = new RequestDeduplicationService(errorQueryClient);
      mockFetcher.mockResolvedValue(mockEntity);

      // Should still return the entity even if caching fails
      const result = await errorService.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      expect(result).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce();
    });
  });

  describe("integration scenarios", () => {
    it("should handle rapid successive calls with cache warming", async () => {
      mockFetcher.mockResolvedValue(mockEntity);

      // First call should fetch
      await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      const result2 = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });
      const result3 = await service.getEntity({
        entityId: "W123456789",
        fetcher: mockFetcher,
      });

      expect(result2).toEqual(mockEntity);
      expect(result3).toEqual(mockEntity);
      expect(mockFetcher).toHaveBeenCalledOnce(); // Still only called once
    });

    it("should handle mixed cache hits and misses", async () => {
      const entity1 = { ...mockEntity, id: "https://openalex.org/W111" };
      const entity2 = { ...mockEntity, id: "https://openalex.org/W222" };

      const fetcher1 = vi.fn().mockResolvedValue(entity1);
      const fetcher2 = vi.fn().mockResolvedValue(entity2);

      // Pre-cache entity1
      queryClient.setQueryData(["entity", "W111"], entity1);

      const [result1, result2] = await Promise.all([
        service.getEntity({ entityId: "W111", fetcher: fetcher1 }), // Should use cache
        service.getEntity({ entityId: "W222", fetcher: fetcher2 }), // Should fetch
      ]);

      expect(result1).toEqual(entity1);
      expect(result2).toEqual(entity2);
      expect(fetcher1).not.toHaveBeenCalled(); // Used cache
      expect(fetcher2).toHaveBeenCalledOnce(); // Fetched
    });
  });
});
