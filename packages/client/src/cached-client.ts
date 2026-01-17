/**
 * Cached Client - Integrated static data caching with multi-tier fallback
 */

import type { OpenAlexEntity, QueryParams } from "@bibgraph/types";
import { isOpenAlexEntity } from "@bibgraph/types";
import { logger } from "@bibgraph/utils";

import { OpenAlexBaseClient, type ValidationSchema } from "./client";
import { AuthorsApi } from "./entities/authors";
import { ConceptsApi } from "./entities/concepts";
import { FundersApi } from "./entities/funders";
import { InstitutionsApi } from "./entities/institutions";
import { KeywordsApi } from "./entities/keywords";
import { PublishersApi } from "./entities/publishers";
import { SourcesApi } from "./entities/sources";
import { TextAnalysisApi } from "./entities/text-analysis";
import { TopicsApi } from "./entities/topics";
import { WorksApi } from "./entities/works";
import {
  cacheEntitiesFromResults,
  cacheEntityResult,
} from "./internal/cache-operations";
import type { OpenAlexClientConfig } from "./internal/client-config";
import {
  detectEntityTypeFromId,
  detectEntityTypeFromUrl,
} from "./internal/entity-type-detection";
import {
  indexEntitiesInGraph,
  indexEntityInGraph,
} from "./internal/graph-indexing";
import {
  type CachedEntityEntry,
  type CacheStatistics,
  type EnvironmentInfo,
  staticDataProvider,
} from "./internal/static-data-provider";
import {
  cleanOpenAlexId,
  toStaticEntityType,
} from "./internal/static-data-utils";
import { validateStaticData } from "./internal/type-helpers";
import { AutocompleteApi } from "./utils/autocomplete";

export interface ClientApis {
  works: WorksApi;
  authors: AuthorsApi;
  sources: SourcesApi;
  institutions: InstitutionsApi;
  topics: TopicsApi;
  publishers: PublishersApi;
  funders: FundersApi;
  keywords: KeywordsApi;
  textAnalysis: TextAnalysisApi;
  concepts: ConceptsApi;
  autocomplete: AutocompleteApi;
  getEntity: (id: string) => Promise<OpenAlexEntity | null>;
}

export interface CachedClientConfig extends OpenAlexClientConfig {
  staticCacheEnabled?: boolean;
  staticCacheGitHubPagesUrl?: string;
  staticCacheLocalDir?: string;
}

/**
 * Type guard to safely access properties that may exist on an extended config
 * @param obj Object to check for property
 * @param key Property name to check
 */
const hasProperty = <K extends string>(obj: unknown, key: K): obj is Record<K, unknown> => typeof obj === "object" && obj !== null && key in obj;

export class CachedOpenAlexClient extends OpenAlexBaseClient {
  client: ClientApis;
  private staticCacheEnabled: boolean;
  private requestStats = {
    totalRequests: 0,
    cacheHits: 0,
    apiFallbacks: 0,
    errors: 0,
  };

  constructor(config: CachedClientConfig = {}) {
    super(config);
    this.staticCacheEnabled = config.staticCacheEnabled ?? true;

    if (config.staticCacheGitHubPagesUrl) {
      staticDataProvider.configure({
        gitHubPagesBaseUrl: config.staticCacheGitHubPagesUrl,
      });
      logger.debug("client", "Static cache GitHub Pages URL configured", {
        url: config.staticCacheGitHubPagesUrl,
      });
    }

    this.client = {
      works: new WorksApi(this),
      authors: new AuthorsApi(this),
      sources: new SourcesApi(this),
      institutions: new InstitutionsApi(this),
      topics: new TopicsApi(this),
      publishers: new PublishersApi(this),
      funders: new FundersApi(this),
      keywords: new KeywordsApi(this),
      textAnalysis: new TextAnalysisApi(this),
      concepts: new ConceptsApi(this),
      autocomplete: new AutocompleteApi(this),
      getEntity: this.getEntityWithStaticCache.bind(this),
    };
  }

