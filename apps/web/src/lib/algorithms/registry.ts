/**
 * Algorithm registry: the single source of truth for every exploration, seed-selection and ranking algorithm the review workflows expose, with its family (novel contribution or baseline) and a one-line description. The create, screening and comparison surfaces all read this registry, so adding an algorithm here surfaces it everywhere, and the family marking drives the novel/baseline badges in the UI.
 *
 * Implementations are consumed from the graphwise package (the thesis's published algorithm library), never reimplemented here (constitution DRY: the library is canonical).
 */

import {
	dome,
	edge,
	type ExplorationConfig,
	type ExplorationResult,
	frontierBalanced,
	hae,
	maze,
	pipe,
	reach,
	sage,
	type Seed,
	standardBfs,
} from "graphwise/exploration";
import type { ReadableGraph } from "graphwise/graph";

import { RANKING_ROSTER } from "./ranking-roster";
import type { RankingRunner } from "./ranking-types";

export type AlgorithmFamily = "novel" | "baseline";

export type AlgorithmStage = "exploration" | "seed-selection" | "ranking";

export interface AlgorithmSpec {
	readonly id: string;
	readonly label: string;
	readonly family: AlgorithmFamily;
	readonly stage: AlgorithmStage;
	readonly description: string;
	/**
	Runs the algorithm over a citation graph from the given seeds; undefined for selectors handled by the seed engine.
	 */
	readonly run?: (graph: Readonly<ReadableGraph>, seeds: readonly Seed[], config?: ExplorationConfig) => ExplorationResult;
	/**
	 * Scores seed-to-seed paths for the ranking stage; undefined for the other stages.
	 */
	readonly rank?: RankingRunner;
}

const EXPLORATION_ROSTER: readonly AlgorithmSpec[] = [
	{ id: "standard-bfs", label: "standard-bfs", family: "baseline", stage: "exploration", description: "Expands evenly outward from every seed in turn.", run: standardBfs },
	{ id: "frontier-balanced", label: "frontier-balanced", family: "baseline", stage: "exploration", description: "Always expands the smallest frontier, keeping seeds' coverage even.", run: frontierBalanced },
	{ id: "dome", label: "DOME", family: "novel", stage: "exploration", description: "Expands the highest-degree candidate next.", run: dome },
	{ id: "edge", label: "EDGE", family: "novel", stage: "exploration", description: "Ranks candidates by a degree-weighted entropy score.", run: edge },
	{ id: "pipe", label: "PIPE", family: "novel", stage: "exploration", description: "Prefers candidates with the most unexplored neighbours.", run: pipe },
	{ id: "sage", label: "SAGE", family: "novel", stage: "exploration", description: "Degree-first, then reinforces nodes on discovered seed-to-seed paths.", run: sage },
	{ id: "reach", label: "REACH", family: "novel", stage: "exploration", description: "Degree-first, then feedback from estimated association strength.", run: reach },
	{ id: "maze", label: "MAZE", family: "novel", stage: "exploration", description: "PIPE priority, damped by path salience once paths emerge.", run: maze },
	{ id: "hae", label: "HAE", family: "novel", stage: "exploration", description: "Adaptive-entropy scoring.", run: hae },
] as const;

/**
 * The seed-selection roster for starting a review with zero seeds. The baselines are structural picks the seed engine computes locally (random with a fixed seed, degree, degree-diversity, eigenvector); the novel selectors come from graphwise/seeds and are wired by the seed engine.
 */
const SELECTION_ROSTER: readonly AlgorithmSpec[] = [
	{ id: "random", label: "random", family: "baseline", stage: "seed-selection", description: "Picks pool works uniformly at random (fixed seed)." },
	{ id: "high-degree", label: "high-degree", family: "baseline", stage: "seed-selection", description: "Picks the most-connected pool works." },
	{ id: "diverse-degree", label: "diverse-degree", family: "baseline", stage: "seed-selection", description: "Spreads picks across the degree ranking." },
	{ id: "eigenvector", label: "eigenvector", family: "baseline", stage: "seed-selection", description: "Picks by eigenvector centrality." },
	{ id: "grasp", label: "GRASP", family: "novel", stage: "seed-selection", description: "Clusters pool works on structural features and picks per cluster." },
	{ id: "stride", label: "STRIDE", family: "novel", stage: "seed-selection", description: "Categorises works by triangle participation and covers the categories." },
	{ id: "spine", label: "SPINE", family: "novel", stage: "seed-selection", description: "Balances picks across degree-distribution skew." },
	{ id: "crisp", label: "CRISP", family: "novel", stage: "seed-selection", description: "Greedy co-citation-informed selection with Jaccard diversity." },
	{ id: "brisk", label: "BRISK", family: "novel", stage: "seed-selection", description: "Rank-aggregation ensemble of the other selectors." },
] as const;

export const ALGORITHMS: readonly AlgorithmSpec[] = [
	...EXPLORATION_ROSTER,
	...SELECTION_ROSTER,
	...RANKING_ROSTER,
];

export const algorithmsByStage = (stage: AlgorithmStage): readonly AlgorithmSpec[] =>
	ALGORITHMS.filter((spec) => spec.stage === stage);

export const algorithmById = (id: string): AlgorithmSpec | undefined =>
	ALGORITHMS.find((spec) => spec.id === id);
