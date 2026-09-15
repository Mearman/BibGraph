/**
 * OpenAlex Random Sampling API
 * Provides random sampling functionality across all entity types
 */

import type {
  EntityType,
  OpenAlexEntity,
  OpenAlexResponse,
  QueryParams,
  SampleParams,
} from "@bibgraph/types";
import { z } from "zod";

import type { OpenAlexBaseClient } from "../client";
import { getEndpointEntitySchema } from "../internal/entity-schemas";
import { logError,logger } from "../internal/logger";

/**
 * Advanced sampling options
 */
export interface AdvancedSampleParams extends SampleParams {
  /**
  Stratified sampling by field
   */
  stratify_by?: string;
  /**
  Ensure temporal diversity
   */
  temporal_diversity?: boolean;
  /**
  Weight by citation count
   */
  citation_weighted?: boolean;
  /**
  Include only entities with minimum works count
   */
  min_works_count?: number;
}

/**
 * Top-level shape of a group_by aggregate response, as used to discover strata distribution before stratified sampling. Not an OpenAlexResponse envelope: aggregate responses are addressed by their group_by array, not a results array.
 */
const strataDistributionSchema = z.object({
  group_by: z
    .array(
      z.object({
        key: z.string(),
        key_display_name: z.string().optional(),
        count: z.number(),
      }),
    )
    .optional(),
});

/**
 * Sampling API class providing random sampling methods
 */
export class SamplingApi {
  constructor(private readonly client: OpenAlexBaseClient) {}

  /**
   * Get random sample of entities from any entity type
   * @param entityType - Type of entity to sample
   * @param params - Sampling parameters
   * @returns Promise resolving to random sample
   * @example
   * ```typescript
   * const randomWorks = await samplingApi.randomSample('works', {
   *   sample_size: 100,
   *   seed: 12345,
   *   filter: 'publication_year:>2020'
   * });
   * ```
   */
  async randomSample(
    entityType: EntityType,
    params: SampleParams = {},
  ): Promise<OpenAlexResponse<OpenAlexEntity>> {
    const MAX_PER_PAGE = 200;
    const { sample_size = 25, seed, ...queryParameters }: SampleParams = params;

    const sampleParameters: QueryParams = {
      ...queryParameters,
      sort: "random",
      per_page: Math.min(sample_size, MAX_PER_PAGE), // OpenAlex typically limits to 200 per page
    };

    // Add seed for reproducible sampling
    if (seed !== undefined) {
      sampleParameters.seed = seed;
    }

    return this.client.getResponse(entityType, sampleParameters, getEndpointEntitySchema(entityType));
  }

  /**
   * Get stratified random sample (balanced across specified field)
   * @param entityType - Type of entity to sample
   * @param stratifyBy - Field to stratify by
   * @param params - Sampling parameters
   * @returns Promise resolving to stratified sample
   * @example
   * ```typescript
   * const stratifiedWorks = await samplingApi.stratifiedSample('works', 'publication_year', {
   *   sample_size: 200,
   *   seed: 67890
   * });
   * ```
   */
  async stratifiedSample(
    entityType: EntityType,
    stratifyBy: string,
    params: AdvancedSampleParams = {},
  ): Promise<{
    samples: OpenAlexEntity[];
    strata_info: {
      stratum: string;
      count: number;
      sample_count: number;
    }[];
  }> {
    const { sample_size = 100, seed, ...queryParameters } = params;

    // First, get distribution of the stratification field
    const groupedResponse = await this.client.get(entityType, {
      ...queryParameters,
      group_by: stratifyBy,
      per_page: 100, // Get top strata
    }, strataDistributionSchema);

    if (!groupedResponse.group_by) {
      // Fallback to regular random sample if grouping not supported
      const regularSample = await this.randomSample(entityType, params);
      return {
        samples: regularSample.results,
        strata_info: [
          {
            stratum: "all",
            count: regularSample.meta.count,
            sample_count: regularSample.results.length,
          },
        ],
      };
    }

    const MAX_STRATA = 10;
    const strata = groupedResponse.group_by.slice(0, MAX_STRATA); // Limit to top strata
    const totalCount = strata.reduce((sum, s) => sum + s.count, 0);

    const samples: OpenAlexEntity[] = [];
    const strataInfo: {
      stratum: string;
      count: number;
      sample_count: number;
    }[] = [];

    // Sample proportionally from each stratum
    for (const stratum of strata) {
      const proportion = stratum.count / totalCount;
      const stratumSampleSize = Math.max(
        1,
        Math.round(sample_size * proportion),
      );

      try {
        const stratumParameters: SampleParams = {
          ...queryParameters,
          sample_size: stratumSampleSize,
          filter:
            queryParameters.filter !== undefined && queryParameters.filter !== ""
              ? `${queryParameters.filter},${stratifyBy}:${stratum.key}`
              : `${stratifyBy}:${stratum.key}`,
        };
        if (seed !== undefined) {
          stratumParameters.seed = seed + stratum.key.length;
        }
        const stratumSample = await this.randomSample(
          entityType,
          stratumParameters,
        );

        samples.push(...stratumSample.results);
        strataInfo.push({
          stratum: stratum.key_display_name !== "" && stratum.key_display_name !== undefined
            ? stratum.key_display_name
            : stratum.key,
          count: stratum.count,
          sample_count: stratumSample.results.length,
        });
      } catch (error: unknown) {
        logError(`Failed to sample from stratum ${stratum.key}`, error);
        logger.warn(`Failed to sample from stratum ${stratum.key}`, {
          stratumKey: stratum.key,
          error,
        });
        strataInfo.push({
          stratum: stratum.key_display_name !== "" && stratum.key_display_name !== undefined
            ? stratum.key_display_name
            : stratum.key,
          count: stratum.count,
          sample_count: 0,
        });
      }
    }

    return { samples, strata_info: strataInfo };
  }

