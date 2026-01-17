/**
 * OpenAlex Grouping Statistics
 * Statistical calculation helpers for grouping operations
 */

import type { EntityType } from "@bibgraph/types";

import type { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";
import { isFiniteNumber } from "./grouping-type-guards";
import type {
  AdvancedGroupParams,
  CalculatedPercentiles,
  GroupResult,
  TemporalDataPoint,
} from "./grouping-types";

/**
 * Calculate percentile from sorted array using linear interpolation
 * @param sortedArray - Array of numbers sorted in ascending order
 * @param percentile - Percentile to calculate (0-100)
 * @returns Calculated percentile value
 */
export const calculatePercentile = (
  sortedArray: number[],
  percentile: number,
): number => {
  if (sortedArray.length === 0) return 0;

  const index = (percentile / 100) * (sortedArray.length - 1);
  const lower = Math.floor(index);
  const upper = Math.ceil(index);
  const weight = index - lower;

  if (upper >= sortedArray.length) return sortedArray.at(-1) ?? 0;
  if (lower < 0) return sortedArray[0] ?? 0;

  const lowerValue = sortedArray[lower] ?? 0;
  const upperValue = sortedArray[upper] ?? 0;
  return lowerValue * (1 - weight) + upperValue * weight;
};

/**
 * Calculate basic statistics for a group
 * @param totalMetric - Total metric value for the group
 * @param count - Number of items in the group
 * @returns Object with total and mean values
 */
export const calculateBasicStats = (
  totalMetric: number,
  count: number,
): { total: number; mean: number } => {
  return {
    total: totalMetric,
    mean: count > 0 ? totalMetric / count : 0,
  };
};

/**
 * Calculate growth rate from temporal data
 * @param temporalData - Array of temporal data points
 * @returns Growth rate as percentage, or undefined if insufficient data
 */
export const calculateGrowthRate = (
  temporalData: TemporalDataPoint[],
): number | undefined => {
  if (temporalData.length < 2) {
    return undefined;
  }

  const COMPARISON_YEARS = 3;
  const recent = temporalData.slice(-COMPARISON_YEARS);
  const early = temporalData.slice(0, COMPARISON_YEARS);

  const recentAvg = recent.reduce((sum, d) => sum + d.count, 0) / recent.length;
  const earlyAvg = early.reduce((sum, d) => sum + d.count, 0) / early.length;

  if (earlyAvg > 0) {
    return ((recentAvg - earlyAvg) / earlyAvg) * 100;
  }

  return undefined;
};

/**
 * Calculate percentiles for a group by sampling from API
 * @param client - OpenAlex client instance
 * @param entityType - Type of entity to query
 * @param groupBy - Field being grouped by
 * @param group - Group result to calculate percentiles for
 * @param metric - Metric to calculate percentiles of
 * @param params - Advanced grouping parameters
 * @returns Calculated percentiles or undefined if calculation failed
 */
export const calculateGroupPercentiles = async (
  client: OpenAlexBaseClient,
  entityType: EntityType,
  groupBy: string,
  group: GroupResult,
  metric: string,
  params: AdvancedGroupParams,
): Promise<CalculatedPercentiles | undefined> => {
  const MIN_COUNT_FOR_PERCENTILES = 10;
  const MAX_SAMPLE_SIZE = 100;

  if (group.count <= MIN_COUNT_FOR_PERCENTILES) {
    return undefined;
  }

  try {
    const groupFilter = `${groupBy}:${group.key}`;
    const fullFilter = params.filter
      ? `${params.filter},${groupFilter}`
      : groupFilter;

    const sample = await client.getResponse<{
      results: Array<Record<string, unknown>>;
    }>(entityType, {
      filter: fullFilter,
      sort: metric,
      per_page: Math.min(MAX_SAMPLE_SIZE, group.count),
      select: [metric],
    });

    const values = sample.results
      .map((item: Record<string, unknown>) => {
        const value = item[metric];
        return isFiniteNumber(value) ? value : 0;
      })
      .sort((a: number, b: number) => a - b);

    if (values.length === 0) return undefined;

    return {
      p25: calculatePercentile(values, 25),
      p50: calculatePercentile(values, 50),
      p75: calculatePercentile(values, 75),
      p90: calculatePercentile(values, 90),
    };
  } catch (error: unknown) {
    logger.warn(
      `[GroupingApi] Failed to calculate percentiles for group ${group.key}`,
      { groupKey: group.key, error },
    );
    return undefined;
  }
};
