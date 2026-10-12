/**
 * Shared ranking contract: what a ranking algorithm receives (the pool's association graph and its structural MI) and returns (every discovered seed-to-seed path with a score, higher meaning more strongly associated). Kept in its own module so the registry and the ranking roster can both depend on it without importing each other.
 */

import type { ExplorationPath, Seed } from "graphwise/exploration";
import type { NodeId, ReadableGraph } from "graphwise/graph";

export interface RankingContext {
	readonly graph: Readonly<ReadableGraph>;
	/**
	 * The thesis's structural MI between two pool works, from coupling and co-citation over the pool's reference lists.
	 */
	readonly structuralMi: (u: NodeId, v: NodeId) => number;
}

export interface ScoredPath {
	readonly fromSeed: Seed;
	readonly toSeed: Seed;
	readonly nodes: readonly NodeId[];
	readonly score: number;
}

export type RankingRunner = (context: RankingContext, paths: readonly ExplorationPath[]) => readonly ScoredPath[];
