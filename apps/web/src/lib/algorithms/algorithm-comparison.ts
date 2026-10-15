/**
 * Algorithm comparison: every roster algorithm of every stage, measured on the review's own pool and marked novel or baseline, so a reviewer can compare them all side by side. The composition suggestion is derived from these same rows (the chosen flag), which keeps what the app recommends and what the comparison shows from ever disagreeing. Measurements: exploration by held-out seed recovery, seed selection by one-hop pool coverage, ranking by held-out seed recovery in the top of the ranked pool, on the exploration the comparison chose. Each stage's measurements are produced by their own function, so the session can measure a stage's missing cells alone and cache the rest under measurement keys.
 */

import type { CellMeasurement } from "@/lib/reviews/measurement-cache";

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

/**
 * One stage's measurements by algorithm id: the measured values and the evidence behind them, before the chosen flag is derived. An absent id was not asked for or did not come back, which consumers must fail loudly on rather than default.
 */
export type StageMeasurements = Readonly<Partial<Record<string, CellMeasurement>>>;

/**
 * Reports which algorithm of which stage a measurement run is starting, so the interface can say what is happening rather than spin globally.
 */
export interface MeasureProgress {
	readonly stage: AlgorithmStage;
	readonly algorithmId: string;
	/**
	 * Algorithms (or algorithm-by-held-out-seed steps) already finished in this run.
	 */
	readonly done: number;
	readonly total: number;
}

export type ProgressReporter = (progress: MeasureProgress) => void;

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
 * Held-out seeds measured per stage. Every held-out seed repeats an exploration (and, for ranking, all twenty-five rankers), so measuring on all of a large seed set costs more with every seed; a fixed, sorted sample of this many keeps the cost bounded and the choice repeatable.
 */
const MAX_HELD_OUT_SEEDS = 3;

const heldOutSample = (seeds: readonly string[]): readonly string[] => [...seeds].sort().slice(0, MAX_HELD_OUT_SEEDS);

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
	measurement: CellMeasurement,
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

const unmeasurableEvidence = (seeds: readonly string[], needed: string): string =>
	seeds.length === 0 ? "no seeds to measure against; roster default" : `needs ${needed} seeds to measure; roster default`;

/**
 * The exploration stage's measurements: each algorithm recovers held-out seeds within the exploration budget. Only the asked algorithms are measured, each reported as it starts, so a partially cached stage measures just its missing cells.
 */
export const measureExplorationStage = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	algorithmIds: readonly string[],
	onProgress?: ProgressReporter,
): StageMeasurements => {
	const roster = algorithmsByStage("exploration");
	if (roster.length === 0) {
		throw new Error("exploration roster is empty");
	}
	const evidence = unmeasurableEvidence(seeds, "two or more");
	if (seeds.length < MIN_SEEDS_FOR_HOLDOUT) {
		const unmeasured: Record<string, CellMeasurement> = {};
		for (const id of algorithmIds) unmeasured[id] = { value: null, evidence };
		return unmeasured;
	}
	const { graph } = buildPoolAssociation(pool);
	const budget = explorationBudget(pool.length);
	const heldOutSeeds = heldOutSample(seeds);
	const measurements: Record<string, CellMeasurement> = {};
	algorithmIds.forEach((algorithmId, index) => {
		onProgress?.({ stage: "exploration", algorithmId, done: index, total: algorithmIds.length });
		const spec = roster.find((candidate) => candidate.id === algorithmId);
		if (spec === undefined) {
			throw new Error(`unknown exploration algorithm: ${algorithmId}`);
		}
		if (!spec.run) {
			throw new Error(`exploration algorithm without a runnable implementation: ${spec.id}`);
		}
		let recovered = 0;
		for (const heldOut of heldOutSeeds) {
			const remaining = seeds.filter((seed) => seed !== heldOut).map((id) => ({ id }));
			if (spec.run(graph, remaining, { maxNodes: budget }).sampledNodes.has(heldOut)) recovered++;
		}
		measurements[algorithmId] = {
			value: recovered,
			evidence: ["recovered", recovered, "of", heldOutSeeds.length, "held-out seeds within a budget of", budget, "works"].join(" "),
		};
	});
	return measurements;
};

/**
 * The seed-selection stage's measurements: each selector's one-hop pool coverage at the selection size. The review's seeds do not enter it, so these measurements survive a seed change.
 */