  /**
   * Get temporally diverse sample (spread across time periods)
   * @param entityType - Type of entity to sample
   * @param params - Sampling parameters
   * @returns Promise resolving to temporally diverse sample
   * @example
   * ```typescript
   * const temporalSample = await samplingApi.temporallyDiverseSample('works', {
   *   sample_size: 150,
   *   min_works_count: 10
   * });
   * ```
   */
  async temporallyDiverseSample(
    entityType: EntityType,
    params: AdvancedSampleParams = {},
  ): Promise<{
    samples: OpenAlexEntity[];
    temporal_distribution: {
      period: string;
      count: number;
      sample_count: number;
    }[];
  }> {
    const currentYear = new Date().getFullYear();
    const periods = [
      { name: "Recent (2020-now)", start: 2020, end: currentYear },
      { name: "Modern (2010-2019)", start: 2010, end: 2019 },
      { name: "Early 2000s (2000-2009)", start: 2000, end: 2009 },
      { name: "Historical (pre-2000)", start: 1900, end: 1999 },
    ];

    const { sample_size = 100 } = params;
    const samplesPerPeriod = Math.ceil(sample_size / periods.length);

    const samples: OpenAlexEntity[] = [];
    const temporalDistribution: {
      period: string;
      count: number;
      sample_count: number;
    }[] = [];

    for (const period of periods) {
      try {
        const dateFilter =
          entityType === "works"
            ? `publication_year:${String(period.start)}-${String(period.end)}`
            : `from_created_date:${String(period.start)}-01-01,to_created_date:${String(period.end)}-12-31`;

        const periodFilter =
          params.filter !== undefined && params.filter !== ""
            ? `${params.filter},${dateFilter}`
            : dateFilter;

        const periodSample = await this.randomSample(entityType, {
          ...params,
          sample_size: samplesPerPeriod,
          filter: periodFilter,
        });

        samples.push(...periodSample.results);
        temporalDistribution.push({
          period: period.name,
          count: periodSample.meta.count,
          sample_count: periodSample.results.length,
        });
      } catch (error: unknown) {
        logError(`Failed to sample from period ${period.name}`, error);
        logger.warn(`Failed to sample from period ${period.name}`, {
          periodName: period.name,
          error,
        });
        temporalDistribution.push({
          period: period.name,
          count: 0,
          sample_count: 0,
        });
      }
    }

    return { samples, temporal_distribution: temporalDistribution };
  }

  /**
   * Get citation-weighted random sample (higher chance for highly cited entities)
   * @param entityType - Type of entity to sample
   * @param params - Sampling parameters
   * @returns Promise resolving to citation-weighted sample
   * @example
   * ```typescript
   * const weightedSample = await samplingApi.citationWeightedSample('works', {
   *   sample_size: 75,
   *   seed: 11111
   * });
   * ```
   */
  async citationWeightedSample(
    entityType: EntityType,
    params: AdvancedSampleParams = {},
  ): Promise<OpenAlexResponse<OpenAlexEntity>> {
    // For citation-weighted sampling, we'll use a mixed approach:
    // 70% from highly cited entities, 30% from regular sample

    const { sample_size = 50, seed, ...queryParameters }: SampleParams = params;

    const HIGHLY_CITED_SHARE = 0.7;
    const highlyCitedSize = Math.floor(sample_size * HIGHLY_CITED_SHARE);
    const regularSize = sample_size - highlyCitedSize;

    const [highlyCitedSample, regularSample] = await Promise.all([
      // Sample from highly cited entities
      (async () => {
        const highlyCitedParameters: SampleParams = {
          ...queryParameters,
          sample_size: highlyCitedSize,
          filter:
            queryParameters.filter !== undefined && queryParameters.filter !== ""
              ? `${queryParameters.filter},cited_by_count:>10`
              : "cited_by_count:>10",
          sort: "random", // Still random within highly cited
        };
        if (seed !== undefined) {
          highlyCitedParameters.seed = seed;
        }
        return this.randomSample(entityType, highlyCitedParameters);
      })(),

      // Regular random sample
      (async () => {
        const regularParameters: SampleParams = {
          ...queryParameters,
          sample_size: regularSize,
        };
        if (seed !== undefined) {
          const REGULAR_SEED_OFFSET = 1000;
          regularParameters.seed = seed + REGULAR_SEED_OFFSET;
        }
        return this.randomSample(entityType, regularParameters);
      })(),
    ]);

    // Combine and shuffle results
    const combinedResults = [
      ...highlyCitedSample.results,
      ...regularSample.results,
    ];

    // Shuffle using seed if provided
    const shuffledResults =
      seed === undefined
        ? this.shuffleArray(combinedResults)
        : this.shuffleArray(combinedResults, seed);

    return {
      results: shuffledResults,
      meta: {
        count: highlyCitedSample.meta.count + regularSample.meta.count,
        db_response_time_ms:
          highlyCitedSample.meta.db_response_time_ms +
          regularSample.meta.db_response_time_ms,
        page: 1,
        per_page: sample_size,
      },
    };
  }

