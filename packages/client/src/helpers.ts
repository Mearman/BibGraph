/**
 * OpenAlex API Helper Functions
 *
 * Convenience functions for common OpenAlex API operations.
 * These functions use a shared client instance for simplicity.
 */

import type {
  Author,
  Concept,
  Funder,
  InstitutionEntity,
  Keyword,
  OpenAlexResponse,
  Publisher,
  QueryParams,
  Source,
  Topic,
  Work,
} from "@bibgraph/types";

import { cachedOpenAlex } from "./cached-client";
import type { OpenAlexBaseClient } from "./client";
import { AuthorsApi } from "./entities/authors";
import { ConceptsApi } from "./entities/concepts";
import { FundersApi } from "./entities/funders";
import { InstitutionsApi } from "./entities/institutions";
import type { InstitutionSearchOptions } from "./entities/institutions/types";
import { KeywordsApi } from "./entities/keywords";
import type { PublisherSearchOptions } from "./entities/publishers";
import { PublishersApi } from "./entities/publishers";
import { SourcesApi } from "./entities/sources";
import type { SourceSearchOptions } from "./entities/sources-query-builder";
import type { TopicSearchOptions } from "./entities/topics";
import { TopicsApi } from "./entities/topics";
import { WorksApi } from "./entities/works";

// Shared client instance for helper functions
// Uses CachedOpenAlexClient by default for IndexedDB caching support
let _sharedClient: OpenAlexBaseClient | null = null;

/**
 * Get or create the shared client instance
 * Uses the cached client singleton by default for IndexedDB caching
 */
const getSharedClient = (): OpenAlexBaseClient => {
  _sharedClient ??= cachedOpenAlex;
  return _sharedClient;
};

// ============================================================================
// AUTHOR HELPERS
// ============================================================================

/**
 * Get a single author by ID
 */
export const getAuthorById = async (id: string, params: QueryParams = {}): Promise<Author> => {
  const client = getSharedClient();
  const authorsApi = new AuthorsApi(client);
  return authorsApi.getAuthor(id, params);
};

/**
 * Get multiple authors with optional filtering
 */
export const getAuthors = async (params: QueryParams = {}): Promise<OpenAlexResponse<Author>> => {
  const client = getSharedClient();
  const authorsApi = new AuthorsApi(client);
  return authorsApi.getAuthors(params);
};

// ============================================================================
// WORK HELPERS
// ============================================================================

/**
 * Get a single work by ID
 */
export const getWorkById = async (id: string, params: QueryParams = {}): Promise<Work> => {
  const client = getSharedClient();
  const worksApi = new WorksApi(client);
  return worksApi.getWork(id, params);
};

/**
 * Get multiple works with optional filtering
 */
export const getWorks = async (params: QueryParams = {}): Promise<OpenAlexResponse<Work>> => {
  const client = getSharedClient();
  const worksApi = new WorksApi(client);
  return worksApi.getWorks(params);
};

// ============================================================================
// CONCEPT HELPERS
// ============================================================================

/**
 * Get a single concept by ID
 */
export const getConceptById = async (id: string, params: QueryParams = {}): Promise<Concept> => {
  const client = getSharedClient();
  const conceptsApi = new ConceptsApi(client);
  return conceptsApi.getConcept(id, params);
};

/**
 * Get multiple concepts with optional filtering
 */
export const getConcepts = async (params: QueryParams = {}): Promise<OpenAlexResponse<Concept>> => {
  const client = getSharedClient();
  const conceptsApi = new ConceptsApi(client);
  return conceptsApi.getConcepts(params);
};

// ============================================================================
// INSTITUTION HELPERS
// ============================================================================

/**
 * Get a single institution by ID
 */
export const getInstitutionById = async (id: string, params: QueryParams = {}): Promise<InstitutionEntity> => {
  const client = getSharedClient();
  const institutionsApi = new InstitutionsApi(client);
  return institutionsApi.getInstitution(id, params);
};

