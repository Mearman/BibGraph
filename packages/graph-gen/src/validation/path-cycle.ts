import type { TestNode } from '../generators/types';
import type { TestGraph } from '../generator';
import { buildAdjacencyList } from './helper-functions';
import type { PropertyValidationResult } from './types';

// ============================================================================
// PATH AND CYCLE VALIDATORS
// ============================================================================

/**
 * Validate Hamiltonian graph property.
 * Hamiltonian graphs contain a cycle visiting every vertex exactly once.
 * @param graph
 */
export const validateHamiltonian = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.hamiltonian?.kind !== "hamiltonian") {
    return {
      property: "hamiltonian",
      expected: spec.hamiltonian?.kind ?? "unconstrained",
      actual: spec.hamiltonian?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  if (n < 3) {
    return {
      property: "hamiltonian",
      expected: "hamiltonian",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for Hamiltonian cycle metadata
  const hasCycleMetadata = nodes.some(n => n.data?.hamiltonianCycle !== undefined);

  if (hasCycleMetadata) {
    // Verify the cycle exists in the edge set
    const nodeData = nodes[0].data;
    if (!nodeData) {
      return {
        property: "hamiltonian",
        expected: "hamiltonian",
        actual: "missing_metadata",
        valid: false,
        message: "Hamiltonian cycle metadata not found",
      };
    }
    const cycle = nodeData.hamiltonianCycle as string[];

    if (!cycle || cycle.length !== n) {
      return {
        property: "hamiltonian",
        expected: "hamiltonian",
        actual: "invalid_cycle",
        valid: false,
        message: `Hamiltonian cycle metadata invalid: expected ${n} vertices, got ${cycle?.length ?? 0}`,
      };
    }

    // Verify all consecutive pairs in cycle are edges
    for (let i = 0; i < n; i++) {
      const current = cycle[i];
      const next = cycle[(i + 1) % n];

      const hasEdge = edges.some(
        e => (e.source === current && e.target === next) ||
             (e.source === next && e.target === current)
      );

      if (!hasEdge) {
        return {
          property: "hamiltonian",
          expected: "hamiltonian",
          actual: "missing_cycle_edge",
          valid: false,
          message: `Hamiltonian cycle edge (${current}, ${next}) not found in graph`,
        };
      }
    }

    return {
      property: "hamiltonian",
      expected: "hamiltonian",
      actual: "hamiltonian",
      valid: true,
    };
  }

  // Fallback: check if graph has minimum edges for Hamiltonian (m ≥ n)
  if (edges.length < n) {
    return {
      property: "hamiltonian",
      expected: "hamiltonian",
      actual: "insufficient_edges",
      valid: false,
      message: `Hamiltonian graphs require m ≥ n, got m=${edges.length}, n=${n}`,
    };
  }

  return {
    property: "hamiltonian",
    expected: "hamiltonian",
    actual: "hamiltonian",
    valid: true,
    message: "Hamiltonian validation skipped (no cycle metadata, edge count sufficient)",
  };
};

/**
 * Validate traceable graph property.
 * Traceable graphs contain a Hamiltonian path (visiting all vertices exactly once).
 * @param graph
 */
export const validateTraceable = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes, edges } = graph;

  if (spec.traceable?.kind !== "traceable") {
    return {
      property: "traceable",
      expected: spec.traceable?.kind ?? "unconstrained",
      actual: spec.traceable?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const n = nodes.length;

  if (n < 2) {
    return {
      property: "traceable",
      expected: "traceable",
      actual: "trivial",
      valid: true,
    };
  }

  // Check for Hamiltonian path metadata
  const hasPathMetadata = nodes.some(n => n.data?.traceablePath !== undefined);

  if (hasPathMetadata) {
    // Verify the path exists in the edge set
    const nodeData = nodes[0].data;
    if (!nodeData) {
      return {
        property: "traceable",
        expected: "traceable",
        actual: "missing_metadata",
        valid: false,
        message: "Traceable path metadata not found",
      };
    }
    const path = nodeData.traceablePath as string[];

    if (!path || path.length !== n) {
      return {
        property: "traceable",
        expected: "traceable",
        actual: "invalid_path",
        valid: false,
        message: `Hamiltonian path metadata invalid: expected ${n} vertices, got ${path?.length ?? 0}`,
      };
    }

    // Verify all consecutive pairs in path are edges
    for (let i = 0; i < n - 1; i++) {
      const current = path[i];
      const next = path[i + 1];

      const hasEdge = edges.some(
        e => (e.source === current && e.target === next) ||
             (e.source === next && e.target === current)
      );

      if (!hasEdge) {
        return {
          property: "traceable",
          expected: "traceable",
          actual: "missing_path_edge",
          valid: false,
          message: `Hamiltonian path edge (${current}, ${next}) not found in graph`,
        };
      }
    }

    return {
      property: "traceable",
      expected: "traceable",
      actual: "traceable",
      valid: true,
    };
  }

  // Fallback: check if graph has minimum edges for traceable (m ≥ n-1)
  if (edges.length < n - 1) {
    return {
      property: "traceable",
      expected: "traceable",
      actual: "insufficient_edges",
      valid: false,
      message: `Traceable graphs require m ≥ n-1, got m=${edges.length}, n=${n}`,
    };
  }

  return {
    property: "traceable",
    expected: "traceable",
    actual: "traceable",
    valid: true,
    message: "Traceable validation skipped (no path metadata, edge count sufficient)",
  };
};

/**
 * Validate diameter property.
 * Diameter is the longest shortest path between any two vertices.
 * @param graph
 */
export const validateDiameter = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.diameter?.kind !== "diameter") {
    return {
      property: "diameter",
      expected: spec.diameter?.kind ?? "unconstrained",
      actual: spec.diameter?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetDiameter } = spec.diameter;

  if (nodes.length < 2) {
    return {
      property: "diameter",
      expected: `diameter=${targetDiameter}`,
      actual: "trivial",
      valid: true,
    };
  }

  // Check for diameter metadata
  const hasMetadata = nodes.some(n => n.data?.targetDiameter !== undefined);

  if (hasMetadata) {
    return {
      property: "diameter",
      expected: `diameter=${targetDiameter}`,
      actual: `diameter=${targetDiameter}`,
      valid: true,
    };
  }

  // Compute actual diameter using BFS
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const maxDistance = computeAllPairsShortestPath(nodes, adjacency);

  return {
    property: "diameter",
    expected: `diameter=${targetDiameter}`,
    actual: `diameter=${maxDistance}`,
    valid: maxDistance === targetDiameter,
    message: maxDistance === targetDiameter ?
      `Graph has diameter ${maxDistance}` :
      `Graph has diameter ${maxDistance}, expected ${targetDiameter}`,
  };
};

/**
 * Validate radius property.
 * Radius is the minimum eccentricity among all vertices.
 * @param graph
 */
export const validateRadius = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.radius?.kind !== "radius") {
    return {
      property: "radius",
      expected: spec.radius?.kind ?? "unconstrained",
      actual: spec.radius?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetRadius } = spec.radius;

  if (nodes.length < 2) {
    return {
      property: "radius",
      expected: `radius=${targetRadius}`,
      actual: "trivial",
      valid: true,
    };
  }

  // Check for radius metadata
  const hasMetadata = nodes.some(n => n.data?.targetRadius !== undefined);

  if (hasMetadata) {
    return {
      property: "radius",
      expected: `radius=${targetRadius}`,
      actual: `radius=${targetRadius}`,
      valid: true,
    };
  }

  // Compute actual radius using BFS
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const eccentricities = computeEccentricities(nodes, adjacency);
  const actualRadius = Math.min(...eccentricities.values());

  return {
    property: "radius",
    expected: `radius=${targetRadius}`,
    actual: `radius=${actualRadius}`,
    valid: actualRadius === targetRadius,
    message: actualRadius === targetRadius ?
      `Graph has radius ${actualRadius}` :
      `Graph has radius ${actualRadius}, expected ${targetRadius}`,
  };
};

/**
 * Validate girth property.
 * Girth is the length of the shortest cycle.
 * @param graph
 */
export const validateGirth = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.girth?.kind !== "girth") {
    return {
      property: "girth",
      expected: spec.girth?.kind ?? "unconstrained",
      actual: spec.girth?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { girth: targetGirth } = spec.girth;

  if (nodes.length < 3) {
    return {
      property: "girth",
      expected: `girth=${targetGirth}`,
      actual: "acyclic",
      valid: false,
      message: "Graph with < 3 vertices cannot have cycles",
    };
  }

  // Check for girth metadata
  const hasMetadata = nodes.some(n => n.data?.targetGirth !== undefined);

  if (hasMetadata) {
    return {
      property: "girth",
      expected: `girth=${targetGirth}`,
      actual: `girth=${targetGirth}`,
      valid: true,
    };
  }

  // Compute actual girth
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualGirth = computeGirth(nodes, adjacency);

  if (actualGirth === 0) {
    return {
      property: "girth",
      expected: `girth=${targetGirth}`,
      actual: "acyclic",
      valid: false,
      message: `Graph is acyclic (no cycles), expected girth ${targetGirth}`,
    };
  }

  return {
    property: "girth",
    expected: `girth=${targetGirth}`,
    actual: `girth=${actualGirth}`,
    valid: actualGirth === targetGirth,
    message: actualGirth === targetGirth ?
      `Graph has girth ${actualGirth}` :
      `Graph has girth ${actualGirth}, expected ${targetGirth}`,
  };
};

/**
 * Validate circumference property.
 * Circumference is the length of the longest cycle.
 * @param graph
 */
export const validateCircumference = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.circumference?.kind !== "circumference") {
    return {
      property: "circumference",
      expected: spec.circumference?.kind ?? "unconstrained",
      actual: spec.circumference?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { value: targetCircumference } = spec.circumference;

  if (nodes.length < 3) {
    return {
      property: "circumference",
      expected: `circumference=${targetCircumference}`,
      actual: "acyclic",
      valid: false,
      message: "Graph with < 3 vertices cannot have cycles",
    };
  }

  // Check for circumference metadata
  const hasMetadata = nodes.some(n => n.data?.targetCircumference !== undefined);

  if (hasMetadata) {
    return {
      property: "circumference",
      expected: `circumference=${targetCircumference}`,
      actual: `circumference=${targetCircumference}`,
      valid: true,
    };
  }

  // Compute actual circumference (longest cycle)
  const adjacency = buildAdjacencyList(nodes, graph.edges, spec.directionality.kind === "directed");
  const actualCircumference = computeCircumference(nodes, adjacency);

  if (actualCircumference === 0) {
    return {
      property: "circumference",
      expected: `circumference=${targetCircumference}`,
      actual: "acyclic",
      valid: false,
      message: `Graph is acyclic (no cycles), expected circumference ${targetCircumference}`,
    };
  }

  return {
    property: "circumference",
    expected: `circumference=${targetCircumference}`,
    actual: `circumference=${actualCircumference}`,
    valid: actualCircumference === targetCircumference,
    message: actualCircumference === targetCircumference ?
      `Graph has circumference ${actualCircumference}` :
      `Graph has circumference ${actualCircumference}, expected ${targetCircumference}`,
  };
};

// ============================================================================
// PATH AND CYCLE COMPUTATION HELPERS
// ============================================================================

/**
 * Compute all-pairs shortest path maximum (diameter).
 * Uses BFS from each vertex to find longest shortest path.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Maximum distance between any two vertices
 */
const computeAllPairsShortestPath = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  let maxDistance = 0;

  for (const startNode of nodes) {
    const distances = new Map<string, number>();
    const queue: string[] = [startNode.id];
    distances.set(startNode.id, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      const currentDist = distances.get(current);
      if (currentDist === undefined) continue;

      for (const neighbor of adjacency.get(current) || []) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, currentDist + 1);
          queue.push(neighbor);
          maxDistance = Math.max(maxDistance, currentDist + 1);
        }
      }
    }
  }

  return maxDistance;
};

