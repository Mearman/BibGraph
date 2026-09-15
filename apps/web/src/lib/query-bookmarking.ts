/**
 * Query bookmarking utilities for BibGraph
 * Handles bookmarking of complex API queries while excluding pagination parameters
 */

import { createApiUrlRequest } from "@bibgraph/utils/storage/user-interactions";

import { type OpenAlexSearchParams as OpenAlexSearchParameters } from "./route-schemas";

// Re-export the type for use in other modules

/**
Default page number used when pagination parameters are absent
 */
const DEFAULT_PAGE = 1;

/**
Default page size used when pagination parameters are absent
 */
const DEFAULT_PER_PAGE = 50;

/**
 * Pagination parameters that should be excluded from query bookmark identification
 * These parameters affect pagination state, not the underlying query semantics
 */
export const PAGINATION_PARAMETERS = new Set([
  "page",
  "per_page",
  "cursor",
  "sample",
  "seed"
]);

/**
 * Query parameters that define the semantic content of a search/query
 * These parameters should be included in query bookmark identification
 */
export const QUERY_SEMANTIC_PARAMETERS = new Set([
  "filter",
  "search",
  "sort",
  "group_by",
  "mailto"
]);

/**
 * Extract pagination-agnostic query parameters from search parameters
 * @param searchParams - Full search parameters including pagination
 * @returns Query parameters excluding pagination
 */
export const extractQueryParameters = (searchParams: OpenAlexSearchParameters): Partial<OpenAlexSearchParameters> => {
  const queryParameters: Partial<OpenAlexSearchParameters> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && !PAGINATION_PARAMETERS.has(key)) {
      queryParameters[key] = value;
    }
  }

  return queryParameters;
};

/**
 * Extract pagination parameters from search parameters
 * @param searchParams - Full search parameters
 * @returns Pagination parameters only
 */
export const extractPaginationParameters = (searchParams: OpenAlexSearchParameters): Partial<OpenAlexSearchParameters> => {
  const paginationParameters: Partial<OpenAlexSearchParameters> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && PAGINATION_PARAMETERS.has(key)) {
      paginationParameters[key] = value;
    }
  }

  return paginationParameters;
};

/**
 * Generate a unique identifier for a query based on semantic parameters only
 * @param entityType - Type of entity (works, authors, etc.)
 * @param searchParams - Search parameters
 * @returns Unique query identifier string
 */
export const generateQueryId = (entityType: string, searchParams: OpenAlexSearchParameters): string => {
  const queryParameters = extractQueryParameters(searchParams);

  // Create a normalized string representation of the query
  const queryParts: string[] = [entityType];

  // Add semantic parameters in a consistent order
  const sortedKeys = Object.keys(queryParameters).sort();

  for (const key of sortedKeys) {
    const value: unknown = queryParameters[key];
    if (value !== undefined && value !== null) {
      const valueString = typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean'
        ? String(value)
        : JSON.stringify(value);
      queryParts.push(`${key}=${valueString}`);
    }
  }

  return queryParts.join('|');
};

/**
 * Create a bookmark request for a query with pagination parameters filtered out
 * @param entityType - Type of entity
 * @param entityId - Optional specific entity ID
 * @param searchParams - Full search parameters including pagination
 * @returns StoredNormalizedRequest for query bookmarking
 */
export const createQueryBookmarkRequest = (entityType: string, entityId: string | undefined, searchParams: OpenAlexSearchParameters) => {
  // Filter out pagination parameters for bookmark identification
  const queryParameters = extractQueryParameters(searchParams);

  // Determine the internal path
  let internalPath: string;

  if (entityId !== undefined && entityId !== "") {
    // Specific entity query (e.g., /authors/A5017898742?select=id,display_name)
    internalPath = `/${entityType}/${entityId}`;
  } else {
    // Entity list query (e.g., /works?filter=author.id:A5017898742)
    internalPath = `/${entityType}`;
  }

  // Generate query ID for hash
  const queryId = generateQueryId(entityType, searchParams);

  // Create the bookmark request with filtered parameters
  return createApiUrlRequest(internalPath, queryParameters, queryId);
};