  /**
   * Try to get entity from static cache
   * @param root0
   * @param root0.cleanId
   * @param root0.entityType
   */
  private async tryStaticCache({
    cleanId,
    entityType,
  }: {
    cleanId: string;
    entityType: string;
  }): Promise<OpenAlexEntity | null> {
    try {
      const staticEntityType = toStaticEntityType(entityType);
      const staticResult = await staticDataProvider.getStaticData(
        staticEntityType,
        cleanId,
      );

      if (
        staticResult.found &&
        staticResult.data &&
        isOpenAlexEntity(staticResult.data)
      ) {
        this.requestStats.cacheHits++;
        logger.debug("client", "Static cache hit for entity", {
          id: cleanId,
          entityType,
          tier: staticResult.tier,
          loadTime: staticResult.loadTime,
        });
        return staticResult.data;
      }
    } catch (staticError: unknown) {
      logger.debug("client", "Static cache error, handling gracefully", {
        id: cleanId,
        error: staticError,
      });
    }
    return null;
  }

  /**
   * Try to get entity from API with caching
   * @param root0
   * @param root0.cleanId
   * @param root0.entityType
   */
  private async tryApiFallback({
    cleanId,
    entityType,
  }: {
    cleanId: string;
    entityType: string;
  }): Promise<unknown> {
    try {
      const result = await this.getById({
        endpoint: `${entityType}`,
        id: cleanId,
      });

      if (this.staticCacheEnabled && result && isOpenAlexEntity(result)) {
        await cacheEntityResult({
          entityType,
          id: cleanId,
          data: result,
        });
      }

      return result;
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API request failed for entity - attempting static cache fallback",
        { id: cleanId, error: apiError },
      );
      this.requestStats.errors++;

      const staticResult = await this.tryStaticCache({ cleanId, entityType });
      if (staticResult) {
        return staticResult;
      }

      throw apiError;
    }
  }

  /**
   * Get entity with static cache integration
   * @param id
   */
  private async getEntityWithStaticCache(
    id: string,
  ): Promise<OpenAlexEntity | null> {
    const cleanId = cleanOpenAlexId(id);
    this.requestStats.totalRequests++;

    const entityType = detectEntityTypeFromId(cleanId);

    if (!entityType) {
      logger.warn("client", "Could not determine entity type for ID", {
        id: cleanId,
      });
      return null;
    }

    if (this.staticCacheEnabled) {
      const staticResult = await this.tryStaticCache({ cleanId, entityType });
      if (staticResult) {
        return staticResult;
      }
    }

    this.requestStats.apiFallbacks++;
    logger.debug("client", "Falling back to API for entity", { id: cleanId });

    const apiResult = await this.tryApiFallback({ cleanId, entityType });
    return isOpenAlexEntity(apiResult) ? apiResult : null;
  }

  /**
   * Try to get data from static cache for getById requests
   * @param endpoint
   * @param cleanId
   * @param isFallback
   */
  private async tryStaticCacheForGetById<T>(
    endpoint: string,
    cleanId: string,
    isFallback: boolean = false,
  ): Promise<T | null> {
    if (!this.staticCacheEnabled) return null;

    try {
      const entityType = detectEntityTypeFromId(cleanId);
      if (!entityType) return null;

      const expectedEndpoint = entityType;
      if (
        !isFallback &&
        expectedEndpoint !== endpoint.replace(/s$/, "") + "s"
      ) {
        return null;
      }

      const staticEntityType = toStaticEntityType(entityType);
      const staticResult = await staticDataProvider.getStaticData(
        staticEntityType,
        cleanId,
      );

      if (staticResult.found && staticResult.data) {
        if (isFallback) {
          this.requestStats.cacheHits++;
        }
        logger.debug(
          "client",
          `Static cache ${isFallback ? "fallback" : "hit"} for getById`,
          {
            endpoint,
            id: cleanId,
            tier: staticResult.tier,
          },
        );
        return isFallback
          ? (staticResult.data as T)
          : (validateStaticData(staticResult.data) as T);
      }
    } catch (error: unknown) {
      logger.debug(
        "client",
        `Static cache ${isFallback ? "fallback" : "lookup"} failed for getById`,
        {
          endpoint,
          id: cleanId,
          error,
        },
      );
    }

    return null;
  }

  /**
   * Enhanced getById with static cache integration
   * @param endpointOrParams
   * @param id
   * @param params
   * @param schema
   */
  async getById<T = unknown>(
    endpointOrParams:
      | string
      | {
          endpoint: string;
          id: string;
          params?: QueryParams;
          schema?: ValidationSchema<T>;
        },
    id?: string,
    params?: QueryParams,
    schema?: ValidationSchema<T>,
  ): Promise<T> {
    // Handle legacy signature: getById(endpoint, id, params, schema)
    if (typeof endpointOrParams === "string") {
      return this.handleLegacyGetById(endpointOrParams, id, params, schema);
    }

    // Handle new signature: getById({ endpoint, id, params, schema })
    return this.handleNewGetById(endpointOrParams);
  }

  private async handleLegacyGetById<T>(
    endpoint: string,
    id: string | undefined,
    params?: QueryParams,
    schema?: ValidationSchema<T>,
  ): Promise<T> {
    if (!id) {
      throw new Error("ID is required for legacy getById signature");
    }
    const cleanId = cleanOpenAlexId(id);

    if (!params) {
      const staticResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
      );
      if (staticResult !== null) {
        return staticResult;
      }
    }

    try {
      return await super.getById(endpoint, cleanId, params, schema);
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API getById failed, attempting static cache fallback",
        { endpoint, id: cleanId, error: apiError },
      );

      const fallbackResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
        true,
      );
      if (fallbackResult !== null) {
        return fallbackResult;
      }

      throw apiError;
    }
  }

  private async handleNewGetById<T>(params: {
    endpoint: string;
    id: string;
    params?: QueryParams;
    schema?: ValidationSchema<T>;
  }): Promise<T> {
    const {
      endpoint,
      id: entityId,
      params: newParams = {},
      schema: newSchema,
    } = params;
    const cleanId = cleanOpenAlexId(entityId);

    if (!newParams || Object.keys(newParams).length === 0) {
      const staticResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
      );
      if (staticResult !== null) {
        return staticResult;
      }
    }

    try {
      return await super.getById({
        endpoint,
        id: cleanId,
        params: newParams,
        schema: newSchema,
      });
    } catch (apiError: unknown) {
      logger.warn(
        "client",
        "API getById failed, attempting static cache fallback",
        { endpoint, id: cleanId, error: apiError },
      );

      const fallbackResult = await this.tryStaticCacheForGetById<T>(
        endpoint,
        cleanId,
        true,
      );
      if (fallbackResult !== null) {
        return fallbackResult;
      }

      throw apiError;
    }
  }

  /**
   * Cache entities from API response data
   * @param root0
   * @param root0.url
   * @param root0.responseData
   */
  protected override async cacheResponseEntities({
    url,
    responseData,
  }: {
    url: string;
    responseData: unknown;
  }): Promise<void> {
    if (!this.staticCacheEnabled) return;

    try {
      const entityType = detectEntityTypeFromUrl(url);
      if (!entityType) return;

      if (this.isListResponse(responseData)) {
        const results = (responseData as { results: unknown[] }).results;
        await cacheEntitiesFromResults(results, entityType);
        await indexEntitiesInGraph(results, entityType);
      } else if (isOpenAlexEntity(responseData)) {
        const id = responseData.id;
        if (typeof id === "string") {
          const cleanId = cleanOpenAlexId(id);
          await cacheEntityResult({
            entityType,
            id: cleanId,
            data: responseData,
          });
          await indexEntityInGraph(cleanId, entityType, responseData);
        }
      }
    } catch (error: unknown) {
      logger.debug("client", "Failed to cache response entities", {
        url,
        error,
      });
    }
  }

  /**
   * Check if response is a list response with results array
   * @param responseData
   */
  private isListResponse(
    responseData: unknown,
  ): responseData is { results: unknown[] } {
    return (
      responseData !== null &&
      typeof responseData === "object" &&
      "results" in responseData &&
      Array.isArray((responseData as { results: unknown[] }).results)
    );
  }

  // ===========================================================================
  // Cache Statistics and Management
  // ===========================================================================

  async getStaticCacheStats(): Promise<CacheStatistics> {
    return staticDataProvider.getCacheStatistics();
  }

  getRequestStats(): typeof this.requestStats {
    return { ...this.requestStats };
  }

  async hasStaticEntity(id: string): Promise<boolean> {
    if (!this.staticCacheEnabled) return false;

    try {
      const cleanId = cleanOpenAlexId(id);
      const entityType = detectEntityTypeFromId(cleanId);

      if (entityType) {
        const staticEntityType = toStaticEntityType(entityType);
        return staticDataProvider.hasStaticData(staticEntityType, cleanId);
      }
    } catch (error: unknown) {
      logger.debug("client", "Failed to check static entity existence", {
        id,
        error,
      });
    }

    return false;
  }

  async clearStaticCache(): Promise<void> {
    await staticDataProvider.clearCache();
    logger.debug("client", "Static cache cleared");
  }

  getStaticCacheEnvironment(): EnvironmentInfo {
    return staticDataProvider.getEnvironmentInfo();
  }

  getStaticCacheEnabled(): boolean {
    return this.staticCacheEnabled;
  }

  setStaticCacheEnabled(enabled: boolean): void {
    this.staticCacheEnabled = enabled;
    logger.debug("client", "Static cache enabled state changed", { enabled });
  }

  /**
   * Set the GitHub Pages base URL for static cache
   * @param url Base URL for static cache (e.g., "https://mearman.github.io/BibGraph/data/openalex/")
   */
  setStaticCacheGitHubPagesUrl(url: string): void {
    staticDataProvider.configure({ gitHubPagesBaseUrl: url });
    logger.debug("client", "Static cache GitHub Pages URL configured", { url });
  }

  override updateConfig(config: Partial<OpenAlexClientConfig>): void {
    super.updateConfig(config);

    // Handle CachedClientConfig-specific properties if present
    // Use type guard to safely access extended properties
    if (hasProperty(config, "staticCacheEnabled")) {
      const enabled = config.staticCacheEnabled;
      if (typeof enabled === "boolean") {
        this.setStaticCacheEnabled(enabled);
      }
    }

    if (hasProperty(config, "staticCacheGitHubPagesUrl")) {
      const url = config.staticCacheGitHubPagesUrl;
      if (typeof url === "string") {
        staticDataProvider.configure({ gitHubPagesBaseUrl: url });
        logger.debug("client", "Static cache configuration updated", { url });
      }
    }
  }

  // ===========================================================================
  // Cache Enumeration Methods
  // ===========================================================================

  enumerateMemoryCacheEntities(): CachedEntityEntry[] {
    return staticDataProvider.enumerateMemoryCacheEntities();
  }

  async enumerateIndexedDBEntities(): Promise<CachedEntityEntry[]> {
    return staticDataProvider.enumerateIndexedDBEntities();
  }

  async getCacheTierSummary(): Promise<{
    memory: { count: number; entities: CachedEntityEntry[] };
    indexedDB: { count: number; entities: CachedEntityEntry[] };
  }> {
    return staticDataProvider.getCacheTierSummary();
  }

  getMemoryCacheSize(): number {
    return staticDataProvider.getMemoryCacheSize();
  }

  getStaticCacheTierConfig(): {
    gitHubPages: {
      url: string;
      isConfigured: boolean;
      isProduction: boolean;
      isLocalhost: boolean;
    };
    localStatic: {
      path: string;
      isAvailable: boolean;
    };
  } {
    return staticDataProvider.getStaticCacheTierConfig();
  }

  async enumerateStaticCacheEntities(): Promise<CachedEntityEntry[]> {
    return staticDataProvider.enumerateStaticCacheEntities();
  }
}

