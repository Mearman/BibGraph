import { GraphExpander } from '../interfaces/graph-expander';
import { PriorityQueue } from './priority-queue';

/**
 * Configuration options for bidirectional BFS.
 */
export interface BidirectionalBFSOptions {
  /** Target number of paths to find */
  targetPaths: number;

  /** Maximum BFS iterations before stopping */
  maxIterations: number;

  /** Minimum iterations to continue after finding target paths (for path diversity) */
  minIterations?: number;
}

/**
 * Result from bidirectional BFS search.
 */
export interface BidirectionalBFSResult {
  /** Array of paths (each path is array of node IDs from seedA to seedB) */
  paths: string[][];

  /** Nodes visited from seedA */
  visitedA: Set<string>;

  /** Nodes visited from seedB */
  visitedB: Set<string>;

  /** Number of iterations performed */
  iterations: number;
}

/**
 * State for one direction of the bidirectional search.
 * @internal
 */
interface BFSState {
  visited: Set<string>;
  frontier: PriorityQueue<string>;
  parents: Map<string, { parent: string; edge: string }>;
}

/**
 * Generic bidirectional breadth-first search with degree-based node prioritization.
 *
 * Searches for paths between two seed nodes by expanding frontiers from both directions.
 * Uses priority queue to process low-degree nodes first, naturally prioritizing specific
 * connections over generic ones.
 *
 * **Algorithm**: Degree-based best-first search
 * - Maintains two frontiers (from seedA and seedB)
 * - Processes nodes in order of degree (low degree = high priority)
 * - Detects when frontiers meet to find paths
 * - Continues for minimum iterations after finding target paths (for diversity)
 *
 * **Time Complexity**: O(E log V) where E = edges explored, V = vertices
 * **Space Complexity**: O(V) for visited sets and frontiers
 *
 * @template T - Type of node data returned by expander
 * @example
 * ```typescript
 * const bfs = new BidirectionalBFS(
 *   expander,
 *   'nodeA',
 *   'nodeB',
 *   { targetPaths: 5, maxIterations: 10, minIterations: 2 }
 * );
 *
 * const result = await bfs.search();
 * console.log(`Found ${result.paths.length} paths in ${result.iterations} iterations`);
 * ```
 */
export class BidirectionalBFS<T> {
  private foundPaths: string[][] = [];
  private stateA: BFSState;
  private stateB: BFSState;

  constructor(
    private readonly expander: GraphExpander<T>,
    private readonly seedA: string,
    private readonly seedB: string,
    private readonly options: BidirectionalBFSOptions
  ) {
    // Initialize frontier A
    const frontierA = new PriorityQueue<string>();
    frontierA.push(seedA, 0); // Seed has priority 0

    this.stateA = {
      visited: new Set([seedA]),
      frontier: frontierA,
      parents: new Map(),
    };

    // Initialize frontier B
    const frontierB = new PriorityQueue<string>();
    frontierB.push(seedB, 0); // Seed has priority 0

    this.stateB = {
      visited: new Set([seedB]),
      frontier: frontierB,
      parents: new Map(),
    };
  }

  /**
   * Execute the bidirectional BFS search.
   *
   * @returns Search results including found paths and visited nodes
   */
  async search(): Promise<BidirectionalBFSResult> {
    // Handle trivial self-path case
    if (this.seedA === this.seedB) {
      return {
        paths: [[this.seedA]],
        visitedA: new Set([this.seedA]),
        visitedB: new Set([this.seedB]),
        iterations: 0,
      };
    }

    let iteration = 0;
    let pathFocusedPhase = false;
    let pathFocusedStartIteration = 0;

    const minIterations = this.options.minIterations ?? 2;

    while (
      (this.foundPaths.length < this.options.targetPaths ||
        (pathFocusedPhase && iteration - pathFocusedStartIteration < minIterations)) &&
      iteration < this.options.maxIterations &&
      (this.stateA.frontier.length > 0 || this.stateB.frontier.length > 0)
    ) {
      iteration++;

      // Expand frontier A
      if (this.stateA.frontier.length > 0) {
        await this.expandFrontier(this.stateA, 'A');
      }

      // Check for connections after processing frontier A
      let pathCountBefore = this.foundPaths.length;
      this.checkForConnections();

      // Enter path-focused phase if target reached
      if (this.foundPaths.length >= this.options.targetPaths && !pathFocusedPhase) {
        pathFocusedPhase = true;
        pathFocusedStartIteration = iteration;
      }

      // Add path nodes to frontiers in path-focused phase
      if (pathFocusedPhase) {
        this.addPathNodesToFrontiers(pathCountBefore);
      }

      // Expand frontier B
      if (this.stateB.frontier.length > 0) {
        await this.expandFrontier(this.stateB, 'B');
      }

      // Check for connections after processing frontier B
      pathCountBefore = this.foundPaths.length;
      this.checkForConnections();

      // Enter path-focused phase if target reached
      if (this.foundPaths.length >= this.options.targetPaths && !pathFocusedPhase) {
        pathFocusedPhase = true;
        pathFocusedStartIteration = iteration;
      }

      // Add path nodes to frontiers in path-focused phase
      if (pathFocusedPhase) {
        this.addPathNodesToFrontiers(pathCountBefore);
      }
    }

    return {
      paths: this.foundPaths,
      visitedA: this.stateA.visited,
      visitedB: this.stateB.visited,
      iterations: iteration,
    };
  }

