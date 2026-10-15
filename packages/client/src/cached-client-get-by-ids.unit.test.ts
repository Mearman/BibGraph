/**
 * Unit tests for CachedOpenAlexClient.getByIds: the batched multi-id lookup keeps the single-fetch static-cache semantics, so with no caller params every id is read from the static cache first and only the misses reach the API as one batched request. The global fetch and the static data provider are mocks, so nothing leaves the process.
 */

import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

// Mock fetch BEFORE any imports that might capture a reference to it
const mockFetch = vi.fn();

Object.defineProperty(global, "fetch", {
  writable: true,
  value: mockFetch,
});

// Mock the static data provider so cache hits are controlled per test and no real tier (disk, GitHub Pages) is read
vi.mock("./internal/static-data-provider", () => ({
  staticDataProvider: {
    configure: vi.fn(),
    getStaticData: vi.fn(),
    setStaticData: vi.fn(),
    clearCache: vi.fn(),
  },
  CacheTier: {
    MEMORY: "memory",
    LOCAL_DISK: "local_disk",
    GITHUB_PAGES: "github_pages",
    API: "api",
  },
}));

import { CachedOpenAlexClient } from "./cached-client";
import type { ValidationSchema } from "./client";
import type { StaticDataResult } from "./internal/static-data-provider";
import { CacheTier, staticDataProvider } from "./internal/static-data-provider";
import type { StaticEntityType } from "./internal/static-data-utils";

/**
 * Type the mocked provider after the established cache.integration.test.ts pattern: the vi.mock factory replaces it at runtime with a plain object of vi.fn() mocks, described here with property syntax so it carries no "this" binding concerns
 */
interface StaticDataProviderMock {
  getStaticData: Mock<(entityType: StaticEntityType, id: string) => Promise<StaticDataResult>>;
}

const mockedStaticDataProvider = staticDataProvider as unknown as StaticDataProviderMock;

/**
 * Test-only schema that accepts any parsed value, for exercising the client's fetch plumbing without constraining mock payloads to a real entity schema
 */
const passthroughSchema = <T = unknown>(): ValidationSchema<T> => ({
  parse: (data: unknown) => data as T,
});

/**
 * Build an OpenAlex list-response envelope around the given results
 */
const envelope = (results: readonly unknown[]): Response =>
  Response.json(
    {
      results,
      meta: {
        count: results.length,
        db_response_time_ms: 5,
        page: 1,
        per_page: Math.max(results.length, 1),
      },
    },
    { headers: { "content-type": "application/json" } },
  );

const requestedFilter = (): string => {
  const url = new URL(mockFetch.mock.calls[0]?.[0] as string);
  return url.searchParams.get("filter") ?? "";
};

describe("CachedOpenAlexClient.getByIds", () => {
  let client: CachedOpenAlexClient;

  beforeEach(() => {
    mockFetch.mockReset();
    mockedStaticDataProvider.getStaticData.mockReset();
    client = new CachedOpenAlexClient({ staticCacheEnabled: true });
  });

  it("serves cache hits without a request and batches only the misses", async () => {
    mockedStaticDataProvider.getStaticData.mockImplementation(async (_entityType: StaticEntityType, id: string) => {
      await Promise.resolve();
      return {
        found: id === "W1",
        data: { id: "https://openalex.org/W1", title: "Cached work" },
        tier: CacheTier.MEMORY,
        loadTime: 0,
      };
    });
    mockFetch.mockImplementation(() =>
      envelope([{ id: "https://openalex.org/W2", title: "Fetched work" }]),
    );

    const works = await client.getByIds({
      endpoint: "works",
      ids: ["W1", "W2"],
      schema: passthroughSchema(),
    });

    expect(mockFetch).toHaveBeenCalledTimes(1);
    expect(requestedFilter()).toBe("openalex_id:W2");
    expect(works.get("W1")).toEqual({ id: "https://openalex.org/W1", title: "Cached work" });
    expect(works.get("W2")).toEqual({ id: "https://openalex.org/W2", title: "Fetched work" });
  });

  it("returns an empty map and makes no request when no ids are given", async () => {
    const works = await client.getByIds({
      endpoint: "works",
      ids: [],
      schema: passthroughSchema(),
    });

    expect(works.size).toBe(0);
    expect(mockFetch).not.toHaveBeenCalled();
    expect(mockedStaticDataProvider.getStaticData).not.toHaveBeenCalled();
  });

  it("skips the static cache when caller params are present, matching single-fetch getById", async () => {
    mockFetch.mockImplementation(() => envelope([]));

    await client.getByIds({
      endpoint: "works",
      ids: ["W1"],
      params: { select: ["id", "title"] },
      schema: passthroughSchema(),
    });

    expect(mockedStaticDataProvider.getStaticData).not.toHaveBeenCalled();
    expect(mockFetch).toHaveBeenCalledTimes(1);
  });
});
