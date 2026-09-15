/**
 * OpenAlex Funders API
 * Provides methods for interacting with OpenAlex funders endpoint
 */

import type {
  AutocompleteResult,
  Funder,
  FundersFilters,
  Institution,
  OpenAlexResponse,
  QueryParams,
  Work,
} from "@bibgraph/types";
import { AutocompleteBaseResponseSchema, funderSchema, institutionSchema, workSchema } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";

/**
Maximum number of funders returned by a random sample
 */
const MAX_RANDOM_SAMPLE_SIZE = 50;

/**
OpenAlex API limit for the per_page parameter
 */
const MAX_PER_PAGE = 200;

/**
 * FundersApi provides methods for interacting with OpenAlex funders Funders represent organizations that provide funding for research and academic work
 */
export class FundersApi {
  private readonly client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single funder by its OpenAlex ID
   * @param id - The OpenAlex ID for the funder (e.g., 'F4320306076')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the funder object
   */
  async get(id: string, params: QueryParams = {}): Promise<Funder> {
    return this.client.getById<Funder>({ schema: funderSchema, endpoint: "funders", id, params });
  }

  /**
   * Get a single funder by its OpenAlex ID (alias for get)
   * @param id - The OpenAlex ID for the funder (e.g., 'F4320306076')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the funder object
   */
  async getFunder(id: string, params: QueryParams = {}): Promise<Funder> {
    return this.get(id, params);
  }

  /**
   * Get multiple funders with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated funders response
   */
  async getMultiple(
    params: QueryParams & FundersFilters = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.client.getResponse<Funder>("funders", params, funderSchema);
  }

  /**
   * Get multiple funders with optional filtering and sorting (alias for getMultiple)
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated funders response
   */
  async getFunders(
    params: QueryParams & FundersFilters & { filter?: string } = {},
  ): Promise<OpenAlexResponse<Funder>> {
    const processedParameters = this.buildQueryParams(params);
    return this.client.getResponse<Funder>("funders", processedParameters, funderSchema);
  }

  /**
   * Build query parameters with proper filter processing
   */
  private buildQueryParams(
    params: QueryParams & FundersFilters & { filter?: string } = {},
  ): QueryParams {
    const { filter, ...otherParameters } = params;
    const queryParameters: QueryParams = { ...otherParameters };

    // Handle filter object conversion to string
    if (
      filter !== undefined &&
      typeof filter === "object" &&
      Object.keys(filter).length > 0
    ) {
      queryParameters.filter = buildFilterString(filter);
    }

    return queryParameters;
  }

  /**
   * Search funders by name or description
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async search(
    query: string,
    params: QueryParams & FundersFilters = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({
      ...params,
      search: query,
    });
  }

  /**
   * Search funders by name or description (alias for search)
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async searchFunders(
    query: string,
    params: QueryParams & FundersFilters = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.search(query, params);
  }

  /**
   * Autocomplete funders by name for quick search suggestions
   * @param query - Search query string for autocomplete suggestions
   * @returns Promise resolving to array of funder autocomplete results
   * @example
   * ```typescript
   * const suggestions = await fundersApi.autocomplete('national science');
   * console.log(`Found ${suggestions.length} funder suggestions`);
   *
   * // Iterate through suggestions
   * suggestions.forEach(funder => {
   *   console.log(`${funder.display_name} (${funder.works_count} works funded)`);
   * });
   * ```
   */
  async autocomplete(query: string): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const endpoint = "autocomplete/funders";
      const queryParameters: QueryParams & { q: string } = {
        q: query.trim(),
      };

