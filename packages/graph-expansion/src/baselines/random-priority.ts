import type { GraphExpander } from '../interfaces/graph-expander';

/**
 * Result from random-priority expansion - matches DegreePrioritisedExpansionResult.
 */
export interface RandomPriorityResult {
  /** Discovered paths (only populated when N >= 2 seeds) */
  paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }>;

  /** Union of all nodes visited by all frontiers */
  sampledNodes: Set<string>;

  /** Set of edges visited during expansion */
  sampledEdges: Set<string>;

  /** Per-frontier visited sets (for diagnostics) */
  visitedPerFrontier: Array<Set<string>>;

  /** Statistics about the expansion */
  stats: RandomPriorityStats;
}

/**
 * Statistics collected during random-priority expansion.
 */
export interface RandomPriorityStats {
  /** Total nodes expanded (popped from frontiers) */
  nodesExpanded: number;

  /** Total edges traversed */
  edgesTraversed: number;

  /** Iterations (single node expansions) performed */
  iterations: number;

  /** Breakdown of nodes by degree ranges */
  degreeDistribution: Map<string, number>;
}

/**
 * State for a single frontier with random selection.
 * @internal
 */
interface FrontierState {
  /** Index of this frontier (corresponds to seed index) */
  index: number;

  /** Array of nodes to expand (random selection) */
  frontier: string[];

  /** Set of visited nodes */
  visited: Set<string>;

  /** Parent pointers for path reconstruction */
  parents: Map<string, { parent: string; edge: string }>;
}

/**
 * Seeded pseudo-random number generator for reproducibility.
 * Uses simple LCG (Linear Congruential Generator).
 */
class SeededRandom {
  private state: number;

  constructor(seed: number) {
    this.state = seed;
  }

  /** Generate random float in [0, 1) */
  next(): number {
    // LCG parameters from Numerical Recipes
    this.state = (this.state * 1664525 + 1013904223) >>> 0;
    return this.state / 0xffffffff;
  }

  /** Generate random integer in [0, max) */
  nextInt(max: number): number {
    return Math.floor(this.next() * max);
  }
}

/**
 * Random Priority Bidirectional Expansion
 *
 * Baseline algorithm that selects nodes randomly from the frontier.
 * This serves as a null hypothesis baseline - if degree-prioritised expansion
 * doesn't outperform random selection, the degree heuristic provides no value.
 *
 * **Key Properties**:
 * - Random node selection from frontier (no priority)
 * - Seeded RNG for reproducibility
 * - No systematic hub avoidance OR hub seeking
 * - Terminates when all frontiers exhausted
 *
 * **Use in Experiments**:
 * - If MI ranking correlation is higher with degree-prioritised than random,
 *   the degree heuristic is effective
 * - If path diversity is higher with degree-prioritised than random,
 *   hub avoidance contributes to diversity
 *
 * @template T - Type of node data returned by expander
 */
