import type { GraphSpec } from './spec';

/**
 * Mathematical impossibility in a graph specification.
 */
export interface GraphSpecImpossibility {
  property: string;
  reason: string;
  severity: 'error' | 'warning';
}

/**
 * Analyze a graph spec for mathematically impossible combinations.
 * @param spec
 */
export const analyzeGraphSpecConstraints = (spec: GraphSpec): GraphSpecImpossibility[] => {
  const impossibilities: GraphSpecImpossibility[] = [];

  // 1. Complete graphs must be connected
  if (spec.completeness.kind === "complete" && spec.connectivity.kind === "unconstrained") {
    impossibilities.push({
      property: "connectivity/completeness",
      reason: "Complete graphs are inherently connected (every node reachable from every other)",
      severity: "error"
    });
  }

  // 2. Acyclic + Complete is impossible for n > 2
  if (spec.completeness.kind === "complete" && spec.cycles.kind === "acyclic") {
    impossibilities.push({
      property: "completeness/cycles",
      reason: "Complete graphs contain cycles (n*(n-1) edges creates many cycles)",
      severity: "error"
    });
  }

  // 3. Multigraph + Acyclic + Disconnected is problematic
  // Forests (acyclic disconnected) are inherently simple graphs
  if (spec.edgeMultiplicity.kind === "multi" &&
      spec.cycles.kind === "acyclic" &&
      spec.connectivity.kind === "unconstrained") {
    impossibilities.push({
      property: "edgeMultiplicity/cycles/connectivity",
      reason: "Forests (acyclic disconnected graphs) are inherently simple; parallel edges either create cycles or are redundant",
      severity: "warning"
    });
  }

  // 4. Density constraints for forests
  // For acyclic disconnected graphs (forests), minimum density is (n-k)/maxEdges
  // where k is number of components. This can exceed "sparse" threshold.
  if (spec.cycles.kind === "acyclic" &&
      spec.connectivity.kind === "unconstrained" &&
      spec.density.kind === "sparse") {
    impossibilities.push({
      property: "cycles/density/connectivity",
      reason: "Forest minimum density may exceed sparse threshold depending on component structure",
      severity: "warning"
    });
  }

  // 5. Tree density constraints
  // Trees (acyclic connected) have exactly n-1 edges, which may not match density spec
  if (spec.directionality.kind === "undirected" &&
      spec.cycles.kind === "acyclic" &&
      spec.connectivity.kind === "connected" &&
      spec.density.kind !== "unconstrained") {
    impossibilities.push({
      property: "cycles/density",
      reason: "Trees have exactly n-1 edges, which may not match specified density",
      severity: "warning"
    });
  }

  // 6. Self-loops in acyclic graphs
  // Self-loops are cycles in directed graphs
  if (spec.cycles.kind === "acyclic" &&
      spec.selfLoops.kind === "allowed" &&
      spec.directionality.kind === "directed") {
    impossibilities.push({
      property: "cycles/selfLoops",
      reason: "Self-loops create cycles in directed graphs",
      severity: "error"
    });
  }

  // 7. Multigraph + Acyclic + Connected + Undirected is IMPOSSIBLE
  // A connected acyclic undirected graph is a tree, which cannot have parallel edges
  if (spec.edgeMultiplicity.kind === "multi" &&
      spec.cycles.kind === "acyclic" &&
      spec.connectivity.kind === "connected" &&
      spec.directionality.kind === "undirected") {
    impossibilities.push({
      property: "edgeMultiplicity/cycles/connectivity/directionality",
      reason: "Undirected connected acyclic graphs are trees (n-1 edges, no parallel edges). Multigraphs require parallel edges which would create cycles.",
      severity: "error"
    });
  }

  // 8. Multigraph + Acyclic for undirected graphs is IMPOSSIBLE
  // Undirected acyclic graphs (forests/trees) cannot have parallel edges without creating cycles
  if (spec.directionality.kind === "undirected" &&
      spec.edgeMultiplicity.kind === "multi" &&
      spec.cycles.kind === "acyclic") {
    impossibilities.push({
      property: "edgeMultiplicity/cycles/directionality",
      reason: "Undirected acyclic graphs (forests and trees) cannot have parallel edges. Adding parallel edges would create cycles.",
      severity: "error"
    });
  }

  // 9. Multigraph + Acyclic for directed graphs is problematic but may be possible
  // Directed acyclic graphs can have parallel edges in opposite directions without creating cycles
  if (spec.directionality.kind === "directed" &&
      spec.edgeMultiplicity.kind === "multi" &&
      spec.cycles.kind === "acyclic") {
    impossibilities.push({
      property: "edgeMultiplicity/cycles/directionality",
      reason: "Directed acyclic graphs with parallel edges require careful design to avoid cycles",
      severity: "warning"
    });
  }

  // 8. Bipartite + cycles with odd length is impossible
  // Bipartite graphs cannot contain odd-length cycles
  if (spec.partiteness?.kind === "bipartite" &&
      spec.cycles.kind === "cycles_allowed" &&
      spec.directionality.kind === "undirected") {
    impossibilities.push({
      property: "partiteness/cycles",
      reason: "Bipartite graphs cannot contain odd-length cycles (all cycles in bipartite graphs have even length)",
      severity: "warning"
    });
  }

  // 9. Planar + Complete graph with n ≥ 5 is impossible
  // K5 is non-planar (Kuratowski's theorem)
  if (spec.embedding?.kind === "planar" &&
      spec.completeness.kind === "complete") {
    impossibilities.push({
      property: "embedding/completeness",
      reason: "Complete graphs with n ≥ 5 are non-planar (K5 is Kuratowski's first graph)",
      severity: "error"
    });
  }

  // 10. Planar + Complete bipartite K3,3 or larger is impossible
  if (spec.embedding?.kind === "planar" &&
      spec.completeBipartite?.kind === "complete_bipartite") {
    const { m, n } = spec.completeBipartite;
    if (m >= 3 && n >= 3) {
      impossibilities.push({
        property: "embedding/completeBipartite",
        reason: `K${m},${n} is non-planar when m,n ≥ 3 (K3,3 is Kuratowski's second graph)`,
        severity: "error"
      });
    }
  }

  // 11. k-vertex-connected requires at least k+1 vertices
  if (spec.kVertexConnected?.kind === "k_vertex_connected") {
    const { k } = spec.kVertexConnected;
    // We can't check node count here (it's a generation parameter, not a spec property)
    // But we can document the constraint for validation
    impossibilities.push({
      property: "kVertexConnected/nodeCount",
      reason: `k-vertex-connected graphs require at least ${k + 1} vertices (will be validated during generation)`,
      severity: "warning"
    });
  }

  // 12. k-edge-connected requires at least k+1 vertices
  if (spec.kEdgeConnected?.kind === "k_edge_connected") {
    const { k } = spec.kEdgeConnected;
    impossibilities.push({
      property: "kEdgeConnected/nodeCount",
      reason: `k-edge-connected graphs require at least ${k + 1} vertices (will be validated during generation)`,
      severity: "warning"
    });
  }

  // 13. Perfect matching + odd vertex count is impossible for simple graphs
  if (spec.perfectMatching?.kind === "perfect_matching" &&
      spec.edgeMultiplicity.kind === "simple") {
    impossibilities.push({
      property: "perfectMatching/vertexCount",
      reason: "Simple graphs with odd vertex count cannot have perfect matching (will be validated during generation)",
      severity: "warning"
    });
  }

  // 14. k-colorable + chromatic number > k is impossible
  if (spec.kColorable?.kind === "k_colorable" &&
      spec.chromaticNumber?.kind === "chromatic_number") {
    const { k: colorableK } = spec.kColorable;
    const { chi } = spec.chromaticNumber;
    if (chi > colorableK) {
      impossibilities.push({
        property: "kColorable/chromaticNumber",
        reason: `Graph cannot be ${colorableK}-colorable if chromatic number is ${chi} (chi > k)`,
        severity: "error"
      });
    }
  }

  // 15. Planar graphs have treewidth ≤ 4
  if (spec.embedding?.kind === "planar" &&
      spec.treewidth?.kind === "treewidth") {
    const { width } = spec.treewidth;
    if (width > 4) {
      impossibilities.push({
        property: "embedding/treewidth",
        reason: `Planar graphs have treewidth ≤ 4, but spec requires treewidth ${width}`,
        severity: "error"
      });
    }
  }

  // 16. Tournament graphs must be directed
  if (spec.tournament?.kind === "tournament" &&
      spec.directionality.kind === "undirected") {
    impossibilities.push({
      property: "tournament/directionality",
      reason: "Tournament graphs are complete oriented graphs (must be directed)",
      severity: "error"
    });
  }

  // 17. Tournament + Complete (redundant)
  if (spec.tournament?.kind === "tournament" &&
      spec.completeness.kind === "complete") {
    impossibilities.push({
      property: "tournament/completeness",
      reason: "Tournament graphs are inherently complete (one directed edge between each vertex pair)",
      severity: "warning"
    });
  }

  // 18. Comparability graphs are perfect
  if (spec.comparability?.kind === "comparability" &&
      spec.perfect?.kind === "imperfect") {
    impossibilities.push({
      property: "comparability/perfect",
      reason: "Comparability graphs are perfect (cannot be imperfect)",
      severity: "error"
    });
  }

  // 19. Interval graphs are chordal and perfect
  if (spec.interval?.kind === "interval") {
    if (spec.chordal?.kind === "non_chordal") {
      impossibilities.push({
        property: "interval/chordal",
        reason: "Interval graphs are chordal (cannot be non-chordal)",
        severity: "error"
      });
    }
    if (spec.perfect?.kind === "imperfect") {
      impossibilities.push({
        property: "interval/perfect",
        reason: "Interval graphs are perfect (cannot be imperfect)",
        severity: "error"
      });
    }
  }

  // 20. Chordal graphs are perfect
  if (spec.chordal?.kind === "chordal" &&
      spec.perfect?.kind === "imperfect") {
    impossibilities.push({
      property: "chordal/perfect",
      reason: "Chordal graphs are perfect (cannot be imperfect)",
      severity: "error"
    });
  }

  // 21. Bipartite graphs are 2-colorable
  if (spec.partiteness?.kind === "bipartite" &&
      spec.kColorable?.kind === "k_colorable") {
    const { k } = spec.kColorable;
    if (k < 2) {
      impossibilities.push({
        property: "partiteness/kColorable",
        reason: `Bipartite graphs are 2-colorable, but spec requires ${k}-colorable (k < 2)`,
        severity: "error"
      });
    }
  }

  // 22. Star graphs are trees
  if (spec.star?.kind === "star" &&
      spec.cycles.kind === "cycles_allowed") {
    impossibilities.push({
      property: "star/cycles",
      reason: "Star graphs are trees (cannot have cycles)",
      severity: "error"
    });
  }

  // 23. Grid graphs are bipartite
  // Grid graphs are inherently bipartite, so specifying both is compatible (no constraint needed)
  // This is just a note for documentation purposes

  // 24. Binary trees are trees
  if (spec.binaryTree?.kind !== "not_binary_tree" &&
      spec.binaryTree?.kind !== "unconstrained" &&
      spec.cycles.kind === "cycles_allowed") {
    impossibilities.push({
      property: "binaryTree/cycles",
      reason: "Binary trees are trees (cannot have cycles)",
      severity: "error"
    });
  }

  // 25. Eulerian circuit requires all vertices have even degree
  // Semi-Eulerian requires exactly 2 vertices have odd degree
  // These will be validated during generation, but we can document the constraint
  if (spec.eulerian?.kind === "eulerian" ||
      spec.eulerian?.kind === "semi_eulerian") {
    impossibilities.push({
      property: "eulerian/degree",
      reason: "Eulerian graphs require specific degree constraints (validated during generation)",
      severity: "warning"
    });
  }

  // 26. Flow networks require directed graphs
  if (spec.flowNetwork?.kind === "flow_network" &&
      spec.directionality.kind === "undirected") {
    impossibilities.push({
      property: "flowNetwork/directionality",
      reason: "Flow networks require directed edges (to define source → sink flow)",
      severity: "error"
    });
  }

  return impossibilities;
};

