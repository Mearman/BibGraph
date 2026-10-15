/**
 * Unit tests for the measurement cache keys: a measurement's key names exactly the inputs that determine its value, so a reload or an unrelated stage switch reuses stored measurements and only genuinely invalidated cells re-measure. Written test-first (constitution II): these must fail before the module exists.
 */

import { describe, expect, it } from "vitest";

import type { PoolWork } from "@/lib/algorithms/screening-engine";

import {
	explorationKey,
	poolFingerprint,
	rankingKey,
	seedSelectionKey,
	seedsFingerprint,
} from "./measurement-cache";

const POOL_A: readonly PoolWork[] = [
	{ id: "W1", references: [] },
	{ id: "W2", references: ["W1", "W3"] },
];

const POOL_B: readonly PoolWork[] = [
	{ id: "W1", references: [] },
	{ id: "W2", references: ["W1"] },
];

const SEEDS_A = ["W1", "W3"];
const SEEDS_B = ["W1", "W4"];

/**
 * The selection size the seed-selection measurements were taken at, and a different one.
 */
const SELECTION_SIZE = 5;
const OTHER_SELECTION_SIZE = 7;

describe("measurement cache keys", () => {
	it("changes only the seed-dependent stages' keys when the seeds change", () => {
		const pool = poolFingerprint(POOL_A);
		const before = {
			exploration: explorationKey("r1", "dome", pool, seedsFingerprint(SEEDS_A)),
			selection: seedSelectionKey("r1", "grasp", pool, SELECTION_SIZE),
			ranking: rankingKey("r1", "association", pool, seedsFingerprint(SEEDS_A), "dome"),
		};
		const after = {
			exploration: explorationKey("r1", "dome", pool, seedsFingerprint(SEEDS_B)),
			selection: seedSelectionKey("r1", "grasp", pool, SELECTION_SIZE),
			ranking: rankingKey("r1", "association", pool, seedsFingerprint(SEEDS_B), "dome"),
		};
		// Exploration and ranking are measured against the seeds, so new seeds invalidate them.
		expect(after.exploration).not.toBe(before.exploration);
		expect(after.ranking).not.toBe(before.ranking);
		// Seed selection is measured on the pool alone, so its stored measurement survives.
		expect(after.selection).toBe(before.selection);
	});

	it("is stable across calls, so a reload with unchanged inputs reuses stored values", () => {
		const pool = poolFingerprint(POOL_A);
		const seeds = seedsFingerprint(SEEDS_A);
		expect(explorationKey("r1", "dome", pool, seeds)).toBe(explorationKey("r1", "dome", pool, seeds));
		expect(seedSelectionKey("r1", "grasp", pool, SELECTION_SIZE)).toBe(seedSelectionKey("r1", "grasp", pool, SELECTION_SIZE));
		expect(rankingKey("r1", "association", pool, seeds, "dome")).toBe(
			rankingKey("r1", "association", pool, seeds, "dome"),
		);
	});

	it("changes every stage's keys when the pool changes", () => {
		const seeds = seedsFingerprint(SEEDS_A);
		const poolA = poolFingerprint(POOL_A);
		const poolB = poolFingerprint(POOL_B);
		expect(explorationKey("r1", "dome", poolB, seeds)).not.toBe(explorationKey("r1", "dome", poolA, seeds));
		expect(seedSelectionKey("r1", "grasp", poolB, SELECTION_SIZE)).not.toBe(
			seedSelectionKey("r1", "grasp", poolA, SELECTION_SIZE),
		);
		expect(rankingKey("r1", "association", poolB, seeds, "dome")).not.toBe(
			rankingKey("r1", "association", poolA, seeds, "dome"),
		);
	});

	it("names the review, so two reviews' measurements never collide", () => {
		const pool = poolFingerprint(POOL_A);
		const seeds = seedsFingerprint(SEEDS_A);
		expect(explorationKey("r2", "dome", pool, seeds)).not.toBe(explorationKey("r1", "dome", pool, seeds));
	});

	it("names the algorithm, so one algorithm's re-measurement leaves its siblings cached", () => {
		const pool = poolFingerprint(POOL_A);
		const seeds = seedsFingerprint(SEEDS_A);
		expect(explorationKey("r1", "edge", pool, seeds)).not.toBe(explorationKey("r1", "dome", pool, seeds));
	});

	it("names the exploration a ranking was measured on", () => {
		const pool = poolFingerprint(POOL_A);
		const seeds = seedsFingerprint(SEEDS_A);
		expect(rankingKey("r1", "association", pool, seeds, "dome")).not.toBe(
			rankingKey("r1", "association", pool, seeds, "edge"),
		);
	});

	it("names the selection size a seed-selection measurement was taken at", () => {
		const pool = poolFingerprint(POOL_A);
		expect(seedSelectionKey("r1", "grasp", pool, SELECTION_SIZE)).not.toBe(seedSelectionKey("r1", "grasp", pool, OTHER_SELECTION_SIZE));
	});

	it("fingerprints the pool by works and references in order, so reordering or editing a work is a new pool", () => {
		expect(poolFingerprint([...POOL_A])).toBe(poolFingerprint(POOL_A));
		expect(poolFingerprint([POOL_A[1], POOL_A[0]])).not.toBe(poolFingerprint(POOL_A));
		expect(poolFingerprint(POOL_B)).not.toBe(poolFingerprint(POOL_A));
	});

	it("fingerprints the seeds in order, so a different seed order is different input", () => {
		expect(seedsFingerprint([...SEEDS_A])).toBe(seedsFingerprint(SEEDS_A));
		expect(seedsFingerprint([...SEEDS_A].reverse())).not.toBe(seedsFingerprint(SEEDS_A));
		expect(seedsFingerprint(SEEDS_B)).not.toBe(seedsFingerprint(SEEDS_A));
	});
});
