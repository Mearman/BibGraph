/**
 * Unit tests for the semantic screening engine: each work reachable from the seeds within two association hops is scored by the chosen ranker over its connecting path from every seed (mean over seeds), the best seed path is its evidence, seeds are never candidates, one seed suffices, and the whole ranking is deterministic.
 *
 * The pool is synthetic and hand-derivable: two seeds, two candidate bridges, shared external references so the structural MI (bibliographic coupling) separates the bridges.
 */

import { standardBfs } from "graphwise/exploration";
import { describe, expect, it } from "vitest";

import type { ScoredPath } from "./ranking-types";
import { algorithmById } from "./registry";
import { buildPoolAssociation, type PoolWork, rankCandidates, screenSemantically } from "./screening-engine";

/**
 * Pool references: s1 cites r1,r2,r3 / a cites r2,r3,r4 and s2 / b cites r3 and s2 / s2 cites nothing.
 *
 * Structural MI on each association edge (coupling over full reference sets, no pool-internal co-citation anywhere): MI(s1,a) = 0.5 * 2/5 (shared r2,r3 over a 5-reference union) and MI(s1,b) = 0.5 * 1/4 (shared r3 over a 4-reference union); direct citations a-s2 and b-s2 floor at 1.
 *
 * So a scores the mean of 0.2 and 1 and b the mean of 0.125 and 1, placing a above b.
 */
const pool: readonly PoolWork[] = [
	{ id: "s1", references: ["r1", "r2", "r3"] },
	{ id: "a", references: ["r2", "r3", "r4", "s2"] },
	{ id: "b", references: ["r3", "s2"] },
	{ id: "s2", references: [] },
];

const SEED_IDS = ["s1", "s2"];

const structuralRanking = () => {
	const rank = algorithmById("parse-structural")?.rank;
	if (rank === undefined) throw new Error("parse-structural ranker missing");
	return rank;
};

describe("screening engine", () => {
	const screen = (works: readonly PoolWork[], seeds: readonly string[]) =>
		screenSemantically(works, seeds, { exploration: standardBfs, ranking: structuralRanking() });

	it("ranks the more strongly associated work first, with its best seed path as evidence", () => {
		const candidates = screen(pool, SEED_IDS);
		expect(candidates.map((c) => c.workId)).toEqual(["a", "b"]);
		expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
		const top = candidates[0];
		expect(SEED_IDS).toContain(top.evidence.fromSeed);
		expect(top.evidence.toSeed).toBe("a");
		expect(top.evidence.via).toEqual([]);
	});

	it("ranks from a single seed", () => {
		expect(screen(pool, ["s1"]).map((c) => c.workId)).toEqual(expect.arrayContaining(["a", "b"]));
	});

	it("follows association for at most two hops", () => {
		const chain: readonly PoolWork[] = [
			{ id: "s1", references: [] },
			{ id: "x", references: ["s1"] },
			{ id: "y", references: ["x"] },
			{ id: "z", references: ["y"] },
		];
		const reached = screen(chain, ["s1"]).map((c) => c.workId);
		expect(reached).toContain("x");
		expect(reached).toContain("y");
		expect(reached).not.toContain("z");
	});

	it("never returns a seed as a candidate", () => {
		const candidates = screen(pool, SEED_IDS);
		expect(candidates.map((c) => c.workId)).not.toContain("s1");
		expect(candidates.map((c) => c.workId)).not.toContain("s2");
	});

	it("returns no candidates when the pool holds only the seeds", () => {
		const onlySeeds: readonly PoolWork[] = [
			{ id: "s1", references: ["r1"] },
			{ id: "s2", references: ["r2"] },
		];
		expect(screen(onlySeeds, ["s1", "s2"])).toEqual([]);
	});

	it("is deterministic across calls", () => {
		expect(screen(pool, SEED_IDS)).toEqual(screen(pool, SEED_IDS));
	});
});

/**
 * Deterministic linear congruential generator, so the random pool below is the same on every run.
 */
