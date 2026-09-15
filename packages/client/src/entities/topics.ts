/**
 * OpenAlex Topics API
 * Provides methods for interacting with OpenAlex topics endpoint
 */

import type {
  Author,
  AutocompleteResult,
  OpenAlexResponse,
  QueryParams,
  Topic,
  TopicsFilters,
  Work,
} from "@bibgraph/types";
import { authorSchema, AutocompleteBaseResponseSchema, topicSchema, workSchema } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { OpenAlexBaseClient } from "../client";
import { isValidWikidata, normalizeExternalId } from "../utils/id-resolver";
import { buildFilterString } from "../utils/query-builder";

/**
Maximum number of topics returned by a random sample
 */
const MAX_RANDOM_SAMPLE_SIZE = 50;

/**
 * Search options for topics API
 */
export interface TopicSearchOptions {
  filters?: TopicsFilters;
  sort?: string;
  page?: number;
  per_page?: number;
  select?: string[];
}

/**
 * TopicsApi provides methods for interacting with OpenAlex topics
 * Topics represent research areas, subjects, and academic fields
 */
export class TopicsApi {
  private readonly client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single topic by its OpenAlex ID or Wikidata ID
   * @param id - The OpenAlex ID (e.g., 'T10138') or Wikidata ID in various formats:
   *   - Q123456
   *   - wikidata:Q123456
   *   - https://www.wikidata.org/wiki/Q123456
   *   - https://www.wikidata.org/entity/Q123456
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the topic object
   * @example
   * ```typescript
   * // Using OpenAlex ID
   * const topic1 = await topicsApi.get('T10138');
   *
   * // Using Wikidata ID (various formats)
   * const topic2 = await topicsApi.get('Q123456');
   * const topic3 = await topicsApi.get('wikidata:Q123456');
   * const topic4 = await topicsApi.get('https://www.wikidata.org/wiki/Q123456');
   * ```
   */
  async get(id: string, params: QueryParams = {}): Promise<Topic> {
    // Check if this might be a Wikidata ID and normalize it
    if (isValidWikidata(id)) {
      const normalizedId = normalizeExternalId(id, "wikidata");
      if (normalizedId !== null) {
        // The normalizer returns Q notation, but OpenAlex API expects wikidata: prefix
        const wikidataFormat = normalizedId.startsWith("Q")
          ? `wikidata:${normalizedId}`
          : normalizedId;
        return this.client.getById<Topic>({
          schema: topicSchema,
          endpoint: "topics",
          id: wikidataFormat,
          params,
        });
      }
      // If normalization failed, fall through to use original ID
    }

    // Handle case where ID is already in wikidata: format
    if (id.startsWith("wikidata:Q")) {
      return this.client.getById<Topic>({ schema: topicSchema, endpoint: "topics", id, params });
    }

    return this.client.getById<Topic>({ schema: topicSchema, endpoint: "topics", id, params });
  }

  /**
   * Get a single topic by its OpenAlex ID or Wikidata ID (alias for get)
   * @param id - The OpenAlex ID or Wikidata ID
   * @param params - Optional query parameters for additional data
   * @returns Promise resolving to the topic object
   */
  async getTopic(id: string, params: QueryParams = {}): Promise<Topic> {
    return this.get(id, params);
  }

  /**
   * Get multiple topics with optional filtering and sorting
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated topics response
   */
  async getMultiple(
    params: QueryParams & TopicsFilters = {},
  ): Promise<OpenAlexResponse<Topic>> {
    return this.client.getResponse<Topic>("topics", params, topicSchema);
  }

  /**
   * Get multiple topics with optional filtering and sorting (alias for getMultiple)
   * @param params - Query parameters for filtering, sorting, and pagination
   * @returns Promise resolving to paginated topics response
   */
  async getTopics(
    params: TopicSearchOptions = {},
  ): Promise<OpenAlexResponse<Topic>> {
    const processedParameters = this.buildQueryParams(params);
    return this.client.getResponse<Topic>("topics", processedParameters, topicSchema);
  }

