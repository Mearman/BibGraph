/**
 * OpenAlex Grouping Operations API
 * Provides advanced grouping and aggregation functionality
 */

import type { EntityType, QueryParams } from "@bibgraph/types";
import { extractPropertyValue } from "@bibgraph/types";
import { z } from "zod";

import type { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";
import { metaCountResponseSchema, stubResultsResponseSchema } from "./aggregate-schemas";
import {
  calculateBasicStats,
  calculateGroupPercentiles,
  calculateGrowthRate,
} from "./grouping-statistics";
import {
  extractMetricFromRecord,
  isFiniteNumber,
  isPerformerRecord,
} from "./grouping-type-guards";
import type {
  AdvancedGroupParams as AdvancedGroupParameters,
  CrossTabulationEntry,
  DistributionStatsResult,
  GroupByResult,
  GroupDistributionStats,
  GroupItem,
  GroupResult,
  GroupTrend,
  GroupWithTopPerformers,
  MultiDimensionalGroupParams as MultiDimensionalGroupParameters,
  MultiDimensionalGroupResult,
  TemporalDataPoint,
  TemporalTrendsResult,
  TopPerformersByGroupResult,
} from "./grouping-types";

/**
 * Multiplier to convert a fraction into a percentage.
 */
const PERCENTAGE_SCALE = 100;

/**
 * Grouping API class providing advanced aggregation methods
 */
export class GroupingApi {
  constructor(private readonly client: OpenAlexBaseClient) {}

  /**
   * Group entities by a specified field
   * @param entityType - Type of entity to group
   * @param groupBy - Field to group by
   * @param params - Grouping parameters
   * @returns Promise resolving to grouped results
   * @example
   * ```typescript
   * const groups = await groupingApi.groupBy('works', 'publication_year', {
   *   group_limit: 20,
   *   filter: 'cited_by_count:>10'
   * });
   * ```
   */
  async groupBy(
    entityType: EntityType,
    groupBy: string,
    params: AdvancedGroupParameters = {},
  ): Promise<GroupByResult> {
    const DEFAULT_GROUP_LIMIT = 100;
    const DEFAULT_MIN_COUNT = 1;
    const {
      group_limit = DEFAULT_GROUP_LIMIT,
      min_count = DEFAULT_MIN_COUNT,
      ...queryParameters
    } = params;

    const groupParameters: QueryParams = {
      ...queryParameters,
      group_by: groupBy,
      per_page: 1, // We only need the grouping results
    };

    const response = await this.client.getResponse(entityType, groupParameters, z.record(z.string(), z.unknown()));

    if (!response.group_by) {
      throw new Error(
        `Grouping not supported for entity type: ${entityType} with field: ${groupBy}`,
      );
    }

    const totalCount = response.group_by.reduce(
      (sum: number, group: Readonly<GroupItem>) => sum + group.count,
      0,
    );
    const filteredGroups = response.group_by
      .filter((group: Readonly<GroupItem>) => group.count >= min_count)
      .slice(0, group_limit);

    const groups: GroupResult[] = filteredGroups.map((group: Readonly<GroupItem>) => ({
      key: group.key,
      key_display_name: group.key_display_name ?? group.key,
      count: group.count,
      ...(group.cited_by_count !== undefined && {
        cited_by_count: group.cited_by_count,
      }),
      ...(group.works_count !== undefined && {
        works_count: group.works_count,
      }),
      ...(group.h_index !== undefined && { h_index: group.h_index }),
      percentage: (group.count / totalCount) * PERCENTAGE_SCALE,
    }));

    const ungroupedCount = response.meta.count - totalCount;

    return {
      groups,
      total_count: totalCount,
      ungrouped_count: Math.max(0, ungroupedCount),
      meta: {
        processing_time_ms: response.meta.db_response_time_ms,
        group_by_field: groupBy,
        total_groups: response.group_by.length,
      },
    };
  }

  /**
   * Get temporal trends for grouped data
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param timeField - Time field for trends (e.g., 'publication_year', 'created_date')
   * @param params - Parameters
   * @returns Promise resolving to temporal trends
   * @example
   * ```typescript
   * const trends = await groupingApi.getTemporalTrends('works', 'type', 'publication_year', {
   *   from_year: 2010,
   *   to_year: 2023
   * });
   * ```
   */
  async getTemporalTrends(
    entityType: EntityType,
    groupBy: string,
    timeField = "publication_year",
    params: AdvancedGroupParameters & {
      from_year?: number;
      to_year?: number;
    } = {},
  ): Promise<TemporalTrendsResult> {
    const DEFAULT_FROM_YEAR = 2010;
    const DEFAULT_TREND_GROUP_LIMIT = 10;
    const {
      from_year = DEFAULT_FROM_YEAR,
      to_year = new Date().getFullYear(),
      group_limit = DEFAULT_TREND_GROUP_LIMIT,
    } = params;

    // First get the main groups
    const mainGroups = await this.groupBy(entityType, groupBy, {
      ...params,
      group_limit,
    });

    const trends: GroupTrend[] = [];

    // For each major group, get temporal breakdown
    for (const group of mainGroups.groups.slice(0, group_limit)) {
      const trendData = await this.getGroupTemporalData(
        entityType,
        groupBy,
        group,
        timeField,
        from_year,
        to_year,
        params,
      );
      if (trendData) {
        trends.push(trendData);
      }
    }

    // Get overall temporal trend
    const overallTemporal = await this.groupBy(entityType, timeField, {
      ...params,
      group_limit: to_year - from_year + 1,
    });

    const overallTrend = overallTemporal.groups
      .map((group) => ({
        year: Number.parseInt(group.key),
        total_count: group.count,
      }))
      .sort((a, b) => a.year - b.year);

    return { trends, overall_trend: overallTrend };
  }

  /**
   * Get temporal data for a single group
   * @param entityType - Type of entity
   * @param groupBy - Field to group by
   * @param group - Group result
   * @param timeField - Time field for temporal breakdown
   * @param fromYear - Start year
   * @param toYear - End year
   * @param params - Advanced group parameters
   */
  private async getGroupTemporalData(
    entityType: EntityType,
    groupBy: string,
    group: Readonly<GroupResult>,
    timeField: string,
    fromYear: number,
    toYear: number,
    params: AdvancedGroupParameters,
  ): Promise<GroupTrend | undefined> {
    try {
      const timeFilter =
        timeField === "publication_year"
          ? `publication_year:${fromYear.toString()}-${toYear.toString()}`
          : `from_created_date:${fromYear.toString()}-01-01,to_created_date:${toYear.toString()}-12-31`;

      const groupFilter = `${groupBy}:${group.key}`;
      const combinedFilter =
        params.filter !== undefined && params.filter !== ""
          ? `${params.filter},${groupFilter},${timeFilter}`
          : `${groupFilter},${timeFilter}`;

      const temporalBreakdown = await this.groupBy(entityType, timeField, {
        filter: combinedFilter,
        group_limit: toYear - fromYear + 1,
      });

      const temporalData: TemporalDataPoint[] = temporalBreakdown.groups.map(
        (yearGroup) => ({
          year: Number.parseInt(yearGroup.key),
          count: yearGroup.count,
          percentage_of_group: (yearGroup.count / group.count) * PERCENTAGE_SCALE,
        }),
      );

      const growthRate = calculateGrowthRate(temporalData);

      return {
        group: group.key,
        group_display_name: group.key_display_name,
        temporal_data: [...temporalData].sort((a, b) => a.year - b.year),
        total_count: group.count,
        ...(growthRate !== undefined && { growth_rate: growthRate }),
      };
    } catch (error: unknown) {
      logger.warn(
        `[GroupingApi] Failed to get temporal trends for group ${group.key}`,
        { groupKey: group.key, error },
      );
      return undefined;
    }
  }

  /**
   * Multi-dimensional grouping (cross-tabulation)
   * @param entityType - Type of entity to group
   * @param params - Multi-dimensional grouping parameters
   * @returns Promise resolving to cross-tabulated results
   * @example
   * ```typescript
   * const crossTab = await groupingApi.multiDimensionalGroup('works', {
   *   primary_group_by: 'type',
   *   secondary_group_by: 'is_oa',
   *   max_groups_per_dimension: 5
   * });
   * ```
   */
  async multiDimensionalGroup(
    entityType: EntityType,
    params: MultiDimensionalGroupParameters,
  ): Promise<MultiDimensionalGroupResult> {
    const DEFAULT_MAX_GROUPS = 10;
    const {
      primary_group_by,
      secondary_group_by,
      max_groups_per_dimension = DEFAULT_MAX_GROUPS,
      ...baseParameters
    } = params;

    // Get primary dimension
    const primary = await this.groupBy(entityType, primary_group_by, {
      ...baseParameters,
      group_limit: max_groups_per_dimension,
    });

    const dimensions: { primary: GroupResult[]; secondary?: GroupResult[] } = {
      primary: primary.groups,
    };
    let crossTabulation: CrossTabulationEntry[] = [];
    let primaryTotals: Record<string, number> = {};

    // Process secondary dimension if specified
    if (secondary_group_by !== undefined && secondary_group_by !== "") {
      const secondary = await this.groupBy(entityType, secondary_group_by, {
        ...baseParameters,
        group_limit: max_groups_per_dimension,
      });
      dimensions.secondary = secondary.groups;

      const built = await this.buildCrossTabulation(
        entityType,
        primary_group_by,
        secondary_group_by,
        primary,
        secondary,
        baseParameters,
      );
      crossTabulation = built.crossTabulation;
      primaryTotals = built.primaryTotals;
    }

    return {
      dimensions,
      cross_tabulation: crossTabulation,
      totals: {
        grand_total: primary.total_count,
        primary_totals: primaryTotals,
      },
    };
  }

  /**
   * Build cross-tabulation data for two dimensions
   * @param entityType - Type of entity
   * @param primaryGroupBy - Primary grouping field
   * @param secondaryGroupBy - Secondary grouping field
   * @param primary - Primary group results
   * @param secondary - Secondary group results
   * @param baseParams - Base query parameters
   * @returns The built cross-tabulation entries and per-primary-group totals
   */
  private async buildCrossTabulation(
    entityType: EntityType,
    primaryGroupBy: string,
    secondaryGroupBy: string,
    primary: GroupByResult,
    secondary: GroupByResult,
    baseParams: Omit<
      MultiDimensionalGroupParameters,
      "primary_group_by" | "secondary_group_by" | "max_groups_per_dimension"
    >,
  ): Promise<{
    crossTabulation: CrossTabulationEntry[];
    primaryTotals: Record<string, number>;
  }> {
    const CROSS_TAB_LIMIT = 5;
    const crossTabulation: CrossTabulationEntry[] = [];
    const primaryTotals: Record<string, number> = {};
    const baseFilter = typeof baseParams.filter === "string" ? baseParams.filter : "";

    for (const primaryGroup of primary.groups.slice(0, CROSS_TAB_LIMIT)) {
      primaryTotals[primaryGroup.key] = primaryGroup.count;

      for (const secondaryGroup of secondary.groups.slice(0, CROSS_TAB_LIMIT)) {
        try {
          const combinedFilter = `${primaryGroupBy}:${primaryGroup.key},${secondaryGroupBy}:${secondaryGroup.key}`;
          const fullFilter =
            baseFilter === "" ? combinedFilter : `${baseFilter},${combinedFilter}`;

          const crossResult = await this.client.get(entityType, {
            filter: fullFilter,
            per_page: 1,
          }, metaCountResponseSchema);

          const { count } = crossResult.meta;

          crossTabulation.push({
            primary_key: primaryGroup.key,
            secondary_key: secondaryGroup.key,
            count,
            percentage_of_total: (count / primary.total_count) * PERCENTAGE_SCALE,
            percentage_of_primary: (count / primaryGroup.count) * PERCENTAGE_SCALE,
          });
        } catch (error: unknown) {
          logger.warn(
            `[GroupingApi] Failed cross-tabulation for ${primaryGroup.key} x ${secondaryGroup.key}`,
            {
              primaryKey: primaryGroup.key,
              secondaryKey: secondaryGroup.key,
              error,
            },
          );
        }
      }
    }

    return { crossTabulation, primaryTotals };
  }

  /**
   * Get top performers by group
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param metric - Metric to rank by ('cited_by_count', 'works_count', etc.)
   * @param params - Parameters
   * @returns Promise resolving to top performers
   * @example
   * ```typescript
   * const topPerformers = await groupingApi.getTopPerformersByGroup(
   *   'authors',
   *   'last_known_institution.country_code',
   *   'cited_by_count',
   *   { top_n: 3, group_limit: 10 }
   * );
   * ```
   */
  async getTopPerformersByGroup(
    entityType: EntityType,
    groupBy: string,
    metric = "cited_by_count",
    params: AdvancedGroupParameters & { top_n?: number } = {},
  ): Promise<TopPerformersByGroupResult> {
    const DEFAULT_TOP_N = 5;
    const DEFAULT_GROUP_LIMIT = 10;
    const { top_n = DEFAULT_TOP_N, group_limit = DEFAULT_GROUP_LIMIT } = params;

    // Get main groups
    const groups = await this.groupBy(entityType, groupBy, {
      ...params,
      group_limit,
    });

    const result: GroupWithTopPerformers[] = [];

    // For each group, get top performers
    for (const group of groups.groups) {
      const groupData = await this.getTopPerformersForGroup(
        entityType,
        groupBy,
        group,
        metric,
        top_n,
        params,
      );
      if (groupData) {
        result.push(groupData);
      }
    }

    return { groups: result };
  }

  /**
   * Get top performers for a single group
   * @param entityType - Type of entity
   * @param groupBy - Field to group by
   * @param group - Group result
   * @param metric - Metric to rank by
   * @param topN - Number of top performers to return
   * @param params - Advanced group parameters
   */
  private async getTopPerformersForGroup(
    entityType: EntityType,
    groupBy: string,
    group: Readonly<GroupResult>,
    metric: string,
    topN: number,
    params: AdvancedGroupParameters,
  ): Promise<GroupWithTopPerformers | undefined> {
    try {
      const groupFilter = `${groupBy}:${group.key}`;
      const fullFilter =
        params.filter !== undefined && params.filter !== ""
          ? `${params.filter},${groupFilter}`
          : groupFilter;

      const topPerformers = await this.client.get(entityType, {
        filter: fullFilter,
        sort: metric,
        per_page: topN,
        select: ["id", "display_name", metric],
      }, stubResultsResponseSchema);

      const resultsArray = topPerformers.results;
      const performersWithRank = resultsArray.map((performer, index: number) =>
        this.mapPerformerToRanked(performer, metric, index),
      );

      return {
        group: group.key,
        group_display_name: group.key_display_name,
        group_total: group.count,
        top_performers: performersWithRank,
      };
    } catch (error: unknown) {
      logger.warn(
        `[GroupingApi] Failed to get top performers for group ${group.key}`,
        { groupKey: group.key, error },
      );
      return undefined;
    }
  }

  /**
   * Map a performer record to a ranked result
   * @param performer - Performer record from API
   * @param metric - Metric key to extract
   * @param index - Position in results array
   */
  private mapPerformerToRanked(
    performer: unknown,
    metric: string,
    index: number,
  ): {
    id: string;
    display_name: string;
    metric_value: number;
    rank_in_group: number;
  } {
    if (!isPerformerRecord(performer)) {
      throw new Error("Invalid performer record structure");
    }

    // Extract properties with explicit type checking using helper
    const idValue = extractPropertyValue({ obj: performer, key: "id" });
    const displayNameValue = extractPropertyValue({
      obj: performer,
      key: "display_name",
    });
    const metricValue = extractPropertyValue({
      obj: performer,
      key: metric,
    });

    const id = typeof idValue === "string" ? idValue : "";
    const displayName =
      typeof displayNameValue === "string" ? displayNameValue : "";
    const metric_value = isFiniteNumber(metricValue) ? metricValue : 0;

    return {
      id,
      display_name: displayName,
      metric_value,
      rank_in_group: index + 1,
    };
  }

  /**
   * Calculate distribution statistics for grouped data
   * @param entityType - Type of entity to analyze
   * @param groupBy - Field to group by
   * @param metric - Metric to analyze distribution of
   * @param params - Parameters
   * @returns Promise resolving to distribution statistics
   * @example
   * ```typescript
   * const distribution = await groupingApi.getDistributionStats(
   *   'works',
   *   'type',
   *   'cited_by_count',
   *   { calculate_percentiles: true }
   * );
   * ```
   */
  async getDistributionStats(
    entityType: EntityType,
    groupBy: string,
    metric = "cited_by_count",
    params: AdvancedGroupParameters = {},
  ): Promise<DistributionStatsResult> {
    const DEFAULT_GROUP_LIMIT = 20;
    const {
      calculate_percentiles = false,
      group_limit = DEFAULT_GROUP_LIMIT,
    } = params;

    const groups = await this.groupBy(entityType, groupBy, {
      ...params,
      group_limit,
      include_citation_stats: true,
    });

    const result: GroupDistributionStats[] = [];
    let grandTotalMetric = 0;
    const totalEntities = groups.groups.reduce(
      (sum, group) => sum + group.count,
      0,
    );

    for (const group of groups.groups) {
      const totalMetric = extractMetricFromRecord(group, metric);
      const basicStats = calculateBasicStats(totalMetric, group.count);

      const percentiles = calculate_percentiles
        ? await calculateGroupPercentiles(
            this.client,
            entityType,
            groupBy,
            group,
            metric,
            params,
          )
        : undefined;

      result.push({
        group: group.key,
        group_display_name: group.key_display_name,
        count: group.count,
        stats: {
          total: basicStats.total,
          mean: basicStats.mean,
          ...(percentiles?.p50 !== undefined && { median: percentiles.p50 }),
          ...(percentiles && {
            percentiles: {
              p25: percentiles.p25,
              p75: percentiles.p75,
              p90: percentiles.p90,
              p95: percentiles.p90, // Use p90 as approximation
              p99: percentiles.p90, // Use p90 as approximation
            },
          }),
        },
      });

      grandTotalMetric += basicStats.total;
    }

    return {
      groups: result,
      overall_stats: {
        total_entities: totalEntities,
        grand_total_metric: grandTotalMetric,
        overall_mean: totalEntities > 0 ? grandTotalMetric / totalEntities : 0,
      },
    };
  }
}
