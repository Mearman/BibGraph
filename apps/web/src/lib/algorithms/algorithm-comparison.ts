/**
 * Algorithm comparison: every roster algorithm of every stage, measured on the review's own pool and marked novel or baseline, so a reviewer can compare them all side by side. The composition suggestion is derived from these same rows (the chosen flag), which keeps what the app recommends and what the comparison shows from ever disagreeing. Measurements: exploration by held-out seed recovery, seed selection by one-hop pool coverage, ranking by held-out seed recovery in the top of the ranked pool, on the exploration the comparison chose.
 */

import {
	algorithmById,
	type AlgorithmFamily,
	algorithmsByStage,
	type AlgorithmSpec,
	type AlgorithmStage,
} from "./registry";
import {
	buildPoolAssociation,
	candidatePaths,
	explorationBudget,
	exploredCore,
	type PoolWork,
	rankCandidates,
} from "./screening-engine";
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
 * Ranking measurement drops one seed, explores from the rest and ranks the works they reach; two remaining seeds keep the held-out measure from resting on a single seed's neighbourhood.
 */
const MIN_SEEDS_FOR_RANKING_HOLDOUT = 3;

/**
 * Share of the pool a reviewer would plausibly screen first; a held-out seed ranked inside this top share counts as recovered.
 */
const RANKING_TOP_FRACTION = 0.1;

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
	const budget = explorationBudget(pool.length);
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

const compareRanking = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	exploration: readonly ComparisonRow[],
): readonly ComparisonRow[] => {
	const roster = algorithmsByStage("ranking");
	if (roster.length === 0) {
		throw new Error("ranking roster is empty");
	}
	if (seeds.length < MIN_SEEDS_FOR_RANKING_HOLDOUT) {
		const evidence =
			seeds.length === 0
				? "no seeds to measure against; roster default"
				: "needs three or more seeds to measure; roster default";
		return markChosen(roster.map((spec) => rowFor(spec, { value: null, evidence })));
	}
	const chosen = exploration.find((row) => row.chosen);
	const run = chosen === undefined ? undefined : algorithmById(chosen.algorithmId)?.run;
	if (run === undefined) {
		throw new Error("ranking is measured on the chosen exploration, which has no runnable implementation");
	}
	const { graph, structuralMi } = buildPoolAssociation(pool);
	const budget = explorationBudget(pool.length);
	const topK = Math.ceil(pool.length * RANKING_TOP_FRACTION);
	const recovered = new Map<string, number>(roster.map((spec) => [spec.id, 0]));
	for (const heldOut of seeds) {
		const remaining = seeds.filter((seed) => seed !== heldOut);
		// One exploration per held-out seed, shared by every ranker: they differ only in how they score the same paths.
		const explored = run(graph, remaining.map((id) => ({ id })), { maxNodes: budget });
		const core = exploredCore(graph, explored.sampledNodes);
		const context = { graph: core, structuralMi };
		const paths = candidatePaths(core, remaining);
		const remainingSet = new Set(remaining);
		for (const spec of roster) {
			if (!spec.rank) {
				throw new Error(`ranking algorithm without a runnable implementation: ${spec.id}`);
			}
			const candidates = rankCandidates(spec.rank(context, paths), remainingSet);
			const position = candidates.findIndex((candidate) => candidate.workId === heldOut);
			if (position !== -1 && position < topK) {
				recovered.set(spec.id, (recovered.get(spec.id) ?? 0) + 1);
			}
		}
	}
	return markChosen(
		roster.map((spec) => {
			const count = recovered.get(spec.id) ?? 0;
			return rowFor(spec, {
				value: count,
				evidence: ["recovered", count, "of", seeds.length, "held-out seeds in the top", topK, "candidates"].join(" "),
			});
		}),
	);
};

export const compareAlgorithms = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: CompareOptions,
): AlgorithmComparison => {
	const exploration = compareExploration(pool, seeds);
	return {
		exploration,
		"seed-selection": compareSeedSelection(pool, options),
		// Staged like the pipeline: the ranking is measured on the exploration the comparison chose.
		ranking: compareRanking(pool, seeds, exploration),
	};
};