export const measureSeedSelectionStage = (
	pool: readonly PoolWork[],
	selectionSize: number,
	algorithmIds: readonly string[],
	onProgress?: ProgressReporter,
): StageMeasurements => {
	const poolGraph = toPoolGraph(pool);
	const measurements: Record<string, CellMeasurement> = {};
	algorithmIds.forEach((algorithmId, index) => {
		onProgress?.({ stage: "seed-selection", algorithmId, done: index, total: algorithmIds.length });
		const spec = algorithmsByStage("seed-selection").find((candidate) => candidate.id === algorithmId);
		if (spec === undefined) {
			throw new Error(`unknown seed-selection algorithm: ${algorithmId}`);
		}
		const coverage = oneHopCoverage(pool, selectSeeds(spec.id, poolGraph, selectionSize));
		measurements[algorithmId] = {
			value: coverage,
			evidence: ["picks cover", Math.round(coverage * pool.length), "of", pool.length, "pool works within one hop"].join(" "),
		};
	});
	return measurements;
};

/**
 * The ranking stage's measurements: every ranker recovers held-out seeds in the top of the pool ranked on the named exploration. The roster shares one exploration per held-out seed (the rankers differ only in how they score the same paths), so the stage measures as one batch keyed on that exploration.
 */
export const measureRankingStage = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	explorationId: string,
	onProgress?: ProgressReporter,
): StageMeasurements => {
	const roster = algorithmsByStage("ranking");
	if (roster.length === 0) {
		throw new Error("ranking roster is empty");
	}
	const evidence = unmeasurableEvidence(seeds, "three or more");
	if (seeds.length < MIN_SEEDS_FOR_RANKING_HOLDOUT) {
		const unmeasured: Record<string, CellMeasurement> = {};
		for (const spec of roster) unmeasured[spec.id] = { value: null, evidence };
		return unmeasured;
	}
	const run = algorithmById(explorationId)?.run;
	if (run === undefined) {
		throw new Error("ranking is measured on the chosen exploration, which has no runnable implementation");
	}
	const { graph, structuralMi } = buildPoolAssociation(pool);
	const budget = explorationBudget(pool.length);
	const topK = Math.ceil(pool.length * RANKING_TOP_FRACTION);
	const recovered = new Map<string, number>(roster.map((spec) => [spec.id, 0]));
	const sample = heldOutSample(seeds);
	const totalSteps = sample.length * roster.length;
	let done = 0;
	for (const heldOut of sample) {
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
			onProgress?.({ stage: "ranking", algorithmId: spec.id, done, total: totalSteps });
			const candidates = rankCandidates(spec.rank(context, paths), remainingSet);
			const position = candidates.findIndex((candidate) => candidate.workId === heldOut);
			if (position !== -1 && position < topK) {
				recovered.set(spec.id, (recovered.get(spec.id) ?? 0) + 1);
			}
			done++;
		}
	}
	const measurements: Record<string, CellMeasurement> = {};
	for (const spec of roster) {
		const count = recovered.get(spec.id) ?? 0;
		measurements[spec.id] = {
			value: count,
			evidence: ["recovered", count, "of", sample.length, "held-out seeds in the top", topK, "candidates"].join(" "),
		};
	}
	return measurements;
};

/**
 * Assembles a stage's comparison rows from its roster and a measurement per algorithm. A missing measurement is a broken cache contract, not a row to hide, so it fails loudly.
 */
export const rowsForStage = (
	stage: AlgorithmStage,
	measurements: StageMeasurements,
): readonly ComparisonRow[] => {
	const roster = algorithmsByStage(stage);
	if (roster.length === 0) {
		throw new Error(`${stage} roster is empty`);
	}
	return markChosen(
		roster.map((spec) => {
			const measurement = measurements[spec.id];
			if (measurement === undefined) {
				throw new Error(`no measurement for ${stage} algorithm ${spec.id}`);
			}
			return rowFor(spec, measurement);
		}),
	);
};

/**
 * The exploration the ranking stage measures on: the exploration comparison's own chosen row.
 */
export const chosenExplorationOf = (explorationRows: readonly ComparisonRow[]): string => {
	const chosen = explorationRows.find((row) => row.chosen);
	if (chosen === undefined) {
		throw new Error("the exploration comparison marks no chosen row");
	}
	return chosen.algorithmId;
};

export const compareAlgorithms = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: CompareOptions,
): AlgorithmComparison => {
	const explorationMeasurements = measureExplorationStage(
		pool,
		seeds,
		algorithmsByStage("exploration").map((spec) => spec.id),
	);
	const exploration = rowsForStage("exploration", explorationMeasurements);
	return {
		exploration,
		// Staged like the pipeline: the ranking is measured on the exploration the comparison chose.
		ranking: rowsForStage(
			"ranking",
			measureRankingStage(pool, seeds, chosenExplorationOf(exploration)),
		),
		"seed-selection": rowsForStage(
			"seed-selection",
			measureSeedSelectionStage(
				pool,
				options.selectionSize,
				algorithmsByStage("seed-selection").map((spec) => spec.id),
			),
		),
	};
};
