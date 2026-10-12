/**
 * Seed-selection engine: picks the k starting works for a zero-seeds review from the pool's undirected citation adjacency. Every selection is deterministic (fixed tie-breaks, seeded randomness) so the same pool always yields the same picks.
 *
 * Selection contracts ported from the thesis's screening tool (association_search.py), whose selectors pick k nodes from pool adjacency. The graphwise/seeds package solves a different contract (seed PAIRS for exploration benchmarking), so it is not wired here; the exploration and ranking stages do consume graphwise directly.
 */

export interface PoolGraph {
	readonly nodes: readonly string[];
	/**
	Undirected citation adjacency among pool works; symmetric by construction.
	 */
	readonly adjacency: Map<string, readonly string[]>;
}

const neighbours = (pool: PoolGraph, id: string): readonly string[] =>
	pool.adjacency.get(id) ?? [];

const degrees = (pool: PoolGraph): Map<string, number> => {
	const out = new Map<string, number>();
	for (const id of pool.nodes) {
		out.set(id, neighbours(pool, id).length);
	}
	return out;
};

/**
Deterministic ordering for every downstream sort: by score, then by id.
 */
const byScoreThenId = (score: (id: string) => number) => (a: string, b: string): number => {
	const diff = score(b) - score(a);
	return diff !== 0 ? diff : (a < b ? -1 : 1);
};

const takeK = (ordered: readonly string[], k: number): string[] => ordered.slice(0, k);

/**
 * Mulberry32: small deterministic PRNG. Seeded randomness keeps the random selector reproducible across sessions (the pool ids order the stream).
 */
const MULBERRY32_INCREMENT = 0x6D2B79F5;
const MULBERRY32_SHIFT_A = 15;
const MULBERRY32_SHIFT_B = 7;
const MULBERRY32_MIX_B = 61;
const MULBERRY32_SHIFT_C = 14;
const MULBERRY32_DIVISOR = 4294967296;

const mulberry32 = (seed: number): (() => number) => {
	let state = seed >>> 0;
	return () => {
		state = Math.trunc(state + MULBERRY32_INCREMENT);
		let t = Math.imul(state ^ (state >>> MULBERRY32_SHIFT_A), 1 | state);
		t = (t + Math.imul(t ^ (t >>> MULBERRY32_SHIFT_B), MULBERRY32_MIX_B | t)) ^ t;
		return ((t ^ (t >>> MULBERRY32_SHIFT_C)) >>> 0) / MULBERRY32_DIVISOR;
	};
};

const RANDOM_SEED = 42;

const randomSelection = (pool: PoolGraph, k: number): string[] => {
	// Fisher-Yates over a sorted copy so the seeded stream is pool-order-stable.
	const ordered = [...pool.nodes].sort();
	const rng = mulberry32(RANDOM_SEED);
	for (let i = ordered.length - 1; i > 0; i--) {
		const j = Math.floor(rng() * (i + 1));
		const tmp = ordered[i];
		ordered[i] = ordered[j];
		ordered[j] = tmp;
	}
	return takeK(ordered, k);
};

const highDegreeSelection = (pool: PoolGraph, k: number): string[] => {
	const deg = degrees(pool);
	return takeK([...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0)), k);
};

const diverseDegreeSelection = (pool: PoolGraph, k: number): string[] => {
	const deg = degrees(pool);
	const ranked = [...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0));
	// Spread picks evenly across the ranking so consecutive same-degree clusters do not dominate the selection.
	const picks: string[] = [];
	const stride = Math.max(1, Math.floor(ranked.length / k));
	for (let i = 0; i < ranked.length && picks.length < k; i += stride) {
		picks.push(ranked[i]);
	}
	for (const id of ranked) {
		if (picks.length >= k) break;
		if (!picks.includes(id)) picks.push(id);
	}
	return takeK(picks, k);
};

const EIGENVECTOR_ITERATIONS = 40;
const EIGENVECTOR_DAMPING = 0.85;
const EIGENVECTOR_BASE = 0.15;