/**
 * Get multiple institutions with optional filtering
 */
export const getInstitutions = async (params: InstitutionSearchOptions = {}): Promise<OpenAlexResponse<InstitutionEntity>> => {
  const client = getSharedClient();
  const institutionsApi = new InstitutionsApi(client);
  return institutionsApi.getInstitutions(params);
};

// ============================================================================
// FUNDER HELPERS
// ============================================================================

/**
 * Get a single funder by ID
 */
export const getFunderById = async (id: string, params: QueryParams = {}): Promise<Funder> => {
  const client = getSharedClient();
  const fundersApi = new FundersApi(client);
  return fundersApi.getFunder(id, params);
};

/**
 * Get multiple funders with optional filtering
 */
export const getFunders = async (params: QueryParams = {}): Promise<OpenAlexResponse<Funder>> => {
  const client = getSharedClient();
  const fundersApi = new FundersApi(client);
  return fundersApi.getFunders(params);
};

// ============================================================================
// PUBLISHER HELPERS
// ============================================================================

/**
 * Get a single publisher by ID
 */
export const getPublisherById = async (id: string, params: QueryParams = {}): Promise<Publisher> => {
  const client = getSharedClient();
  const publishersApi = new PublishersApi(client);
  return publishersApi.getPublisher(id, params);
};

/**
 * Get multiple publishers with optional filtering
 */
export const getPublishers = async (params: PublisherSearchOptions = {}): Promise<OpenAlexResponse<Publisher>> => {
  const client = getSharedClient();
  const publishersApi = new PublishersApi(client);
  return publishersApi.getPublishers(params);
};

// ============================================================================
// SOURCE HELPERS
// ============================================================================

/**
 * Get a single source by ID
 */
export const getSourceById = async (id: string, params: QueryParams = {}): Promise<Source> => {
  const client = getSharedClient();
  const sourcesApi = new SourcesApi(client);
  return sourcesApi.getSource(id, params);
};

/**
 * Get multiple sources with optional filtering
 */
export const getSources = async (params: SourceSearchOptions = {}): Promise<OpenAlexResponse<Source>> => {
  const client = getSharedClient();
  const sourcesApi = new SourcesApi(client);
  return sourcesApi.getSources(params);
};

// ============================================================================
// TOPIC HELPERS
// ============================================================================

/**
 * Get a single topic by ID
 */
export const getTopicById = async (id: string, params: QueryParams = {}): Promise<Topic> => {
  const client = getSharedClient();
  const topicsApi = new TopicsApi(client);
  return topicsApi.getTopic(id, params);
};

/**
 * Get multiple topics with optional filtering
 */
export const getTopics = async (params: TopicSearchOptions = {}): Promise<OpenAlexResponse<Topic>> => {
  const client = getSharedClient();
  const topicsApi = new TopicsApi(client);
  return topicsApi.getTopics(params);
};

// ============================================================================
// KEYWORD HELPERS
// ============================================================================

/**
 * Get a single keyword by ID
 */
export const getKeywordById = async (id: string, params: QueryParams = {}): Promise<Keyword> => {
  const client = getSharedClient();
  const keywordsApi = new KeywordsApi(client);
  return keywordsApi.getKeyword(id, params);
};

/**
 * Get multiple keywords with optional filtering
 */
export const getKeywords = async (params: QueryParams = {}): Promise<OpenAlexResponse<Keyword>> => {
  const client = getSharedClient();
  const keywordsApi = new KeywordsApi(client);
  return keywordsApi.getKeywords(params);
};

// ============================================================================
// UTILITY FUNCTIONS
// ============================================================================

/**
 * Set a custom client instance for all helper functions
 * Useful for testing or when you need specific client configuration
 */
export const setSharedClient = (client: OpenAlexBaseClient): void => {
  _sharedClient = client;
};

/**
 * Reset the shared client to use default configuration
 */
export const resetSharedClient = (): void => {
  _sharedClient = null;
};
