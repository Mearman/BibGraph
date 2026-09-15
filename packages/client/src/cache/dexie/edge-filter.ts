/**
 * Edge Filter Utilities
 *
 * Provides filtering logic for graph edges based on property filters.
 */

import type { EdgePropertyFilter, GraphEdgeRecord } from '@bibgraph/types';

/**
 * Check if an edge matches the author position filter
 */
const matchesAuthorPosition = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.authorPosition === undefined) {
    return true;
  }
  return edge.authorPosition === filter.authorPosition;
};

/**
 * Check if an edge matches the corresponding author filter
 */
const matchesCorresponding = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.isCorresponding === undefined) {
    return true;
  }
  return edge.isCorresponding === filter.isCorresponding;
};

/**
 * Check if an edge matches the open access filter
 */
const matchesOpenAccess = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.isOpenAccess === undefined) {
    return true;
  }
  return edge.isOpenAccess === filter.isOpenAccess;
};

/**
 * Check if an edge matches the version filter
 */
const matchesVersion = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.version === undefined) {
    return true;
  }
  return edge.version === filter.version;
};

/**
 * Check if an edge matches the score range filters
 */
const matchesScoreRange = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.scoreMin !== undefined && (edge.score === undefined || edge.score < filter.scoreMin)) {
      return false;
    }
  if (filter.scoreMax !== undefined && (edge.score === undefined || edge.score > filter.scoreMax)) {
      return false;
    }
  return true;
};

/**
 * Check if an edge matches the years inclusion filter
 */
const matchesYearsInclude = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.yearsInclude === undefined || filter.yearsInclude.length === 0) {
    return true;
  }
  const { years } = edge;
  if (!years) {
    return false;
  }
  return filter.yearsInclude.some((year) => years.includes(year));
};

/**
 * Check if an edge matches the award ID filter
 */
const matchesAwardId = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.awardId === undefined) {
    return true;
  }
  return edge.awardId === filter.awardId;
};

/**
 * Check if an edge matches the role filter
 */
const matchesRole = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  if (filter.role === undefined) {
    return true;
  }
  return edge.role === filter.role;
};

/**
 * Check if a single edge matches all filter criteria
 */
const edgeMatchesFilter = (
  edge: GraphEdgeRecord,
  filter: EdgePropertyFilter
): boolean => {
  return (
    matchesAuthorPosition(edge, filter) &&
    matchesCorresponding(edge, filter) &&
    matchesOpenAccess(edge, filter) &&
    matchesVersion(edge, filter) &&
    matchesScoreRange(edge, filter) &&
    matchesYearsInclude(edge, filter) &&
    matchesAwardId(edge, filter) &&
    matchesRole(edge, filter)
  );
};

/**
 * Apply edge property filter to an array of edges
 * @param edges - Array of edges to filter
 * @param filter - Filter criteria to apply
 * @returns Filtered array of edges matching all criteria
 */
export const applyEdgeFilter = (
  edges: readonly GraphEdgeRecord[],
  filter: EdgePropertyFilter
): GraphEdgeRecord[] => {
  return edges.filter((edge) => edgeMatchesFilter(edge, filter));
};
