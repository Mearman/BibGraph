/**
 * Unit tests for the screening view-model: the semantic path folds inclusions into the seeds and hides decided works with its evidence (best seed, path, seed reach) kept for titling, the standard path keeps query order, decided works are listed, labels attach titles and cross-link the two lists, evidence is described in plain words with titles, and sorting and filtering are pure and deterministic.
 */

import { describe, expect, it } from "vitest";

import type { LiteratureReview } from "@/stores/review-store";

import { suggestComposition } from "../algorithms/composition-engine";
import type { PoolWork } from "../algorithms/screening-engine";
import type { WorkLabel } from "../algorithms/work-labels";
import {
	buildScreeningView,
	type DecidedRow,
	describeEvidence,
	filterRows,
	labelIdsFor,
	type LabelledRef,
	ordinal,
	type ScreeningRow,
	sortRows,
	withLabels,
} from "./screening-view";

const SELECTION_SIZE = 2;
const BRIDGE_YEAR = 2021;
/**
 * Position and expected ordinal as strings, so the irregular cases stay literal without magic-number literals.
 */
const ORDINAL_CASES: readonly (readonly [string, string])[] = [
	["1", "1st"],
	["2", "2nd"],
	["3", "3rd"],
	["4", "4th"],
	["11", "11th"],
	["12", "12th"],
	["13", "13th"],
	["21", "21st"],
	["112", "112th"],
];

/**
 * Chain pool: seeds W1 and W3 with W2 citing both (directly associated with each) and W4 citing W2.
 */
const pool: readonly PoolWork[] = [
	{ id: "W1", references: [] },
	{ id: "W2", references: ["W1", "W3"] },
	{ id: "W3", references: [] },
	{ id: "W4", references: ["W2"] },
];

const reviewWith = (decisions: LiteratureReview["decisions"]): LiteratureReview => ({
	id: "r1",
	name: "r",
	query: "q",
	seeds: ["W1", "W3"],
	decisions,
	suggestedComposition: suggestComposition(pool, ["W1", "W3"], { selectionSize: SELECTION_SIZE }),
	createdAt: new Date(0),
	updatedAt: new Date(0),
});

const labelMap = (entries: readonly (readonly [string, WorkLabel])[]): ReadonlyMap<string, WorkLabel> =>
	new Map(entries);

describe("buildScreeningView", () => {
	it("keeps the semantic path's evidence: the best seed, the path between, and how many seeds reach the work", () => {
		const view = buildScreeningView(reviewWith({}), pool);
		const bridge = view.semantic.find((candidate) => candidate.workId === "W2");
		if (bridge === undefined) throw new Error("W2 is not a semantic candidate");
		expect(["W1", "W3"]).toContain(bridge.fromSeed);
		expect(bridge.via).toEqual([]);
		expect(bridge.seedsReaching).toBe(2);
		expect(view.semantic.every((candidate) => candidate.score >= 0)).toBe(true);
	});

	it("folds inclusions into the seeds and hides decided works on the semantic path", () => {
		const view = buildScreeningView(reviewWith({ W2: "include", W4: "exclude" }), pool);
		expect(view.seeds).toEqual(["W1", "W3", "W2"]);
		expect(view.semantic.map((item) => item.workId)).toEqual([]);
	});

	it("lists the standard path in query order with the rank", () => {
		const view = buildScreeningView(reviewWith({ W3: "exclude" }), pool);
		expect(view.standard.map((item) => item.workId)).toEqual(["W2", "W4"]);
		expect(view.standard[0]?.rank).toBe(1);
	});

	it("lists the decided works with their decision and counts them", () => {
		const view = buildScreeningView(reviewWith({ W2: "include", W4: "exclude" }), pool);
		expect(view.decided).toEqual([
			{ workId: "W2", decision: "include" },
			{ workId: "W4", decision: "exclude" },
		]);
		expect(view.includedCount).toBe(1);
		expect(view.excludedCount).toBe(1);
	});
});

