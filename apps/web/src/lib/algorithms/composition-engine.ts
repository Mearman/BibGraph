/**
 * Composition suggestion engine: proposes each stage's algorithm for a review, chosen by measured performance on the reviewer's own pool rather than a fixed default. Exploration is measured by held-out seed recovery (drop each seed, explore from the rest, check the exploration samples it); seed selection by one-hop pool coverage; ranking names its sole roster candidate. Every tie-break is deterministic (roster order first), the evidence string names the measurement, and the reviewer remains free to override.
 */

import type { SuggestedComposition } from "../../stores/review-store";
import { algorithmsByStage } from "./registry";
import { buildPoolAssociation, type PoolWork } from "./screening-engine";
import { selectSeeds } from "./seed-engine";

export interface SuggestCompositionOptions {
	/**
	 * How many seeds the seed-selection stage should propose for a zero-seeds start.
	 */
	readonly selectionSize: number;
}

/**
Hold-out measurement needs at least one remaining seed to explore from after dropping one.
 */
const MIN_SEEDS_FOR_HOLDOUT = 2;

/**
Ties between equally measured algorithms resolve to roster order, so the suggestion is deterministic.
 */
const pickBest = (
	measurements: readonly { algorithmId: string; value: number; evidence: string }[],
): { algorithmId: string; evidence: string } => {
	let best = measurements[0];
	for (const candidate of measurements) {
		if (candidate.value > best.value) best = candidate;
	}
	return { algorithmId: best.algorithmId, evidence: best.evidence };
};

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

const toPoolGraph = (pool: readonly PoolWork[]) => {
	const { graph } = buildPoolAssociation(pool);
	const adjacency = new Map<string, readonly string[]>();
	for (const work of pool) {
		adjacency.set(work.id, [...graph.neighbours(work.id)]);
	}
	return { nodes: pool.map((work) => work.id), adjacency };
};

export const suggestComposition = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: SuggestCompositionOptions,
): SuggestedComposition => {
	const explorationRoster = algorithmsByStage("exploration");
	if (explorationRoster.length === 0) {
		throw new Error("exploration roster is empty");
	}
	const firstExploration = explorationRoster[0];
	let exploration = {
		algorithmId: firstExploration.id,
		evidence: "no seeds to measure against; roster default",
	};
	if (seeds.length >= MIN_SEEDS_FOR_HOLDOUT) {
		const { graph } = buildPoolAssociation(pool);
		const measurements = explorationRoster.map((spec) => {
			if (!spec.run) {
				throw new Error(`exploration algorithm without a runnable implementation: ${spec.id}`);
			}
			let recovered = 0;
			for (const heldOut of seeds) {
				const remaining = seeds.filter((seed) => seed !== heldOut).map((id) => ({ id }));
				if (spec.run(graph, remaining).sampledNodes.has(heldOut)) recovered++;
			}
			return {
				algorithmId: spec.id,
				value: recovered,
				evidence: ["recovered", recovered, "of", seeds.length, "held-out seeds on this pool"].join(" "),
			};
		});
		exploration = pickBest(measurements);
	}

	const rankingRoster = algorithmsByStage("ranking");
	if (rankingRoster.length !== 1) {
		throw new Error(["ranking roster must hold exactly the association ranking, found", rankingRoster.length].join(" "));
	}
	const ranking = {
		algorithmId: rankingRoster[0].id,
		evidence: "sole ranking algorithm in the roster",
	};

	// A review that already has seeds never needs a selection suggestion; a zero-seeds start measures which selector's picks buy the most immediate coverage.
	const seedSelection =
		seeds.length > 0
			? null
			: pickBest(
					algorithmsByStage("seed-selection").map((spec) => {
						const coverage = oneHopCoverage(pool, selectSeeds(spec.id, toPoolGraph(pool), options.selectionSize));
						return {
							algorithmId: spec.id,
							value: coverage,
							evidence: ["picks cover", Math.round(coverage * pool.length), "of", pool.length, "pool works within one hop"].join(" "),
						};
					}),
				);

	return { exploration, ranking, seedSelection };
};
