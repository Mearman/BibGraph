/**
 * Algorithm comparison: every roster algorithm of every stage, measured on the review's own pool and marked novel or baseline, so a reviewer can compare them all side by side. The composition suggestion is derived from these same rows (the chosen flag), which keeps what the app recommends and what the comparison shows from ever disagreeing. Measurements: exploration by held-out seed recovery, seed selection by one-hop pool coverage, ranking has a single roster entry and no measurement.
 */

import { type AlgorithmFamily, algorithmsByStage,type AlgorithmSpec, type AlgorithmStage } from "./registry";
import { buildPoolAssociation, type PoolWork } from "./screening-engine";
import { selectSeeds } from "./seed-engine";

export interface ComparisonRow {
	readonly algorithmId: string;
	readonly label: string;
	readonly family: AlgorithmFamily;
	readonly stage: AlgorithmStage;
	readonly description: string;
	/**
	 * The measured score, higher is better; null when the stage cannot be measured on this review.
	 */
	readonly value: number | null;
	readonly evidence: string;
	/**
	 * Whether this is the algorithm the app suggests for its stage.
	 */
	readonly chosen: boolean;
}

export type AlgorithmComparison = Readonly<Record<AlgorithmStage, readonly ComparisonRow[]>>;

export interface CompareOptions {
	/**
	 * How many seeds each seed selector proposes.
	 */
	readonly selectionSize: number;
}

/**
 * Hold-out measurement needs at least one remaining seed to explore from after dropping one.
 */
const MIN_SEEDS_FOR_HOLDOUT = 2;

/**
 * Share of the pool each held-out exploration may expand. With no budget every algorithm eventually reaches every connected seed and the measure cannot tell them apart; a fixed share of the pool follows association chains far enough to find related works yet stays small enough that the algorithms differ, and it bounds the cost of measuring on a large pool.
 */
const EXPLORATION_BUDGET_FRACTION = 0.25;

/**
 * Fraction of the pool reachable within one hop of the picks (picks included), the coverage a zero-seeds selection buys before any screening decision exists.
 */
export const oneHopCoverage = (pool: readonly PoolWork[], picks: readonly string[]): number => {
	const { graph } = buildPoolAssociation(pool);
	const covered = new Set<string>(picks);
	for (const pick of picks) {
		for (const neighbour of graph.neighbours(pick)) {
			covered.add(neighbour);
		}
	}
	return covered.size / pool.length;
};

export const toPoolGraph = (pool: readonly PoolWork[]) => {
	const { graph } = buildPoolAssociation(pool);
	const adjacency = new Map<string, readonly string[]>();
	for (const work of pool) {
		adjacency.set(work.id, [...graph.neighbours(work.id)]);
	}
	return { nodes: pool.map((work) => work.id), adjacency };
};

const rowFor = (
	spec: AlgorithmSpec,
	measurement: Readonly<{ value: number | null; evidence: string }>,
): Omit<ComparisonRow, "chosen"> => ({
	algorithmId: spec.id,
	label: spec.label,
	family: spec.family,
	stage: spec.stage,
	description: spec.description,
	value: measurement.value,
	evidence: measurement.evidence,
});

/**
 * Marks the first row holding the maximum value chosen: ties resolve to roster order, so the suggestion is deterministic. Rows with no measurement choose the first roster entry as the default.
 */
const markChosen = (rows: readonly Omit<ComparisonRow, "chosen">[]): readonly ComparisonRow[] => {
	let bestIndex = 0;
	rows.forEach((row, index) => {
		const bestValue = rows[bestIndex].value;
		if (row.value !== null && (bestValue === null || row.value > bestValue)) bestIndex = index;
	});
	return rows.map((row, index) => ({ ...row, chosen: index === bestIndex }));
};

const compareExploration = (pool: readonly PoolWork[], seeds: readonly string[]): readonly ComparisonRow[] => {
	const roster = algorithmsByStage("exploration");
	if (roster.length === 0) {
		throw new Error("exploration roster is empty");
	}
	if (seeds.length < MIN_SEEDS_FOR_HOLDOUT) {
		const evidence =
			seeds.length === 0
				? "no seeds to measure against; roster default"
				: "needs two or more seeds to measure; roster default";
		return markChosen(roster.map((spec) => rowFor(spec, { value: null, evidence })));
	}
	const { graph } = buildPoolAssociation(pool);
	const budget = Math.ceil(pool.length * EXPLORATION_BUDGET_FRACTION);
	return markChosen(
		roster.map((spec) => {
			if (!spec.run) {
				throw new Error(`exploration algorithm without a runnable implementation: ${spec.id}`);
			}
			let recovered = 0;
			for (const heldOut of seeds) {
				const remaining = seeds.filter((seed) => seed !== heldOut).map((id) => ({ id }));
				if (spec.run(graph, remaining, { maxNodes: budget }).sampledNodes.has(heldOut)) recovered++;
			}
			return rowFor(spec, {
				value: recovered,
				evidence: ["recovered", recovered, "of", seeds.length, "held-out seeds within a budget of", budget, "works"].join(" "),
			});
		}),
	);
};

const compareSeedSelection = (pool: readonly PoolWork[], options: CompareOptions): readonly ComparisonRow[] => {
	const poolGraph = toPoolGraph(pool);
	const rows = algorithmsByStage("seed-selection").map((spec) => {
		const coverage = oneHopCoverage(pool, selectSeeds(spec.id, poolGraph, options.selectionSize));
		return rowFor(spec, {
			value: coverage,
			evidence: ["picks cover", Math.round(coverage * pool.length), "of", pool.length, "pool works within one hop"].join(" "),
		});
	});
	return markChosen(rows);
};

const compareRanking = (): readonly ComparisonRow[] => {
	const roster = algorithmsByStage("ranking");
	if (roster.length !== 1) {
		throw new Error(["ranking roster must hold exactly the association ranking, found", roster.length].join(" "));
	}
	return markChosen(roster.map((spec) => rowFor(spec, { value: null, evidence: "sole ranking algorithm in the roster" })));
};

export const compareAlgorithms = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: CompareOptions,
): AlgorithmComparison => ({
	exploration: compareExploration(pool, seeds),
	"seed-selection": compareSeedSelection(pool, options),
	ranking: compareRanking(),
});
