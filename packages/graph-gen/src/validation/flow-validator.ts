import type { TestGraph, TestEdge } from '../graph-generator';
import type { PropertyValidationResult } from './types';

/**
 * Validate flow network properties.
 *
 * A flow network must satisfy:
 * 1. Directed graph with source and sink nodes
 * 2. Non-negative edge capacities (weights)
 * 3. Every node lies on some path from source to sink
 * 4. No edges enter the source
 * 5. No edges leave the sink
 *
 * @param graph - The graph to validate
 * @returns PropertyValidationResult with flow network validation
 */
export function validateFlowNetwork(graph: TestGraph): PropertyValidationResult {
  const errors: string[] = [];
  const warnings: string[] = [];

  const { spec, nodes, edges } = graph;

  // Only validate when spec requires flow_network
  if (spec.flowNetwork?.kind !== 'flow_network') {
    return {
      property: "flowNetwork",
      expected: spec.flowNetwork?.kind ?? "unconstrained",
      actual: spec.flowNetwork?.kind ?? "unconstrained",
      valid: true,
    };
  }

  const { source, sink } = spec.flowNetwork;

  // Check 1: Must be a directed graph
  if (spec.directionality.kind !== 'directed') {
    errors.push('Flow network must be directed');
  }

  // Check 2: Source and sink must exist in the graph
  const sourceNode = nodes.find(n => n.id === source);
  const sinkNode = nodes.find(n => n.id === sink);

  if (!sourceNode) {
    errors.push(`Source node '${source}' does not exist in the graph`);
  }

  if (!sinkNode) {
    errors.push(`Sink node '${sink}' does not exist in the graph`);
  }

  // Check 3: Source and sink must be different nodes
  if (source === sink) {
    errors.push('Source and sink must be different nodes');
  }

  // Check 4: Must be weighted (edge capacities)
  if (spec.weighting.kind !== 'weighted_numeric') {
    errors.push('Flow network must have weighted edges (capacities)');
  }

  // Check 5: All edges must have non-negative weights (capacities)
  const edgesWithoutCapacity: TestEdge[] = [];
  const edgesWithNegativeCapacity: TestEdge[] = [];

  for (const edge of edges) {
    if (edge.weight === undefined) {
      edgesWithoutCapacity.push(edge);
    } else if (edge.weight < 0) {
      edgesWithNegativeCapacity.push(edge);
    }
  }

  if (edgesWithoutCapacity.length > 0) {
    errors.push(
      `Flow network edges must have capacities (weights). ` +
      `Missing capacities on ${edgesWithoutCapacity.length} edge(s): ` +
      edgesWithoutCapacity.map(e => `${e.source}→${e.target}`).join(', ')
    );
  }

  if (edgesWithNegativeCapacity.length > 0) {
    errors.push(
      `Flow network capacities must be non-negative. ` +
      `Negative capacities on ${edgesWithNegativeCapacity.length} edge(s): ` +
      edgesWithNegativeCapacity.map(e => `${e.source}→${e.target} (${e.weight})`).join(', ')
    );
  }

  // Check 6: No edges should enter the source
  const edgesEnteringSource = edges.filter(e => e.target === source);
  if (edgesEnteringSource.length > 0) {
    warnings.push(
      `Flow network typically has no edges entering the source. ` +
      `Found ${edgesEnteringSource.length} edge(s) entering source: ` +
      edgesEnteringSource.map(e => `${e.source}→${e.target}`).join(', ')
    );
  }

  // Check 7: No edges should leave the sink
  const edgesLeavingSink = edges.filter(e => e.source === sink);
  if (edgesLeavingSink.length > 0) {
    warnings.push(
      `Flow network typically has no edges leaving the sink. ` +
      `Found ${edgesLeavingSink.length} edge(s) leaving sink: ` +
      edgesLeavingSink.map(e => `${e.source}→${e.target}`).join(', ')
    );
  }

  // Check 8: Every node should be reachable from source and able to reach sink
  if (sourceNode && sinkNode && errors.length === 0) {
    // Build adjacency list for traversal
    const adjacency = new Map<string, string[]>();
    for (const node of nodes) {
      adjacency.set(node.id, []);
    }
    for (const edge of edges) {
      adjacency.get(edge.source)!.push(edge.target);
    }

    // Find nodes reachable from source
    const reachableFromSource = new Set<string>();
    const queue: string[] = [source];
    while (queue.length > 0) {
      const current = queue.shift()!;
      if (reachableFromSource.has(current)) continue;
      reachableFromSource.add(current);
      const neighbors = adjacency.get(current) ?? [];
      queue.push(...neighbors.filter(n => !reachableFromSource.has(n)));
    }

    // Build reverse adjacency for finding nodes that can reach sink
    const reverseAdjacency = new Map<string, string[]>();
    for (const node of nodes) {
      reverseAdjacency.set(node.id, []);
    }
    for (const edge of edges) {
      reverseAdjacency.get(edge.target)!.push(edge.source);
    }

    // Find nodes that can reach sink
    const canReachSink = new Set<string>();
    const reverseQueue: string[] = [sink];
    while (reverseQueue.length > 0) {
      const current = reverseQueue.shift()!;
      if (canReachSink.has(current)) continue;
      canReachSink.add(current);
      const predecessors = reverseAdjacency.get(current) ?? [];
      reverseQueue.push(...predecessors.filter(p => !canReachSink.has(p)));
    }

    // Nodes that don't lie on any source-to-sink path
    const disconnectedNodes: string[] = [];
    for (const node of nodes) {
      if (node.id !== source && node.id !== sink) {
        if (!reachableFromSource.has(node.id) || !canReachSink.has(node.id)) {
          disconnectedNodes.push(node.id);
        }
      }
    }

    if (disconnectedNodes.length > 0) {
      warnings.push(
        `Flow network nodes should lie on paths from source to sink. ` +
        `Found ${disconnectedNodes.length} disconnected node(s): ` +
        disconnectedNodes.join(', ')
      );
    }
  }

  // Success if no critical errors
  const valid = errors.length === 0;

  // Combine all errors and warnings into message
  const allMessages = [...errors, ...warnings];
  const message = allMessages.length > 0
    ? allMessages.join('; ')
    : undefined;

  return {
    property: "flowNetwork",
    expected: "flow_network",
    actual: valid ? "flow_network" : "not_flow_network",
    valid,
    message,
  };
}
