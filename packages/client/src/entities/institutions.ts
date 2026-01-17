/**
 * OpenAlex Institutions API Entity Methods
 * Provides methods for querying and retrieving institution data
 */

import type {
  Author,
  AutocompleteResult,
  InstitutionEntity,
  OpenAlexResponse,
  QueryParams,
  Work,
} from "@bibgraph/types";

import { OpenAlexBaseClient } from "../client";
import type { AutocompleteOptions } from "../utils/autocomplete";
import type { InstitutionSearchOptions } from "./institutions/index";
import {
  buildInstitutionQueryParams,
  formatErrorForLogging,
  validateAndNormalizeRor,
} from "./institutions/index";

// Re-export types for DTS bundling (vite-plugin-dts requires explicit type re-exports)
// eslint-disable-next-line custom/no-reexport-from-non-barrel
export type { InstitutionSearchOptions, InstitutionsQueryParams } from "./institutions/index";

/** OpenAlex API limit for autocomplete results */
const AUTOCOMPLETE_MAX_RESULTS = 200;

/** OpenAlex API limit for sample results */
const SAMPLE_MAX_RESULTS = 200;

/** Upper bound for random seed generation */
const RANDOM_SEED_UPPER_BOUND = 1_000_000;

/**
 * Institutions API class providing methods for institution data access
 *
 * ## ROR ID Support
 *
 * This API provides support for Research Organization Registry (ROR) identifiers
 * in addition to OpenAlex IDs. ROR IDs are automatically validated and normalized.
 *
 * ### Supported ROR Formats:
 * - **Bare format**: `05dxps055` (9-character alphanumeric with letters)
 * - **ROR prefix**: `ror:05dxps055` (ror: followed by 9-character ID)
 * - **ROR URL**: `https://ror.org/05dxps055` (full HTTPS URL)
 * - **ROR domain**: `ror.org/05dxps055` (domain without protocol)
 *
 * ### Examples:
 * ```typescript
 * // All these formats are equivalent and valid for MIT:
 * await institutionsApi.getInstitution('05dxps055');
 * await institutionsApi.getInstitution('ror:05dxps055');
 * await institutionsApi.getInstitution('https://ror.org/05dxps055');
 * await institutionsApi.getInstitution('ror.org/05dxps055');
 * ```
 *
 * Methods supporting ROR IDs: `getInstitution`, `getInstitutionWorks`,
 * `getInstitutionAuthors`, `getAssociatedInstitutions`
 */
export class InstitutionsApi {
  private client: OpenAlexBaseClient;

  constructor(client: OpenAlexBaseClient) {
    this.client = client;
  }

  /**
   * Get a single institution by its OpenAlex ID, ROR ID, or other identifier
   *
   * Supports all ROR ID formats:
   * - Bare format: `05dxps055`
   * - ROR prefix: `ror:05dxps055`
   * - ROR URL: `https://ror.org/05dxps055`
   * - ROR domain: `ror.org/05dxps055`
   *
   * @param id - Institution ID (OpenAlex ID, ROR ID, etc.)
   * @param params - Optional query parameters (select fields, etc.)
   * @returns Promise resolving to institution entity
   * @throws Error if ROR ID format is invalid or fails checksum validation
   */
  async getInstitution(
    id: string,
    params: QueryParams = {},
  ): Promise<InstitutionEntity> {
    const processedId = validateAndNormalizeRor(id);
    return this.client.getById<InstitutionEntity>(
      "institutions",
      processedId,
      params,
    );
  }

  /**
   * Get autocomplete suggestions for institutions based on a search query
   *
   * Uses the OpenAlex institutions autocomplete endpoint to provide fast,
   * relevant suggestions for institution names and aliases.
   * @param query - Search query string for institution name or alias
   * @param options - Optional autocomplete parameters including per_page limit
   * @returns Promise resolving to array of institution autocomplete suggestions
   */
  async autocomplete(
    query: string,
    options?: Partial<AutocompleteOptions>,
  ): Promise<AutocompleteResult[]> {
    if (!query || typeof query !== "string") {
      return [];
    }

    const trimmedQuery = query.trim();
    if (!trimmedQuery) {
      return [];
    }

    try {
      const queryParams: QueryParams & { q: string } = {
        q: trimmedQuery,
      };

      if (options?.per_page && options.per_page > 0) {
        queryParams.per_page = Math.min(options.per_page, AUTOCOMPLETE_MAX_RESULTS);
      }

      const endpoint = "autocomplete/institutions";
      const response = await this.client.getResponse<AutocompleteResult>(
        endpoint,
        queryParams,
      );

      return response.results.map((result) => ({
        ...result,
        entity_type: "institution",
      }));
    } catch (error: unknown) {
      formatErrorForLogging(error);
      return [];
    }
  }

