/**
 * Unit tests for the ranking roster: PARSE with the thesis's structural MI, PARSE with every graphwise MI variant, and every graphwise path-ranking baseline, each marked novel or baseline and each a runnable ranker that scores the paths it is given deterministically.
 */

import { AdjacencyMapGraph } from "graphwise/graph";
import { describe, expect, it } from "vitest";

import { RANKING_ROSTER } from "./ranking-roster";

const MI_VARIANT_IDS = [
	"parse-jaccard",
	"parse-adamic-adar",
	"parse-cosine",
	"parse-sorensen",
	"parse-resource-allocation",
	"parse-overlap-coefficient",
	"parse-hub-promoted",
	"parse-scale",
	"parse-skew",
	"parse-span",
	"parse-etch",
	"parse-notch",
	"parse-adaptive",
];

const PATH_BASELINE_IDS = [
	"path-shortest",
	"path-degree-sum",
	"path-widest",
	"path-jaccard-arithmetic",
	"path-pagerank",
	"path-betweenness",
	"path-katz",
	"path-communicability",
	"path-resistance-distance",
	"path-random",
	"path-hitting-time",
];

const NOVEL_IDS = [
	"parse-structural",
	"parse-scale",
	"parse-skew",
	"parse-span",
	"parse-etch",
	"parse-notch",
	"parse-adaptive",
];

const FIXED_MI = 0.5;

/**
 * Square with a diagonal-free ring: a-b-c and a-d-c, one discovered path a-b-c between the seeds a and c.
 */
const buildContext = () => {
	const graph = AdjacencyMapGraph.undirected();
	for (const id of ["a", "b", "c", "d"]) graph.addNode({ id });
	for (const [source, target] of [
		["a", "b"],
		["b", "c"],
		["a", "d"],
		["d", "c"],
	]) {
		graph.addEdge({ source, target });
	}
	return { graph, structuralMi: () => FIXED_MI };
};

const paths = [{ fromSeed: { id: "a" }, toSeed: { id: "c" }, nodes: ["a", "b", "c"] }];

describe("RANKING_ROSTER", () => {
	it("lists PARSE structural MI, every MI variant and every path baseline with unique ids", () => {
		const ids = RANKING_ROSTER.map((spec) => spec.id);
		expect(ids).toEqual(["parse-structural", ...MI_VARIANT_IDS, ...PATH_BASELINE_IDS]);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("marks the thesis contributions novel and everything else baseline", () => {
		const novel = RANKING_ROSTER.filter((spec) => spec.family === "novel").map((spec) => spec.id);
		expect(novel).toEqual(NOVEL_IDS);
		expect(RANKING_ROSTER.every((spec) => spec.stage === "ranking")).toBe(true);
	});

	it("gives every entry a runnable ranker that scores each given path finitely", () => {
		const context = buildContext();
		const failures = RANKING_ROSTER.filter((spec) => {
			const scored = spec.rank?.(context, paths);
			return scored?.length !== 1 || !Number.isFinite(scored[0].score) || scored[0].nodes.join(',') !== "a,b,c";
		}).map((spec) => spec.id);
		expect(failures).toEqual([]);
	});

	it("is deterministic across calls", () => {
		const context = buildContext();
		for (const spec of RANKING_ROSTER) {
			expect(spec.rank?.(context, paths)).toEqual(spec.rank?.(context, paths));
		}
	});
});
