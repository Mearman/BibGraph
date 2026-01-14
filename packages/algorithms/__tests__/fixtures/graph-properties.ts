/**
 * Defines all possible graph characteristics that can be used to classify graphs.
 * These properties can be combined to generate comprehensive test fixtures.
 */

/**
 * Enum-based graph property types for explicit classification.
 */

/** Edge direction property */
export type Direction = 'directed' | 'undirected';

/** Edge weighting property */
export type Weighting = 'weighted' | 'unweighted';

/** Cycle presence property */
export type Cyclicity = 'acyclic' | 'cyclic';

/** Connectivity property */
export type Connectivity = 'connected' | 'disconnected';

/** Node/edge type diversity property */
export type Heterogeneity = 'heterogeneous' | 'homogeneous';

/** Multiple edges between same vertices property */
export type EdgeMultiplicity = 'multigraph' | 'simple';

/** Self-loop permission property */
export type SelfLoopAllowance = 'allow-self-loops' | 'no-self-loops';

/**
 * Target edge count classification for graph generation.
 * Density is derived from this (actual edges / max possible edges).
 */
export type EdgeCountTarget =
  | 'minimal' // 1-5% of max edges (trees, real-world networks)
  | 'sparse' // 10-20% of max edges (moderately connected)
  | 'moderate' // 30-50% of max edges (middle ground)
  | 'dense' // 60-80% of max edges (highly connected)
  | 'complete'; // 95-100% of max edges (nearly/fully complete)

/**
 * Core graph properties that define graph structure and behavior.
 * All properties use explicit enums instead of booleans for clarity and extensibility.
 */
export interface GraphProperties {
  /** Edge direction: directed (A→B ≠ B→A) or undirected (A-B = B-A) */
  direction: Direction;

  /** Edge weighting: weighted (edges have numerical costs) or unweighted */
  weighting: Weighting;

  /** Cycle presence: acyclic (no cycles) or cyclic (contains cycles) */
  cyclicity: Cyclicity;

  /** Connectivity: connected (path exists between all pairs) or disconnected */
  connectivity: Connectivity;

  /** Type diversity: heterogeneous (multiple types) or homogeneous (single type) */
  heterogeneity: Heterogeneity;

  /** Edge multiplicity: multigraph (parallel edges allowed) or simple (one edge per pair) */
  edgeMultiplicity: EdgeMultiplicity;

  /** Self-loop allowance: allow-self-loops or no-self-loops */
  selfLoopAllowance: SelfLoopAllowance;

  /** Target edge count for generation (density is derived from this) */
  edgeCountTarget: EdgeCountTarget;
}

/**
 * Derived graph types based on property combinations.
 * These represent common named graph structures.
 */
export type DerivedGraphType =
  | 'dag' // Directed Acyclic Graph
  | 'tree' // Connected acyclic graph
  | 'forest' // Disconnected acyclic graph (multiple trees)
  | 'complete' // All vertices connected to all others
  | 'star' // One central hub connected to all leaves
  | 'chain' // Linear path
  | 'cycle' // Circular path
  | 'bipartite' // Two disjoint vertex sets
  | 'general'; // No special structure

/**
 * Validation constraints for property combinations.
 * Some property combinations are logically invalid or redundant.
 */
export const PROPERTY_CONSTRAINTS = {
  /** Tree requires undirected, acyclic, and connected */
  tree: (props: GraphProperties) =>
    props.direction === 'undirected' &&
    props.cyclicity === 'acyclic' &&
    props.connectivity === 'connected',

  /** DAG requires directed and acyclic */
  dag: (props: GraphProperties) =>
    props.direction === 'directed' && props.cyclicity === 'acyclic',

  /** Forest is disconnected trees (undirected, acyclic, disconnected) */
  forest: (props: GraphProperties) =>
    props.direction === 'undirected' &&
    props.cyclicity === 'acyclic' &&
    props.connectivity === 'disconnected',

  /** Cycle requires cyclic and connected */
  cycle: (props: GraphProperties) =>
    props.cyclicity === 'cyclic' && props.connectivity === 'connected',

  /** Complete graph must have complete edge count and be connected */
  complete: (props: GraphProperties) =>
    props.edgeCountTarget === 'complete' && props.connectivity === 'connected',

  /** Star graph implies minimal/sparse edges and connected */
  star: (props: GraphProperties) =>
    (props.edgeCountTarget === 'minimal' || props.edgeCountTarget === 'sparse') &&
    props.connectivity === 'connected',
} as const;

/**
 * Check if a property combination is logically valid.
 *
 * Invalid combinations:
 * - Dense/complete + disconnected = impossible (high edge counts require connectivity)
 * - Acyclic + self-loops = contradiction (self-loops are cycles)
 * - Acyclic + multigraph (undirected) = problematic (parallel edges detected as cycles)
 * - Acyclic + connected + high edge count = impossible (trees/DAGs have minimal edges)
 */
