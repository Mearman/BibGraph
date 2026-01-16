import type { TestGraph } from '../generators/types'
import type { PropertyValidationResult } from './types';

// ============================================================================
// NETWORK VALIDATORS
// ============================================================================

/**
 * Validates scale-free graph property.
 * Scale-free graphs have power-law degree distribution P(k) ~ k^(-γ).
 * @param graph
 */
export const validateScaleFree = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.scaleFree?.kind !== "scale_free") {
    return {
      property: "scaleFree",
      expected: spec.scaleFree?.kind ?? "unconstrained",
      actual: spec.scaleFree?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 10) {
    return {
      property: "scaleFree",
      expected: "scale_free",
      actual: "too_small",
      valid: true,
      message: "Scale-free validation skipped for small graph (n < 10)",
    };
  }

  // Check if stored exponent exists
  const hasExponent = nodes.every(n => n.data?.scaleFreeExponent !== undefined);
  if (hasExponent) {
    // Verify all nodes have the same exponent
    const exponent = nodes[0].data?.scaleFreeExponent;
    const consistentExponent = nodes.every(n => (n.data?.scaleFreeExponent as number | undefined) === exponent);

    if (!consistentExponent) {
      return {
        property: "scaleFree",
        expected: "scale_free",
        actual: "inconsistent_exponents",
        valid: false,
        message: "Nodes have inconsistent exponent markers",
      };
    }

    // For small graphs, skip power-law validation (needs more data)
    if (nodes.length < 50) {
      return {
        property: "scaleFree",
        expected: "scale_free",
        actual: `scale_free (exponent=${exponent})`,
        valid: true,
        message: "Power-law validation skipped for small graph (n < 50)",
      };
    }

    // TODO: Implement Kolmogorov-Smirnov test for power-law fit
    return {
      property: "scaleFree",
      expected: "scale_free",
      actual: `scale_free (exponent=${exponent})`,
      valid: true,
      message: "Power-law validation not yet implemented",
    };
  }

  return {
    property: "scaleFree",
    expected: "scale_free",
    actual: "unknown",
    valid: true,
    message: "Scale-free validation skipped (no exponent metadata found)",
  };
};

/**
 * Validates small-world graph property.
 * Small-world graphs have high clustering coefficient + short average path length.
 * @param graph
 */
export const validateSmallWorld = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.smallWorld?.kind !== "small_world") {
    return {
      property: "smallWorld",
      expected: spec.smallWorld?.kind ?? "unconstrained",
      actual: spec.smallWorld?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 4) {
    return {
      property: "smallWorld",
      expected: "small_world",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored parameters exist
  const hasParameters = nodes.every(n => n.data?.smallWorldRewireProb !== undefined);
  if (hasParameters) {
    const rewireProb = nodes[0].data?.smallWorldRewireProb;
    const meanDegree = nodes[0].data?.smallWorldMeanDegree;

    // Verify all nodes have consistent parameters
    const consistentParams = nodes.every(n =>
      (n.data?.smallWorldRewireProb as number | undefined) === rewireProb &&
      (n.data?.smallWorldMeanDegree as number | undefined) === meanDegree
    );

    if (!consistentParams) {
      return {
        property: "smallWorld",
        expected: "small_world",
        actual: "inconsistent_parameters",
        valid: false,
        message: "Nodes have inconsistent small-world parameters",
      };
    }

    // TODO: Compute clustering coefficient and average path length
    return {
      property: "smallWorld",
      expected: "small_world",
      actual: `small_world (rewire=${rewireProb}, k=${meanDegree})`,
      valid: true,
      message: "Clustering/path length validation not yet implemented",
    };
  }

  return {
    property: "smallWorld",
    expected: "small_world",
    actual: "unknown",
    valid: true,
    message: "Small-world validation skipped (no parameter metadata found)",
  };
};

/**
 * Validates modular graph property (community structure).
 * Modular graphs have high modularity score Q.
 * @param graph
 */
export const validateModular = (graph: TestGraph): PropertyValidationResult => {
  const { spec, nodes } = graph;

  if (spec.communityStructure?.kind !== "modular") {
    return {
      property: "modular",
      expected: spec.communityStructure?.kind ?? "unconstrained",
      actual: spec.communityStructure?.kind ?? "unconstrained",
      valid: true,
    };
  }

  if (nodes.length < 3) {
    return {
      property: "modular",
      expected: "modular",
      actual: "trivial",
      valid: true,
    };
  }

  // Check if stored community assignments exist
  const hasCommunities = nodes.every(n => n.data?.community !== undefined);
  if (hasCommunities) {
    // Verify communities are assigned (0 to numCommunities-1)
    const numCommunities = nodes[0].data?.numCommunities;
    const uniqueCommunities = new Set(nodes.map(n => (n.data?.community as number | undefined) ?? 0));

    if (uniqueCommunities.size !== numCommunities) {
      return {
        property: "modular",
        expected: "modular",
        actual: "invalid_communities",
        valid: false,
        message: `Expected ${numCommunities} communities, found ${uniqueCommunities.size}`,
      };
    }

    // TODO: Compute modularity score Q using Girvan-Newman algorithm
    return {
      property: "modular",
      expected: "modular",
      actual: `modular (${numCommunities} communities)`,
      valid: true,
      message: "Modularity score validation not yet implemented",
    };
  }

  return {
    property: "modular",
    expected: "modular",
    actual: "unknown",
    valid: true,
    message: "Modular validation skipped (no community metadata found)",
  };
};
