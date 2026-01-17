/**
 * OpenAlex Sources API Entity Methods
 * Provides methods for interacting with journal/conference sources
 *
 * ## ISSN Support
 *
 * This API provides ISSN (International Standard Serial Number) support
 * with format validation, normalization, and checksum verification.
 *
 * ### Supported ISSN Formats:
 * - Standard: `1234-5678`
 * - With Prefixes: `ISSN 1234-5678`, `ISSN: 1234-5678`
 * - Scheme Notation: `issn:1234-5678`, `eissn:1234-5678`
 * - Bare Format: `12345678`
 * - Check Digit Variants: `1234-567X`, `1234567X`
 *
 * @example ISSN Usage
 * ```typescript
 * // Standard ISSN lookup
 * const nature = await sourcesApi.getSource('0028-0836');
 *
 * // Various format support
 * const sources = await sourcesApi.getSourcesByISSN('ISSN 1476-4687');
 * const eISSN = await sourcesApi.getSourcesByISSN('eissn:2041-1723');
 *
 * // With checksum validation
 * const validated = await sourcesApi.getSourcesByISSN('2041-172X', {}, {
 *   validateChecksum: true
 * });
 * ```
 */

import type {
  AutocompleteResult,
  OpenAlexResponse,
  QueryParams,
  Source,
  SourcesFilters,
  Work,
} from "@bibgraph/types";

import { OpenAlexBaseClient } from "../client";
import { logger } from "../internal/logger";
import { buildFilterString } from "../utils/query-builder";
import {
  isISSNIdentifier,
  validateAndNormalizeISSN,
  validateISSN as validateISSNUtil,
} from "./issn-utils";
import {
  buildSourceFilterParams,
  type SourceSearchOptions,
} from "./sources-query-builder";

// Re-export types for DTS bundling (vite-plugin-dts requires explicit type re-exports)
// eslint-disable-next-line custom/no-reexport-from-non-barrel
export type { SourceSearchOptions } from "./sources-query-builder";

export class SourcesApi {
  private readonly DEFAULT_SORT = "works_count:desc";
  private readonly WORKS_COUNT_DESC = this.DEFAULT_SORT;

  constructor(private client: OpenAlexBaseClient) {}

  /**
   * Get a single source/journal by ID or ISSN
   * @param id - The OpenAlex source ID (e.g., 'S123456789'), URL, or ISSN identifier
   * @param params - Additional query parameters (select fields, etc.)
   * @returns Promise resolving to the source data
   * @example
   * ```typescript
   * // Get by OpenAlex ID
   * const source = await sourcesApi.getSource('S4306400886');
   *
   * // Get by ISSN (various formats supported)
   * const sourceByISSN = await sourcesApi.getSource('0028-0836');
   * const sourceByISSNPrefix = await sourcesApi.getSource('ISSN 0028-0836');
   * ```
   */
  async getSource(id: string, params: QueryParams = {}): Promise<Source> {
    // Check if the ID is an ISSN identifier
    if (isISSNIdentifier(id)) {
      const normalizedISSN = validateAndNormalizeISSN(id, {
        validateChecksum: false,
      });
      if (normalizedISSN) {
        logger.debug("issn", `Resolving ISSN ${id} as ${normalizedISSN}`);

        const response = await this.getSourcesByISSN(normalizedISSN, {
          ...params,
          per_page: 1,
        });

        if (response.results.length > 0) {
          return response.results[0];
        } else {
          throw new Error(`No source found for ISSN: ${normalizedISSN}`);
        }
      } else {
        throw new Error(`Invalid ISSN format: ${id}`);
      }
    }

    return this.client.getById<Source>({ endpoint: "sources", id, params });
  }

  /**
   * Get multiple sources with optional filters
   * @param params - Query parameters including filters, pagination, sorting
   * @returns Promise resolving to sources response with results and metadata
   */
  async getSources(
    params: SourceSearchOptions = {},
  ): Promise<OpenAlexResponse<Source>> {
    const queryParams = buildSourceFilterParams(params);
    return this.client.getResponse<Source>("sources", queryParams);
  }