/**
 * Check if a graph spec combination is mathematically impossible.
 * @param spec
 */
export const isGraphSpecImpossible = (spec: GraphSpec): boolean => {
  const impossibilities = analyzeGraphSpecConstraints(spec);
  return impossibilities.some(imp => imp.severity === "error");
};

/**
 * Get adjusted validation expectations for impossible combinations.
 * For specs with warnings, relax certain validation constraints.
 * @param spec
 */
export const getAdjustedValidationExpectations = (spec: GraphSpec): Partial<Record<string, boolean>> => {
  const adjustments: Partial<Record<string, boolean>> = {};
  const impossibilities = analyzeGraphSpecConstraints(spec);

  for (const imp of impossibilities) {
    if (imp.severity === "warning") {
      // For warnings, adjust validation expectations

      // Multigraph + Acyclic: Don't validate cycles (parallel edges don't create traditional cycles)
      if (imp.property.includes("edgeMultiplicity/cycles")) {
        // The validator should accept acyclic for multigraphs even if cycles allowed
        adjustments["skipCycleValidation"] = true;
      }

      // Forest density: Accept any density that's the minimum possible for the structure
      if (imp.property.includes("cycles/density/connectivity")) {
        adjustments["relaxDensityValidation"] = true;
      }

      // Tree density: Accept tree structure regardless of density spec
      if (imp.property.includes("cycles/density")) {
        adjustments["relaxDensityValidation"] = true;
      }
    }
  }

  return adjustments;
};