const eigenvectorSelection = (pool: PoolGraph, k: number): string[] => {
	const scores = new Map<string, number>();
	for (const id of pool.nodes) {
		scores.set(id, 1);
	}
	for (let iter = 0; iter < EIGENVECTOR_ITERATIONS; iter++) {
		const next = new Map<string, number>();
		for (const id of pool.nodes) {
			let sum = 0;
			for (const nb of neighbours(pool, id)) {
				sum += (scores.get(nb) ?? 0) / Math.max(1, neighbours(pool, nb).length);
			}
			next.set(id, EIGENVECTOR_BASE + EIGENVECTOR_DAMPING * sum);
		}
		for (const [id, value] of next) {
			scores.set(id, value);
		}
	}
	return takeK([...pool.nodes].sort(byScoreThenId((id) => scores.get(id) ?? 0)), k);
};

const triangles = (pool: PoolGraph, id: string): number => {
	const nb = new Set(neighbours(pool, id));
	let count = 0;
	for (const a of nb) {
		for (const b of neighbours(pool, a)) {
			if (b !== id && nb.has(b)) {
				count++;
			}
		}
	}
	return count / 2;
};

const GRASP_KMEANS_K = 3;
const GRASP_MAX_ITERATIONS = 10;

/**
GRASP-inspired: cluster on (log-degree, clustering coefficient) and pick the top of each cluster.
 */
const graspSelection = (pool: PoolGraph, k: number): string[] => {
	const deg = degrees(pool);
	const features = pool.nodes.map((id) => {
		const nb = neighbours(pool, id);
		const possible = Math.max(1, (nb.length * (nb.length - 1)) / 2);
		return { id, x: Math.log1p(deg.get(id) ?? 0), y: triangles(pool, id) / possible };
	});
	// Deterministic k-means: initialise from the first k sorted-by-x points.
	const sorted = [...features].sort((a, b) => (a.x < b.x ? 1 : (a.x > b.x) || (a.id < b.id) ? -1 : 1));
	const centres = sorted.slice(0, Math.min(GRASP_KMEANS_K, k)).map((f) => ({ x: f.x, y: f.y }));
	let assignments = new Map<string, number>();
	for (let iter = 0; iter < GRASP_MAX_ITERATIONS; iter++) {
		const next = new Map<string, number>();
		for (const f of features) {
			let best = 0;
			let bestDist = Infinity;
			for (let c = 0; c < centres.length; c++) {
				const dist = (f.x - centres[c].x) ** 2 + (f.y - centres[c].y) ** 2;
				if (dist < bestDist || (dist === bestDist && c < best)) {
					best = c;
					bestDist = dist;
				}
			}
			next.set(f.id, best);
		}
		assignments = next;
		for (let c = 0; c < centres.length; c++) {
			const members = features.filter((f) => assignments.get(f.id) === c);
			if (members.length === 0) continue;
			centres[c] = {
				x: members.reduce((sum, m) => sum + m.x, 0) / members.length,
				y: members.reduce((sum, m) => sum + m.y, 0) / members.length,
			};
		}
	}
	// Top-degree member of each cluster first (cluster coverage), then fill by degree.
	const picks: string[] = [];
	const byFeatureDegree = (a: Readonly<{ id: string }>, b: Readonly<{ id: string }>): number => {
		const diff = (deg.get(b.id) ?? 0) - (deg.get(a.id) ?? 0);
		return diff !== 0 ? diff : (a.id < b.id ? -1 : 1);
	};
	for (let c = 0; c < centres.length && picks.length < k; c++) {
		const members = features.filter((f) => assignments.get(f.id) === c).sort(byFeatureDegree);
		if (members.length > 0) picks.push(members[0].id);
	}
	for (const node of [...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0))) {
		if (picks.length >= k) break;
		if (!picks.includes(node)) picks.push(node);
	}
	return takeK(picks, k);
};

/**
STRIDE: triangle-count categories (core/bridge/periphery), pick across categories.
 */
const STRIDE_CATEGORY_COUNT = 3;

const strideSelection = (pool: PoolGraph, k: number): string[] => {
	const tri = new Map<string, number>();
	for (const id of pool.nodes) {
		tri.set(id, triangles(pool, id));
	}
	const category = (id: string): number => {
		const t = tri.get(id) ?? 0;
		if (t >= 2) return 0;
		if (t >= 1) return 1;
		return 2;
	};
	const deg = degrees(pool);
	const picks: string[] = [];
	for (let cat = 0; cat < STRIDE_CATEGORY_COUNT && picks.length < k; cat++) {
		const members = pool.nodes.filter((id) => category(id) === cat).sort(byScoreThenId((id) => deg.get(id) ?? 0));
		if (members.length > 0) picks.push(members[0]);
	}
	for (const node of [...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0))) {
		if (picks.length >= k) break;
		if (!picks.includes(node)) picks.push(node);
	}
	return takeK(picks, k);
};

