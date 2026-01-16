/**
 * Graph loading utilities
 *
 * Support for loading benchmark datasets in various formats.
 */

export {
  loadEdgeList,
  loadTriples,
  loadGraph,
  loadGraphFromUrl,
  type LoadedNode,
  type LoadedEdge,
  type EdgeListConfig,
  type TripleConfig,
  type LoadResult,
} from './edge-list-loader';
