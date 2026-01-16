import type { GraphExpander } from '../interfaces/graph-expander';

/**
 * Result from standard BFS expansion - matches DegreePrioritisedExpansionResult.
 */
export interface StandardBfsResult {
  /** Discovered paths (only populated when N >= 2 seeds) */
  paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }>;

  /** Union of all nodes visited by all frontiers */
  sampledNodes: Set<string>;

  /** Set of edges visited during expansion */
  sampledEdges: Set<string>;

  /** Per-frontier visited sets (for diagnostics) */
  visitedPerFrontier: Array<Set<string>>;

  /** Statistics about the expansion */
  stats: BfsExpansionStats;
}

/**
 * Statistics collected during BFS expansion.
 */
export interface BfsExpansionStats {
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
 * State for a single BFS frontier.
 * @internal
 */
interface FrontierState {
  /** Index of this frontier (corresponds to seed index) */
  index: number;

  /** Queue of nodes to expand (FIFO) */
  queue: string[];

  /** Set of visited nodes */
  visited: Set<string>;

  /** Parent pointers for path reconstruction */
  parents: Map<string, { parent: string; edge: string }>;
}

/**
 * Standard Bidirectional BFS Expansion
 *
 * Baseline algorithm for comparison with degree-prioritised expansion.
 * Expands nodes in breadth-first order (FIFO queue) without any prioritisation.
 *
 * This converges through high-degree hub nodes because BFS explores all nodes
 * at distance k before k+1, regardless of degree. Hubs are often encountered
 * early and their many neighbors flood the queue.
 *
 * **Key Properties**:
 * - FIFO expansion order (level-by-level)
 * - No degree-based prioritisation
 * - Converges through hubs (hub-biased sampling)
 * - Terminates when all frontiers exhausted
 *
 * @template T - Type of node data returned by expander
 */
export class StandardBfsExpansion<T> {
  private readonly frontiers: FrontierState[] = [];
  private readonly paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }> = [];
  private readonly sampledEdges = new Set<string>();
  private stats: BfsExpansionStats;

  /**
   * Create a new standard BFS expansion.
   *
   * @param expander - Graph expander providing neighbour access
   * @param seeds - Array of seed node IDs (N >= 1)
   * @throws Error if no seeds provided
   */
  constructor(
    private readonly expander: GraphExpander<T>,
    private readonly seeds: readonly string[]
  ) {
    if (seeds.length === 0) {
      throw new Error('At least one seed node is required');
    }

    // Initialize N frontiers, one per seed
    for (let i = 0; i < seeds.length; i++) {
      const seed = seeds[i];
      this.frontiers.push({
        index: i,
        queue: [seed],
        visited: new Set([seed]),
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
  async run(): Promise<StandardBfsResult> {
    // Core loop: round-robin across frontiers, FIFO within each
    while (this.hasNonEmptyFrontier()) {
      this.stats.iterations++;

      // Select next frontier with items (round-robin)
      const activeIndex = this.selectNextFrontier();
      if (activeIndex === -1) break;

      const activeState = this.frontiers[activeIndex];
      const node = activeState.queue.shift();
      if (!node) continue;

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

        // Add to queue (FIFO - end of queue)
        activeState.queue.push(targetId);

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
    return this.frontiers.some((state) => state.queue.length > 0);
  }

  /**
   * Select the next frontier with items (round-robin).
   * Returns -1 if all frontiers are empty.
   * @internal
   */
  private selectNextFrontier(): number {
    // Simple: return first non-empty frontier
    for (let i = 0; i < this.frontiers.length; i++) {
      if (this.frontiers[i].queue.length > 0) {
        return i;
      }
    }
    return -1;
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