export function isValidPropertyCombination(props: GraphProperties): boolean {
  // High edge count graphs cannot be disconnected
  if (
    (props.edgeCountTarget === 'dense' || props.edgeCountTarget === 'complete') &&
    props.connectivity === 'disconnected'
  ) {
    return false;
  }

  // Acyclic graphs cannot have self-loops (self-loops are cycles by definition)
  if (props.cyclicity === 'acyclic' && props.selfLoopAllowance === 'allow-self-loops') {
    return false;
  }

  // Acyclic undirected multigraphs are problematic:
  // Parallel edges between same nodes are detected as cycles in undirected graphs
  if (
    props.cyclicity === 'acyclic' &&
    props.direction === 'undirected' &&
    props.edgeMultiplicity === 'multigraph'
  ) {
    return false;
  }

  // Connected graphs require minimal edges for connectivity
  // Minimal edge count (<9%) requires fewer than n-1 edges = impossible to maintain connectivity
  if (props.connectivity === 'connected' && props.edgeCountTarget === 'minimal') {
    return false;
  }

  // Acyclic + connected + high edge count is impossible:
  // Connected acyclic graphs (trees/DAGs) require ≥n-1 edges but can't have too many (would create cycles)
  if (props.cyclicity === 'acyclic' && props.connectivity === 'connected') {
    // Dense/complete edge counts (>58%) create cycles in acyclic graphs
    if (props.edgeCountTarget === 'dense' || props.edgeCountTarget === 'complete') {
      return false;
    }
  }

  return true;
}

/**
 * Infer derived graph type from properties.
 */
export function inferDerivedType(props: GraphProperties): DerivedGraphType {
  if (PROPERTY_CONSTRAINTS.tree(props)) return 'tree';
  if (PROPERTY_CONSTRAINTS.dag(props)) return 'dag';
  if (PROPERTY_CONSTRAINTS.forest(props)) return 'forest';
  if (PROPERTY_CONSTRAINTS.complete(props)) return 'complete';
  if (PROPERTY_CONSTRAINTS.star(props)) return 'star';
  if (PROPERTY_CONSTRAINTS.cycle(props)) return 'cycle';

  return 'general';
}

/**
 * Generate all valid permutations of graph properties.
 *
 * @param constraints - Optional constraints to filter permutations
 * @returns Array of all valid property combinations
 */
export function generatePropertyPermutations(
  constraints?: Partial<GraphProperties>
): GraphProperties[] {
  const permutations: GraphProperties[] = [];

  // Define all possible values for each property
  const directions: Direction[] = ['directed', 'undirected'];
  const weightings: Weighting[] = ['weighted', 'unweighted'];
  const cyclicities: Cyclicity[] = ['acyclic', 'cyclic'];
  const connectivities: Connectivity[] = ['connected', 'disconnected'];
  const heterogeneities: Heterogeneity[] = ['heterogeneous', 'homogeneous'];
  const edgeMultiplicities: EdgeMultiplicity[] = ['multigraph', 'simple'];
  const selfLoopAllowances: SelfLoopAllowance[] = ['allow-self-loops', 'no-self-loops'];
  const edgeCountTargets: EdgeCountTarget[] = ['minimal', 'sparse', 'moderate', 'dense', 'complete'];

  // Generate all combinations: 2^7 × 5 = 640 combinations
  for (const direction of directions) {
    for (const weighting of weightings) {
      for (const cyclicity of cyclicities) {
        for (const connectivity of connectivities) {
          for (const heterogeneity of heterogeneities) {
            for (const edgeMultiplicity of edgeMultiplicities) {
              for (const selfLoopAllowance of selfLoopAllowances) {
                for (const edgeCountTarget of edgeCountTargets) {
                  const props: GraphProperties = {
                    direction,
                    weighting,
                    cyclicity,
                    connectivity,
                    heterogeneity,
                    edgeMultiplicity,
                    selfLoopAllowance,
                    edgeCountTarget,
                  };

                  // Skip if doesn't match constraints
                  if (constraints) {
                    const matches = Object.entries(constraints).every(
                      ([key, value]) => props[key as keyof GraphProperties] === value
                    );
                    if (!matches) continue;
                  }

                  // Skip invalid combinations
                  if (!isValidPropertyCombination(props)) continue;

                  permutations.push(props);
                }
              }
            }
          }
        }
      }
    }
  }

  return permutations;
}

/**
 * Get human-readable description of graph properties.
 */
export function describeProperties(props: GraphProperties): string {
  const parts: string[] = [];

  parts.push(props.direction);
  if (props.weighting === 'weighted') parts.push('weighted');
  if (props.cyclicity === 'acyclic') parts.push('acyclic');
  if (props.connectivity === 'connected') parts.push('connected');
  if (props.heterogeneity === 'heterogeneous') parts.push('heterogeneous');
  if (props.edgeMultiplicity === 'multigraph') parts.push('multigraph');
  if (props.selfLoopAllowance === 'allow-self-loops') parts.push('self-loops');
  parts.push(props.edgeCountTarget);

  const derivedType = inferDerivedType(props);
  if (derivedType !== 'general') {
    parts.push(`[${derivedType}]`);
  }

  return parts.join(', ');
}

/**
 * Create a GraphProperties object with default values.
 * Useful for tests - provide only the properties you care about.
 */
export function createGraphProperties(overrides?: Partial<GraphProperties>): GraphProperties {
  return {
    direction: 'directed',
    weighting: 'unweighted',
    cyclicity: 'cyclic',
    connectivity: 'connected',
    heterogeneity: 'homogeneous',
    edgeMultiplicity: 'simple',
    selfLoopAllowance: 'no-self-loops',
    edgeCountTarget: 'sparse',
    ...overrides,
  };
}
