/**
 * Query bookmarking utilities for BibGraph
 * Handles bookmarking of complex API queries while excluding pagination parameters
 */

import { createApiUrlRequest } from "@bibgraph/utils/storage/user-interactions";

import { type OpenAlexSearchParams } from "./route-schemas";

// Re-export the type for use in other modules

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
export const extractQueryParameters = (searchParams: OpenAlexSearchParams): Partial<OpenAlexSearchParams> => {
  const queryParams: Partial<OpenAlexSearchParams> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && !PAGINATION_PARAMETERS.has(key)) {
      queryParams[key as keyof OpenAlexSearchParams] = value;
    }
  }

  return queryParams;
};

/**
 * Extract pagination parameters from search parameters
 * @param searchParams - Full search parameters
 * @returns Pagination parameters only
 */
export const extractPaginationParameters = (searchParams: OpenAlexSearchParams): Partial<OpenAlexSearchParams> => {
  const paginationParams: Partial<OpenAlexSearchParams> = {};

  for (const [key, value] of Object.entries(searchParams)) {
    if (value !== undefined && value !== null && PAGINATION_PARAMETERS.has(key)) {
      paginationParams[key as keyof OpenAlexSearchParams] = value;
    }
  }

  return paginationParams;
};

/**
 * Generate a unique identifier for a query based on semantic parameters only
 * @param entityType - Type of entity (works, authors, etc.)
 * @param searchParams - Search parameters
 * @returns Unique query identifier string
 */
export const generateQueryId = (entityType: string, searchParams: OpenAlexSearchParams): string => {
  const queryParams = extractQueryParameters(searchParams);

  // Create a normalized string representation of the query
  const queryParts: string[] = [entityType];

  // Add semantic parameters in a consistent order
  const sortedKeys = Object.keys(queryParams).sort();

  for (const key of sortedKeys) {
    const value = queryParams[key as keyof OpenAlexSearchParams];
    if (value !== undefined && value !== null) {
      queryParts.push(`${key}=${String(value)}`);
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
export const createQueryBookmarkRequest = (entityType: string, entityId: string | undefined, searchParams: OpenAlexSearchParams) => {
  // Filter out pagination parameters for bookmark identification
  const queryParams = extractQueryParameters(searchParams);

  // Determine the internal path
  let internalPath: string;

  if (entityId) {
    // Specific entity query (e.g., /authors/A5017898742?select=id,display_name)
    internalPath = `/${entityType}/${entityId}`;
  } else {
    // Entity list query (e.g., /works?filter=author.id:A5017898742)
    internalPath = `/${entityType}`;
  }

  // Generate query ID for hash
  const queryId = generateQueryId(entityType, searchParams);

  // Create the bookmark request with filtered parameters
  return createApiUrlRequest(internalPath, queryParams, queryId);
};

/**
 * Check if two queries are semantically equivalent (ignoring pagination)
 * @param query1 - First query parameters
 * @param query2 - Second query parameters
 * @returns True if queries are semantically equivalent
 */
export const areQueriesEquivalent = (query1: OpenAlexSearchParams, query2: OpenAlexSearchParams): boolean => {
  const params1 = extractQueryParameters(query1);
  const params2 = extractQueryParameters(query2);

  const keys1 = Object.keys(params1).sort();
  const keys2 = Object.keys(params2).sort();

  if (keys1.length !== keys2.length) {
    return false;
  }

  for (const [i, key] of keys1.entries()) {
    if (key !== keys2[i]) {
      return false;
    }

    const value1 = params1[key as keyof OpenAlexSearchParams];
    const value2 = params2[key as keyof OpenAlexSearchParams];

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
export const generateQueryTitle = (entityType: string, searchParams: OpenAlexSearchParams): string => {
  const queryParams = extractQueryParameters(searchParams);
  const parts: string[] = [];

  // Entity type (capitalized)
  const entityTypeName = entityType.charAt(0).toUpperCase() + entityType.slice(1);

  // Add key query characteristics
  if (queryParams.search) {
    parts.push(`"${queryParams.search}"`);
  }

  if (queryParams.filter) {
    // Extract key filter information (simplified)
    const filterStr = queryParams.filter;
    if (filterStr.includes('author.id:')) {
      parts.push('by author');
    } else if (filterStr.includes('concepts.id:')) {
      parts.push('by concept');
    } else if (filterStr.includes('institutions.id:')) {
      parts.push('by institution');
    } else if (filterStr.includes('publication_year:')) {
      parts.push('by year');
    } else {
      parts.push('filtered');
    }
  }

  if (queryParams.sort) {
    parts.push(`sorted ${queryParams.sort.replace('.desc', ' (desc)').replace('.asc', ' (asc)')}`);
  }

  if (queryParams.group_by) {
    parts.push(`grouped by ${queryParams.group_by}`);
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
export const getPaginationInfo = (searchParams: OpenAlexSearchParams): {
  page: number;
  perPage: number;
  cursor?: string;
  hasPagination: boolean;
} => {
  const page = Number(searchParams.page) || 1;
  const perPage = Number(searchParams.per_page) || 50;
  const cursor = searchParams.cursor;

  return {
    page,
    perPage,
    cursor,
    hasPagination: !!(searchParams.page || searchParams.per_page || searchParams.cursor)
  };
};

/**
 * Merge query parameters with pagination defaults
 * @param queryParams - Semantic query parameters
 * @param paginationParams - Optional pagination parameters
 * @returns Complete search parameters
 */
export const mergeQueryAndPagination = (queryParams: Partial<OpenAlexSearchParams>, paginationParams?: Partial<OpenAlexSearchParams>): OpenAlexSearchParams => {
  const defaults: Partial<OpenAlexSearchParams> = {
    page: 1,
    per_page: 50
  };

  return {
    ...queryParams,
    ...defaults,
    ...paginationParams
  } as OpenAlexSearchParams;
};