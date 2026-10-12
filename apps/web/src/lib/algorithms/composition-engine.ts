/**
 * Composition suggestion engine: proposes each stage's algorithm for a review, chosen by measured performance on the reviewer's own pool rather than a fixed default. The suggestion is read straight off the algorithm comparison (the chosen rows), so the app's recommendation and the side-by-side comparison are one computation. The evidence string names the measurement, and the reviewer remains free to override.
 */

import type { CompositionPick, SuggestedComposition } from "../../stores/review-store";
import { type AlgorithmComparison, compareAlgorithms, type ComparisonRow } from "./algorithm-comparison";
import { algorithmsByStage } from "./registry";
import type { PoolWork } from "./screening-engine";

export interface SuggestCompositionOptions {
	/**
	 * How many seeds the seed-selection stage should propose for a zero-seeds start.
	 */
	readonly selectionSize: number;
}

const chosenPick = (rows: readonly ComparisonRow[]): CompositionPick | null => {
	const row = rows.find((candidate) => candidate.chosen);
	return row === undefined ? null : { algorithmId: row.algorithmId, evidence: row.evidence, chosenBy: "app" };
};

export const suggestComposition = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: SuggestCompositionOptions,
): SuggestedComposition => {
	const comparison = compareAlgorithms(pool, seeds, options);
	return {
		exploration: chosenPick(comparison.exploration),
		ranking: chosenPick(comparison.ranking),
		// A review that already has seeds needs no selection pick; the comparison still shows how each selector measures.
		seedSelection: seeds.length > 0 ? null : chosenPick(comparison["seed-selection"]),
	};
};

const DEFAULT_EVIDENCE = "default until measured on this review";

const defaultPick = (stage: "exploration" | "ranking"): CompositionPick => {
	const first = algorithmsByStage(stage)[0];
	return { algorithmId: first.id, evidence: DEFAULT_EVIDENCE, chosenBy: "app" };
};

/**
 * The composition a review runs with before anything has been measured: the first roster entry of the exploration and ranking stages. Starting a review needs a working composition at once; measurement then replaces these defaults (adoptMeasured), because measuring every algorithm is far slower than loading the pool.
 */
export const defaultComposition = (seedSelection: CompositionPick | null): SuggestedComposition => ({
	exploration: defaultPick("exploration"),
	ranking: defaultPick("ranking"),
	seedSelection,
});

const STAGE_KEYS = [
	["exploration", "exploration"],
	["ranking", "ranking"],
] as const;

/**
 * Replaces each app-made exploration and ranking pick with the measured best, leaving every reviewer override and the seed selection alone. Returns the same composition object when nothing changes, so callers can tell whether a write is needed.
 */
export const adoptMeasured = (composition: SuggestedComposition, comparison: AlgorithmComparison): SuggestedComposition => {
	let adopted = composition;
	for (const [stage, key] of STAGE_KEYS) {
		const current = composition[key];
		if (current?.chosenBy === "reviewer") continue;
		const measured = chosenPick(comparison[stage]);
		if (measured === null) continue;
		if (current?.algorithmId === measured.algorithmId && current.evidence === measured.evidence) continue;
		adopted = { ...adopted, [key]: measured };
	}
	return adopted;
};