const LCG_SEED = 12345;
const LCG_MULTIPLIER = 1664525;
const LCG_INCREMENT = 1013904223;
const LCG_MODULUS = 4294967296;
const RANDOM_POOL_SIZE = 40;
const EXTERNAL_REFERENCE_COUNT = 15;
const MAX_REFERENCES_PER_WORK = 6;
const COIN_SIDES = 2;

const randomPool = (): readonly PoolWork[] => {
	let state = LCG_SEED;
	const next = (bound: number): number => {
		state = (Math.imul(state, LCG_MULTIPLIER) + LCG_INCREMENT) % LCG_MODULUS;
		return Math.floor((Math.abs(state) / LCG_MODULUS) * bound);
	};
	const ids = Array.from({ length: RANDOM_POOL_SIZE }, (_, i) => `W${String(i)}`);
	return ids.map((id) => ({
		id,
		references: Array.from({ length: next(MAX_REFERENCES_PER_WORK) + 1 }, () =>
			next(COIN_SIDES) === 0 ? ids[next(RANDOM_POOL_SIZE)] : `X${String(next(EXTERNAL_REFERENCE_COUNT))}`,
		),
	}));
};

describe("buildPoolAssociation", () => {
	it("links exactly the pairs with non-zero structural MI, matching a brute-force pass", () => {
		const randomWorks = randomPool();
		const { graph, structuralMi } = buildPoolAssociation(randomWorks);
		const ids = randomWorks.map((work) => work.id).sort();
		for (let i = 0; i < ids.length; i++) {
			for (let j = i + 1; j < ids.length; j++) {
				const linked = [...graph.neighbours(ids[i])].includes(ids[j]);
				expect(linked).toBe(structuralMi(ids[i], ids[j]) > 0);
			}
		}
	});

	it("builds the association once per pool object", () => {
		const works = randomPool();
		expect(buildPoolAssociation(works)).toBe(buildPoolAssociation(works));
	});
});

describe("rankCandidates", () => {
	const SCORE_S1_TO_C = 0.8;
	const SCORE_S2_TO_C = 0.4;
	const SCORE_S1_TO_D = 0.6;
	const SEED_COUNT = 2;

	const path = (from: string, to: string, score: number, between: readonly string[] = []): ScoredPath => ({
		fromSeed: { id: from },
		toSeed: { id: to },
		nodes: [from, ...between, to],
		score,
	});

	it("scores a candidate by the mean over all seeds, a seed with no path counting zero", () => {
		const ranked = rankCandidates(
			[path("s1", "c", SCORE_S1_TO_C), path("s2", "c", SCORE_S2_TO_C), path("s1", "d", SCORE_S1_TO_D)],
			new Set(["s1", "s2"]),
		);
		expect(ranked.map((c) => [c.workId, c.pathsConnected])).toEqual([
			["c", SEED_COUNT],
			["d", 1],
		]);
		expect(ranked[0].score).toBeCloseTo((SCORE_S1_TO_C + SCORE_S2_TO_C) / SEED_COUNT);
		expect(ranked[1].score).toBeCloseTo(SCORE_S1_TO_D / SEED_COUNT);
	});

	it("keeps each seed's best path and names the best of those as the evidence", () => {
		const ranked = rankCandidates(
			[path("s1", "c", SCORE_S2_TO_C, ["x"]), path("s1", "c", SCORE_S1_TO_C), path("s2", "c", SCORE_S2_TO_C, ["y"])],
			new Set(["s1", "s2"]),
		);
		expect(ranked[0].evidence).toEqual({ fromSeed: "s1", toSeed: "c", via: [] });
	});

	it("orders equal scores by work id", () => {
		const ranked = rankCandidates([path("s1", "b", SCORE_S1_TO_C), path("s1", "a", SCORE_S1_TO_C)], new Set(["s1"]));
		expect(ranked.map((c) => c.workId)).toEqual(["a", "b"]);
	});
});
