/**
 * Semantic screening engine: ranks a review's candidate pool by association with its seed works. Builds the pool's undirected citation-association graph, discovers seed-to-seed paths with a registry exploration algorithm, ranks the paths with PARSE (graphwise), and aggregates each path's salience onto the works that bridge it. Deterministic throughout: fixed iteration order and score-then-id tie-breaks, so the same pool and seeds always yield the same screening order.
 *
 * The association weight ports the thesis's structural MI (eq:mi_structural, mirrored in tools/association_search.py): direct citation floors at 1, otherwise half the sum of the bibliographic-coupling Jaccard over full reference lists and the within-pool co-citation Jaccard.
 */

import type { ExplorationConfig, ExplorationPath, ExplorationResult, Seed } from "graphwise/exploration";
import { AdjacencyMapGraph, type NodeId, type ReadableGraph } from "graphwise/graph";

import type { RankingRunner, ScoredPath } from "./ranking-types";

/**
 * A pool work: its OpenAlex id and the works it cites (OpenAlex referenced_works, external ids included).
 */
export interface PoolWork {
	readonly id: string;
	readonly references: readonly string[];
}

/**
 * One screened candidate: the association score that earned its position and the best seed-to-candidate path it comes from.
 */
export interface RankedCandidate {
	readonly workId: string;
	/**
	 * Mean over all seeds of the best path score from that seed.
	 */
	readonly score: number;
	readonly evidence: {
		readonly fromSeed: string;
		readonly toSeed: string;
		/**
		 * The works between the seed and the candidate on the best path (none when they are directly associated), in path order.
		 */
		readonly via: readonly string[];
	};
	/**
	 * How many seeds have a path to this work.
	 */
	readonly pathsConnected: number;
}

export type ExplorationRunner = (
	graph: Readonly<ReadableGraph>,
	seeds: readonly Seed[],
	config?: ExplorationConfig,
) => ExplorationResult;

export interface ScreeningOptions {
	/**
	 * The exploration algorithm whose paths feed the ranking; the registry's run functions satisfy this.
	 */
	readonly exploration: ExplorationRunner;
	readonly explorationConfig?: ExplorationConfig;
	/**
	 * The ranking algorithm that scores the discovered paths; the registry's rank functions satisfy this.
	 */
	readonly ranking: RankingRunner;
}

/**
 * Share of the pool one exploration may expand. Used both when measuring algorithms and when screening, so what the comparison reports is exactly the protocol the screen runs. Without a budget every algorithm eventually reaches every connected work and the measure cannot tell them apart; a fixed share follows association chains far enough to find related works yet stays small enough that the algorithms differ, and it bounds the cost of exploring a large pool.
 */
export const EXPLORATION_BUDGET_FRACTION = 0.25;

/**
 * Pools this small are explored in full: a quarter of a handful of works could not follow even a short association chain.
 */
export const MIN_EXPLORATION_BUDGET = 32;

export const explorationBudget = (poolSize: number): number =>
	Math.max(MIN_EXPLORATION_BUDGET, Math.ceil(poolSize * EXPLORATION_BUDGET_FRACTION));

// Direct citation is the strongest structural association.
const DIRECT_CITATION_MI = 1;
// eq:mi_structural is half the sum of the coupling and co-citation Jaccards.
const STRUCTURAL_MI_HALF = 0.5;

const jaccardSimilarity = (a: ReadonlySet<string>, b: ReadonlySet<string>): number => {
	if (a.size === 0 && b.size === 0) return 0;
	let intersection = 0;
	for (const value of a) {
		if (b.has(value)) intersection++;
	}
	const union = a.size + b.size - intersection;
	return union === 0 ? 0 : intersection / union;
};

/**
 * Map accessor that fails loudly: every pool id is initialised before any read, so a miss is a logic error, not an expected absence.
 */
const required = <T>(map: Map<string, T>, id: string, what: string): T => {
	const value = map.get(id);
	if (value === undefined) {
		throw new Error(`${what} missing for pool work ${id}`);
	}
	return value;
};

export interface PoolAssociation {
	readonly graph: Readonly<ReadableGraph>;
	readonly poolIds: ReadonlySet<string>;
	readonly structuralMi: (u: NodeId, v: NodeId) => number;
}

/**
 * Pairs of works that can have non-zero structural MI: a direct citation, a shared reference (coupling), or a shared citer (co-citation). Every other pair scores zero and carries no edge, so enumerating these through inverted indices replaces testing all n-squared pairs.
 */
