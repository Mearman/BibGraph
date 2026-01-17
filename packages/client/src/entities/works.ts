/**
 * OpenAlex Works API Entity Methods
 * Provides methods for interacting with Works (academic papers) through the OpenAlex API
 */

import type {
  AutocompleteResult,
  GroupedResponse,
  OpenAlexResponse,
  QueryParams,
  Work,
  WorksFilters,
} from "@bibgraph/types";

import { OpenAlexBaseClient } from "../client";
import { buildFilterString } from "../utils/query-builder";
import {
  isWorksFilters,
  mergeFilters,
  validateAndNormalizeDOI,
  validateAndNormalizePMID,
} from "./works/index";
// Re-export types for external consumers
// Re-export utilities for external consumers who need them
// Import types for internal use
import type {
  GroupWorksOptions,
  RelatedWorksOptions,
  SearchWorksOptions,
  WorksAutocompleteOptions,
  WorksQueryParams,
} from "./works/types";

/**
 * Works API class providing methods for academic paper operations
 */
export class WorksApi {
  constructor(private client: OpenAlexBaseClient) {}

  /**
   * Get a single work by its OpenAlex ID, DOI, PMID, or other identifier
   * @param id - The work ID (OpenAlex ID, DOI, PMID, etc.)
   * @param params - Optional query parameters
   * @returns Promise resolving to the Work entity
   * @example
   * ```typescript
   * // OpenAlex ID
   * const work = await worksApi.getWork('W2741809807');
   *
   * // DOI - Multiple formats supported:
   * const workByDoi1 = await worksApi.getWork('https://doi.org/10.7717/peerj.4375');  // Full URL
   * const workByDoi2 = await worksApi.getWork('http://doi.org/10.7717/peerj.4375');   // HTTP variant
   * const workByDoi3 = await worksApi.getWork('doi:10.7717/peerj.4375');              // DOI prefix
   * const workByDoi4 = await worksApi.getWork('10.7717/peerj.4375');                  // Bare DOI
   *
   * // Crossref redirects also supported:
   * const workByDoi5 = await worksApi.getWork('https://www.crossref.org/iPage?doi=10.7717/peerj.4375');
   *
   * // PMID (PubMed ID) - multiple formats supported
   * const workByPmid1 = await worksApi.getWork('pmid:12345678');     // Lowercase prefix
   * const workByPmid2 = await worksApi.getWork('PMID:12345678');     // Uppercase prefix
   * const workByPmid3 = await worksApi.getWork('12345678');          // Bare numeric format
   * ```
   */
  async getWork(id: string, params: QueryParams = {}): Promise<Work> {
    // Validate and normalize DOI if applicable
    const normalizedDoi = validateAndNormalizeDOI(id);
    if (normalizedDoi) {
      return this.client.getById<Work>({
        endpoint: "works",
        id: normalizedDoi,
        params,
      });
    }

    // Validate and normalize PMID if applicable
    const normalizedPmid = validateAndNormalizePMID(id);
    if (normalizedPmid) {
      return this.client.getById<Work>({
        endpoint: "works",
        id: normalizedPmid,
        params,
      });
    }

    // For other identifiers (OpenAlex ID, etc.), pass through directly
    return this.client.getById<Work>({ endpoint: "works", id, params });
  }

  /**
   * Get multiple works with optional filtering and pagination
   * @param params - Query parameters including filters, pagination, and selection
   * @returns Promise resolving to OpenAlexResponse containing works and metadata
   * @example
   * ```typescript
   * const response = await worksApi.getWorks({
   *   filter: { 'publication_year': 2023, 'is_oa': true },
   *   sort: 'cited_by_count',
   *   per_page: 50
   * });
   * ```
   */
  async getWorks(
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const queryParams = this.buildQueryParams(params);
    return this.client.getResponse<Work>("works", queryParams);
  }

  /**
   * Search works by query string with optional filters and sorting
   * @param query - Search query string
   * @param options - Search options including filters, sorting, and pagination
   * @returns Promise resolving to search results
   */
  async searchWorks(
    query: string,
    options: SearchWorksOptions = {},
  ): Promise<OpenAlexResponse<Work>> {
    const params: WorksQueryParams = {
      search: query,
      sort:
        options.sort ??
        (query.trim() ? "relevance_score:desc" : "publication_date"),
    };

    if (options.page !== undefined) params.page = options.page;
    if (options.per_page !== undefined) params.per_page = options.per_page;
    if (options.select !== undefined) params.select = options.select;
    if (options.filters) params.filter = buildFilterString(options.filters);

    return this.getWorks(params);
  }