  /**
   * Generate reproducible random samples for A/B testing
   * @param entityType - Type of entity to sample
   * @param groupA - Parameters for group A
   * @param groupB - Parameters for group B
   * @returns Promise resolving to both sample groups
   * @example
   * ```typescript
   * const { groupA, groupB } = await samplingApi.abTestSample('works',
   *   { sample_size: 100, seed: 1 },
   *   { sample_size: 100, seed: 2 }
   * );
   * ```
   */
  async abTestSample(
    entityType: EntityType,
    groupA: SampleParams,
    groupB: SampleParams,
  ): Promise<{
    groupA: OpenAlexResponse<OpenAlexEntity>;
    groupB: OpenAlexResponse<OpenAlexEntity>;
    overlap: OpenAlexEntity[];
  }> {
    const [sampleA, sampleB] = await Promise.all([
      this.randomSample(entityType, groupA),
      this.randomSample(entityType, groupB),
    ]);

    // Check for overlap (entities appearing in both samples)
    const idsA = new Set(sampleA.results.map((item) => item.id));
    const overlap = sampleB.results.filter((item) => idsA.has(item.id));

    return {
      groupA: sampleA,
      groupB: sampleB,
      overlap,
    };
  }

  /**
   * Get quality sample (entities with good metadata completeness)
   * @param entityType - Type of entity to sample
   * @param params - Sampling parameters
   * @returns Promise resolving to quality sample
   * @example
   * ```typescript
   * const qualitySample = await samplingApi.qualitySample('works', {
   *   sample_size: 50
   * });
   * ```
   */
  async qualitySample(
    entityType: EntityType,
    params: AdvancedSampleParams = {},
  ): Promise<OpenAlexResponse<OpenAlexEntity>> {
    const qualityFilters = this.getQualityFilters(entityType);

    return this.randomSample(entityType, {
      ...params,
      filter:
        params.filter !== undefined && params.filter !== ""
          ? `${params.filter},${qualityFilters}`
          : qualityFilters,
    });
  }

  /**
   * Get quality filters for different entity types
   */
  private getQualityFilters(entityType: EntityType): string {
    switch (entityType) {
      case "works":
        return "has_doi:true,is_oa:true"; // Has DOI and is open access
      case "authors":
        return "works_count:>5"; // Authors with multiple works
      case "sources":
        return "works_count:>100"; // Active sources
      case "institutions":
        return "works_count:>50"; // Active institutions
      case "topics":
      case "concepts":
      case "publishers":
      case "funders":
      case "keywords":
      case "domains":
      case "fields":
      case "subfields":
        return "works_count:>1"; // At least some activity
      default:
        return entityType satisfies never;
    }
  }

  /**
   * Fisher-Yates shuffle algorithm with optional seed
   */
  private shuffleArray<T>(array: readonly T[], seed?: number): T[] {
    const shuffled = [...array];
    // Simple seeded random number generator (not cryptographically secure)
    const random = seed !== undefined ? this.seededRandom(seed) : Math.random;

    for (let index = shuffled.length - 1; index > 0; index--) {
      const index_ = Math.floor(random() * (index + 1));
      [shuffled[index], shuffled[index_]] = [shuffled[index_], shuffled[index]];
    }
    return shuffled;
  }

  /**
   * Simple seeded random number generator
   */
  private seededRandom(seed: number): () => number {
    // Linear congruential generator constants (Numerical Recipes parameters).
    const LCG_MULTIPLIER = 1_664_525;
    const LCG_INCREMENT = 1_013_904_223;
    const LCG_MODULUS_BITS = 32;
    const modulus = Math.pow(2, LCG_MODULUS_BITS);

    let state = seed;
    return () => {
      state = (state * LCG_MULTIPLIER + LCG_INCREMENT) % modulus;
      return state / modulus;
    };
  }
}