/**
 * Default cached client instance with static caching enabled
 */
export const cachedOpenAlex: CachedOpenAlexClient = new CachedOpenAlexClient({
  staticCacheEnabled: true,
});

/**
 * Create a new cached client with custom configuration
 * @param config
 */
export const createCachedOpenAlexClient = (
  config: CachedClientConfig = {},
): CachedOpenAlexClient => new CachedOpenAlexClient(config);

/**
 * Update the email configuration for the global OpenAlex client
 * @param email
 */
export const updateOpenAlexEmail = (email: string | undefined) => {
  cachedOpenAlex.updateConfig({ userEmail: email });
};

/**
 * Update the API key configuration for the global OpenAlex client
 * @param apiKey
 */
export const updateOpenAlexApiKey = (apiKey: string | undefined) => {
  cachedOpenAlex.updateConfig({ apiKey });
};

/**
 * Get comprehensive cache performance metrics
 */
export const getCachePerformanceMetrics = async (): Promise<{
  staticCache: CacheStatistics;
  requestStats: {
    totalRequests: number;
    cacheHits: number;
    apiFallbacks: number;
    errors: number;
    cacheHitRate: number;
  };
  environment: EnvironmentInfo;
}> => {
  const staticCache = await cachedOpenAlex.getStaticCacheStats();
  const requestStats = cachedOpenAlex.getRequestStats();
  const environment = cachedOpenAlex.getStaticCacheEnvironment();

  return {
    staticCache,
    requestStats: {
      ...requestStats,
      cacheHitRate:
        requestStats.totalRequests > 0
          ? requestStats.cacheHits / requestStats.totalRequests
          : 0,
    },
    environment,
  };
};