  /**
   * Get works by a specific author
   * @param authorId - OpenAlex author ID or ORCID
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works authored by the specified author
   */
  async getWorksByAuthor(
    authorId: string,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = { "authorships.author.id": authorId };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Get works affiliated with a specific institution
   * @param institutionId - OpenAlex institution ID or ROR ID
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works from the specified institution
   */
  async getWorksByInstitution(
    institutionId: string,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = {
      "authorships.institutions.id": institutionId,
    };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Get works published in a specific source (journal, conference, etc.)
   * @param sourceId - OpenAlex source ID or ISSN
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works from the specified source
   */
  async getWorksBySource(
    sourceId: string,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = { "primary_location.source.id": sourceId };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Get works that cite a specific work
   * @param workId - OpenAlex work ID of the cited work
   * @param params - Optional query parameters for filtering and pagination
   * @returns Promise resolving to works that cite the specified work
   */
  async getCitedWorks(
    workId: string,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = { referenced_works: workId };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Get works referenced by a specific work
   * @param workId - OpenAlex work ID
   * @param options - Options for filtering and limiting results
   * @returns Promise resolving to referenced works
   */
  async getReferencedWorks(
    workId: string,
    options: RelatedWorksOptions = {},
  ): Promise<Work[]> {
    const work = await this.getWork(workId, { select: ["referenced_works"] });

    if (!work.referenced_works || work.referenced_works.length === 0) {
      return [];
    }

    const referencesToFetch = options.limit
      ? work.referenced_works.slice(0, options.limit)
      : work.referenced_works;

    const filters: WorksFilters = {
      "ids.openalex": referencesToFetch.join("|"),
      ...options.filters,
    };

    const queryParams: WorksQueryParams = {
      filter: buildFilterString(filters),
      per_page: referencesToFetch.length,
    };
    if (options.select !== undefined) {
      queryParams.select = options.select;
    }

    const response = await this.getWorks(queryParams);
    return response.results;
  }

  /**
   * Get works related to a specific work (using OpenAlex's related works feature)
   * @param workId - OpenAlex work ID
   * @param options - Options for filtering and limiting results
   * @returns Promise resolving to related works
   */
  async getRelatedWorks(
    workId: string,
    options: RelatedWorksOptions = {},
  ): Promise<Work[]> {
    const work = await this.getWork(workId, { select: ["related_works"] });

    if (!work.related_works || work.related_works.length === 0) {
      return [];
    }

    const relatedToFetch = options.limit
      ? work.related_works.slice(0, options.limit)
      : work.related_works;

    const filters: WorksFilters = {
      "ids.openalex": relatedToFetch.join("|"),
      ...options.filters,
    };

    const queryParams: WorksQueryParams = {
      filter: buildFilterString(filters),
      per_page: relatedToFetch.length,
    };
    if (options.select !== undefined) {
      queryParams.select = options.select;
    }

    const response = await this.getWorks(queryParams);
    return response.results;
  }

  /**
   * Get a random sample of works
   * @param count - Number of random works to retrieve (max 10,000)
   * @param params - Optional query parameters for filtering the sample
   * @returns Promise resolving to random works
   */
  async getRandomWorks(
    count: number,
    params: WorksQueryParams = {},
  ): Promise<Work[]> {
    const MAX_SAMPLE_SIZE = 10_000;
    if (count > MAX_SAMPLE_SIZE) {
      throw new Error(`Maximum sample size is ${MAX_SAMPLE_SIZE} works`);
    }

    const queryParams = this.buildQueryParams(params);
    queryParams.sample = count;
    queryParams.seed = Math.floor(Math.random() * 1_000_000);

    const response = await this.client.getResponse<Work>("works", queryParams);
    return response.results;
  }

  /**
   * Stream all works matching criteria using cursor pagination
   * @param params - Query parameters for filtering
   * @param batchSize - Number of works per batch (default: 200)
   * @returns AsyncGenerator yielding batches of works
   */
  async *streamWorks(
    params: WorksQueryParams = {},
    batchSize = 200,
  ): AsyncGenerator<Work[], void, unknown> {
    const queryParams = this.buildQueryParams(params);
    queryParams.per_page ??= batchSize;

    yield* this.client.stream<Work>("works", queryParams, queryParams.per_page);
  }

  /**
   * Get all works matching criteria (use with caution for large result sets)
   * @param params - Query parameters for filtering
   * @param maxResults - Maximum number of results to return
   * @returns Promise resolving to all matching works
   */
  async getAllWorks(
    params: WorksQueryParams = {},
    maxResults?: number,
  ): Promise<Work[]> {
    const queryParams = this.buildQueryParams(params);
    return this.client.getAll<Work>("works", queryParams, maxResults);
  }

  /**
   * Get works statistics and aggregations
   * @param params - Query parameters for filtering
   * @param groupBy - Field to group results by
   * @returns Promise resolving to aggregated results
   */
  async getWorksStats(
    params: WorksQueryParams = {},
    groupBy?: string,
  ): Promise<OpenAlexResponse<Work>> {
    const queryParams = this.buildQueryParams(params);
    queryParams.per_page = 0;

    if (groupBy) {
      queryParams.group_by = groupBy;
    }

    return this.client.getResponse<Work>("works", queryParams);
  }

  /**
   * Get statistical aggregations for works grouped by a specific field
   * @param groupBy - Field to group works by
   * @param filters - Optional filters to apply before grouping
   * @returns Promise resolving to grouped statistical results
   */
  async getStats(
    groupBy: string,
    filters?: WorksFilters,
  ): Promise<GroupedResponse<Work>> {
    const queryParams: QueryParams = {
      per_page: 0,
      group_by: groupBy,
    };

    if (filters) {
      queryParams.filter = buildFilterString(filters);
    }

    const response = await this.client.getResponse<Work>("works", queryParams);

    if (!response.group_by) {
      throw new Error(`No grouping data returned for field: ${groupBy}`);
    }

    return { ...response, group_by: response.group_by };
  }

  /**
   * Get works grouped by a specific field with full work data
   * @param field - Field to group works by
   * @param options - Options for filtering, pagination, and field selection
   * @returns Promise resolving to grouped works with metadata
   */
  async getWorksGroupedBy(
    field: string,
    options: GroupWorksOptions = {},
  ): Promise<GroupedResponse<Work>> {
    const DEFAULT_PER_PAGE = 25;
    const queryParams: QueryParams = {
      group_by: field,
      per_page: options.per_page ?? DEFAULT_PER_PAGE,
    };

    if (options.page !== undefined) queryParams.page = options.page;
    if (options.sort !== undefined) queryParams.sort = options.sort;
    if (options.select !== undefined) queryParams.select = options.select;
    if (options.group_limit !== undefined) {
      queryParams.group_limit = options.group_limit;
    }

    if (options.filters) {
      queryParams.filter = buildFilterString(options.filters);
    }

    const response = await this.client.getResponse<Work>("works", queryParams);

    if (!response.group_by) {
      throw new Error(`No grouping data returned for field: ${field}`);
    }

    return { ...response, group_by: response.group_by };
  }

  /**
   * Get works by publication year range
   * @param startYear - Start year (inclusive)
   * @param endYear - End year (inclusive)
   * @param params - Additional query parameters
   * @returns Promise resolving to works in the specified year range
   */
  async getWorksByYearRange(
    startYear: number,
    endYear: number,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = {
      publication_year: `${String(startYear)}-${String(endYear)}`,
    };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Autocomplete works based on a search query
   * Uses the OpenAlex autocomplete endpoint for fast, typeahead-style search results
   * @param query - Search query string (minimum 1 character)
   * @param options - Optional autocomplete parameters
   * @returns Promise resolving to array of autocomplete results
   */
  async autocomplete(
    query: string,
    options: WorksAutocompleteOptions = {},
  ): Promise<AutocompleteResult[]> {
    if (typeof query !== "string") {
      throw new TypeError("Query must be a string");
    }

    const trimmedQuery = query.trim();
    if (trimmedQuery.length === 0) {
      return [];
    }

    try {
      const queryParams: QueryParams & { q: string } = { q: trimmedQuery };

      if (options.per_page !== undefined) {
        const MIN_PER_PAGE = 1;
        const MAX_PER_PAGE = 50;
        if (options.per_page < MIN_PER_PAGE || options.per_page > MAX_PER_PAGE) {
          throw new Error(
            `per_page must be between ${MIN_PER_PAGE} and ${MAX_PER_PAGE}`,
          );
        }
        queryParams.per_page = options.per_page;
      }

      if (options.filters) {
        Object.assign(queryParams, options.filters);
      }

      const response = await this.client.getResponse<AutocompleteResult>(
        "autocomplete/works",
        queryParams,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "work",
      }));
    } catch (error: unknown) {
      if (error instanceof Error) {
        throw new Error(`Works autocomplete failed: ${error.message}`);
      }
      throw new Error("Works autocomplete failed with unknown error");
    }
  }

  /**
   * Get open access works only
   * @param params - Optional query parameters for additional filtering
   * @returns Promise resolving to open access works
   */
  async getOpenAccessWorks(
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = { is_oa: true };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({ ...params, filter: mergedFilter });
  }

  /**
   * Get highly cited works (top percentile)
   * @param minCitations - Minimum number of citations
   * @param params - Optional query parameters for additional filtering
   * @returns Promise resolving to highly cited works
   */
  async getHighlyCitedWorks(
    minCitations: number,
    params: WorksQueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const filters: WorksFilters = {
      cited_by_count: `>${String(minCitations)}`,
    };
    const mergedFilter = mergeFilters(filters, params.filter);
    return this.getWorks({
      ...params,
      filter: mergedFilter,
      sort: "cited_by_count:desc",
    });
  }

  /**
   * Build query parameters from WorksQueryParams, handling filter conversion
   * @param params - Works query parameters with optional filter object
   * @returns Standard query parameters with filter as string
   */
  private buildQueryParams(params: WorksQueryParams): QueryParams {
    const { filter, ...otherParams } = params;
    const queryParams: QueryParams = { ...otherParams };

    if (filter) {
      if (typeof filter === "string") {
        queryParams.filter = filter;
      } else if (isWorksFilters(filter)) {
        queryParams.filter = buildFilterString(filter);
      }
    }

    return queryParams;
  }
}

/**
 * Create a default Works API instance using the default client
 * Import this lazily to avoid circular dependencies
 */
export const createDefaultWorksApi = async (): Promise<WorksApi> => {
  const { defaultClient } = await import("../client");
  return new WorksApi(defaultClient);
};
