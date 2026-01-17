/**
 * OpenAlex Authors API Entity Methods
 * Provides methods for interacting with author entities
 */

import type {
  Author,
  AuthorAutocompleteOptions,
  AuthorCollaboratorsFilters,
  AuthorGroupingOptions,
  AuthorSearchOptions,
  AuthorsFilters,
  AuthorWorksFilters,
  AutocompleteResult,
  GroupByResult,
  GroupedResponse,
  OpenAlexResponse,
  QueryParams,
  Work,
} from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import type { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import {
  analyzeAuthorCollaborators,
  type CollaboratorResult,
} from "./authors/collaborators";
import { isValidOrcid, normalizeOrcidId } from "./authors/orcid-utils";
import {
  type AuthorConcept,
  type AuthorTopic,
  filterValidConcepts,
  filterValidTopics,
} from "./authors/type-guards";

/**
 * Authors API class providing methods for author entity operations
 */
export class AuthorsApi {
  constructor(private client: OpenAlexBaseClient) {}

  /**
   * Check if an identifier is a valid ORCID in any supported format
   * @param id - Identifier to check
   * @returns True if the identifier is a valid ORCID, false otherwise
   */
  isValidOrcid(id: string): boolean {
    return isValidOrcid(id);
  }

  /**
   * Autocomplete authors based on partial name or query string
   * Provides fast suggestions for author names with built-in debouncing and caching
   * @param query - Search query string (e.g., partial author name)
   * @param options - Optional parameters for autocomplete behavior
   * @returns Promise resolving to array of autocomplete results
   * @example
   * ```typescript
   * // Basic autocomplete
   * const suggestions = await authorsApi.autocomplete('einstein');
   *
   * // Limit number of results
   * const limitedSuggestions = await authorsApi.autocomplete('marie curie', {
   *   per_page: 10
   * });
   * ```
   */
  async autocomplete(
    query: string,
    options: AuthorAutocompleteOptions = {},
  ): Promise<AutocompleteResult[]> {
    // Validate query parameter
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
      const endpoint = "autocomplete/authors";
      const queryParams: QueryParams & { q: string } = {
        q: trimmedQuery,
      };

      // Apply per_page limit if specified
      const MAX_AUTOCOMPLETE_RESULTS = 200;
      if (options.per_page !== undefined && options.per_page > 0) {
        queryParams.per_page = Math.min(options.per_page, MAX_AUTOCOMPLETE_RESULTS);
      }

      const response = await this.client.getResponse<AutocompleteResult>(
        endpoint,
        queryParams,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "author",
      }));
    } catch (error: unknown) {
      // Log error but return empty array for graceful degradation
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(
        "authors-api",
        `Autocomplete failed for query "${query}": ${errorMessage}`,
      );
      return [];
    }
  }

  /**
   * Get a single author by ID with enhanced ORCID support
   * @param id - Author ID (OpenAlex ID, ORCID in any format, or other supported format)
   * @param params - Query parameters for field selection and additional options
   * @returns Promise resolving to Author entity
   * @example
   * ```typescript
   * // OpenAlex ID
   * const author = await authorsApi.getAuthor('A2208157607');
   *
   * // ORCID formats - all supported
   * const author1 = await authorsApi.getAuthor('0000-0003-1613-5981'); // Bare format
   * const author2 = await authorsApi.getAuthor('https://orcid.org/0000-0003-1613-5981'); // URL
   * const author3 = await authorsApi.getAuthor('orcid:0000-0003-1613-5981'); // Prefixed
   *
   * // With field selection
   * const authorWithSelect = await authorsApi.getAuthor('A2208157607', {
   *   select: ['id', 'display_name', 'works_count', 'cited_by_count']
   * });
   * ```
   */
  async getAuthor(id: string, params: QueryParams = {}): Promise<Author> {
    // Normalize ORCID if it's an ORCID identifier
    const normalizedId = normalizeOrcidId(id) ?? id;
    return this.client.getById<Author>({
      endpoint: "authors",
      id: normalizedId,
      params,
    });
  }

  /**
   * Get multiple authors with optional filtering and pagination
   * @param params - Query parameters including filters, sorting, and pagination
   * @returns Promise resolving to OpenAlexResponse containing authors
   * @example
   * ```typescript
   * // Get authors with high citation counts
   * const authors = await authorsApi.getAuthors({
   *   filter: 'cited_by_count:>1000',
   *   sort: 'cited_by_count:desc',
   *   per_page: 50
   * });
   *
   * // Get authors from specific institution
   * const institutionAuthors = await authorsApi.getAuthors({
   *   filter: 'last_known_institution.id:I27837315'
   * });
   * ```
   */
  async getAuthors(
    params: QueryParams & { filter?: string | AuthorsFilters } = {},
  ): Promise<OpenAlexResponse<Author>> {
    const processedParams = { ...params };

    // Convert filter object to string if needed
    if (processedParams.filter && typeof processedParams.filter === "object") {
      processedParams.filter = buildFilterString(processedParams.filter);
    }

    return this.client.getResponse<Author>("authors", processedParams);
  }

  /**
   * Search authors by query string with optional filters
   * @param query - Search query string
   * @param options - Search options including filters, sorting, and pagination
   * @returns Promise resolving to OpenAlexResponse containing matching authors
   * @example
   * ```typescript
   * // Search authors by name
   * const authors = await authorsApi.searchAuthors('einstein');
   *
   * // Search with filters
   * const authors = await authorsApi.searchAuthors('machine learning', {
   *   filters: { 'works_count': '>10', 'has_orcid': true }
   * });
   * ```
   */
  async searchAuthors(
    query: string,
    options: AuthorSearchOptions = {},
  ): Promise<OpenAlexResponse<Author>> {
    const params: QueryParams = {
      search: query,
      sort: options.sort
        ? (options.sort.includes(":")
          ? options.sort
          : `${options.sort}:desc`)
        : (query.trim()
          ? "relevance_score:desc"
          : "works_count"),
    };

    if (options.page !== undefined) params.page = options.page;
    if (options.per_page !== undefined) params.per_page = options.per_page;
    if (options.select !== undefined) params.select = options.select;
    if (options.filters) params.filter = buildFilterString(options.filters);

    return this.client.getResponse<Author>("authors", params);
  }

  /**
   * Get authors affiliated with a specific institution
   * @param institutionId - Institution ID (OpenAlex ID or ROR)
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing institution authors
   */
  async getAuthorsByInstitution(
    institutionId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    return this.getAuthors({
      ...params,
      filter: `last_known_institution.id:${institutionId}`,
    });
  }

  /**
   * Get authors from a specific country
   * @param countryCode - ISO 2-letter country code
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing country authors
   */
  async getAuthorsByCountry(
    countryCode: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    return this.getAuthors({
      ...params,
      filter: `last_known_institution.country_code:${countryCode.toUpperCase()}`,
    });
  }

  /**
   * Get works authored by a specific author
   * @param authorId - Author ID
   * @param filters - Optional filters for works
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing author's works
   */
  async getAuthorWorks(
    authorId: string,
    filters: AuthorWorksFilters = {},
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    // Build combined filters with author ID
    const combinedFilters = {
      "authorships.author.id": authorId,
      ...filters,
    };

    return this.client.getResponse<Work>("works", {
      ...params,
      filter: buildFilterString(combinedFilters),
    });
  }

  /**
   * Get research concepts associated with an author
   * @param authorId - Author ID
   * @param params - Additional query parameters
   * @returns Promise resolving to array of concepts with scores
   */
  async getAuthorConcepts(
    authorId: string,
    params: QueryParams = {},
  ): Promise<AuthorConcept[]> {
    const author = await this.getAuthor(authorId, {
      ...params,
      select: ["x_concepts"],
    });

    const concepts = author.x_concepts ?? [];
    if (!Array.isArray(concepts)) {
      return [];
    }

    return filterValidConcepts(concepts);
  }

  /**
   * Get research topics associated with an author
   * @param authorId - Author ID
   * @param params - Additional query parameters
   * @returns Promise resolving to array of topics with counts
   */
  async getAuthorTopics(
    authorId: string,
    params: QueryParams = {},
  ): Promise<AuthorTopic[]> {
    const author = await this.getAuthor(authorId, {
      ...params,
      select: ["topics"],
    });

    const topics = author.topics ?? [];
    if (!Array.isArray(topics)) {
      return [];
    }

    return filterValidTopics(topics);
  }

  /**
   * Get frequent collaborators of an author
   * @param authorId - Author ID
   * @param filters - Optional filters for collaboration analysis
   * @param params - Additional query parameters
   * @returns Promise resolving to array of collaborator authors with collaboration stats
   */
  async getAuthorCollaborators(
    authorId: string,
    filters: AuthorCollaboratorsFilters = {},
    params: QueryParams = {},
  ): Promise<CollaboratorResult[]> {
    return analyzeAuthorCollaborators(
      authorId,
      filters,
      params,
      // Bind the methods to preserve `this` context
      this.getAuthorWorks.bind(this),
      this.getAuthor.bind(this),
    );
  }

  /**
   * Get a random sample of authors
   * @param count - Number of random authors to return (max 200)
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing random authors
   */
  async getRandomAuthors(
    count: number = 25,
    params: QueryParams & { filter?: string } = {},
  ): Promise<OpenAlexResponse<Author>> {
    const MAX_SAMPLE_SIZE = 200;
    const MAX_SEED_VALUE = 1_000_000;
    // Ensure count is within reasonable bounds
    const sampleSize = Math.min(Math.max(count, 1), MAX_SAMPLE_SIZE);

    return this.getAuthors({
      ...params,
      sample: sampleSize,
      seed: Math.floor(Math.random() * MAX_SEED_VALUE),
    });
  }

  /**
   * Get authors with ORCID identifiers
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing authors with ORCIDs
   */
  async getAuthorsWithOrcid(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    return this.getAuthors({
      ...params,
      filter: "has_orcid:true",
    });
  }

  /**
   * Get most cited authors globally or with filters
   * @param limit - Number of authors to return
   * @param filters - Optional filters to refine search
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing most cited authors
   */
  async getMostCitedAuthors(
    limit: number = 50,
    filters: AuthorsFilters = {},
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    const MAX_RESULTS = 200;
    const authorsParams: QueryParams & { filter?: string } = {
      ...params,
      sort: "cited_by_count:desc",
      per_page: Math.min(limit, MAX_RESULTS),
    };

    const filterString = buildFilterString(filters);
    if (filterString) {
      authorsParams.filter = filterString;
    }

    return this.getAuthors(authorsParams);
  }

  /**
   * Get most productive authors (by works count)
   * @param limit - Number of authors to return
   * @param filters - Optional filters to refine search
   * @param params - Additional query parameters
   * @returns Promise resolving to OpenAlexResponse containing most productive authors
   */
  async getMostProductiveAuthors(
    limit: number = 50,
    filters: AuthorsFilters = {},
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Author>> {
    const MAX_RESULTS = 200;
    const authorsParams: QueryParams & { filter?: string } = {
      ...params,
      sort: "works_count:desc",
      per_page: Math.min(limit, MAX_RESULTS),
    };

    const filterString = buildFilterString(filters);
    if (filterString) {
      authorsParams.filter = filterString;
    }

    return this.getAuthors(authorsParams);
  }

  /**
   * Stream all authors matching the given criteria
   * Useful for processing large datasets
   * @param params - Query parameters for filtering
   * @param batchSize - Number of authors per batch
   * @returns AsyncGenerator yielding batches of authors
   */
  async *streamAuthors(
    params: QueryParams & { filter?: string } = {},
    batchSize: number = 200,
  ): AsyncGenerator<Author[], void, unknown> {
    yield* this.client.stream<Author>("authors", params, batchSize);
  }

  /**
   * Get statistical aggregations for authors grouped by a specific field
   * @param groupBy - Field to group by (e.g., 'last_known_institution.country_code')
   * @param filters - Optional filters to apply before grouping
   * @returns Promise resolving to array of GroupByResult with statistics
   */
  async getStats(
    groupBy: string,
    filters: AuthorsFilters = {},
  ): Promise<GroupByResult[]> {
    const params: QueryParams & { filter?: string } = {
      group_by: groupBy,
      per_page: 0, // Only get grouping stats, no individual results
    };

    const filterString = buildFilterString(filters);
    if (filterString) {
      params.filter = filterString;
    }

    const response = await this.client.getResponse<Author>("authors", params);

    return response.group_by ?? [];
  }

  /**
   * Get authors grouped by a specific field with full author data
   * @param field - Field to group by
   * @param options - Additional options for filtering and pagination
   * @returns Promise resolving to GroupedResponse containing grouped authors
   */
  async getAuthorsGroupedBy(
    field: string,
    options: AuthorGroupingOptions = {},
  ): Promise<GroupedResponse<Author>> {
    const hasValidProperties = <T extends Record<string, unknown>>(
      obj: unknown,
      keys: (keyof T)[],
    ): obj is T =>
      typeof obj === "object" && obj !== null && keys.every((key) => key in obj);

    const DEFAULT_PER_PAGE = 25;
    const { filters, sort, per_page = DEFAULT_PER_PAGE, page } = options;
    if (!hasValidProperties(options, ["filters", "sort", "per_page", "page"])) {
      throw new Error("Invalid options structure");
    }

    const params: QueryParams & { filter?: string } = {
      group_by: field,
      per_page,
      ...(sort && { sort }),
      ...(page && { page }),
    };

    const filterString = filters
      ? buildFilterString(filters as Record<string, unknown>)
      : "";
    if (filterString) {
      params.filter = filterString;
    }

    const response = await this.client.getResponse<Author>("authors", params);

    // Transform the response to match GroupedResponse type
    return {
      ...response,
      group_by: response.group_by ?? [],
    };
  }
}