export class RandomPriorityExpansion<T> {
  private readonly frontiers: FrontierState[] = [];
  private readonly paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }> = [];
  private readonly sampledEdges = new Set<string>();
  private readonly rng: SeededRandom;
  private stats: RandomPriorityStats;

  /**
   * Create a new random-priority expansion.
   *
   * @param expander - Graph expander providing neighbour access
   * @param seeds - Array of seed node IDs (N >= 1)
   * @param seed - Random seed for reproducibility (default: 42)
   * @throws Error if no seeds provided
   */
  constructor(
    private readonly expander: GraphExpander<T>,
    private readonly seeds: readonly string[],
    seed = 42
  ) {
    if (seeds.length === 0) {
      throw new Error('At least one seed node is required');
    }

    this.rng = new SeededRandom(seed);

    // Initialize N frontiers, one per seed
    for (let i = 0; i < seeds.length; i++) {
      const seedNode = seeds[i];
      this.frontiers.push({
        index: i,
        frontier: [seedNode],
        visited: new Set([seedNode]),
        parents: new Map(),
      });
    }

    this.stats = {
      nodesExpanded: 0,
      edgesTraversed: 0,
      iterations: 0,
      degreeDistribution: new Map(),
    };
  }

  /**
   * Run the expansion to completion.
   *
   * Terminates when all frontiers are exhausted (no unexpanded nodes remain).
   *
   * @returns Expansion results including paths and sampled subgraph
   */
  async run(): Promise<RandomPriorityResult> {
    // Core loop: randomly select frontier, randomly select node within frontier
    while (this.hasNonEmptyFrontier()) {
      this.stats.iterations++;

      // Randomly select a non-empty frontier
      const activeIndex = this.selectRandomFrontier();
      if (activeIndex === -1) break;

      const activeState = this.frontiers[activeIndex];

      // Randomly select and remove a node from the frontier
      const nodeIndex = this.rng.nextInt(activeState.frontier.length);
      const node = activeState.frontier[nodeIndex];
      activeState.frontier.splice(nodeIndex, 1);

      this.stats.nodesExpanded++;
      this.recordDegree(this.expander.getDegree(node));

      // Expand this node's neighbours
      const neighbors = await this.expander.getNeighbors(node);

      for (const { targetId, relationshipType } of neighbors) {
        // Skip if already visited by this frontier
        if (activeState.visited.has(targetId)) continue;

        this.stats.edgesTraversed++;

        // Record edge in output
        this.expander.addEdge(node, targetId, relationshipType);
        const edgeKey = `${node}->${targetId}`;
        this.sampledEdges.add(edgeKey);

        // Mark as visited and set parent for this frontier
        activeState.visited.add(targetId);
        activeState.parents.set(targetId, { parent: node, edge: relationshipType });

        // Add to frontier (will be randomly selected later)
        activeState.frontier.push(targetId);

        // Check intersection with ALL other frontiers
        for (let other = 0; other < this.frontiers.length; other++) {
          if (other !== activeIndex && this.frontiers[other].visited.has(targetId)) {
            const path = this.reconstructPath(activeState, this.frontiers[other], targetId);
            if (path && !this.pathExists(activeIndex, other, path)) {
              this.paths.push({
                fromSeed: activeIndex,
                toSeed: other,
                nodes: path,
              });
            }
          }
        }
      }
    }

    // Compute union of all visited sets
    const sampledNodes = new Set<string>();
    const visitedPerFrontier: Array<Set<string>> = [];
    for (const state of this.frontiers) {
      for (const node of state.visited) {
        sampledNodes.add(node);
      }
      visitedPerFrontier.push(new Set(state.visited));
    }

    return {
      paths: this.paths,
      sampledNodes,
      sampledEdges: this.sampledEdges,
      visitedPerFrontier,
      stats: this.stats,
    };
  }

  /**
   * Check if any frontier has unexpanded nodes.
   * @internal
   */
  private hasNonEmptyFrontier(): boolean {
    return this.frontiers.some((state) => state.frontier.length > 0);
  }

  /**
   * Randomly select a non-empty frontier.
   * Returns -1 if all frontiers are empty.
   * @internal
   */
  private selectRandomFrontier(): number {
    const nonEmpty = this.frontiers
      .map((state, index) => ({ index, size: state.frontier.length }))
      .filter((f) => f.size > 0);

    if (nonEmpty.length === 0) return -1;

    const selected = nonEmpty[this.rng.nextInt(nonEmpty.length)];
    return selected.index;
  }

  /**
   * Reconstruct path from meeting point between two frontiers.
   * @internal
   */
  private reconstructPath(
    stateA: FrontierState,
    stateB: FrontierState,
    meetingNode: string
  ): string[] | null {
    const pathFromA: string[] = [];
    const pathFromB: string[] = [];

    // Trace back from meeting point to seed A
    let current: string | undefined = meetingNode;
    while (current !== undefined) {
      pathFromA.unshift(current);
      const parent = stateA.parents.get(current);
      current = parent?.parent;
    }

    // Trace back from meeting point to seed B (excluding meeting node)
    current = meetingNode;
    let parentInfo = stateB.parents.get(current);
    while (parentInfo) {
      pathFromB.push(parentInfo.parent);
      parentInfo = stateB.parents.get(parentInfo.parent);
    }

    // Validate path connects seeds
    const seedA = this.seeds[stateA.index];
    const seedB = this.seeds[stateB.index];

    if (pathFromA[0] !== seedA) return null;
    if (pathFromB.length > 0 && pathFromB[pathFromB.length - 1] !== seedB) {
      if (meetingNode !== seedB) return null;
    }

    return [...pathFromA, ...pathFromB];
  }

  /**
   * Check if an equivalent path already exists.
   * @internal
   */
  private pathExists(fromSeed: number, toSeed: number, nodes: string[]): boolean {
    return this.paths.some(
      (p) =>
        ((p.fromSeed === fromSeed && p.toSeed === toSeed) ||
          (p.fromSeed === toSeed && p.toSeed === fromSeed)) &&
        p.nodes.length === nodes.length &&
        (p.nodes.every((n, i) => n === nodes[i]) ||
          p.nodes.every((n, i) => n === nodes[nodes.length - 1 - i]))
    );
  }

  /**
   * Record degree in distribution histogram.
   * @internal
   */
  private recordDegree(degree: number): void {
    const bucket = this.getDegreeBucket(degree);
    const count = this.stats.degreeDistribution.get(bucket) ?? 0;
    this.stats.degreeDistribution.set(bucket, count + 1);
  }

  /**
   * Get histogram bucket for a degree value.
   * @internal
   */
  private getDegreeBucket(degree: number): string {
    if (degree <= 5) return '1-5';
    if (degree <= 10) return '6-10';
    if (degree <= 50) return '11-50';
    if (degree <= 100) return '51-100';
    if (degree <= 500) return '101-500';
    if (degree <= 1000) return '501-1000';
    return '1000+';
  }
}
