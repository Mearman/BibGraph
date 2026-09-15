/**
 * OpenAlex Publishers API
 * Provides methods for interacting with OpenAlex publishers endpoint
 */

import type {
  AutocompleteResult,
  OpenAlexResponse,
  Publisher,
  PublishersFilters,
  QueryParams,
  Source,
  Work,
} from "@bibgraph/types";
import { AutocompleteBaseResponseSchema, publisherSchema, sourceSchema, workSchema } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";

/**
Maximum number of publishers returned by a random sample
 */
const MAX_RANDOM_SAMPLE_SIZE = 50;

/**
OpenAlex API limit for the per_page parameter
 */
const MAX_PER_PAGE = 200;

/**
 * Search options for publishers API
 */
export interface PublisherSearchOptions {
  filters?: PublishersFilters;
  sort?: string;
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * PublishersApi provides methods for interacting with OpenAlex publishers
 * Publishers represent organizations that publish academic sources (journals, conferences, etc.)
 */
export class PublishersApi {
  private readonly client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single publisher by its OpenAlex ID
   * @param id - The OpenAlex ID for the publisher (e.g., 'P4310320990')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the publisher object
   */
  async get(id: string, params: QueryParams = {}): Promise<Publisher> {
    return this.client.getById<Publisher>({
      schema: publisherSchema,
      endpoint: "publishers",
      id,
      params,
    });
  }

  /**
   * Get a single publisher by its OpenAlex ID (alias for get)
   * @param id - The OpenAlex ID for the publisher (e.g., 'P4310320990')
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the publisher object
   */
  async getPublisher(id: string, params: QueryParams = {}): Promise<Publisher> {
    return this.get(id, params);
  }

  /**
   * Get multiple publishers with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated publishers response
   */
  async getMultiple(
    params: QueryParams & PublishersFilters = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.client.getResponse<Publisher>("publishers", params, publisherSchema);
  }

  /**
   * Get multiple publishers with optional filtering and sorting (alias for getMultiple)
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated publishers response
   */
  async getPublishers(
    params: PublisherSearchOptions = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    const processedParameters = this.buildQueryParams(params);
    return this.client.getResponse<Publisher>("publishers", processedParameters, publisherSchema);
  }

  /**
   * Build query parameters with proper filter processing
   */
  private buildQueryParams(options: PublisherSearchOptions = {}): QueryParams {
    const { filters, sort, page, per_page, select, ...otherOptions } = options;

    const queryParameters: QueryParams = {
      ...otherOptions,
    };

    // Handle filters
    if (filters && Object.keys(filters).length > 0) {
      queryParameters.filter = buildFilterString(filters);
    }

    // Add sort if provided
    if (sort !== undefined) {
      queryParameters.sort = sort;
    }

    // Add pagination if provided
    if (page !== undefined) {
      queryParameters.page = page;
    }
    if (per_page !== undefined) {
      queryParameters.per_page = per_page;
    }

    // Add select if provided
    if (select) {
      queryParameters.select = select;
    }

    return queryParameters;
  }

  /**
   * Search publishers by name
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async search(
    query: string,
    params: QueryParams & PublishersFilters = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({
      ...params,
      search: query,
    });
  }

  /**
   * Search publishers by name (alias for search)
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async searchPublishers(
    query: string,
    params: QueryParams & PublishersFilters = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.search(query, params);
  }

  /**
   * Autocomplete publishers by name for quick search suggestions
   * @param query - Search query string for autocomplete suggestions
   * @returns Promise resolving to array of publisher autocomplete results
   * @example
   * ```typescript
   * const suggestions = await publishersApi.autocomplete('springer');
   * console.log(`Found ${suggestions.length} publisher suggestions`);
   *
   * // Iterate through suggestions
   * suggestions.forEach(publisher => {
   *   console.log(`${publisher.display_name} (${publisher.works_count} works)`);
   * });
   * ```
   */
  async autocomplete(query: string): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const endpoint = "autocomplete/publishers";
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
        entity_type: "publisher",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        "publishers-api",
        `Autocomplete failed for query "${query}": ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get publishers with specific filters applied
   * @param filters - Publisher-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered publishers response
   */
  async filters(
    filters: PublishersFilters,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({ ...params, ...filters });
  }

  /**
   * Get a random sample of publishers
   * @param count - Number of random publishers to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random publishers
   */
  async randomSample(
    count = 10,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({
      ...params,
      sample: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
      per_page: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
    });
  }

  /**
   * Get sources (journals, conferences) published by a publisher
   * @param publisherId - The OpenAlex ID for the publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to sources published by this publisher
   */
  async getPublisherSources(
    publisherId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    return this.client.getResponse<Source>("sources", {
      ...params,
      filter: `host_organization_lineage:${publisherId}`,
    }, sourceSchema);
  }

  /**
   * Get works published by a publisher
   * @param publisherId - The OpenAlex ID for the publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works published by this publisher
   */
  async getPublisherWorks(
    publisherId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    return this.client.getResponse<Work>("works", {
      ...params,
      filter: `locations.source.host_organization_lineage:${publisherId}`,
    }, workSchema);
  }

  /**
   * Get child publishers (subsidiaries or imprints) of a parent publisher
   * @param parentPublisherId - The OpenAlex ID for the parent publisher
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to child publishers
   */
  async getChildPublishers(
    parentPublisherId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({
      ...params,
      filter: `parent_publisher:${parentPublisherId}`,
    });
  }

  /**
   * Get publishers by country codes
   * @param countryCodes - Array of ISO country codes (e.g., ['US', 'GB'])
   * @param params - Optional query parameters
   * @returns Promise resolving to publishers from specified countries
   */
  async getByCountry(
    countryCodes: readonly string[],
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.filters({ country_codes: [...countryCodes] }, params);
  }

  /**
   * Get publishers in a lineage hierarchy
   * @param lineageIds - Array of OpenAlex IDs representing the publisher lineage
   * @param params - Optional query parameters
   * @returns Promise resolving to publishers in the specified lineage
   */
  async getByLineage(
    lineageIds: readonly string[],
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.filters({ lineage: lineageIds.join("|") }, params);
  }

  /**
   * Get top publishers by works count
   * @param limit - Maximum number of top publishers to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top publishers by publication volume
   */
  async getTopByWorksCount(
    limit = 50,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({
      ...params,
      sort: "works_count:desc",
      per_page: Math.min(limit, MAX_PER_PAGE),
    });
  }

  /**
   * Get top publishers by citations
   * @param limit - Maximum number of top publishers to return (default: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to top publishers by citation impact
   */
  async getTopByCitations(
    limit = 50,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Publisher>> {
    return this.getMultiple({
      ...params,
      sort: "cited_by_count:desc",
      per_page: Math.min(limit, MAX_PER_PAGE),
    });
  }

  /**
   * Stream all publishers using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of publishers per batch (default: 200)
   * @returns Async generator yielding batches of publishers
   */
  async *stream(
    params: QueryParams & PublishersFilters = {},
    batchSize = 200,
  ): AsyncGenerator<Publisher[], void, unknown> {
    yield* this.client.stream<Publisher>("publishers", params,publisherSchema,  batchSize);
  }

  /**
   * Get all publishers (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching publishers
   */
  async getAll(
    params: QueryParams & PublishersFilters = {},
    maxResults?: number,
  ): Promise<Publisher[]> {
    return this.client.getAll<Publisher>("publishers", params,publisherSchema,  maxResults);
  }
}