const candidatePairs = (
	pool: readonly PoolWork[],
	citesInPool: ReadonlyMap<string, ReadonlySet<string>>,
): Map<string, Set<string>> => {
	const pairs = new Map<string, Set<string>>();
	const addPair = (a: string, b: string) => {
		if (a === b) return;
		const [low, high] = a < b ? [a, b] : [b, a];
		const partners = pairs.get(low) ?? new Set<string>();
		partners.add(high);
		pairs.set(low, partners);
	};
	const addAll = (group: readonly string[]) => {
		group.forEach((a, i) => {
			for (const b of group.slice(i + 1)) addPair(a, b);
		});
	};
	const citersOfReference = new Map<string, string[]>();
	for (const work of pool) {
		for (const ref of new Set(work.references)) {
			const citers = citersOfReference.get(ref) ?? [];
			citers.push(work.id);
			citersOfReference.set(ref, citers);
		}
	}
	for (const citers of citersOfReference.values()) addAll(citers);
	for (const [citer, cited] of citesInPool) {
		for (const target of cited) addPair(citer, target);
		addAll([...cited]);
	}
	return pairs;
};

const computePoolAssociation = (pool: readonly PoolWork[]): PoolAssociation => {
	const refsById = new Map<string, ReadonlySet<string>>();
	for (const work of pool) {
		refsById.set(work.id, new Set(work.references));
	}
	const poolIds = new Set(refsById.keys());
	// Pool-internal citation direction: which pool works each work cites, and which cite it.
	const citesInPool = new Map<string, Set<string>>();
	const citedByInPool = new Map<string, Set<string>>();
	for (const id of poolIds) {
		citesInPool.set(id, new Set());
		citedByInPool.set(id, new Set());
	}
	for (const work of pool) {
		for (const ref of required(refsById, work.id, "references")) {
			if (!poolIds.has(ref) || ref === work.id) continue;
			required(citesInPool, work.id, "pool citations").add(ref);
			required(citedByInPool, ref, "pool citers").add(work.id);
		}
	}

	const structuralMi = (u: NodeId, v: NodeId): number => {
		if (
			required(citesInPool, u, "pool citations").has(v) ||
			required(citesInPool, v, "pool citations").has(u)
		) {
			return DIRECT_CITATION_MI;
		}
		const coupling = jaccardSimilarity(required(refsById, u, "references"), required(refsById, v, "references"));
		const coCitation = jaccardSimilarity(
			required(citedByInPool, u, "pool citers"),
			required(citedByInPool, v, "pool citers"),
		);
		return STRUCTURAL_MI_HALF * (coupling + coCitation);
	};

	const graph = AdjacencyMapGraph.undirected();
	for (const work of pool) {
		graph.addNode({ id: work.id });
	}
	// Edges are inserted in sorted pair order so neighbour iteration, and every exploration tie-break that follows it, is deterministic.
	const pairs = candidatePairs(pool, citesInPool);
	for (const low of [...pairs.keys()].sort()) {
		for (const high of [...required(pairs, low, "candidate pairs")].sort()) {
			if (structuralMi(low, high) === 0) continue;
			graph.addEdge({ source: low, target: high });
		}
	}
	return { graph, poolIds, structuralMi };
};

const associationCache = new WeakMap<readonly PoolWork[], PoolAssociation>();

/**
 * The pool's undirected citation-association graph with its structural MI, shared by every algorithm surface that reasons over pool association (screening, comparison, composition suggestion). Memoised per pool object: pools are immutable once loaded, so one pool is analysed once however many surfaces ask.
 */
export const buildPoolAssociation = (pool: readonly PoolWork[]): PoolAssociation => {
	const cached = associationCache.get(pool);
	if (cached) return cached;
	const association = computePoolAssociation(pool);
	associationCache.set(pool, association);
	return association;
};

/**
 * The subgraph induced by the works an exploration sampled. Ranking runs on this core rather than the whole pool: the paths lie inside it, and the heavier path-ranking baselines (resistance distance, communicability) cost more than quadratic in the graph's size.
 */
export const exploredCore = (
	graph: Readonly<ReadableGraph>,
	sampled: ReadonlySet<NodeId>,
): Readonly<ReadableGraph> => {
	const core = AdjacencyMapGraph.undirected();
	for (const id of [...sampled].sort()) {
		core.addNode({ id });
	}
	for (const edge of graph.edges()) {
		if (sampled.has(edge.source) && sampled.has(edge.target)) {
			core.addEdge({ source: edge.source, target: edge.target });
		}
	}
	return core;
};