/**
SPINE: balance across the degree distribution's skew (low and high ends first).
 */
const spineSelection = (pool: PoolGraph, k: number): string[] => {
	const deg = degrees(pool);
	const ranked = [...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0));
	// Alternate from the top and bottom of the ranking to balance the skew.
	const picks: string[] = [];
	let low = 0;
	let high = ranked.length - 1;
	while (picks.length < k && low <= high) {
		picks.push(ranked[high]);
		if (picks.length < k && low !== high) picks.push(ranked[low]);
		high--;
		low++;
	}
	return takeK(picks, k);
};

const CRISP_DIVERSITY_THRESHOLD = 0.5;

const intersectionSize = (a: Set<string>, b: Set<string>): number => {
	let count = 0;
	for (const value of a) {
		if (b.has(value)) count++;
	}
	return count;
};

/**
CRISP: greedy common-neighbour scoring with Jaccard diversity.
 */
const crispSelection = (pool: PoolGraph, k: number): string[] => {
	const nbSets = new Map<string, Set<string>>();
	for (const id of pool.nodes) {
		nbSets.set(id, new Set(neighbours(pool, id)));
	}
	const connectivity = (id: string): number => neighbours(pool, id).length;
	const picks: string[] = [];
	const remaining = [...pool.nodes].sort(byScoreThenId(connectivity));
	for (const candidate of remaining) {
		if (picks.length >= k) break;
		const candidateSet = nbSets.get(candidate);
		if (!candidateSet) continue;
		let diverse = true;
		for (const picked of picks) {
			const pickedSet = nbSets.get(picked);
			if (!pickedSet) continue;
			const union = candidateSet.union(pickedSet);
			const jaccard = union.size === 0 ? 0 : intersectionSize(candidateSet, pickedSet) / union.size;
			if (jaccard > CRISP_DIVERSITY_THRESHOLD) {
				diverse = false;
				break;
			}
		}
		if (diverse) picks.push(candidate);
	}
	// Fill any shortfall deterministically by degree.
	const deg = degrees(pool);
	for (const node of [...pool.nodes].sort(byScoreThenId((id) => deg.get(id) ?? 0))) {
		if (picks.length >= k) break;
		if (!picks.includes(node)) picks.push(node);
	}
	return takeK(picks, k);
};

/**
BRISK: rank aggregation (Borda count) over the other selectors.
 */
const briskSelection = (pool: PoolGraph, k: number): string[] => {
	const contributors: readonly (readonly string[])[] = [
		highDegreeSelection(pool, pool.nodes.length),
		diverseDegreeSelection(pool, pool.nodes.length),
		eigenvectorSelection(pool, pool.nodes.length),
		graspSelection(pool, pool.nodes.length),
		strideSelection(pool, pool.nodes.length),
	];
	const borda = new Map<string, number>();
	for (const id of pool.nodes) {
		borda.set(id, 0);
	}
	for (const ranking of contributors) {
		ranking.forEach((id, position) => {
			borda.set(id, (borda.get(id) ?? 0) + (ranking.length - position));
		});
	}
	return takeK([...pool.nodes].sort(byScoreThenId((id) => borda.get(id) ?? 0)), k);
};

export type SelectorId =
	| "random"
	| "high-degree"
	| "diverse-degree"
	| "eigenvector"
	| "grasp"
	| "stride"
	| "spine"
	| "crisp"
	| "brisk";

const SELECTORS: ReadonlyMap<string, (pool: PoolGraph, k: number) => string[]> = new Map([
	["random", randomSelection],
	["high-degree", highDegreeSelection],
	["diverse-degree", diverseDegreeSelection],
	["eigenvector", eigenvectorSelection],
	["grasp", graspSelection],
	["stride", strideSelection],
	["spine", spineSelection],
	["crisp", crispSelection],
	["brisk", briskSelection],
]);

export const selectSeeds = (selectorId: string, pool: PoolGraph, k: number): string[] => {
	const selector = SELECTORS.get(selectorId);
	if (!selector) {
		throw new Error(`unknown seed selector: ${selectorId}`);
	}
	return selector(pool, k);
};