      const response = await this.client.get(
        endpoint,
        queryParameters,
        AutocompleteBaseResponseSchema,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "funder",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        "funders-api",
        `Autocomplete failed for query "${query}": ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get funders with specific filters applied
   * @param filters - Funder-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered funders response
   */
  async filters(
    filters: FundersFilters,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({ ...params, ...filters });
  }

  /**
   * Get a random sample of funders
   * @param count - Number of random funders to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random funders
   */
  async randomSample(
    count = 10,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({
      ...params,
      sample: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
      per_page: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
    });
  }

  /**
   * Get grants associated with a funder
   * Note: This returns works that were funded by the funder, as OpenAlex doesn't have a separate grants entity
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works funded by this funder (representing grants)
   */
  async getFunderGrants(
    funderId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    return this.getFunderWorks(funderId, params);
  }

  /**
   * Get works funded by a funder
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works funded by this funder
   */
  async getFunderWorks(
    funderId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    return this.client.getResponse<Work>("works", {
      ...params,
      filter: `grants.funder:${funderId}`,
    }, workSchema);
  }

  /**
   * Get institutions that have received funding from a funder
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to institutions funded by this funder
   */
  async getFunderInstitutions(
    funderId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Institution>> {
    return this.client.getResponse<Institution>("institutions", {
      ...params,
      filter: `works_count:>0`, // Get institutions with works, then filter by funder in practice
    }, institutionSchema);
  }

  /**
   * Get funders by country
   * @param countryCode - ISO country code (e.g., 'US', 'GB')
   * @param params - Optional query parameters
   * @returns Promise resolving to funders from the specified country
   */
  async getByCountry(
    countryCode: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.filters({ country_code: countryCode }, params);
  }

  /**
   * Get funders by multiple countries
   * @param countryCodes - Array of ISO country codes (e.g., ['US', 'GB', 'CA'])
   * @param params - Optional query parameters
   * @returns Promise resolving to funders from the specified countries
   */
  async getByCountries(
    countryCodes: readonly string[],
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.filters({ country_code: [...countryCodes] }, params);
  }

  /**
   * Get funders by research topics
   * @param topicIds - Array of topic OpenAlex IDs
   * @param params - Optional query parameters
   * @returns Promise resolving to funders that fund research in specified topics
   */
  async getByTopics(
    topicIds: readonly string[],
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.filters({ "topics.id": topicIds.join("|") }, params);
  }

  /**
   * Get top funders by grants count
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by number of grants awarded
   */
  async getTopByGrantsCount(
    limit = 50,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({
      ...params,
      sort: "grants_count:desc",
      per_page: Math.min(limit, MAX_PER_PAGE),
    });
  }

  /**
   * Get top funders by works count
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by number of funded works
   */
  async getTopByWorksCount(
    limit = 50,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({
      ...params,
      sort: "works_count:desc",
      per_page: Math.min(limit, MAX_PER_PAGE),
    });
  }

  /**
   * Get top funders by citations
   * @param limit - Maximum number of top funders to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top funders by citation impact of funded works
   */
  async getTopByCitations(
    limit = 50,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Funder>> {
    return this.getMultiple({
      ...params,
      sort: "cited_by_count:desc",
      per_page: Math.min(limit, MAX_PER_PAGE),
    });
  }

  /**
   * Get funding statistics for a funder over time
   * @param funderId - The OpenAlex ID for the funder
   * @param params - Optional query parameters
   * @returns Promise resolving to the funder with year-over-year statistics
   */
  async getFundingStats(
    funderId: string,
    params: QueryParams = {},
  ): Promise<Funder> {
    return this.get(funderId, {
      ...params,
      // Request additional statistics fields if available
    });
  }

  /**
   * Stream all funders using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of funders per batch (default: 200)
   * @returns Async generator yielding batches of funders
   */
  async *stream(
    params: QueryParams & FundersFilters = {},
    batchSize = 200,
  ): AsyncGenerator<Funder[], void, unknown> {
    yield* this.client.stream<Funder>("funders", params,funderSchema,  batchSize);
  }

  /**
   * Get all funders (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching funders
   */
  async getAll(
    params: QueryParams & FundersFilters = {},
    maxResults?: number,
  ): Promise<Funder[]> {
    return this.client.getAll<Funder>("funders", params,funderSchema,  maxResults);
  }
}
