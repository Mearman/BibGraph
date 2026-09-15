/**
 * OpenAlex Concepts API Entity Methods
 * Provides methods for interacting with concept entities
 */

import type {
  AutocompleteResult,
  BaseAutocompleteOptions,
  Concept,
  ConceptSearchOptions,
  ConceptsFilters,
  ConceptsQueryParams,
  OpenAlexResponse,
  QueryParams,
} from "@bibgraph/types";
import { AutocompleteBaseResponseSchema, conceptSchema } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { OpenAlexBaseClient } from "../client";
import { AutocompleteApi } from "../utils/autocomplete";
import { isValidWikidata, normalizeExternalId } from "../utils/id-resolver";
import { buildFilterString } from "../utils/query-builder";
import { toQueryParams as toQueryParameters } from "../utils/query-params";

/**
OpenAlex API limit for autocomplete results
 */
const AUTOCOMPLETE_MAX_RESULTS = 200;

/**
OpenAlex API limit for the per_page parameter
 */
const MAX_PER_PAGE = 200;

/**
Highest valid OpenAlex concept hierarchy level
 */
const MAX_CONCEPT_LEVEL = 5;

/**
Sample size used to compute aggregate concept statistics
 */
const STATS_SAMPLE_SIZE = 1000;

/**
 * Type guard narrowing an unknown value to a plain object with string keys
 * @param value - Value to check
 * @returns True if the value is a non-null, non-array object
 */
const isRecord = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value);

/**
 * Concepts API class providing methods for concept operations
 */
export class ConceptsApi {
  private readonly autocompleteApi: AutocompleteApi;

  constructor(private readonly client: OpenAlexBaseClient) {
    this.autocompleteApi = new AutocompleteApi(client);
  }

  /**
   * Type guard to check if params is QueryParams by checking for string sort property
   */
  private isQueryParams(params: unknown): params is QueryParams {
    if (typeof params !== "object" || params === null) {
      return false;
    }
    if ("sort" in params) {
      const sortValue = params.sort;
      return typeof sortValue === "string";
    }
    return true; // If no sort property, assume it's basic QueryParams
  }

  /**
   * Type guard to check if params is ConceptsQueryParams
   */
  private isConceptsQueryParams(
    params: unknown,
  ): params is ConceptsQueryParams {
    return typeof params === "object" && params !== null;
  }

