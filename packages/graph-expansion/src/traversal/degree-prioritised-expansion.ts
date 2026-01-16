import { GraphExpander } from '../interfaces/graph-expander';
import { PriorityQueue } from './priority-queue';

/**
 * Result from degree-prioritised expansion.
 */
export interface DegreePrioritisedExpansionResult {
  /** Discovered paths (only populated when N ≥ 2 seeds) */
  paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }>;

  /** Union of all nodes visited by all frontiers */
  sampledNodes: Set<string>;

  /** Set of edges visited during expansion */
  sampledEdges: Set<string>;

  /** Per-frontier visited sets (for diagnostics) */
  visitedPerFrontier: Array<Set<string>>;

  /** Statistics about the expansion */
  stats: ExpansionStats;
}

/**
 * Statistics collected during expansion.
 */
export interface ExpansionStats {
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
 * State for a single expansion frontier.
 * @internal
 */
interface FrontierState {
  /** Index of this frontier (corresponds to seed index) */
  index: number;

  /** Priority queue of nodes to expand (priority = degree) */
  frontier: PriorityQueue<string>;

  /** Set of visited nodes */
  visited: Set<string>;

  /** Parent pointers for path reconstruction */
  parents: Map<string, { parent: string; edge: string }>;
}

/**
 * Degree-Prioritised Bidirectional Expansion
 *
 * A unified algorithm for representative graph sampling between N ≥ 1 seed nodes.
 * Uses node degree as priority (low degree = high priority) to explore peripheral
 * routes before hub-dominated paths.
 *
 * **Key Design Properties**:
 * 1. **Parameter-free termination**: No arbitrary limits on nodes, edges, or iterations.
 *    The sole termination condition is structural: all frontiers exhausted.
 * 2. **N-seed generalisation**: Single algorithm handles N=1 (ego-network), N=2
 *    (bidirectional), and N≥3 (multi-frontier) with identical code path.
 * 3. **Emergent behaviour**: Different behaviours for different N values emerge
 *    naturally from the same loop—no conditional branching based on seed count.
 * 4. **Degree prioritisation**: Always expands the globally lowest-degree node
 *    across all frontiers, naturally avoiding hub explosion.
 *
 * **Algorithm**:
 * ```
 * 1. Initialize N frontiers, one per seed
 * 2. While any frontier is non-empty:
 *    a. Select the frontier with the lowest-degree node at its front
 *    b. Pop that node and expand its neighbours
 *    c. For each new neighbour, check intersection with all other frontiers
 *    d. If intersection found, record path between the two seeds
 * 3. Return sampled subgraph (union of all visited nodes)
 * ```
 *
 * **Complexity**: O(E log V) where E = edges explored, V = vertices
 *
 * @template T - Type of node data returned by expander
 * @example
 * ```typescript
 * const expansion = new DegreePrioritisedExpansion(expander, ['seedA', 'seedB']);
 * const result = await expansion.run();
 * console.log(`Found ${result.paths.length} paths`);
 * console.log(`Sampled ${result.sampledNodes.size} nodes`);
 * ```
 */
export class DegreePrioritisedExpansion<T> {
  private readonly frontiers: FrontierState[] = [];
  private readonly paths: Array<{ fromSeed: number; toSeed: number; nodes: string[] }> = [];
  private readonly sampledEdges = new Set<string>();
  private stats: ExpansionStats;

  /**
   * Create a new degree-prioritised expansion.
   *
   * @param expander - Graph expander providing neighbour access
   * @param seeds - Array of seed node IDs (N ≥ 1)
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
      const frontier = new PriorityQueue<string>();
      const degree = expander.getDegree(seed);
      frontier.push(seed, degree);

      this.frontiers.push({
        index: i,
        frontier,
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
   * This is the ONLY termination condition—no arbitrary limits.
   *
   * @returns Expansion results including paths and sampled subgraph
   */
  async run(): Promise<DegreePrioritisedExpansionResult> {
    // Core loop: always expand globally lowest-degree node
    while (this.hasNonEmptyFrontier()) {
      this.stats.iterations++;

      // Select frontier with lowest-degree node at front
      const activeIndex = this.selectLowestDegreeFrontier();
      if (activeIndex === -1) break; // Safety check (should not happen)

      const activeState = this.frontiers[activeIndex];
      const node = activeState.frontier.pop();
      if (!node) continue; // Safety check

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

        // Add to frontier with degree as priority
        const degree = this.expander.getDegree(targetId);
        activeState.frontier.push(targetId, degree);

        // Check intersection with ALL other frontiers (N ≥ 2 only)
        // This loop naturally handles all N without branching:
        // - N=1: Loop iterates zero times (no other frontiers exist) → no paths
        // - N=2: Loop checks the one other frontier → bidirectional path detection
        // - N≥3: Loop checks all other frontiers → multi-seed path detection
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
   * Select the frontier with the lowest-degree node at its front.
   * Returns -1 if all frontiers are empty.
   * @internal
   */
  private selectLowestDegreeFrontier(): number {
    let minDegree = Infinity;
    let minIndex = -1;

    for (let i = 0; i < this.frontiers.length; i++) {
      const state = this.frontiers[i];
      if (state.frontier.length > 0) {
        // Peek at the front node's degree (priority queue stores by degree)
        const peekDegree = this.peekPriority(state.frontier);
        if (peekDegree < minDegree) {
          minDegree = peekDegree;
          minIndex = i;
        }
      }
    }

    return minIndex;
  }

  /**
   * Peek at the priority of the front item without removing it.
   * @internal
   */
  private peekPriority(queue: PriorityQueue<string>): number {
    // The priority queue is a min-heap, so the front item has minimum priority.
    // We need to access the heap internals for peek - for now use getDegree on first item.
    // This is safe because items are added with their degree as priority.
    for (const item of queue) {
      return this.expander.getDegree(item);
    }
    return Infinity;
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

    // Trace back from meeting point to seed B (excluding meeting node to avoid duplication)
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
      // Path from B should end at seed B, or be empty if meeting node is seed B
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
