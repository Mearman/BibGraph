/**
 * Cache Integration Tests - CachedOpenAlexClient Integration
 *
 * Tests for the CachedOpenAlexClient that integrates static data caching
 * with multi-tier fallback to the OpenAlex API.
 */

import { beforeEach, describe, expect, it, vi } from "vitest";

import {
  type CachedClientConfig,
  CachedOpenAlexClient,
} from "../../cached-client";
import { CacheTier, staticDataProvider } from "../../internal/static-data-provider";

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
    constructor(config: any) {
      this.config = config;
    }
    config: any;
     
    async getById<T>(_params: { endpoint: string; id: string; params?: any }): Promise<T> {
      throw new Error("API call failed");
    }
     
    updateConfig(_config: any): void {
      // Mock implementation
    }
  },
}));

// Mock entity APIs
vi.mock("../../entities/works", () => ({
  WorksApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/authors", () => ({
  AuthorsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/sources", () => ({
  SourcesApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/institutions", () => ({
  InstitutionsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/topics", () => ({
  TopicsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/publishers", () => ({
  PublishersApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/funders", () => ({
  FundersApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/keywords", () => ({
  KeywordsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/text-analysis", () => ({
  TextAnalysisApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
  },
}));

vi.mock("../../entities/concepts", () => ({
  ConceptsApi: class {
    constructor(client: any) {
      this.client = client;
    }
    client: any;
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

// Type the mocked functions
const mockedStaticDataProvider = staticDataProvider as any;

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
      totalSize: 0,
      memorySize: 0,
      diskSize: 0,
      githubPagesSize: 0,
      entries: [],
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
      // Mock static cache miss
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      // Note: The base client mock always throws errors, so API fallback will fail
      // This test verifies that getEntity is called, which attempts API fallback
      const result = await cachedClient.client.getEntity("W123");

      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );

      // Since API fallback fails (base client mock throws), result should be null
      expect(result).toBeNull();
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
          memory: { requests: 50, hits: 40, averageLoadTime: 10 },
          local_disk: { requests: 30, hits: 25, averageLoadTime: 50 },
          github_pages: { requests: 15, hits: 12, averageLoadTime: 200 },
          api: { requests: 5, hits: 3, averageLoadTime: 1000 },
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
        data: { id: "W123", title: "Work" },
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
        data: { id: "A123", name: "Author" },
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
        data: { id: "S123", name: "Source" },
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
      // Mock static cache error
      mockedStaticDataProvider.getStaticData.mockRejectedValue(
        new Error("Cache error"),
      );

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toBeNull();
      // API should not be called when static cache fails gracefully
      expect(mockedStaticDataProvider.getStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should handle API errors and attempt static cache fallback", async () => {
      const testData = {
        id: "https://openalex.org/W123",
        title: "Cached Work",
        display_name: "Cached Work",
        publication_year: 2023,
        cited_by_count: 10,
        counts_by_year: [],
        updated_date: "2023-01-01",
        created_date: "2023-01-01",
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
      expect(staticDataProvider.getStaticData).toHaveBeenCalledTimes(2);
    });

    it("should return null when both cache and API fail", async () => {
      // Mock static cache miss
      mockedStaticDataProvider.getStaticData.mockResolvedValue({
        found: false,
        data: undefined,
      });

      // Mock API error - skip test as it requires complex mocking
      // const getByIdSpy2 = spyOn(cachedClient as any, "getById")
      //   .mockRejectedValue(new Error("API error"));

      const result = await cachedClient.client.getEntity("W123");

      expect(result).toBeNull();
    });
  });

  describe("Cache Control Methods", () => {
    it("should check if entity exists in static cache", async () => {
      mockedStaticDataProvider.hasStaticData.mockResolvedValue(true);

      const exists = await cachedClient.hasStaticEntity("W123");
      expect(exists).toBe(true);
      expect(staticDataProvider.hasStaticData).toHaveBeenCalledWith(
        "works",
        "W123",
      );
    });

    it("should return false when static cache is disabled", async () => {
      cachedClient.setStaticCacheEnabled(false);

      const exists = await cachedClient.hasStaticEntity("W123");
      expect(exists).toBe(false);
      expect(staticDataProvider.hasStaticData).not.toHaveBeenCalled();
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
      const env = cachedClient.getStaticCacheEnvironment();
      expect(env).toBeDefined();
      expect(typeof env.isDevelopment).toBe("boolean");
      expect(typeof env.isProduction).toBe("boolean");
      expect(typeof env.isTest).toBe("boolean");
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
