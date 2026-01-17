/**
 * Query Builder Factory Functions
 *
 * Factory functions for creating typed QueryBuilder instances for different OpenAlex entity types.
 */

import type {
  AuthorsFilters,
  FundersFilters,
  InstitutionsFilters,
  PublishersFilters,
  SourcesFilters,
  TopicsFilters,
  WorksFilters,
} from "@bibgraph/types";

import { QueryBuilder } from "./query-builder.js";

/**
 * Create a new QueryBuilder instance for Works entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Works
 */
export const createWorksQuery = (filters?: Partial<WorksFilters>): QueryBuilder<WorksFilters> => new QueryBuilder<WorksFilters>(filters);

/**
 * Create a new QueryBuilder instance for Authors entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Authors
 */
export const createAuthorsQuery = (filters?: Partial<AuthorsFilters>): QueryBuilder<AuthorsFilters> => new QueryBuilder<AuthorsFilters>(filters);

/**
 * Create a new QueryBuilder instance for Sources entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Sources
 */
export const createSourcesQuery = (filters?: Partial<SourcesFilters>): QueryBuilder<SourcesFilters> => new QueryBuilder<SourcesFilters>(filters);

/**
 * Create a new QueryBuilder instance for Institutions entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Institutions
 */
export const createInstitutionsQuery = (filters?: Partial<InstitutionsFilters>): QueryBuilder<InstitutionsFilters> => new QueryBuilder<InstitutionsFilters>(filters);

/**
 * Create a new QueryBuilder instance for Topics entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Topics
 */
export const createTopicsQuery = (filters?: Partial<TopicsFilters>): QueryBuilder<TopicsFilters> => new QueryBuilder<TopicsFilters>(filters);

/**
 * Create a new QueryBuilder instance for Publishers entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Publishers
 */
export const createPublishersQuery = (filters?: Partial<PublishersFilters>): QueryBuilder<PublishersFilters> => new QueryBuilder<PublishersFilters>(filters);

/**
 * Create a new QueryBuilder instance for Funders entities
 * @param filters - Initial filters (optional)
 * @returns QueryBuilder configured for Funders
 */
export const createFundersQuery = (filters?: Partial<FundersFilters>): QueryBuilder<FundersFilters> => new QueryBuilder<FundersFilters>(filters);
