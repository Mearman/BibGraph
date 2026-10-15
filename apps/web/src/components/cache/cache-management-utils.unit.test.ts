/**
 * Unit tests for the pure cache-management aggregation used by the /cache page (US-26): per-type counts, sizes and recency, plus whole-cache usage.
 */

import type { CachedEntityEntry } from "@bibgraph/client/internal/static-data-provider";
import { describe, expect, it } from "vitest";

import { aggregateByEntityType, summariseCacheUsage } from "./cache-management-utils";

const entry = (overrides: Readonly<Partial<CachedEntityEntry>>): CachedEntityEntry => ({
	entityType: "works",
	entityId: "W1",
	cachedAt: 1_000,
	lastAccessedAt: 1_500,
	accessCount: 1,
	dataSize: 100,
	...overrides,
});

describe("aggregateByEntityType", () => {
	it("aggregates count, size and recency per entity type", () => {
		const stats = aggregateByEntityType([
			entry({ entityType: "works", entityId: "W1", dataSize: 100, cachedAt: 1_000, lastAccessedAt: 1_500 }),
			entry({ entityType: "works", entityId: "W2", dataSize: 50, cachedAt: 2_000, lastAccessedAt: 900 }),
			entry({ entityType: "authors", entityId: "A1", dataSize: 25, cachedAt: 3_000, lastAccessedAt: 4_000 }),
		]);

		expect(stats).toEqual([
			{
				entityType: "works",
				count: 2,
				totalSizeBytes: 150,
				lastCachedAt: 2_000,
				lastAccessedAt: 1_500,
			},
			{
				entityType: "authors",
				count: 1,
				totalSizeBytes: 25,
				lastCachedAt: 3_000,
				lastAccessedAt: 4_000,
			},
		]);
	});

	it("sorts types by descending count with a deterministic tiebreak on type name", () => {
		const stats = aggregateByEntityType([
			entry({ entityType: "topics", entityId: "T1" }),
			entry({ entityType: "authors", entityId: "A1" }),
			entry({ entityType: "topics", entityId: "T2" }),
		]);

		expect(stats.map((stat) => stat.entityType)).toEqual(["topics", "authors"]);
	});

	it("returns an empty array for no entries", () => {
		expect(aggregateByEntityType([])).toEqual([]);
	});
});

describe("summariseCacheUsage", () => {
	it("summarises total entries, size and the most recent write", () => {
		const summary = summariseCacheUsage([
			entry({ entityId: "W1", dataSize: 100, cachedAt: 1_000 }),
			entry({ entityId: "W2", dataSize: 50, cachedAt: 5_000 }),
		]);

		expect(summary).toEqual({
			totalEntries: 2,
			totalSizeBytes: 150,
			lastCachedAt: 5_000,
		});
	});

	it("reports a null last write for an empty cache", () => {
		expect(summariseCacheUsage([])).toEqual({
			totalEntries: 0,
			totalSizeBytes: 0,
			lastCachedAt: null,
		});
	});
});
