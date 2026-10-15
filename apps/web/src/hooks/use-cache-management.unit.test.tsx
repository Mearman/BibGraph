/**
 * Unit tests for the /cache page's data hook (US-26), against a mocked cachedOpenAlex client: loading, aggregation, previews, and clearing.
 */

import { cachedOpenAlex } from "@bibgraph/client";
import type { CachedEntityEntry, CachedEntityPreview } from "@bibgraph/client/internal/static-data-provider";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";

import { useCacheManagement } from "./use-cache-management";

vi.mock("@bibgraph/client", () => ({
	cachedOpenAlex: {
		enumerateIndexedDBEntities: vi.fn(),
		getIndexedDBEntityPreviews: vi.fn(),
		enumerateMemoryCacheEntities: vi.fn(),
		clearStaticCache: vi.fn(),
		clearIndexedDBCacheByType: vi.fn(),
	},
}));

const mockedClient = vi.mocked(cachedOpenAlex);

const entry = (overrides: Readonly<Partial<CachedEntityEntry>>): CachedEntityEntry => ({
	entityType: "works",
	entityId: "W1",
	cachedAt: 1_000,
	lastAccessedAt: 1_500,
	accessCount: 1,
	dataSize: 100,
	...overrides,
});

const preview = (overrides: Readonly<Partial<CachedEntityPreview>>): CachedEntityPreview => ({
	...entry({ entityType: "works", entityId: "W1" }),
	displayName: "A study of cache management",
	...overrides,
});

const wrapper = ({ children }: { children: ReactNode }) => <>{children}</>;

describe("useCacheManagement", () => {
	beforeEach(() => {
		vi.clearAllMocks();
		mockedClient.enumerateMemoryCacheEntities.mockReturnValue([]);
	});

	it("loads entries, aggregates them by type and exposes previews", async () => {
		mockedClient.enumerateIndexedDBEntities.mockResolvedValue([
			entry({ entityType: "works", entityId: "W1", dataSize: 100 }),
			entry({ entityType: "authors", entityId: "A1", dataSize: 25 }),
		]);
		mockedClient.getIndexedDBEntityPreviews.mockResolvedValue([
			preview({ entityId: "W1", displayName: "A study of cache management" }),
		]);
		mockedClient.enumerateMemoryCacheEntities.mockReturnValue([entry({ entityType: "topics", entityId: "T1" })]);

		const { result } = renderHook(() => useCacheManagement(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.usage).toEqual({
			totalEntries: 2,
			totalSizeBytes: 125,
			lastCachedAt: 1_000,
		});
		// Both types have one entry, so the deterministic tiebreak is alphabetical.
		expect(result.current.typeStats.map((stat) => stat.entityType)).toEqual(["authors", "works"]);
		expect(result.current.memoryEntryCount).toBe(1);
		expect(result.current.previews[0]?.displayName).toBe("A study of cache management");
		expect(result.current.error).toBeNull();
	});

	it("clears all tiers through the client and reloads", async () => {
		mockedClient.enumerateIndexedDBEntities.mockResolvedValue([entry({})]);
		mockedClient.getIndexedDBEntityPreviews.mockResolvedValue([preview({})]);
		mockedClient.clearStaticCache.mockResolvedValue(undefined);

		const { result } = renderHook(() => useCacheManagement(), { wrapper });
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		mockedClient.enumerateIndexedDBEntities.mockResolvedValue([]);
		mockedClient.getIndexedDBEntityPreviews.mockResolvedValue([]);

		await act(async () => {
			await result.current.clearAll();
		});

		expect(mockedClient.clearStaticCache.mock.calls).toHaveLength(1);
		await waitFor(() => {
			expect(result.current.usage.totalEntries).toBe(0);
		});
	});

	it("clears one entity type through the client and reloads", async () => {
		mockedClient.enumerateIndexedDBEntities.mockResolvedValue([
			entry({ entityType: "works", entityId: "W1" }),
			entry({ entityType: "authors", entityId: "A1" }),
		]);
		mockedClient.getIndexedDBEntityPreviews.mockResolvedValue([]);
		mockedClient.clearIndexedDBCacheByType.mockResolvedValue(1);

		const { result } = renderHook(() => useCacheManagement(), { wrapper });
		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		mockedClient.enumerateIndexedDBEntities.mockResolvedValue([
			entry({ entityType: "authors", entityId: "A1" }),
		]);

		await act(async () => {
			await result.current.clearByType("works");
		});

		expect(mockedClient.clearIndexedDBCacheByType.mock.calls).toEqual([["works"]]);
		await waitFor(() => {
			expect(result.current.typeStats.map((stat) => stat.entityType)).toEqual(["authors"]);
		});
	});

	it("surfaces a load failure as an error message without throwing", async () => {
		mockedClient.enumerateIndexedDBEntities.mockRejectedValue(new Error("IndexedDB unavailable"));
		mockedClient.getIndexedDBEntityPreviews.mockResolvedValue([]);

		const { result } = renderHook(() => useCacheManagement(), { wrapper });

		await waitFor(() => {
			expect(result.current.isLoading).toBe(false);
		});

		expect(result.current.error).toBe("Unable to load the cache contents.");
		expect(result.current.usage.totalEntries).toBe(0);
	});
});
