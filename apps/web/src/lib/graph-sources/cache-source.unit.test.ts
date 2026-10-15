/**
 * Unit tests for the cache-tier graph sources' work hydration: every work entry on a cache tier is fetched through one batched getWorksByIds call keyed by normalised id, never one single-work request per entry (which OpenAlex rate-limits within seconds on tiers holding thousands of entities). The client package is a mock, so no request leaves the process.
 */

import type { Work } from "@bibgraph/types";
import type { Mock } from "vitest";
import { beforeEach, describe, expect, it, vi } from "vitest";

type WorksByIds = (ids: readonly string[]) => Promise<ReadonlyMap<string, Work>>;
type WorkById = (id: string) => Promise<Work>;

const getWorksByIds = vi.fn<WorksByIds>();
const getWorkById = vi.fn<WorkById>();
const getAuthorById = vi.fn<WorkById>();

vi.mock("@bibgraph/client", () => ({
  cachedOpenAlex: {
    enumerateIndexedDBEntities: vi.fn(),
    enumerateMemoryCacheEntities: vi.fn(),
    enumerateStaticCacheEntities: vi.fn(),
  },
  getWorksByIds: async (ids: readonly string[]) => getWorksByIds(ids),
  getWorkById: async (id: string) => getWorkById(id),
  getAuthorById: async (id: string) => getAuthorById(id),
  getInstitutionById: vi.fn(),
  getSourceById: vi.fn(),
  getTopicById: vi.fn(),
  getFunderById: vi.fn(),
  getPublisherById: vi.fn(),
}));

import { cachedOpenAlex } from "@bibgraph/client";

import { createIndexedDBCacheSource } from "./cache-source";

/**
 * A cache-tier entry as the client's enumerate functions report them
 */
interface WorkEntry {
  entityType: "works" | "authors";
  entityId: string;
  cachedAt: number;
  lastAccessedAt: number;
  accessCount: number;
  dataSize: number;
}

/**
 * Type the mocked client after the established package pattern: the vi.mock factory replaces it at runtime with a plain object of vi.fn() mocks, described here with property syntax so it carries no "this" binding concerns
 */
interface CachedClientMock {
  enumerateIndexedDBEntities: Mock<() => Promise<readonly WorkEntry[]>>;
}

const mockedCachedOpenAlex = cachedOpenAlex as unknown as CachedClientMock;

const workEntry = (entityId: string): WorkEntry => ({
  entityType: "works",
  entityId,
  cachedAt: 0,
  lastAccessedAt: 0,
  accessCount: 1,
  dataSize: 100,
});

describe("cache source work hydration", () => {
  beforeEach(() => {
    getWorksByIds.mockReset();
    getWorkById.mockReset();
    getAuthorById.mockReset();
    getWorksByIds.mockResolvedValue(
      new Map(
        ["W1", "W2"].map((id) => [
          id,
          { id: `https://openalex.org/${id}`, title: `Work ${id}`, display_name: `Work ${id}` } as unknown as Work,
        ]),
      ),
    );
  });

  it("hydrates every work entry through one batched call, never one request per work", async () => {
    mockedCachedOpenAlex.enumerateIndexedDBEntities.mockResolvedValue([workEntry("W1"), workEntry("W2")]);

    const entities = await createIndexedDBCacheSource().getEntities();

    expect(getWorksByIds).toHaveBeenCalledTimes(1);
    expect(getWorksByIds).toHaveBeenCalledWith(["W1", "W2"]);
    expect(getWorkById).not.toHaveBeenCalled();
    expect(entities.map((entity) => entity.label)).toEqual(["Work W1", "Work W2"]);
  });

  it("skips the batched call entirely when the tier holds no works", async () => {
    mockedCachedOpenAlex.enumerateIndexedDBEntities.mockResolvedValue([
      { ...workEntry("A1"), entityType: "authors" },
    ]);
    getAuthorById.mockResolvedValue({ id: "https://openalex.org/A1", display_name: "An Author" } as unknown as Work);

    const entities = await createIndexedDBCacheSource().getEntities();

    expect(getWorksByIds).not.toHaveBeenCalled();
    expect(entities).toHaveLength(1);
  });

  it("keeps going with unlabelled entities when the batched call fails", async () => {
    mockedCachedOpenAlex.enumerateIndexedDBEntities.mockResolvedValue([workEntry("W1")]);
    getWorksByIds.mockRejectedValue(new Error("rate limited"));

    const entities = await createIndexedDBCacheSource().getEntities();

    expect(entities).toHaveLength(0);
    expect(getWorkById).not.toHaveBeenCalled();
  });
});