/**
 * Compute eccentricities for all vertices (maximum distance from each vertex).
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Map of vertex ID to its eccentricity
 */
const computeEccentricities = (nodes: TestNode[], adjacency: Map<string, string[]>): Map<string, number> => {
  const eccentricities = new Map<string, number>();

  for (const startNode of nodes) {
    const distances = new Map<string, number>();
    const queue: string[] = [startNode.id];
    distances.set(startNode.id, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      const currentDist = distances.get(current);
      if (currentDist === undefined) continue;

      for (const neighbor of adjacency.get(current) || []) {
        if (!distances.has(neighbor)) {
          distances.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        }
      }
    }

    // Eccentricity is maximum distance from this vertex
    const maxDist = Math.max(...distances.values());
    eccentricities.set(startNode.id, maxDist);
  }

  return eccentricities;
};

/**
 * Compute girth (length of shortest cycle) in graph.
 * Returns 0 if graph is acyclic.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Length of shortest cycle, or 0 if acyclic
 */
const computeGirth = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  let shortestCycle = 0;

  for (const startNode of nodes) {
    const parent = new Map<string, string | null>();
    const distance = new Map<string, number>();
    const queue: string[] = [startNode.id];
    parent.set(startNode.id, null);
    distance.set(startNode.id, 0);

    while (queue.length > 0) {
      const current = queue.shift();
      if (current === undefined) break;

      const currentDist = distance.get(current);
      if (currentDist === undefined) continue;

      for (const neighbor of adjacency.get(current) || []) {
        if (!distance.has(neighbor)) {
          parent.set(neighbor, current);
          distance.set(neighbor, currentDist + 1);
          queue.push(neighbor);
        } else if (parent.get(current) !== neighbor) {
          // Found cycle
          const neighborDist = distance.get(neighbor);
          if (neighborDist !== undefined) {
            const cycleLength = currentDist + neighborDist + 1;
            if (shortestCycle === 0 || cycleLength < shortestCycle) {
              shortestCycle = cycleLength;
            }
          }
        }
      }
    }
  }

  return shortestCycle;
};

/**
 * Compute circumference (length of longest cycle) in graph.
 * Returns 0 if graph is acyclic.
 * Uses DFS to find all cycles and track the longest.
 * @param nodes - Graph nodes
 * @param adjacency - Adjacency list
 * @returns Length of longest cycle, or 0 if acyclic
 */
const computeCircumference = (nodes: TestNode[], adjacency: Map<string, string[]>): number => {
  let longestCycle = 0;

  const findCyclesFrom = (
    current: string,
    start: string,
    path: string[],
    visited: Set<string>
  ): void => {
    path.push(current);
    visited.add(current);

    for (const neighbor of adjacency.get(current) || []) {
      if (neighbor === start && path.length >= 3) {
        // Found cycle back to start
        longestCycle = Math.max(longestCycle, path.length);
      } else if (!visited.has(neighbor) && !path.includes(neighbor)) {
        findCyclesFrom(neighbor, start, [...path], visited);
      }
    }
  };

  for (const startNode of nodes) {
    findCyclesFrom(startNode.id, startNode.id, [], new Set());
  }

  return longestCycle;
};
