/**
 * Cache Integration Tests - CachedOpenAlexClient Integration
 *
 * Tests for the CachedOpenAlexClient that integrates static data caching
 * with multi-tier fallback to the OpenAlex API.
 */

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type CachedClientConfig,
  CachedOpenAlexClient,
} from "../../cached-client";
import type {
  CacheStatistics,
  EnvironmentInfo,
  StaticDataResult,
} from "../../internal/static-data-provider";
import { CacheTier, staticDataProvider } from "../../internal/static-data-provider";
import type { StaticEntityType } from "../../internal/static-data-utils";

// Mock the static data provider
vi.mock("../../internal/static-data-provider", () => ({
  staticDataProvider: {
    configure: vi.fn(),
    getStaticData: vi.fn(),
    hasStaticData: vi.fn(),
    getCacheStatistics: vi.fn(),
    clearCache: vi.fn(),
    getEnvironmentInfo: vi.fn(),
  },
  CacheTier: {
    MEMORY: "memory",
    LOCAL_DISK: "local_disk",
    GITHUB_PAGES: "github_pages",
    API: "api",
  },
}));

// Mock the base client
vi.mock("../../client", () => ({
  OpenAlexBaseClient: class {
    constructor(config: unknown) {
      this.config = config;
    }
    config: unknown;

    async getById<T>(_parameters: { endpoint: string; id: string; params?: unknown }): Promise<T> {
      // Yield to the microtask queue to emulate a real (async) API call before it fails.
      await Promise.resolve();
      throw new Error("API call failed");
    }

    updateConfig(_config: unknown): void {
      // Mock implementation
    }
  },
}));