  /**
   * Autocomplete concepts based on partial name or query string
   * @param query - Search query string (e.g., partial concept name)
   * @param options - Optional parameters for autocomplete behavior
   * @returns Promise resolving to array of autocomplete results
   * @example
   * ```typescript
   * const suggestions = await conceptsApi.autocomplete('machine learning');
   * ```
   */
  async autocomplete(
    query: string,
    options: Readonly<BaseAutocompleteOptions> = {},
  ): Promise<AutocompleteResult[]> {
    if (!query || typeof query !== "string") {
      throw new Error(
        "Query parameter is required and must be a non-empty string",
      );
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return [];
    }

    try {
      const endpoint = "autocomplete/concepts";
      const queryParameters: QueryParams & { q: string } = {
        q: trimmedQuery,
      };

      // Apply per_page limit if specified
      if (options.per_page !== undefined && options.per_page > 0) {
        queryParameters.per_page = Math.min(options.per_page, AUTOCOMPLETE_MAX_RESULTS); // Respect OpenAlex API limits
      }

      const response = await this.client.get(
        endpoint,
        queryParameters,
        AutocompleteBaseResponseSchema,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "concept",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        "concepts-api",
        `Autocomplete failed for query "${query}": ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get a single concept by its OpenAlex ID or Wikidata ID
   * @param id - The concept ID (OpenAlex concept ID) or Wikidata ID in various formats:
   *   - Q123456
   *   - wikidata:Q123456
   *   - https://www.wikidata.org/wiki/Q123456
   *   - https://www.wikidata.org/entity/Q123456
   * @param params - Additional query parameters with strict typing
   * @returns Promise resolving to a concept
   * @throws An OpenAlexApiError when the concept is not found or the ID format is invalid
   * @example
   * ```typescript
   * // Using OpenAlex ID
   * const concept1 = await conceptsApi.getConcept('https://openalex.org/C123456789', {
   *   select: ['id', 'display_name', 'works_count']
   * });
   *
   * // Using Wikidata ID (various formats)
   * const concept2 = await conceptsApi.getConcept('Q123456');
   * const concept3 = await conceptsApi.getConcept('wikidata:Q123456');
   * const concept4 = await conceptsApi.getConcept('https://www.wikidata.org/wiki/Q123456');
   * ```
   */
  async getConcept(
    id: string,
    params: ConceptsQueryParams | QueryParams = {},
  ): Promise<Concept> {
    if (!id || typeof id !== "string") {
      throw new Error("Concept ID must be a non-empty string");
    }

    // Check if this might be a Wikidata ID and normalize it
    let normalizedId = id;
    if (isValidWikidata(id)) {
      const wikidataId = normalizeExternalId(id, "wikidata");
      if (wikidataId !== null) {
        // The normalizer returns Q notation, but OpenAlex API expects wikidata: prefix
        normalizedId = wikidataId.startsWith("Q")
          ? `wikidata:${wikidataId}`
          : wikidataId;
      }
      // If normalization failed, fall through to use original ID
    }

    // Handle case where ID is already in wikidata: format
    if (id.startsWith("wikidata:Q")) {
      normalizedId = id;
    }

    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      return this.client.getById<Concept>({
        schema: conceptSchema,
        endpoint: "concepts",
        id: normalizedId,
        params,
      });
    }
    // Otherwise, convert from ConceptsQueryParams
    if (this.isConceptsQueryParams(params)) {
      return this.client.getById<Concept>({
        schema: conceptSchema,
        endpoint: "concepts",
        id: normalizedId,
        params: toQueryParameters(params),
      });
    }
    // Default case - treat as basic params
    return this.client.getById<Concept>({
      schema: conceptSchema,
      endpoint: "concepts",
      id: normalizedId,
      params,
    });
  }

  /**
   * Get a list of concepts with optional filtering and pagination
   * @param params - Query parameters for filtering and pagination
   * @returns Promise resolving to a paginated response of concepts
   * @example
   * ```typescript
   * const response = await conceptsApi.getConcepts({
   *   filter: { 'works_count': '>100' },
   *   page: 1,
   *   per_page: 25
   * });
   * ```
   */
  async getConcepts(
    params: ConceptsQueryParams | QueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      return this.client.getResponse<Concept>("concepts", params, conceptSchema);
    }
    // Otherwise, convert from ConceptsQueryParams
    if (this.isConceptsQueryParams(params)) {
      return this.client.getResponse<Concept>(
        "concepts",
        toQueryParameters(params),
      conceptSchema);
    }
    // Default case - treat as basic params
    return this.client.getResponse<Concept>("concepts", toQueryParameters({}), conceptSchema);
  }

  /**
   * Search for concepts using text search with strict validation
   * @param query - Search query string (must be non-empty)
   * @param options - Search options including filters and pagination
   * @returns Promise resolving to search results
   * @throws An Error when query is empty or invalid pagination parameters
   * @example
   * ```typescript
   * const results = await conceptsApi.searchConcepts('machine learning', {
   *   sort: 'cited_by_count',
   *   per_page: 10,
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
  async searchConcepts(
    query: string,
    options: Readonly<ConceptSearchOptions> = {},
  ): Promise<OpenAlexResponse<Concept>> {
    if (!query || typeof query !== "string" || query.trim().length === 0) {
      throw new Error("Search query must be a non-empty string");
    }

    const {
      sort = "relevance_score:desc",
      page = 1,
      per_page = 25,
      select,
    } = options;
    const filtersValue: unknown = options.filters;

    // Validate pagination parameters
    if (page < 1) {
      throw new Error("Page number must be at least 1");
    }
    if (per_page < 1 || per_page > MAX_PER_PAGE) {
      throw new Error(`per_page must be between 1 and ${String(MAX_PER_PAGE)}`);
    }

    const baseParameters = {
      search: query.trim(),
      filter: isRecord(filtersValue)
        ? buildFilterString(filtersValue)
        : "",
      sort: sort,
      page,
      per_page,
    };

    const parameters: ConceptsQueryParams =
      select === undefined ? baseParameters : { ...baseParameters, select };

    return this.getConcepts(parameters);
  }

  /**
   * Get concepts by minimum works count with strict validation
   * @param minWorksCount - Minimum number of works for concepts (must be at least 0)
   * @param params - Additional query parameters
   * @returns Promise resolving to filtered concepts
   * @throws An Error when minWorksCount is invalid
   * @example
   * ```typescript
   * const popularConcepts = await conceptsApi.getConceptsByWorksCount(100, {
   *   sort: 'works_count',
   *   per_page: 50
   * });
   * ```
   */
  async getConceptsByWorksCount(
    minWorksCount: number,
    params: ConceptsQueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    if (!Number.isInteger(minWorksCount) || minWorksCount < 0) {
      throw new Error("minWorksCount must be a non-negative integer");
    }

    const filters: ConceptsFilters = {
      works_count: `>=${String(minWorksCount)}`,
    };

    return this.getConcepts({
      ...params,
      filter: buildFilterString(filters),
    });
  }

  /**
   * Get concepts by level
   * @param level - Concept level (0-5)
   * @param params - Additional query parameters
   * @returns Promise resolving to concepts at the specified level
   * @example
   * ```typescript
   * const topLevelConcepts = await conceptsApi.getConceptsByLevel(0, {
   *   sort: 'works_count',
   *   per_page: 25
   * });
   * ```
   */
  async getConceptsByLevel(
    level: number,
    params: ConceptsQueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    if (!Number.isInteger(level) || level < 0 || level > MAX_CONCEPT_LEVEL) {
      throw new Error("Level must be an integer between 0 and 5");
    }

    const filters: ConceptsFilters = {
      level: level.toString(),
    };

    return this.getConcepts({
      ...params,
      filter: buildFilterString(filters),
    });
  }

  /**
   * Get random concepts
   * @param params - Query parameters
   * @returns Promise resolving to random concepts
   * @example
   * ```typescript
   * const randomConcepts = await conceptsApi.getRandomConcepts({
   *   per_page: 10,
   *   select: ['id', 'display_name', 'works_count']
   * });
   * ```
   */
  async getRandomConcepts(
    params: ConceptsQueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    return this.getConcepts({
      ...params,
      sort: "random",
    });
  }

  /**
   * Stream all concepts using cursor pagination
   * @param params - Query parameters for filtering
   * @returns Batches of concepts
   * @example
   * ```typescript
   * for await (const conceptBatch of conceptsApi.streamConcepts({ filter: { 'works_count': '>10' } })) {
   *   console.log(`Processing ${conceptBatch.length} concepts`);
   * }
   * ```
   */
  async *streamConcepts(
    params: ConceptsQueryParams | QueryParams = {},
  ): AsyncGenerator<Concept[], void, unknown> {
    // If it's already QueryParams (has string sort), pass directly
    if (
      "sort" in params &&
      typeof params.sort === "string" &&
      this.isQueryParams(params)
    ) {
      yield* this.client.stream<Concept>("concepts", params, conceptSchema);
      return;
    }
    // Otherwise, convert from ConceptsQueryParams
    if (this.isConceptsQueryParams(params)) {
      yield* this.client.stream<Concept>("concepts", toQueryParameters(params), conceptSchema);
    } else {
      // Default case - treat as basic params
      yield* this.client.stream<Concept>("concepts", toQueryParameters({}), conceptSchema);
    }
  }

  /**
   * Get all concepts (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to array of all matching concepts
   * @example
   * ```typescript
   * const allConcepts = await conceptsApi.getAllConcepts({
   *   filter: { 'works_count': '>1000' }
   * }, 500);
   * ```
   */
  async getAllConcepts(
    params: ConceptsQueryParams = {},
    maxResults?: number,
  ): Promise<Concept[]> {
    return this.client.getAll<Concept>(
      "concepts",
      toQueryParameters(params),
      conceptSchema,
      maxResults,
    );
  }

  /**
   * Get concepts statistics
   * @param params - Query parameters for filtering
   * @returns Promise resolving to aggregated statistics
   * @example
   * ```typescript
   * const stats = await conceptsApi.getConceptsStats({
   *   filter: { 'level': 0 }
   * });
   * ```
   */
  async getConceptsStats(params: ConceptsQueryParams = {}): Promise<{
    count: number;
    total_works: number;
    total_citations: number;
    avg_works_per_concept: number;
    avg_citations_per_concept: number;
    levels_distribution: Record<number, number>;
  }> {
    const response = await this.getConcepts({
      ...params,
      per_page: 1, // We only need the meta information
    });

    // For more detailed stats, we might need to aggregate from a sample
    const sampleSize = Math.min(STATS_SAMPLE_SIZE, response.meta.count);
    const sample = await this.getConcepts({
      ...params,
      per_page: sampleSize,
    });

    const totalWorks = sample.results.reduce(
      (sum, concept) => sum + concept.works_count,
      0,
    );
    const totalCitations = sample.results.reduce(
      (sum, concept) => sum + concept.cited_by_count,
      0,
    );

    // Calculate level distribution
    const levelsDistribution: Record<number, number> = {};
    for (const concept of sample.results) {
      levelsDistribution[concept.level] =
        (levelsDistribution[concept.level] || 0) + 1;
    }

    return {
      count: response.meta.count,
      total_works: totalWorks,
      total_citations: totalCitations,
      avg_works_per_concept: totalWorks / sample.results.length,
      avg_citations_per_concept: totalCitations / sample.results.length,
      levels_distribution: levelsDistribution,
    };
  }

  /**
   * Get trending concepts by year range
   * @param fromYear - Start year
   * @param toYear - End year (optional, defaults to current year)
   * @param params - Additional query parameters
   * @returns Promise resolving to trending concepts
   * @example
   * ```typescript
   * const trending = await conceptsApi.getTrendingConcepts(2020, 2023, {
   *   per_page: 20,
   *   sort: 'works_count'
   * });
   * ```
   */
  async getTrendingConcepts(
    fromYear: number,
    toYear: number = new Date().getFullYear(),
    params: ConceptsQueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    const filters: ConceptsFilters = {
      from_created_date: `${String(fromYear)}-01-01`,
      to_created_date: `${String(toYear)}-12-31`,
      works_count: ">10", // Filter out very rare concepts
    };

    return this.getConcepts({
      ...params,
      filter: buildFilterString(filters),
      sort: "works_count",
    });
  }

  /**
   * Get highly cited concepts
   * @param params - Additional query parameters
   * @returns Promise resolving to highly cited concepts
   * @example
   * ```typescript
   * const highlyCited = await conceptsApi.getHighlyCitedConcepts({
   *   per_page: 25,
   *   select: ['id', 'display_name', 'cited_by_count', 'works_count']
   * });
   * ```
   */
  async getHighlyCitedConcepts(
    params: ConceptsQueryParams = {},
  ): Promise<OpenAlexResponse<Concept>> {
    const filters: ConceptsFilters = {
      cited_by_count: ">1000",
    };

    return this.getConcepts({
      ...params,
      filter: buildFilterString(filters),
      sort: "cited_by_count",
    });
  }
}
