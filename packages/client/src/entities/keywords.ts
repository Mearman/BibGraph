/**
 * OpenAlex Keywords API Entity Methods
 * Provides methods for interacting with Keywords (research keywords) through the OpenAlex API
 */

import type {
  Keyword,
  KeywordsFilters,
  OpenAlexResponse,
  QueryParams,
} from "@bibgraph/types";
import { extractPropertyValue, keywordSchema,trustObjectShape  } from "@bibgraph/types";

import type { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
// Replace lodash-es with native JavaScript
const isString = (value: unknown): value is string => typeof value === "string";

/**
OpenAlex API limit for the per_page parameter
 */
const MAX_PER_PAGE = 200;

/**
Sample size used to compute aggregate keyword statistics
 */
const STATS_SAMPLE_SIZE = 1000;


/**
 * Strict query parameters specific to Keywords API
 */
export interface StrictKeywordsQueryParams {
  /**
  Filter string for keyword queries
   */
  readonly filter?: string;

  /**
  Search query string
   */
  readonly search?: string;

  /**
  Sort order for results
   */
  readonly sort?: KeywordSortOption;

  /**
  Page number for pagination
   */
  readonly page?: number;

  /**
  Number of results per page
   */
  readonly per_page?: number;

  /**
  Cursor for cursor-based pagination
   */
  readonly cursor?: string;

  /**
  Specific fields to include in response
   */
  readonly select?: KeywordSelectField[];

  /**
  Sample size for random sampling
   */
  readonly sample?: number;

  /**
  Seed for reproducible random sampling
   */
  readonly seed?: number;

  /**
  Group by field
   */
  readonly group_by?: string;
}

/**
 * Type guard to check if a value is a string array
 */
const isStringArray = (value: unknown): value is string[] => Array.isArray(value) && value.every((item) => isString(item));

/**
 * Convert strict keywords query params to base query params
 */
const toQueryParameters = (params: StrictKeywordsQueryParams): QueryParams => {
  const result: QueryParams = {
    ...params,
  };

  if (params.sort && isString(params.sort)) {
    result.sort = params.sort;
  }

  if (params.select && isStringArray(params.select)) {
    result.select = params.select;
  }

  // Convert filter object to filter string if it exists and is an object
  if (
    params.filter !== undefined &&
    typeof params.filter === "object" &&
    !isString(params.filter)
  ) {
    result.filter = buildFilterString(params.filter);
  }

  return result;
};

/**
 * Extended query parameters specific to Keywords API (for backward compatibility)
 */
export type KeywordsQueryParams = QueryParams;

/**
 * Sort options for keywords with strict typing
 */
export type KeywordSortOption =
  | "relevance_score"
  | "cited_by_count"
  | "works_count"
  | "created_date"
  | "updated_date"
  | "display_name"
  | "random"
  | "relevance_score:asc"
  | "relevance_score:desc"
  | "cited_by_count:asc"
  | "cited_by_count:desc"
  | "works_count:asc"
  | "works_count:desc"
  | "created_date:asc"
  | "created_date:desc"
  | "updated_date:asc"
  | "updated_date:desc"
  | "display_name:asc"
  | "display_name:desc";

/**
 * Selectable fields for keywords queries
 */
export type KeywordSelectField =
  | "id"
  | "display_name"
  | "description"
  | "keywords"
  | "works_count"
  | "cited_by_count"
  | "ids"
  | "counts_by_year"
  | "works_api_url"
  | "updated_date"
  | "created_date";

/**
 * Options for searching keywords with strict typing
 */
export interface SearchKeywordsOptions {
  /**
  Filters to apply to the search
   */
  readonly filters?: KeywordsFilters;

  /**
  Sort order for results
   */
  readonly sort?: KeywordSortOption;

  /**
  Page number for pagination (1-based)
   */
  readonly page?: number;

  /**
  Number of results per page (1-200)
   */
  readonly per_page?: number;

  /**
  Specific fields to include in response
   */
  readonly select?: KeywordSelectField[];
}

/**
 * Keywords API class providing methods for keyword operations
 */
export class KeywordsApi {
  constructor(private readonly client: OpenAlexBaseClient) {}

  /**
   * Type guard to check if params is QueryParams by checking for string sort property
   */
  private isQueryParams(params: unknown): params is QueryParams {
    if (typeof params !== "object" || params === null) {
      return false;
    }
    if (!("sort" in params)) {
      return false;
    }
    // After validation, safely cast to record to access properties
    const parametersObject = trustObjectShape(params);
    const sortValue = extractPropertyValue({ obj: parametersObject, key: "sort" });
    return typeof sortValue === "string";
  }

  /**
   * Type guard to check if params is StrictKeywordsQueryParams
   */
  private isStrictKeywordsQueryParams(
    params: unknown,
  ): params is StrictKeywordsQueryParams {
    return typeof params === "object" && params !== null;
  }

  /**
   * Get a single keyword by its OpenAlex ID
   * @param id - The keyword ID (must be a valid OpenAlex keyword ID)
   * @param params - Additional query parameters with strict typing
   * @returns Promise resolving to a keyword
   * @throws An OpenAlexApiError when the keyword is not found or the ID format is invalid
   * @example
   * ```typescript
   * const keyword = await keywordsApi.getKeyword('https://openalex.org/K123456789', {
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
  async getKeyword(
    id: string,
    params: StrictKeywordsQueryParams | QueryParams = {},
  ): Promise<Keyword> {
    if (!id || typeof id !== "string") {
      throw new Error("Keyword ID must be a non-empty string");
    }
    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      return this.client.getById({ schema: keywordSchema, endpoint: "keywords", id, params });
    }
    // Otherwise, convert from StrictKeywordsQueryParams
    if (this.isStrictKeywordsQueryParams(params)) {
      return this.client.getById({
        schema: keywordSchema,
        endpoint: "keywords",
        id,
        params: toQueryParameters(params),
      });
    }
    // Default case - treat as basic params
    return this.client.getById({
      schema: keywordSchema,
      endpoint: "keywords",
      id,
      params: toQueryParameters({}),
    });
  }

  /**
   * Get a list of keywords with optional filtering and pagination
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to a paginated response of keywords
   * @example
   * ```typescript
   * const response = await keywordsApi.getKeywords({
   *   filter: { 'works_count': '>100' },
   *   page: 1,
   *   per_page: 25
   * });
   * ```
   */
  async getKeywords(
    params: StrictKeywordsQueryParams | QueryParams = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      return this.client.getResponse<Keyword>("keywords", params, keywordSchema);
    }
    // Otherwise, convert from StrictKeywordsQueryParams
    if (this.isStrictKeywordsQueryParams(params)) {
      return this.client.getResponse<Keyword>(
        "keywords",
        toQueryParameters(params),
      keywordSchema);
    }
    // Default case - treat as basic params
    return this.client.getResponse<Keyword>("keywords", toQueryParameters({}), keywordSchema);
  }

  /**
   * Search for keywords using text search with strict validation
   * @param query - Search query string (must be non-empty)
   * @param options - Search options including filters and pagination
   * @returns Promise resolving to search results
   * @throws An Error when query is empty or invalid pagination parameters
   * @example
   * ```typescript
   * const results = await keywordsApi.searchKeywords('machine learning', {
   *   sort: 'cited_by_count',
   *   per_page: 10,
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
  async searchKeywords(
    query: string,
    options: SearchKeywordsOptions = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Search query must be a non-empty string");
    }

    const {
      filters = {},
      sort = "relevance_score:desc",
      page = 1,
      per_page = 25,
      select,
    } = options;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error("Page number must be at least 1");
    }
    if (per_page < 1 || per_page > MAX_PER_PAGE) {
      throw new Error(`per_page must be between 1 and ${String(MAX_PER_PAGE)}`);
    }

    const baseParameters = {
      search: query.trim(),
      filter: buildFilterString(filters),
      sort,
      page,
      per_page,
    };

    const parameters: StrictKeywordsQueryParams =
      select === undefined ? baseParameters : { ...baseParameters, select };

    return this.getKeywords(parameters);
  }

  /**
   * Get keywords by minimum works count with strict validation
   * @param minWorksCount - Minimum number of works for keywords (must be at least 0)
   * @param params - Additional query parameters
   * @returns Promise resolving to filtered keywords
   * @throws An Error when minWorksCount is invalid
   * @example
   * ```typescript
   * const popularKeywords = await keywordsApi.getKeywordsByWorksCount(100, {
   *   sort: 'works_count',
   *   per_page: 50,
   *   select: ['id', 'display_name', 'works_count', 'cited_by_count']
   * });
   * ```
   */
  async getKeywordsByWorksCount(
    minWorksCount: number,
    params: StrictKeywordsQueryParams = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    if (!Number.isInteger(minWorksCount) || minWorksCount < 0) {
      throw new Error("minWorksCount must be a non-negative integer");
    }

    const filters: KeywordsFilters = {
      works_count: `>=${String(minWorksCount)}`,
    };

    return this.getKeywords({
      ...params,
      filter: buildFilterString(filters),
    });
  }

  /**
   * Get random keywords
   * @param params - Query parameters
   * @returns Promise resolving to random keywords
   * @example
   * ```typescript
   * const randomKeywords = await keywordsApi.getRandomKeywords({
   *   per_page: 10,
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
  async getRandomKeywords(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    return this.getKeywords({
      ...params,
      sort: "random",
    });
  }

  /**
   * Stream all keywords using cursor pagination
   * @param params - Query parameters for filtering
   * @returns Batches of keywords
   * @example
   * ```typescript
   * for await (const keywordBatch of keywordsApi.streamKeywords({ filter: { 'works_count': '>10' } })) {
   *   logger.debug("api", `Processing ${keywordBatch.length} keywords`);
   * }
   * ```
   */
  async *streamKeywords(
    params: StrictKeywordsQueryParams | QueryParams = {},
  ): AsyncGenerator<Keyword[], void, unknown> {
    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      yield* this.client.stream<Keyword>("keywords", params, keywordSchema);
      return;
    }
    // Otherwise, convert from StrictKeywordsQueryParams
    if (this.isStrictKeywordsQueryParams(params)) {
      yield* this.client.stream<Keyword>("keywords", toQueryParameters(params), keywordSchema);
    } else {
      // Default case - treat as basic params
      yield* this.client.stream<Keyword>("keywords", toQueryParameters({}), keywordSchema);
    }
  }

  /**
   * Get all keywords (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to array of all matching keywords
   * @example
   * ```typescript
   * const allKeywords = await keywordsApi.getAllKeywords({
   *   filter: { 'works_count': '>1000' }
   * }, 500);
   * ```
   */
  async getAllKeywords(
    params: StrictKeywordsQueryParams = {},
    maxResults?: number,
  ): Promise<Keyword[]> {
    return this.client.getAll<Keyword>(
      "keywords",
      toQueryParameters(params),
      keywordSchema,
      maxResults,
    );
  }

  /**
   * Get keywords statistics
   * @param params - Query parameters for filtering
   * @returns Promise resolving to aggregated statistics
   * @example
   * ```typescript
   * const stats = await keywordsApi.getKeywordsStats({
   *   filter: { 'works_count': '>100' }
   * });
   * ```
   */
  async getKeywordsStats(params: StrictKeywordsQueryParams = {}): Promise<{
    count: number;
    total_works: number;
    total_citations: number;
    avg_works_per_keyword: number;
    avg_citations_per_keyword: number;
  }> {
    const response = await this.getKeywords({
      ...params,
      per_page: 1, // We only need the meta information
    });

    // For more detailed stats, we might need to aggregate from a sample
    const sampleSize = Math.min(STATS_SAMPLE_SIZE, response.meta.count);
    const sample = await this.getKeywords({
      ...params,
      per_page: sampleSize,
    });

    const totalWorks = sample.results.reduce(
      (sum, keyword) =>
        sum +
        keyword.counts_by_year.reduce(
          (yearSum, year) => yearSum + year.works_count,
          0,
        ),
      0,
    );
    const totalCitations = sample.results.reduce(
      (sum, keyword) => sum + keyword.cited_by_count,
      0,
    );

    return {
      count: response.meta.count,
      total_works: totalWorks,
      total_citations: totalCitations,
      avg_works_per_keyword: totalWorks / sample.results.length,
      avg_citations_per_keyword: totalCitations / sample.results.length,
    };
  }

  /**
   * Get trending keywords by year range
   * @param fromYear - Start year
   * @param toYear - End year (optional, defaults to current year)
   * @param params - Additional query parameters
   * @returns Promise resolving to trending keywords
   * @example
   * ```typescript
   * const trending = await keywordsApi.getTrendingKeywords(2020, 2023, {
   *   per_page: 20,
   *   sort: 'works_count'
   * });
   * ```
   */
  async getTrendingKeywords(
    fromYear: number,
    toYear: number = new Date().getFullYear(),
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    const filters: KeywordsFilters = {
      from_created_date: `${String(fromYear)}-01-01`,
      to_created_date: `${String(toYear)}-12-31`,
      works_count: ">10", // Filter out very rare keywords
    };

    return this.getKeywords({
      ...params,
      filter: buildFilterString(filters),
      sort: "works_count",
    });
  }

  /**
   * Get highly cited keywords
   * @param params - Additional query parameters
   * @returns Promise resolving to highly cited keywords
   * @example
   * ```typescript
   * const highlyCited = await keywordsApi.getHighlyCitedKeywords({
   *   per_page: 25,
   *   select: ['id', 'display_name', 'cited_by_count', 'works_count']
   * });
   * ```
   */
  async getHighlyCitedKeywords(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Keyword>> {
    const filters: KeywordsFilters = {
      cited_by_count: ">1000",
    };

    return this.getKeywords({
      ...params,
      filter: buildFilterString(filters),
      sort: "cited_by_count",
    });
  }
}