  /**
   * Expand frontier by getting neighbors from expander and adding to priority queue.
   * @param state - BFS state to expand
   * @param _label - Direction label (unused, for debugging)
   * @internal
   */
  private async expandFrontier(state: BFSState, _label: string): Promise<void> {
    // Pop all nodes from priority queue for this iteration
    const nodesToProcess: string[] = [];
    while (state.frontier.length > 0) {
      const node = state.frontier.pop();
      if (node) nodesToProcess.push(node);
    }

    // Expand each node and collect new frontier nodes with priorities
    for (const nodeId of nodesToProcess) {
      const neighbors = await this.expander.getNeighbors(nodeId);

      for (const { targetId, relationshipType } of neighbors) {
        // Skip if already visited
        if (state.visited.has(targetId)) continue;

        // Add edge to output
        this.expander.addEdge(nodeId, targetId, relationshipType);

        // Mark as visited and set parent
        state.visited.add(targetId);
        state.parents.set(targetId, { parent: nodeId, edge: relationshipType });

        // Add to frontier with degree as priority
        const degree = this.expander.getDegree(targetId);
        state.frontier.push(targetId, degree);
      }
    }
  }

  /**
   * Check if frontiers have met (bidirectional search intersection).
   * @internal
   */
  private checkForConnections(): void {
    // Check if any node in frontier A is visited by B
    for (const nodeA of this.stateA.frontier) {
      if (this.stateB.visited.has(nodeA)) {
        const path = this.reconstructPath(nodeA, true);
        if (path.length > 0 && !this.pathExists(path)) {
          this.foundPaths.push(path);
        }
      }
    }

    // Check if any node in frontier B is visited by A
    for (const nodeB of this.stateB.frontier) {
      if (this.stateA.visited.has(nodeB)) {
        const path = this.reconstructPath(nodeB, false);
        if (path.length > 0 && !this.pathExists(path)) {
          this.foundPaths.push(path);
        }
      }
    }
  }

  /**
   * Reconstruct path from meeting point.
   * @param meetingNode - Node where the two searches met
   * @param _fromA - Whether path started from A (unused, for symmetry)
   * @internal
   */
  private reconstructPath(meetingNode: string, _fromA: boolean): string[] {
    const pathFromA: string[] = [];
    const pathFromB: string[] = [];

    // Reconstruct path from A to meeting point
    let current: string | undefined = meetingNode;
    while (current !== undefined) {
      pathFromA.unshift(current);
      const parent = this.stateA.parents.get(current);
      current = parent?.parent;
    }

    // Reconstruct path from B to meeting point
    current = meetingNode;
    while (current !== undefined) {
      const parent = this.stateB.parents.get(current);
      if (parent) {
        pathFromB.push(parent.parent);
        current = parent.parent;
      } else {
        break;
      }
    }

    // Combine paths (don't duplicate meeting node)
    return [...pathFromA, ...pathFromB];
  }

  /**
   * Check if path already exists in foundPaths.
   * @param path
   * @internal
   */
  private pathExists(path: string[]): boolean {
    return this.foundPaths.some(
      (existingPath) =>
        existingPath.length === path.length &&
        existingPath.every((node, index) => node === path[index])
    );
  }

  /**
   * Add nodes from newly discovered paths to frontiers for focused exploration.
   * @param pathCountBefore
   * @internal
   */
  private addPathNodesToFrontiers(pathCountBefore: number): void {
    if (this.foundPaths.length <= pathCountBefore) return;

    // Process all newly discovered paths
    for (let i = pathCountBefore; i < this.foundPaths.length; i++) {
      const path = this.foundPaths[i];

      for (const nodeId of path) {
        // Add to frontier A if not already visited
        if (!this.stateA.visited.has(nodeId)) {
          const degree = this.expander.getDegree(nodeId);
          this.stateA.frontier.push(nodeId, degree);
          this.stateA.visited.add(nodeId);
        }

        // Add to frontier B if not already visited
        if (!this.stateB.visited.has(nodeId)) {
          const degree = this.expander.getDegree(nodeId);
          this.stateB.frontier.push(nodeId, degree);
          this.stateB.visited.add(nodeId);
        }
      }
    }
  }
}