  /**
   * Get multiple institutions with optional filtering, sorting, and pagination
   * @param params - Optional query parameters including filters
   * @returns Promise resolving to paginated institutions response
   */
  async getInstitutions(
    params: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const queryParams = buildInstitutionQueryParams(params);
    return this.client.getResponse<InstitutionEntity>(
      "institutions",
      queryParams,
    );
  }

  /**
   * Search institutions by query string with optional filters
   * @param query - Search query string
   * @param options - Optional search parameters and filters
   * @returns Promise resolving to matching institutions
   */
  async searchInstitutions(
    query: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      search: query,
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions by country code
   * @param countryCode - ISO 3166-1 alpha-2 country code (e.g., 'US', 'GB', 'CA')
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions in the specified country
   */
  async getInstitutionsByCountry(
    countryCode: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        country_code: countryCode,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions by institution type
   * @param type - Institution type (e.g., 'education', 'healthcare', 'company', 'government')
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions of the specified type
   */
  async getInstitutionsByType(
    type: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        type,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get works published by authors affiliated with a specific institution
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters for filtering works
   * @returns Promise resolving to works from the institution
   */
  async getInstitutionWorks(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<Work>> {
    const processedId = validateAndNormalizeRor(institutionId);
    const queryParams = {
      filter: `authorships.institutions.id:${processedId}`,
      ...buildInstitutionQueryParams(options),
    };
    return this.client.getResponse<Work>("works", queryParams);
  }

  /**
   * Get authors affiliated with a specific institution
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters for filtering authors
   * @returns Promise resolving to authors at the institution
   */
  async getInstitutionAuthors(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<Author>> {
    const processedId = validateAndNormalizeRor(institutionId);
    const queryParams = {
      filter: `last_known_institution.id:${processedId}`,
      ...buildInstitutionQueryParams(options),
    };
    return this.client.getResponse<Author>("authors", queryParams);
  }

  /**
   * Get institutions associated with a specific institution (parent, child, or related)
   *
   * Supports both OpenAlex IDs and ROR IDs for the institution identifier.
   * @param institutionId - Institution OpenAlex ID or ROR ID (any format)
   * @param options - Optional search parameters
   * @returns Promise resolving to associated institutions
   */
  async getAssociatedInstitutions(
    institutionId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const processedId = validateAndNormalizeRor(institutionId);
    const params = {
      ...options,
      filters: {
        ...options.filters,
        "associated_institutions.id": processedId,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get a random sample of institutions
   * @param count - Number of random institutions to retrieve (max 200)
   * @param options - Optional parameters including filters to apply before sampling
   * @param seed - Optional random seed for reproducible results
   * @returns Promise resolving to random sample of institutions
   */
  async getRandomInstitutions(
    count: number = 10,
    options: InstitutionSearchOptions = {},
    seed?: number,
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params: InstitutionSearchOptions & { sample: number; seed: number } =
      {
        ...options,
        sample: Math.min(count, SAMPLE_MAX_RESULTS),
        seed: seed ?? Math.floor(Math.random() * RANDOM_SEED_UPPER_BOUND),
      };

    return this.getInstitutions(params);
  }

  /**
   * Get institutions in the Global South
   * @param options - Optional search parameters
   * @returns Promise resolving to Global South institutions
   */
  async getGlobalSouthInstitutions(
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        is_global_south: true,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions that have ROR IDs
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions with ROR IDs
   */
  async getInstitutionsWithRor(
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        has_ror: true,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Get institutions in a specific lineage (hierarchy)
   * @param lineageId - Institution ID in the lineage
   * @param options - Optional search parameters
   * @returns Promise resolving to institutions in the lineage
   */
  async getInstitutionsByLineage(
    lineageId: string,
    options: InstitutionSearchOptions = {},
  ): Promise<OpenAlexResponse<InstitutionEntity>> {
    const params = {
      ...options,
      filters: {
        ...options.filters,
        lineage: lineageId,
      },
    };
    return this.getInstitutions(params);
  }

  /**
   * Stream all institutions matching the criteria (use with caution for large datasets)
   * @param options - Search parameters and filters
   * @yields Arrays of institutions in batches
   */
  async *streamInstitutions(
    options: InstitutionSearchOptions = {},
  ): AsyncGenerator<InstitutionEntity[], void, unknown> {
    const queryParams = buildInstitutionQueryParams(options);
    yield* this.client.stream<InstitutionEntity>("institutions", queryParams);
  }

  /**
   * Get all institutions matching the criteria (use with caution)
   * @param options - Search parameters and filters
   * @param maxResults - Optional maximum number of results to retrieve
   * @returns Promise resolving to array of all matching institutions
   */
  async getAllInstitutions(
    options: InstitutionSearchOptions = {},
    maxResults?: number,
  ): Promise<InstitutionEntity[]> {
    const queryParams = buildInstitutionQueryParams(options);
    return this.client.getAll<InstitutionEntity>(
      "institutions",
      queryParams,
      maxResults,
    );
  }
}