/**
 * How far association is followed from a seed. Association between works fades quickly along a citation chain, and the thesis's screening tool ranks by at most two hops.
 */
export const MAX_PATH_HOPS = 2;

/**
 * Shortest connecting paths from every seed to every other work within MAX_PATH_HOPS, found by breadth-first search in sorted neighbour order so the path chosen between two works never depends on insertion order. Each path runs from a seed to a candidate; the ranking algorithms score paths, so this is what they are asked to rank.
 */
export const candidatePaths = (core: Readonly<ReadableGraph>, seeds: readonly string[]): readonly ExplorationPath[] => {
	const seedSet = new Set(seeds);
	const paths: ExplorationPath[] = [];
	for (const seed of [...seeds].sort()) {
		const via = new Map<string, readonly string[]>([[seed, [seed]]]);
		let frontier = [seed];
		for (let hop = 0; hop < MAX_PATH_HOPS; hop++) {
			const next: string[] = [];
			for (const node of frontier) {
				const upTo = via.get(node);
				if (upTo === undefined) continue;
				for (const neighbour of [...core.neighbours(node)].sort()) {
					if (via.has(neighbour)) continue;
					const path = [...upTo, neighbour];
					via.set(neighbour, path);
					next.push(neighbour);
					if (!seedSet.has(neighbour)) {
						paths.push({ fromSeed: { id: seed }, toSeed: { id: neighbour }, nodes: path });
					}
				}
			}
			frontier = next;
		}
	}
	return paths;
};

/**
 * Folds scored seed-to-candidate paths into one score per candidate: the mean over all seeds of the best path from that seed (a seed with no path counts zero, as in the thesis's tool). The evidence is the best-scoring seed path; ties break on the seed id, so equal scores order deterministically.
 */
export const rankCandidates = (
	scored: readonly ScoredPath[],
	seeds: ReadonlySet<string>,
): readonly RankedCandidate[] => {
	const bestBySeed = new Map<string, Map<string, ScoredPath>>();
	for (const path of scored) {
		const candidate = path.toSeed.id;
		if (seeds.has(candidate)) continue;
		const perSeed = bestBySeed.get(candidate) ?? new Map<string, ScoredPath>();
		const current = perSeed.get(path.fromSeed.id);
		if (current === undefined || path.score > current.score) perSeed.set(path.fromSeed.id, path);
		bestBySeed.set(candidate, perSeed);
	}
	const candidates: RankedCandidate[] = [];
	for (const [workId, perSeed] of bestBySeed) {
		let total = 0;
		let best: ScoredPath | undefined;
		for (const seed of [...perSeed.keys()].sort()) {
			const path = required(perSeed, seed, "seed path");
			total += path.score;
			if (best === undefined || path.score > best.score) best = path;
		}
		if (best === undefined) continue;
		candidates.push({
			workId,
			score: total / seeds.size,
			evidence: { fromSeed: best.fromSeed.id, toSeed: workId, via: best.nodes.slice(1, -1) },
			pathsConnected: perSeed.size,
		});
	}
	return candidates.sort((a, b) => (a.score !== b.score ? (a.score > b.score ? -1 : 1) : a.workId < b.workId ? -1 : 1));
};

/**
 * Ranks every work reachable from the seeds on an explored core with the given ranking algorithm.
 */
export const rankOnCore = (
	core: Readonly<ReadableGraph>,
	structuralMi: PoolAssociation["structuralMi"],
	seeds: readonly string[],
	ranking: RankingRunner,
): readonly RankedCandidate[] =>
	rankCandidates(ranking({ graph: core, structuralMi }, candidatePaths(core, seeds)), new Set(seeds));

export const screenSemantically = (
	pool: readonly PoolWork[],
	seeds: readonly string[],
	options: ScreeningOptions,
): readonly RankedCandidate[] => {
	const { graph, poolIds, structuralMi } = buildPoolAssociation(pool);
	for (const seed of seeds) {
		if (!poolIds.has(seed)) {
			throw new Error(`seed not in pool: ${seed}`);
		}
	}
	const seedObjects: readonly Seed[] = seeds.map((id) => ({ id }));
	const exploration = options.exploration(graph, seedObjects, options.explorationConfig);
	return rankOnCore(exploredCore(graph, exploration.sampledNodes), structuralMi, seeds, options.ranking);
};
