/**
 * OpenAlex Grouping Types
 * Type definitions for grouping and aggregation operations
 */

import type { GroupParams } from "@bibgraph/types";

/**
 * Raw group item from OpenAlex API response
 */
export interface GroupItem {
  key: string;
  key_display_name?: string;
  count: number;
  cited_by_count?: number;
  works_count?: number;
  h_index?: number;
}

/**
 * Group result with enhanced metadata
 */
export interface GroupResult {
  key: string;
  key_display_name: string;
  count: number;
  cited_by_count?: number;
  works_count?: number;
  h_index?: number;
  percentage: number;
}

/**
 * Advanced grouping options
 */
export interface AdvancedGroupParams extends GroupParams {
  /** Include citation statistics */
  include_citation_stats?: boolean;
  /** Include temporal trends */
  include_temporal_trends?: boolean;
  /** Minimum count threshold */
  min_count?: number;
  /** Calculate percentiles */
  calculate_percentiles?: boolean;
}

/**
 * Multi-dimensional grouping parameters
 */
export interface MultiDimensionalGroupParams extends GroupParams {
  /** Primary grouping field */
  primary_group_by: string;
  /** Secondary grouping field */
  secondary_group_by?: string;
  /** Tertiary grouping field */
  tertiary_group_by?: string;
  /** Maximum groups per dimension */
  max_groups_per_dimension?: number;
}

/**
 * Result structure for groupBy operations
 */
export interface GroupByResult {
  groups: GroupResult[];
  total_count: number;
  ungrouped_count: number;
  meta: {
    processing_time_ms: number;
    group_by_field: string;
    total_groups: number;
  };
}

/**
 * Temporal data point for trend analysis
 */
export interface TemporalDataPoint {
  year: number;
  count: number;
  percentage_of_group: number;
}

/**
 * Trend data for a single group
 */
export interface GroupTrend {
  group: string;
  group_display_name: string;
  temporal_data: TemporalDataPoint[];
  total_count: number;
  growth_rate?: number;
}

/**
 * Result structure for temporal trends
 */
export interface TemporalTrendsResult {
  trends: GroupTrend[];
  overall_trend: Array<{
    year: number;
    total_count: number;
  }>;
}

/**
 * Cross-tabulation entry
 */
export interface CrossTabulationEntry {
  primary_key: string;
  secondary_key?: string;
  tertiary_key?: string;
  count: number;
  percentage_of_total: number;
  percentage_of_primary: number;
}

/**
 * Result structure for multi-dimensional grouping
 */
export interface MultiDimensionalGroupResult {
  dimensions: {
    primary: GroupResult[];
    secondary?: GroupResult[];
    tertiary?: GroupResult[];
  };
  cross_tabulation: CrossTabulationEntry[];
  totals: {
    grand_total: number;
    primary_totals: Record<string, number>;
  };
}

/**
 * Top performer entry
 */
export interface TopPerformer {
  id: string;
  display_name: string;
  metric_value: number;
  rank_in_group: number;
}

/**
 * Group with top performers
 */
export interface GroupWithTopPerformers {
  group: string;
  group_display_name: string;
  group_total: number;
  top_performers: TopPerformer[];
}

/**
 * Result structure for top performers by group
 */
export interface TopPerformersByGroupResult {
  groups: GroupWithTopPerformers[];
}

/**
 * Percentile statistics
 */
export interface PercentileStats {
  p25: number;
  p75: number;
  p90: number;
  p95: number;
  p99: number;
}

/**
 * Group statistics
 */
export interface GroupStats {
  total: number;
  mean: number;
  median?: number;
  percentiles?: PercentileStats;
}

/**
 * Distribution statistics for a group
 */
export interface GroupDistributionStats {
  group: string;
  group_display_name: string;
  count: number;
  stats: GroupStats;
}

/**
 * Result structure for distribution statistics
 */
export interface DistributionStatsResult {
  groups: GroupDistributionStats[];
  overall_stats: {
    total_entities: number;
    grand_total_metric: number;
    overall_mean: number;
  };
}

/**
 * Calculated percentiles (internal use)
 */
export interface CalculatedPercentiles {
  p25: number;
  p50: number;
  p75: number;
  p90: number;
}
