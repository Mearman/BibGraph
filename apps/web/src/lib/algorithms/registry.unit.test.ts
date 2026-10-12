/**
 * Unit tests for the algorithm registry: coverage of the full thesis roster, correct family marking (novel vs baseline), and that every exploration entry carries a runnable graphwise implementation.
 */

import { describe, expect, it } from "vitest";

import { algorithmById, ALGORITHMS, algorithmsByStage } from "./registry";

const EXPLORATION_IDS = [
	"standard-bfs",
	"frontier-balanced",
	"dome",
	"edge",
	"pipe",
	"sage",
	"reach",
	"maze",
	"hae",
];

const SELECTION_IDS = [
	"random",
	"high-degree",
	"diverse-degree",
	"eigenvector",
	"grasp",
	"stride",
	"spine",
	"crisp",
	"brisk",
];

describe("algorithm registry", () => {
	it("covers the full exploration roster with families marked", () => {
		const exploration = algorithmsByStage("exploration");
		expect(exploration.map((a) => a.id)).toEqual(EXPLORATION_IDS);
		const novel = exploration.filter((a) => a.family === "novel").map((a) => a.id);
		expect(novel).toEqual(["dome", "edge", "pipe", "sage", "reach", "maze", "hae"]);
	});

	it("covers the full seed-selection roster with families marked", () => {
		const selection = algorithmsByStage("seed-selection");
		expect(selection.map((a) => a.id)).toEqual(SELECTION_IDS);
		const baselines = selection.filter((a) => a.family === "baseline").map((a) => a.id);
		expect(baselines).toEqual(["random", "high-degree", "diverse-degree", "eigenvector"]);
	});

	it("exposes the PARSE ranking and unique ids across the registry", () => {
		expect(algorithmById("association")?.family).toBe("novel");
		const ids = ALGORITHMS.map((a) => a.id);
		expect(new Set(ids).size).toBe(ids.length);
	});

	it("gives every exploration entry a runnable implementation and a description", () => {
		for (const spec of algorithmsByStage("exploration")) {
			expect(typeof spec.run).toBe("function");
			expect(spec.description.length).toBeGreaterThan(0);
		}
	});
});