  /**
   * Build query parameters with proper filter processing
   */
  private buildQueryParams(options: TopicSearchOptions = {}): QueryParams {
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
   * Search topics by name or keywords
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async search(
    query: string,
    params: QueryParams & TopicsFilters = {},
  ): Promise<OpenAlexResponse<Topic>> {
    return this.getMultiple({
      ...params,
      search: query,
    });
  }

  /**
   * Search topics by name or keywords (alias for search)
   * @param query - Search query string
   * @param params - Optional additional query parameters
   * @returns Promise resolving to search results
   */
  async searchTopics(
    query: string,
    params: QueryParams & TopicsFilters = {},
  ): Promise<OpenAlexResponse<Topic>> {
    return this.search(query, params);
  }

  /**
   * Autocomplete topics by name for quick search suggestions
   * @param query - Search query string for autocomplete suggestions
   * @returns Promise resolving to array of topic autocomplete results
   * @example
   * ```typescript
   * const suggestions = await topicsApi.autocomplete('machine learning');
   * console.log(`Found ${suggestions.length} topic suggestions`);
   *
   * // Iterate through suggestions
   * suggestions.forEach(topic => {
   *   console.log(`${topic.display_name} (${topic.works_count} works)`);
   * });
   * ```
   */
  async autocomplete(query: string): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const endpoint = "autocomplete/topics";
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
        entity_type: "topic",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        "topics-api",
        `Autocomplete failed for query "${query}": ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get topics with specific filters applied
   * @param filters - Topic-specific filters
   * @param params - Optional additional query parameters
   * @returns Promise resolving to filtered topics response
   */
  async filters(
    filters: TopicsFilters,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Topic>> {
    return this.getMultiple({ ...params, ...filters });
  }

  /**
   * Get a random sample of topics
   * @param count - Number of random topics to return (default: 10, max: 50)
   * @param params - Optional query parameters
   * @returns Promise resolving to random topics
   */
  async randomSample(
    count = 10,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Topic>> {
    return this.getMultiple({
      ...params,
      sample: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
      per_page: Math.min(count, MAX_RANDOM_SAMPLE_SIZE),
    });
  }

  /**
   * Get works associated with a topic
   * @param topicId - The OpenAlex ID for the topic
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works in this topic
   */
  async getTopicWorks(
    topicId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    return this.client.getResponse<Work>("works", {
      ...params,
      filter: `topics.id:${topicId}`,
    }, workSchema);
  }

  /**
   * Get authors who have published in a topic
   * @param topicId - The OpenAlex ID for the topic
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to authors who work in this topic
   */
  async getTopicAuthors(
    topicId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    return this.client.getResponse<Author>("authors", {
      ...params,
      filter: `topics.id:${topicId}`,
    }, authorSchema);
  }

  /**
   * Get subfields within the OpenAlex topic hierarchy
   * @param fieldId - Optional field ID to get subfields for a specific field
   * @param params - Optional query parameters
   * @returns Promise resolving to subfield topics
   */
  async getSubfields(
    fieldId?: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Topic>> {
    const filters: TopicsFilters = {};
    if (fieldId !== undefined) {
      filters["field.id"] = fieldId;
    }

    return this.getMultiple({
      ...params,
      ...filters,
    });
  }

  /**
   * Get fields within the OpenAlex topic hierarchy
   * @param domainId - Optional domain ID to get fields for a specific domain
   * @param params - Optional query parameters
   * @returns Promise resolving to field topics
   */
  async getFields(
    domainId?: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Topic>> {
    const filters: TopicsFilters = {};
    if (domainId !== undefined) {
      filters["domain.id"] = domainId;
    }

    // Fields are at a specific hierarchy level - this would need to be refined
    // based on OpenAlex's actual topic hierarchy implementation
    return this.getMultiple({
      ...params,
      ...filters,
    });
  }

  /**
   * Get domains (top-level topics) within the OpenAlex topic hierarchy
   * @param params - Optional query parameters
   * @returns Promise resolving to domain topics
   */
  async getDomains(params: QueryParams = {}): Promise<OpenAlexResponse<Topic>> {
    // Domains are at the highest level of the topic hierarchy
    // This would need to be refined based on OpenAlex's actual implementation
    return this.getMultiple({
      ...params,
      sort: "cited_by_count:desc", // Sort by most cited domains
    });
  }

  /**
   * Stream all topics using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of topics per batch (default: 200)
   * @returns Async generator yielding batches of topics
   */
  async *stream(
    params: QueryParams & TopicsFilters = {},
    batchSize = 200,
  ): AsyncGenerator<Topic[], void, unknown> {
    yield* this.client.stream<Topic>("topics", params,topicSchema,  batchSize);
  }

  /**
   * Get all topics (use with caution for large datasets)
   * @param params - Query parameters for filtering
   * @param maxResults - Optional maximum number of results to return
   * @returns Promise resolving to all matching topics
   */
  async getAll(
    params: QueryParams & TopicsFilters = {},
    maxResults?: number,
  ): Promise<Topic[]> {
    return this.client.getAll<Topic>("topics", params,topicSchema,  maxResults);
  }
}
