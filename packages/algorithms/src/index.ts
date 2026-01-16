/**
 * Algorithms package main exports
 */

// Graph property analysis has moved to @bibgraph/graph-gen
// Import from there directly:
// import { ... } from '@bibgraph/graph-gen';

// Core analysis algorithms
export * from "./analysis/scc";
export * from "./analysis/connected-components";
export * from "./analysis/topological-sort";
export * from "./analysis/cycle-detection";

// Clustering algorithms
export * from "./clustering/infomap";
export * from "./clustering/louvain";
export * from "./clustering/label-propagation";
export * from "./clustering/leiden";

// Decomposition algorithms
export * from "./decomposition/biconnected";
export * from "./decomposition/core-periphery";
export * from "./decomposition/k-core";

// Extraction algorithms
export * from "./extraction/subgraph";
export * from "./extraction/filter";
export * from "./extraction/truss";
export * from "./extraction/motif";

// Graph algorithms
export * from "./graph/graph";

// Hierarchical algorithms
export * from "./hierarchical/clustering";

// Layout algorithms
export * from "./layout/hierarchical-layout";

// Partitioning algorithms
export * from "./partitioning/spectral";

// Pathfinding algorithms
export * from "./pathfinding/priority-queue";
export * from "./pathfinding/dijkstra";
export * from "./pathfinding/mutual-information";
export * from "./pathfinding/path-ranking";

// Traversal algorithms
export { bfs } from './traversal/bfs';

// Evaluation framework moved to @bibgraph/evaluation
// Import evaluation functions from: @bibgraph/evaluation
// For example:
//   import { runExperiment, spearmanCorrelation, ndcg } from '@bibgraph/evaluation';
//   import type { ExperimentConfig, ExperimentReport } from '@bibgraph/evaluation';

// Metrics
export * from "./metrics/cluster-quality";
export * from "./metrics/conductance";
export * from "./metrics/modularity";

// Types
export * from "./types/errors";
export * from "./types/result";
export * from "./types/graph";
export * from "./types/algorithm-results";
export * from "./types/weight-function";
export * from "./types/option";
export * from "./types/clustering-types";
