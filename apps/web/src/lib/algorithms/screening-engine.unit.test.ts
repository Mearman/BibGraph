/**
 * Unit tests for the semantic screening engine: PARSE salience over exploration paths ranks pool candidates, evidence names the seed pair and bridging works, seeds are never candidates, and the whole ranking is deterministic.
 *
 * The pool is synthetic and hand-derivable: two seeds, two candidate bridges, shared external references so the structural MI (bibliographic coupling) separates the bridges.
 */

import { standardBfs } from "graphwise/exploration";
import { describe, expect, it } from "vitest";

import { type PoolWork, screenSemantically } from "./screening-engine";

/**
 * Pool references: s1 cites r1,r2,r3 / a cites r2,r3,r4 and s2 / b cites r3 and s2 / s2 cites nothing.
 *
 * Structural MI on each association edge (coupling over full reference sets, no pool-internal co-citation anywhere): MI(s1,a) = 0.5 * 2/5 (shared r2,r3 over a 5-reference union) and MI(s1,b) = 0.5 * 1/4 (shared r3 over a 4-reference union); direct citations a-s2 and b-s2 floor at 1.
 *
 * So PARSE salience for the s1-a-s2 path (geometric mean of 0.2 and 1) beats s1-b-s2 (geometric mean of 0.125 and 1), placing a above b.
 */
const pool: readonly PoolWork[] = [
	{ id: "s1", references: ["r1", "r2", "r3"] },
	{ id: "a", references: ["r2", "r3", "r4", "s2"] },
	{ id: "b", references: ["r3", "s2"] },
	{ id: "s2", references: [] },
];

const SEED_IDS = ["s1", "s2"];

describe("screening engine", () => {
	it("ranks the stronger association bridge first with seed-pair evidence", () => {
		const candidates = screenSemantically(pool, SEED_IDS, { exploration: standardBfs });
		expect(candidates.map((c) => c.workId)).toEqual(["a", "b"]);
		expect(candidates[0].score).toBeGreaterThan(candidates[1].score);
		const top = candidates[0];
		// The seed pair is unordered on the undirected association graph; the exploration order picks the direction.
		expect([top.evidence.fromSeed, top.evidence.toSeed].sort()).toEqual(["s1", "s2"]);
		expect(top.evidence.via).toContain("a");
		expect(top.pathsConnected).toBeGreaterThan(0);
	});

	it("never returns a seed as a candidate", () => {
		const candidates = screenSemantically(pool, SEED_IDS, { exploration: standardBfs });
		expect(candidates.map((c) => c.workId)).not.toContain("s1");
		expect(candidates.map((c) => c.workId)).not.toContain("s2");
	});

	it("returns an empty candidate list when the seeds share no association paths", () => {
		const isolated: readonly PoolWork[] = [
			{ id: "s1", references: ["r1"] },
			{ id: "s2", references: ["r2"] },
		];
		expect(screenSemantically(isolated, ["s1", "s2"], { exploration: standardBfs })).toEqual([]);
	});

	it("is deterministic across calls", () => {
		const first = screenSemantically(pool, SEED_IDS, { exploration: standardBfs });
		const second = screenSemantically(pool, SEED_IDS, { exploration: standardBfs });
		expect(first).toEqual(second);
	});
});