describe("withLabels", () => {
	it("attaches titles, keeps fromSeed and via as titled refs, and cross-links the two lists", () => {
		const view = buildScreeningView(reviewWith({ W4: "exclude" }), pool);
		const labels = labelMap([
			["W1", { title: "Seed one", year: 2019 }],
			["W2", { title: "Bridge paper", year: BRIDGE_YEAR }],
			["W3", { title: "Seed three", year: 2018 }],
		]);
		const labelled = withLabels(view, labels);
		const bridge = labelled.semantic.find((row) => row.workId === "W2");
		if (bridge?.evidence == null) throw new Error("W2 has no evidence");
		expect(bridge.title).toBe("Bridge paper");
		expect(bridge.year).toBe(BRIDGE_YEAR);
		expect(bridge.evidence.fromSeed.title).toBe("Seed one");
		expect(bridge.evidence.via).toEqual([]);
		expect(bridge.otherPosition).toBe(1);
		const standardBridge = labelled.standard.find((row) => row.workId === "W2");
		if (standardBridge === undefined) throw new Error("W2 is not in the standard list");
		expect(standardBridge.otherPosition).toBe(1);
		expect(standardBridge.otherScore).not.toBeNull();
		expect(standardBridge.evidence).toBeNull();
	});

	it("marks works whose title never arrived instead of presenting the id as a title", () => {
		const view = buildScreeningView(reviewWith({}), pool);
		const labelled = withLabels(view, labelMap([]));
		const anyRow = labelled.semantic[0];
		expect(anyRow.titleKnown).toBe(false);
		expect(anyRow.title).toBe(anyRow.workId);
	});

	it("titles the seeds and the decided works", () => {
		const view = buildScreeningView(reviewWith({ W2: "include" }), pool);
		const labelled = withLabels(view, labelMap([["W1", { title: "Seed one", year: null }]]));
		expect(labelled.seeds.map((seed: LabelledRef) => seed.title)).toEqual(["Seed one", "W3", "W2"]);
		const decided = labelled.decided.find((row: DecidedRow) => row.workId === "W2");
		expect(decided?.decision).toBe("include");
		expect(decided?.titleKnown).toBe(false);
	});
});

describe("describeEvidence", () => {
	const ref = (id: string, title: string, known: boolean): LabelledRef => ({ id, title, known });

	it("says who cited the work directly when the path has no works between", () => {
		expect(
			describeEvidence({ score: 0.5, fromSeed: ref("W1", "Seed one", true), via: [], seedsReaching: 1, seedCount: 2 }),
		).toBe("Cited directly by Seed one");
	});

	it("spells the chain out in titles when works lie between", () => {
		expect(
			describeEvidence({
				score: 0.25,
				fromSeed: ref("W1", "Seed one", true),
				via: [ref("W2", "Bridge paper", true)],
				seedsReaching: 1,
				seedCount: 2,
			}),
		).toBe("Seed one -> Bridge paper -> this work");
	});

	it("marks a referred work whose title never arrived", () => {
		expect(
			describeEvidence({ score: 0.5, fromSeed: ref("W9", "W9", false), via: [], seedsReaching: 1, seedCount: 2 }),
		).toBe("Cited directly by Unknown work (W9)");
	});
});

const row = (workId: string, fields: Partial<ScreeningRow> = {}): ScreeningRow => ({
	workId,
	title: workId,
	year: null,
	titleKnown: false,
	evidence: null,
	searchRank: null,
	otherPosition: null,
	otherScore: null,
	...fields,
});

describe("sortRows", () => {
	it("orders by association score, strongest first", () => {
		const rows = [
			row("W1", { evidence: { score: 0.2, fromSeed: { id: "S", title: "S", known: true }, via: [], seedsReaching: 1, seedCount: 1 } }),
			row("W2", { evidence: { score: 0.9, fromSeed: { id: "S", title: "S", known: true }, via: [], seedsReaching: 1, seedCount: 1 } }),
		];
		expect(sortRows(rows, "score").map((item) => item.workId)).toEqual(["W2", "W1"]);
	});

	it("orders by year, newest first, unknown years last", () => {
		const rows = [row("W1", { year: 2019 }), row("W2", { year: 2023 }), row("W3", { year: null })];
		expect(sortRows(rows, "year").map((item) => item.workId)).toEqual(["W2", "W1", "W3"]);
	});

	it("orders by title A to Z", () => {
		const rows = [row("W1", { title: "Zeta" }), row("W2", { title: "alpha" })];
		expect(sortRows(rows, "title").map((item) => item.title)).toEqual(["alpha", "Zeta"]);
	});

	it("keeps rows without evidence in their current order under a score sort", () => {
		const rows = [row("W2", { searchRank: 2 }), row("W1", { searchRank: 1 })];
		expect(sortRows(rows, "score").map((item) => item.workId)).toEqual(["W2", "W1"]);
	});
});

describe("filterRows", () => {
	it("matches titles case-insensitively and passes everything through when empty", () => {
		const rows = [row("W1", { title: "Gut barrier" }), row("W2", { title: "Liver fibrosis" })];
		expect(filterRows(rows, "gut").map((item) => item.workId)).toEqual(["W1"]);
		expect(filterRows(rows, "  ")).toHaveLength(2);
	});

	it("matches the work id when the title does not match", () => {
		const rows = [row("W123", { title: "Gut barrier" })];
		expect(filterRows(rows, "w123")).toHaveLength(1);
	});
});

describe("ordinal", () => {
	it("writes the ordinal for each irregular position", () => {
		for (const [position, word] of ORDINAL_CASES) {
			expect(ordinal(Number(position))).toBe(word);
		}
	});
});

describe("labelIdsFor", () => {
	it("collects the seeds, both lists' works, evidence paths and decided works, without duplicates", () => {
		const view = buildScreeningView(reviewWith({ W4: "exclude" }), pool);
		expect(labelIdsFor(view)).toEqual(["W1", "W2", "W3", "W4"]);
	});
});