  /**
   * Search sources by display name and description
   * @param query - Search query string
   * @param options - Search options (filters, pagination, sorting)
   * @returns Promise resolving to matching sources
   */
  async searchSources(
    query: string,
    options: SourceSearchOptions = {},
  ): Promise<OpenAlexResponse<Source>> {
    const params: QueryParams = {
      search: query,
      sort:
        options.sort ?? (query.trim() ? "relevance_score:desc" : "works_count"),
    };

    if (options.page !== undefined) params.page = options.page;
    if (options.per_page !== undefined) params.per_page = options.per_page;
    if (options.select !== undefined) params.select = options.select;
    if (options.filters) params.filter = buildFilterString(options.filters);

    return this.client.getResponse<Source>("sources", params);
  }

  /**
   * Autocomplete sources by name/title for quick search suggestions
   * @param query - Search query string for autocomplete suggestions
   * @returns Promise resolving to array of source autocomplete results
   */
  async autocomplete(query: string): Promise<AutocompleteResult[]> {
    if (!query.trim()) {
      return [];
    }

    try {
      const endpoint = "autocomplete/sources";
      const queryParams: QueryParams & { q: string } = {
        q: query.trim(),
      };

      const response = await this.client.getResponse<AutocompleteResult>(
        endpoint,
        queryParams,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "source",
      }));
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : "Unknown error";
      logger.warn(`Autocomplete failed for query "${query}": ${errorMessage}`, {
        query,
        error,
      });
      return [];
    }
  }

  /**
   * Get sources published by a specific publisher
   * @param publisher - Publisher name or ID to filter by
   * @param params - Additional query parameters
   * @returns Promise resolving to sources from the publisher
   */
  async getSourcesByPublisher(
    publisher: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = { publisher };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
      sort: params.sort ?? "works_count:desc",
    };

    const queryParams = buildSourceFilterParams(searchOptions);
    return this.client.getResponse<Source>("sources", queryParams);
  }

  /**
   * Get only open access sources
   * @param params - Additional query parameters
   * @returns Promise resolving to open access sources
   */
  async getOpenAccessSources(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = { is_oa: true };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
    };

    const queryParams = buildSourceFilterParams(searchOptions);
    return this.client.getResponse<Source>("sources", queryParams);
  }

  /**
   * Get sources by country code
   * @param countryCode - Two-letter ISO country code (e.g., 'US', 'GB', 'DE')
   * @param params - Additional query parameters
   * @returns Promise resolving to sources from the specified country
   */
  async getSourcesByCountry(
    countryCode: string,
    params: Omit<QueryParams, "filter"> & { filter?: SourcesFilters } = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {
      ...params.filter,
      country_code: countryCode,
    };

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { filter, ...paramsWithoutFilter } = params;
    const isString = (value: unknown): value is string =>
      typeof value === "string";

    const searchOptions: SourceSearchOptions = {
      ...paramsWithoutFilter,
      filters,
      sort: isString(paramsWithoutFilter.sort)
        ? paramsWithoutFilter.sort
        : this.WORKS_COUNT_DESC,
    };

    const queryParams = buildSourceFilterParams(searchOptions);
    return this.client.getResponse<Source>("sources", queryParams);
  }

  /**
   * Get works published in a specific source
   * @param sourceId - The source ID to get works for
   * @param params - Additional query parameters for works filtering
   * @returns Promise resolving to works published in this source
   */
  async getSourceWorks(
    sourceId: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Work>> {
    const worksParams = {
      ...params,
      filter: `primary_location.source.id:${sourceId}`,
    };

    return this.client.getResponse<Work>("works", worksParams);
  }

  /**
   * Get citation statistics for a source
   * @param sourceId - The source ID to get statistics for
   * @param params - Additional parameters (select fields, etc.)
   * @returns Promise resolving to source with citation statistics
   */
  async getSourceStats(
    sourceId: string,
    params: QueryParams = {},
  ): Promise<Source> {
    const statsParams = {
      ...params,
      select: params.select ?? [
        "id",
        "display_name",
        "cited_by_count",
        "works_count",
        "summary_stats",
        "counts_by_year",
        "is_oa",
        "type",
        "publisher",
        "country_code",
      ],
    };

    return this.getSource(sourceId, statsParams);
  }

  /**
   * Get a random sample of sources
   * @param count - Number of random sources to return (max 10,000)
   * @param filters - Optional filters to apply to the random sample
   * @param seed - Optional seed for reproducible random results
   * @returns Promise resolving to random sources
   */
  async getRandomSources(
    count: number,
    filters: SourcesFilters = {},
    seed?: number,
  ): Promise<OpenAlexResponse<Source>> {
    const MAX_SAMPLE_SIZE = 10_000;
    if (count > MAX_SAMPLE_SIZE) {
      throw new Error(`Random sample size cannot exceed ${MAX_SAMPLE_SIZE}`);
    }

    const options: SourceSearchOptions = {
      filters,
      sample: count,
      per_page: count,
    };

    if (seed !== undefined) {
      options.seed = seed;
    }

    const queryParams = buildSourceFilterParams(options);
    return this.client.getResponse<Source>("sources", queryParams);
  }

  /**
   * Get sources that are indexed in DOAJ (Directory of Open Access Journals)
   * @param params - Additional query parameters
   * @returns Promise resolving to DOAJ-indexed sources
   */
  async getDOAJSources(
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = { is_in_doaj: true };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
    };

    return this.getSources(searchOptions);
  }

  /**
   * Get sources by publication type (journal, conference, repository, etc.)
   * @param type - Source type to filter by
   * @param params - Additional query parameters
   * @returns Promise resolving to sources of the specified type
   */
  async getSourcesByType(
    type: string,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = { type };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
    };

    return this.getSources(searchOptions);
  }

  /**
   * Get sources with APC (Article Processing Charge) information
   * @param minAPC - Minimum APC price in USD (optional)
   * @param maxAPC - Maximum APC price in USD (optional)
   * @param params - Additional query parameters
   * @returns Promise resolving to sources with APC information
   */
  async getSourcesWithAPC(
    minAPC?: number,
    maxAPC?: number,
    params: QueryParams = {},
  ): Promise<OpenAlexResponse<Source>> {
    const filters: SourcesFilters = {};

    if (minAPC !== undefined && maxAPC !== undefined) {
      filters["apc_usd"] = `${minAPC.toString()}-${maxAPC.toString()}`;
    } else if (minAPC !== undefined) {
      filters["apc_usd"] = `>${minAPC.toString()}`;
    } else if (maxAPC !== undefined) {
      filters["apc_usd"] = `<${maxAPC.toString()}`;
    }

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
      sort: params.sort ?? this.WORKS_COUNT_DESC,
    };

    return this.getSources(searchOptions);
  }

  /**
   * Get the most cited sources in a given time period
   * @param year - Publication year to focus on (optional)
   * @param limit - Number of top sources to return
   * @param filters - Additional filters to apply
   * @returns Promise resolving to top cited sources
   */
  async getTopCitedSources(
    year?: number,
    limit = 25,
    filters: SourcesFilters = {},
  ): Promise<OpenAlexResponse<Source>> {
    const combinedFilters = { ...filters };

    const params: SourceSearchOptions = {
      filters: combinedFilters,
      sort: "cited_by_count:desc",
      per_page: limit,
    };

    return this.getSources(params);
  }

  /**
   * Stream all sources matching the given criteria
   * Use this for large-scale data processing
   * @param filters - Filters to apply
   * @param batchSize - Number of sources per batch
   * @returns AsyncGenerator yielding batches of sources
   */
  async *streamSources(
    filters: SourcesFilters = {},
    batchSize = 200,
  ): AsyncGenerator<Source[], void, unknown> {
    const queryParams: QueryParams = {};
    const filterString = buildFilterString(filters);
    if (filterString) {
      queryParams.filter = filterString;
    }
    yield* this.client.stream<Source>("sources", queryParams, batchSize);
  }

  /**
   * Get sources by ISSN identifier with format support
   * @param issn - ISSN identifier (supports multiple formats)
   * @param params - Additional query parameters
   * @param options - ISSN validation options
   * @param options.validateChecksum
   * @returns Promise resolving to sources matching the ISSN
   * @example
   * ```typescript
   * const sources = await sourcesApi.getSourcesByISSN('0028-0836');
   * const sources2 = await sourcesApi.getSourcesByISSN('ISSN 0028-0836');
   * const sources3 = await sourcesApi.getSourcesByISSN('issn:0028-0836');
   * ```
   */
  async getSourcesByISSN(
    issn: string,
    params: QueryParams = {},
    options: { validateChecksum?: boolean } = {},
  ): Promise<OpenAlexResponse<Source>> {
    const normalizedISSN = validateAndNormalizeISSN(issn, options);
    if (!normalizedISSN) {
      throw new Error(`Invalid ISSN format: ${issn}`);
    }

    logger.debug(
      "issn",
      `Searching for sources with ISSN: ${normalizedISSN} (from input: ${issn})`,
    );

    const filters: SourcesFilters = {
      "ids.issn": normalizedISSN,
    };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
    };

    return this.getSources(searchOptions);
  }

  /**
   * Validate ISSN format and optionally verify checksum
   * @param issn - ISSN to validate
   * @param options - Validation options
   * @param options.validateChecksum
   * @returns Validation result with normalized ISSN if valid
   * @example
   * ```typescript
   * const result = sourcesApi.validateISSN('0028-0836');
   * // { isValid: true, normalized: '0028-0836', format: 'standard' }
   *
   * const result2 = sourcesApi.validateISSN('ISSN 2041-172X', { validateChecksum: true });
   * // { isValid: true, normalized: '2041-172X', format: 'with_prefix', checksumValid: true }
   * ```
   */
  validateISSN(
    issn: string,
    options: { validateChecksum?: boolean } = {},
  ): {
    isValid: boolean;
    normalized?: string;
    format?:
      | "standard"
      | "with_prefix"
      | "scheme_notation"
      | "bare"
      | "unknown";
    checksumValid?: boolean;
    error?: string;
  } {
    return validateISSNUtil(issn, options);
  }

  /**
   * Get sources for multiple ISSNs in a single request
   * @param issns - Array of ISSN identifiers (any supported format)
   * @param params - Additional query parameters
   * @param options - ISSN validation options
   * @param options.validateChecksum
   * @returns Promise resolving to sources matching any of the ISSNs
   * @example
   * ```typescript
   * const sources = await sourcesApi.getSourcesByMultipleISSNs([
   *   '0028-0836',           // Nature
   *   'ISSN 2041-1723',      // Nature Communications
   *   'eissn:1476-4687',     // Nature Biotechnology
   * ]);
   * ```
   */
  async getSourcesByMultipleISSNs(
    issns: string[],
    params: QueryParams = {},
    options: { validateChecksum?: boolean } = {},
  ): Promise<OpenAlexResponse<Source>> {
    if (!Array.isArray(issns) || issns.length === 0) {
      throw new Error("ISSN array must be non-empty");
    }

    const normalizedISSNs: string[] = [];
    const invalidISSNs: string[] = [];

    for (const issn of issns) {
      const normalized = validateAndNormalizeISSN(issn, options);
      if (normalized) {
        normalizedISSNs.push(normalized);
      } else {
        invalidISSNs.push(issn);
      }
    }

    if (invalidISSNs.length > 0) {
      logger.warn("issn", `Invalid ISSNs found: ${invalidISSNs.join(", ")}`);
    }

    if (normalizedISSNs.length === 0) {
      throw new Error(`No valid ISSNs found in: ${issns.join(", ")}`);
    }

    logger.debug(
      "issn",
      `Searching for sources with ISSNs: ${normalizedISSNs.join(", ")}`,
    );

    // Use OR filter for multiple ISSNs - join with pipe for OR logic
    const filters: SourcesFilters = {
      "ids.issn": normalizedISSNs.join("|"),
    };

    const searchOptions: SourceSearchOptions = {
      ...params,
      filters,
    };

    return this.getSources(searchOptions);
  }
}