// Mock entity APIs
vi.mock("../../entities/works", () => ({
  WorksApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/authors", () => ({
  AuthorsApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/sources", () => ({
  SourcesApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/institutions", () => ({
  InstitutionsApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/topics", () => ({
  TopicsApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/publishers", () => ({
  PublishersApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/funders", () => ({
  FundersApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/keywords", () => ({
  KeywordsApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/text-analysis", () => ({
  TextAnalysisApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

vi.mock("../../entities/concepts", () => ({
  ConceptsApi: class {
    constructor(client: unknown) {
      this.client = client;
    }
    client: unknown;
  },
}));

// Mock utils
vi.mock("../../internal/static-data-utils", () => ({
  toStaticEntityType: vi.fn().mockImplementation((entityType: string) => entityType),
  cleanOpenAlexId: vi.fn().mockImplementation((id: string) => id),
}));

vi.mock("@bibgraph/utils", () => ({
  logger: {
    debug: vi.fn(),
    info: vi.fn(),
    warn: vi.fn(),
    error: vi.fn(),
  },
}));

// Type the mocked functions. `staticDataProvider`'s real (unmocked) type is a class instance with real methods; the vi.mock factory above replaces it at runtime with a plain object of vi.fn() mocks that carries no "this" binding concerns, so it's described with its own local, accurate interface (property syntax, not method syntax) rather than the real class's type.
interface StaticDataProviderMock {
  configure: Mock<(config: Readonly<{ gitHubPagesBaseUrl?: string }>) => void>;
  getStaticData: Mock<(entityType: StaticEntityType, id: string) => Promise<StaticDataResult>>;
  hasStaticData: Mock<(entityType: StaticEntityType, id: string) => Promise<boolean>>;
  getCacheStatistics: Mock<() => Promise<CacheStatistics>>;
  clearCache: Mock<() => Promise<void>>;
  getEnvironmentInfo: Mock<() => EnvironmentInfo>;
}

const mockedStaticDataProvider = staticDataProvider as unknown as StaticDataProviderMock;


/**
 * Minimal entities that satisfy the runtime type guards on the static-cache hit path: each carries the full base-entity fields (OpenAlex URL id, display name, citation counts, per-year counts, ISO dates) the guards validate.
 */
const validWork = (id: string) => ({
  id: `https://openalex.org/${id}`,
  display_name: "Cached Work",
  cited_by_count: 10,
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
});

const validAuthor = (id: string) => ({
  id: `https://openalex.org/${id}`,
  display_name: "Cached Author",
  works_count: 5,
  cited_by_count: 50,
  orcid: undefined,
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
  summary_stats: { "2yr_mean_citedness": 1, h_index: 2, i10_index: 3 },
});

const validSource = (id: string) => ({
  id: `https://openalex.org/${id}`,
  display_name: "Cached Source",
  works_count: 5,
  cited_by_count: 50,
  works_api_url: "https://api.openalex.org/works",
  is_oa: false,
  is_in_doaj: false,
  counts_by_year: [],
  updated_date: "2023-01-01",
  created_date: "2023-01-01",
});

describe("Cache Integration - CachedOpenAlexClient", () => {
  let cachedClient: CachedOpenAlexClient;

  beforeEach(() => {
    // Reset all mocks before each test
    vi.clearAllMocks();

    // Reset static data provider mock to default behavior
    mockedStaticDataProvider.getStaticData.mockResolvedValue({
      found: false,
      data: undefined,
    });
    mockedStaticDataProvider.hasStaticData.mockResolvedValue(false);
    mockedStaticDataProvider.getCacheStatistics.mockResolvedValue({
      totalRequests: 0,
      hits: 0,
      misses: 0,
      hitRate: 0,
      tierStats: {
        [CacheTier.MEMORY]: { requests: 0, hits: 0, averageLoadTime: 0 },
        [CacheTier.INDEXED_DB]: { requests: 0, hits: 0, averageLoadTime: 0 },
        [CacheTier.LOCAL_DISK]: { requests: 0, hits: 0, averageLoadTime: 0 },
        [CacheTier.GITHUB_PAGES]: { requests: 0, hits: 0, averageLoadTime: 0 },
        [CacheTier.API]: { requests: 0, hits: 0, averageLoadTime: 0 },
      },
      bandwidthSaved: 0,
      lastUpdated: 0,
    });
    mockedStaticDataProvider.clearCache.mockResolvedValue();
    mockedStaticDataProvider.getEnvironmentInfo.mockReturnValue({
      isDevelopment: false,
      isProduction: true,
      isTest: true,
    });

    const config: CachedClientConfig = {
      staticCacheEnabled: true,
      staticCacheGitHubPagesUrl: "https://example.github.io",
      staticCacheLocalDir: "./cache",
    };

    cachedClient = new CachedOpenAlexClient(config);
  });

  describe("Client Configuration", () => {
    it("should initialize with static cache enabled", () => {
      expect(cachedClient).toBeInstanceOf(CachedOpenAlexClient);
      expect(cachedClient.getStaticCacheEnabled()).toBe(true);
    });

    it("should have access to all entity APIs", () => {
      expect(cachedClient.client.works).toBeDefined();
      expect(cachedClient.client.authors).toBeDefined();
      expect(cachedClient.client.sources).toBeDefined();
      expect(cachedClient.client.institutions).toBeDefined();
      expect(cachedClient.client.topics).toBeDefined();
      expect(cachedClient.client.publishers).toBeDefined();
      expect(cachedClient.client.funders).toBeDefined();
      expect(cachedClient.client.keywords).toBeDefined();
      expect(cachedClient.client.textAnalysis).toBeDefined();
      expect(cachedClient.client.concepts).toBeDefined();
    });

    it("should have getEntity method", () => {
      expect(typeof cachedClient.client.getEntity).toBe("function");
    });
  });

  describe("Static Data Provider Integration", () => {
    it("should use static data provider for entity lookup", async () => {
      const testData = {
        id: "https://openalex.org/W123",
        title: "Test Work",
        display_name: "Test Work",
        publication_year: 2023,
        cited_by_count: 10,
        counts_by_year: [],
        updated_date: "2023-01-01",
        created_date: "2023-01-01",
      };

      // Mock the static data provider to return test data
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: testData,
        tier: CacheTier.MEMORY,
        loadTime: 10,
      });

      // Call getEntity which should use the static data provider
      const result = await cachedClient.client.getEntity("W123");

      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
      expect(result).toEqual(testData);
    });

    it("should fallback to API when static cache misses", async () => {
      // Mock static cache miss: the base client mock always throws, so the
      // API fallback surfaces its failure rather than flattening it to null
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      await expect(cachedClient.client.getEntity("W123")).rejects.toThrow("API call failed");
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should track request statistics", () => {
      const stats = cachedClient.getRequestStats();
      expect(stats).toBeDefined();
      expect(typeof stats.totalRequests).toBe("number");
      expect(typeof stats.cacheHits).toBe("number");
      expect(typeof stats.apiFallbacks).toBe("number");
      expect(typeof stats.errors).toBe("number");
    });

    it("should get static cache statistics", async () => {
      const mockStats = {
        totalRequests: 100,
        hits: 80,
        misses: 20,
        hitRate: 0.8,
        tierStats: {
          [CacheTier.MEMORY]: { requests: 50, hits: 40, averageLoadTime: 10 },
          [CacheTier.INDEXED_DB]: { requests: 0, hits: 0, averageLoadTime: 0 },
          [CacheTier.LOCAL_DISK]: { requests: 30, hits: 25, averageLoadTime: 50 },
          [CacheTier.GITHUB_PAGES]: { requests: 15, hits: 12, averageLoadTime: 200 },
          [CacheTier.API]: { requests: 5, hits: 3, averageLoadTime: 1000 },
        },
        bandwidthSaved: 1000,
        lastUpdated: Date.now(),
      };

      mockedStaticDataProvider.getCacheStatistics.mockResolvedValue(mockStats);

      const stats = await cachedClient.getStaticCacheStats();
      expect(stats).toEqual(mockStats);
    });
  });

  describe("Entity Type Detection", () => {
    it("should detect works entity type", async () => {
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: validWork("W123"),
      });

      await cachedClient.client.getEntity("W123");
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should detect authors entity type", async () => {
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: validAuthor("A123"),
      });

      await cachedClient.client.getEntity("A123");
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "authors",
        "A123",
      );
    });

    it("should detect sources entity type", async () => {
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: true,
        data: validSource("S123"),
      });

      await cachedClient.client.getEntity("S123");
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "sources",
        "S123",
      );
    });
  });

  describe("Error Handling and Resilience", () => {
    it("should handle static cache errors gracefully", async () => {
      // Cache lookups reject on both the primary and the post-API fallback
      // attempt; the provider degrades each to a miss, so the API failure is
      // what surfaces
      mockedStaticDataProvider.getStaticData.mockRejectedValue(
        new Error("Cache error"),
      );

      await expect(cachedClient.client.getEntity("W123")).rejects.toThrow("API call failed");
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should handle API errors and attempt static cache fallback", async () => {
      const testData = {
        ...validWork("W123"),
        title: "Cached Work",
        publication_year: 2023,
      };

      // Mock static cache miss first
      mockedStaticDataProvider.getStaticData.mockResolvedValueOnce({
        found: false,
        data: undefined,
      });

      // Mock API error - skip test as it requires complex mocking
      // const getByIdSpy2 = spyOn(cachedClient as any, "getById")
      //   .mockRejectedValue(new Error("API error"));

      // Mock static cache fallback success
      mockedStaticDataProvider.getStaticData.mockResolvedValueOnce({
        found: true,
        data: testData,
        tier: CacheTier.MEMORY,
        loadTime: 5,
      });

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toEqual(testData);
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledTimes(2);
    });

    it("should reject when both cache and API fail", async () => {
      // Mock static cache miss: the primary and fallback lookups both miss,
      // and the mocked API client always throws
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      await expect(cachedClient.client.getEntity("W123")).rejects.toThrow("API call failed");
    });
  });

  describe("Cache Control Methods", () => {
    it("should check if entity exists in static cache", async () => {
      mockedStaticDataProvider.hasStaticData.mockResolvedValue(true);

      const isExists = await cachedClient.hasStaticEntity("W123");
      expect(isExists).toBe(true);
      expect(mockedStaticDataProvider.hasStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should return false when static cache is disabled", async () => {
      cachedClient.setStaticCacheEnabled(false);

      const isExists = await cachedClient.hasStaticEntity("W123");
      expect(isExists).toBe(false);
      expect(mockedStaticDataProvider.hasStaticData).not.toHaveBeenCalled();
    });

    it("should clear static cache", async () => {
      await cachedClient.clearStaticCache();
      expect(mockedStaticDataProvider.clearCache).toHaveBeenCalled();
    });

    it("should enable and disable static caching", () => {
      cachedClient.setStaticCacheEnabled(false);
      expect(cachedClient.getStaticCacheEnabled()).toBe(false);

      cachedClient.setStaticCacheEnabled(true);
      expect(cachedClient.getStaticCacheEnabled()).toBe(true);
    });

    it("should get static cache environment", () => {
      const environment = cachedClient.getStaticCacheEnvironment();
      expect(environment).toBeDefined();
      expect(typeof environment.isDevelopment).toBe("boolean");
      expect(typeof environment.isProduction).toBe("boolean");
      expect(typeof environment.isTest).toBe("boolean");
    });
  });

  describe("Configuration Updates", () => {
    it("should update static cache configuration", () => {
      // Type coercion permitted in test files per constitution
      cachedClient.updateConfig({
        staticCacheEnabled: false,
        staticCacheGitHubPagesUrl: "https://new-url.com",
      } as Record<string, unknown>);

      expect(cachedClient.getStaticCacheEnabled()).toBe(false);
    });
  });
});