/**
 * Check if two queries are semantically equivalent (ignoring pagination)
 * @param query1 - First query parameters
 * @param query2 - Second query parameters
 * @returns True if queries are semantically equivalent
 */
export const areQueriesEquivalent = (query1: OpenAlexSearchParameters, query2: OpenAlexSearchParameters): boolean => {
  const parameters1 = extractQueryParameters(query1);
  const parameters2 = extractQueryParameters(query2);

  const keys1 = Object.keys(parameters1).sort();
  const keys2 = Object.keys(parameters2).sort();

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const [index, key] of keys1.entries()) {
    if (key !== keys2[index]) {
      return false;
    }

    const value1: unknown = parameters1[key];
    const value2: unknown = parameters2[key];

    if (String(value1) !== String(value2)) {
      return false;
    }
  }

  return true;
};

/**
 * Generate a human-readable title for a query bookmark
 * @param entityType - Type of entity
 * @param searchParams - Search parameters
 * @returns Human-readable title
 */
export const generateQueryTitle = (entityType: string, searchParams: OpenAlexSearchParameters): string => {
  const queryParameters = extractQueryParameters(searchParams);
  const parts: string[] = [];

  // Entity type (capitalized)
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  // Add key query characteristics
  if (queryParameters.search !== undefined && queryParameters.search !== "") {
    parts.push(`"${queryParameters.search}"`);
  }

  if (queryParameters.filter !== undefined && queryParameters.filter !== "") {
    // Extract key filter information (simplified)
    const filterString = queryParameters.filter;
    if (filterString.includes('author.id:')) {
      parts.push('by author');
    } else if (filterString.includes('concepts.id:')) {
      parts.push('by concept');
    } else if (filterString.includes('institutions.id:')) {
      parts.push('by institution');
    } else if (filterString.includes('publication_year:')) {
      parts.push('by year');
    } else {
      parts.push('filtered');
    }
  }

  if (queryParameters.sort !== undefined && queryParameters.sort !== "") {
    parts.push(`sorted ${queryParameters.sort.replace('.desc', ' (desc)').replace('.asc', ' (asc)')}`);
  }

  if (queryParameters.group_by !== undefined && queryParameters.group_by !== "") {
    parts.push(`grouped by ${queryParameters.group_by}`);
  }

  // If there are no characteristics, return entity type + "list"
  if (parts.length === 0) {
    return `${entityTypeName} list`;
  }

  // Otherwise, prepend entity type and join
  const result = [entityTypeName, ...parts].join(' ');

  // Fallback: if result somehow ends up as just the entity name, add " list"
  if (result === entityTypeName) {
    return `${entityTypeName} list`;
  }

  return result;
};

/**
 * Get current page and pagination info from search parameters
 * @param searchParams - Full search parameters
 * @returns Pagination information
 */
export const getPaginationInfo = (searchParams: OpenAlexSearchParameters): {
  page: number;
  perPage: number;
  cursor?: string;
  hasPagination: boolean;
} => {
  const page = Number(searchParams.page) || DEFAULT_PAGE;
  const perPage = Number(searchParams.per_page) || DEFAULT_PER_PAGE;
  const cursor = searchParams.cursor;

  return {
    page,
    perPage,
    cursor,
    hasPagination: searchParams.page !== undefined
      || searchParams.per_page !== undefined
      || (searchParams.cursor !== undefined && searchParams.cursor !== "")
  };
};

/**
 * Merge query parameters with pagination defaults
 * @param queryParams - Semantic query parameters
 * @param paginationParams - Optional pagination parameters
 * @returns Complete search parameters
 */
export const mergeQueryAndPagination = (queryParams: Partial<OpenAlexSearchParameters>, paginationParams?: Partial<OpenAlexSearchParameters>): OpenAlexSearchParameters => {
  const defaults: Partial<OpenAlexSearchParameters> = {
    page: DEFAULT_PAGE,
    per_page: DEFAULT_PER_PAGE
  };

  return {
    ...queryParams,
    ...defaults,
    ...paginationParams
  };
};