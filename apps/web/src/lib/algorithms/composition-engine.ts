/**
 * Composition suggestion engine: proposes each stage's algorithm for a review, chosen by measured performance on the reviewer's own pool rather than a fixed default. The suggestion is read straight off the algorithm comparison (the chosen rows), so the app's recommendation and the side-by-side comparison are one computation. The evidence string names the measurement, and the reviewer remains free to override.
 */

import type { CompositionPick, SuggestedComposition } from "../../stores/review-store";
import { compareAlgorithms, type ComparisonRow } from "./algorithm-comparison";
import type { PoolWork } from "./screening-engine";

export interface SuggestCompositionOptions {
	/**
	 * How many seeds the seed-selection stage should propose for a zero-seeds start.
	 */
	readonly selectionSize: number;
}

const chosenPick = (rows: readonly ComparisonRow[]): CompositionPick | null => {
	const row = rows.find((candidate) => candidate.chosen);
	return row === undefined ? null : { algorithmId: row.algorithmId, evidence: row.evidence };
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
