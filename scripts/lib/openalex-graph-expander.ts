/**
 * OpenAlex-specific implementation of GraphExpander interface.
 *
 * Handles all API fetching, caching, batch requests, and relationship extraction
 * for OpenAlex entities. Completely decoupled from the BFS algorithm.
 */

import type { GraphExpander, Neighbor } from '../../packages/algorithms/dist/index.js';
import { OpenAlexCache } from './openalex-cache.js';
import {
  extractRelationships,
  getRelationshipSelectFields,
  FILTER_RELATIONSHIP_TYPES,
} from './entity-extraction.js';

// ============================================================================
// Types
// ============================================================================

export type EntityType =
  | 'work'
  | 'author'
  | 'institution'
  | 'source'
  | 'concept'
  | 'topic'
  | 'funder'
  | 'publisher';

export interface Entity {
  id: string;
  type: EntityType;
  data: Record<string, unknown>;
}

interface FetchedEntity {
  id: string;
  data: Record<string, unknown>;
}

interface BatchFetchResult {
  fetched: Entity[];
  failed: string[];
}

// ============================================================================
// Configuration
// ============================================================================

const API_BASE = 'https://api.openalex.org';
const RATE_LIMIT_MS = 100;
const WORKS_PER_PAGE = 200;
const BATCH_SIZE = 50;
const MAX_FETCH_PER_RELATIONSHIP = 1000;

const API_HEADERS = {
  'User-Agent': 'BibGraph/1.0 (https://github.com/Mearman/BibGraph)',
  Accept: 'application/json',
};

const ENTITY_ENDPOINTS: Record<EntityType, string> = {
  work: 'works',
  author: 'authors',
  institution: 'institutions',
  source: 'sources',
  concept: 'concepts',
  topic: 'topics',
  funder: 'funders',
  publisher: 'publishers',
};

// ============================================================================
// OpenAlex Graph Expander Implementation
// ============================================================================

/**
 * OpenAlex-specific graph expander.
 *
 * Implements GraphExpander interface by:
 * - Fetching entity neighbors from OpenAlex API
 * - Caching responses to disk
 * - Batch fetching to minimize API calls
 * - Extracting relationships from entity data
 *
 * NO knowledge of BFS algorithm - purely data fetching and relationship extraction.
 */
export class OpenAlexGraphExpander implements GraphExpander<Entity> {
  private entities: Map<string, Entity> = new Map();
  private failedIds: Set<string> = new Set();
  private responseCache: OpenAlexCache;
  private edges: Array<{ source: string; target: string; relationshipType: string }> = [];

  constructor(cacheDir?: string) {
    this.responseCache = new OpenAlexCache({
      cacheDir,
      ttlMs: 7 * 24 * 60 * 60 * 1000, // 7 days
      autoPrune: true,
    });

    const stats = this.responseCache.getStats();
    console.log(
      `Response cache: ${stats.totalRequests} cached requests (${(stats.totalSizeBytes / 1024 / 1024).toFixed(1)} MB)`
    );
    console.log(`  Location: ${this.responseCache.getCacheDir()}`);
  }

  /**
   * Get all neighbors of a node by expanding relationships.
   *
   * Implements GraphExpander.getNeighbors()
   * - Extracts relationships from cached entity data
   * - Fetches additional entities via *_api_url endpoints
   * - Batch fetches uncached entities
   * - Returns all neighbor IDs and relationship types
   */
  async getNeighbors(nodeId: string): Promise<Neighbor[]> {
    const entity = this.entities.get(nodeId);
    if (!entity) {
      return [];
    }

    const neighbors: Neighbor[] = [];
    const relationships = extractRelationships(entity);

    // Special handling: Author → Works (via works_api_url)
    if (entity.type === 'author' && typeof entity.data.works_api_url === 'string') {
      const works = await this.fetchWorksFromUrl(entity.data.works_api_url, 'works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'authored',
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} works`);
      }
    }

    // Special handling: Work → Citing Works (via cited_by_api_url)
    if (entity.type === 'work' && typeof entity.data.cited_by_api_url === 'string') {
      const citingWorks = await this.fetchWorksFromUrl(entity.data.cited_by_api_url, 'citing works');
      for (const citingWork of citingWorks) {
        const normalizedWorkId = this.normalizeId(citingWork.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: citingWork.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'cited_by',
        });
      }
      if (citingWorks.length > 0) {
        console.log(
          `    [${entity.data.display_name ?? entity.data.title ?? nodeId}]: ${citingWorks.length} citing works`
        );
      }
    }

    // Special handling: Publisher → Sources (via sources_api_url)
    if (entity.type === 'publisher' && typeof entity.data.sources_api_url === 'string') {
      const sources = await this.fetchSourcesFromUrl(entity.data.sources_api_url, 'sources');
      for (const source of sources) {
        const normalizedSourceId = this.normalizeId(source.id);
        if (!this.entities.has(normalizedSourceId)) {
          this.entities.set(normalizedSourceId, {
            id: normalizedSourceId,
            type: 'source',
            data: source.data,
          });
        }
        relationships.push({
          targetId: normalizedSourceId,
          relationshipType: 'publishes',
        });
      }
      if (sources.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${sources.length} sources`);
      }
    }

    // Special handling: Institution → Works (via works_api_url)
    if (entity.type === 'institution' && typeof entity.data.works_api_url === 'string') {
      const works = await this.fetchWorksFromUrl(entity.data.works_api_url, 'works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'produced_work',
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} works`);
      }
    }

    // Special handling: Source → Works (via works_api_url)
    if (entity.type === 'source' && typeof entity.data.works_api_url === 'string') {
      const works = await this.fetchWorksFromUrl(entity.data.works_api_url, 'works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'published_work',
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} works`);
      }
    }

    // Special handling: Topic → Works (via works_api_url)
    if (entity.type === 'topic' && typeof entity.data.works_api_url === 'string') {
      const works = await this.fetchWorksFromUrl(entity.data.works_api_url, 'works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'topic_work',
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} works`);
      }
    }

    // Special handling: Concept → Works (via works_api_url)
    if (entity.type === 'concept' && typeof entity.data.works_api_url === 'string') {
      const works = await this.fetchWorksFromUrl(entity.data.works_api_url, 'works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: 'concept_work',
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} works`);
      }
    }

    // Special handling: Funder → Works (via filter query)
    if (entity.type === 'funder') {
      const shortId = this.extractShortId(nodeId);
      const funderWorksUrl = `https://api.openalex.org/works?filter=funders.id:${shortId}`;
      const works = await this.fetchWorksFromUrl(funderWorksUrl, 'funded works');
      for (const work of works) {
        const normalizedWorkId = this.normalizeId(work.id);
        if (!this.entities.has(normalizedWorkId)) {
          this.entities.set(normalizedWorkId, {
            id: normalizedWorkId,
            type: 'work',
            data: work.data,
          });
        }
        relationships.push({
          targetId: normalizedWorkId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.FUNDER_WORK,
        });
      }
      if (works.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${works.length} funded works`);
      }
    }

    // Filter-based relationship discovery
    await this.addFilterBasedRelationships(nodeId, entity, relationships);

    // Batch fetch uncached entities
    await this.batchFetchUncachedEntities(relationships);

    // Convert to Neighbor format
    for (const rel of relationships) {
      neighbors.push({
        targetId: rel.targetId,
        relationshipType: rel.relationshipType,
      });
    }

    return neighbors;
  }

  /**
   * Get node degree (number of relationships).
   *
   * Implements GraphExpander.getDegree()
   * Used for priority computation in BFS frontier.
   */
  getDegree(nodeId: string): number {
    const entity = this.entities.get(nodeId);
    if (!entity) {
      return 10; // Neutral priority for uncached entities
    }

    const relationships = extractRelationships(entity);
    return relationships.length;
  }

  /**
   * Get node data.
   *
   * Implements GraphExpander.getNode()
   */
  async getNode(nodeId: string): Promise<Entity | null> {
    return this.entities.get(nodeId) ?? null;
  }

  /**
   * Add edge to graph output.
   *
   * Implements GraphExpander.addEdge()
   * Called by BFS during node expansion to track discovered relationships.
   */
  addEdge(source: string, target: string, relationshipType: string): void {
    this.edges.push({ source, target, relationshipType });
  }

  /**
   * Get all edges discovered during traversal.
   */
  getEdges(): Array<{ source: string; target: string; relationshipType: string }> {
    return this.edges;
  }

  /**
   * Check if entity is cached.
   */
  has(id: string): boolean {
    return this.entities.has(id) || this.failedIds.has(id);
  }

  /**
   * Get cached entity.
   */
  get(id: string): Entity | null {
    return this.entities.get(id) ?? null;
  }

  /**
   * Cache an entity.
   */
  set(id: string, entity: Entity): void {
    this.entities.set(id, entity);
  }

  /**
   * Get all cached entities.
   */
  getAllEntities(): Map<string, Entity> {
    return this.entities;
  }

  /**
   * Fetch a single entity from OpenAlex API.
   */
  async fetchEntity(url: string): Promise<Record<string, unknown> | null> {
    await this.sleep(RATE_LIMIT_MS);

    try {
      const response = await fetch(url, { headers: API_HEADERS });

      if (!response.ok) {
        return null;
      }

      const contentType = response.headers.get('content-type');
      if (!contentType?.includes('application/json')) {
        return null;
      }

      return (await response.json()) as Record<string, unknown>;
    } catch {
      return null;
    }
  }

  /**
   * Convert entity ID to API URL.
   */
  idToApiUrl(id: string): string {
    const match = id.match(/([WAISCFTPG])(\d+)$/i);
    if (!match) return id;

    const prefix = match[1].toUpperCase();
    const typeMap: Record<string, string> = {
      W: 'works',
      A: 'authors',
      I: 'institutions',
      S: 'sources',
      C: 'concepts',
      T: 'topics',
      F: 'funders',
      P: 'publishers',
    };

    const entityPath = typeMap[prefix];
    if (!entityPath) return id;

    return `${API_BASE}/${entityPath}/${prefix}${match[2]}`;
  }

  // ============================================================================
  // Private Helper Methods
  // ============================================================================

  private async sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private extractShortId(id: string): string {
    const match = id.match(/([WAISCFTPG]\d+)$/i);
    return match ? match[1].toUpperCase() : id;
  }

  private normalizeId(id: string): string {
    const match = id.match(/([WAISCFTPG]\d+)$/i);
    return match ? `https://openalex.org/${match[1].toUpperCase()}` : id;
  }

  private getEntityType(id: string): EntityType | null {
    if (!id || typeof id !== 'string') return null;

    const match = id.match(/([WAISCFTPG])\d+$/i);
    if (!match) return null;

    const prefix = match[1].toUpperCase();
    const typeMap: Record<string, EntityType> = {
      W: 'work',
      A: 'author',
      I: 'institution',
      S: 'source',
      C: 'concept',
      T: 'topic',
      F: 'funder',
      P: 'publisher',
    };

    return typeMap[prefix] ?? null;
  }

  /**
   * Batch fetch multiple entities of the same type.
   * Reduces API calls by ~50x compared to individual fetches.
   */
  private async batchFetchEntities(ids: string[], entityType: EntityType): Promise<BatchFetchResult> {
    const results: Entity[] = [];
    const failed: string[] = [];
    const endpoint = ENTITY_ENDPOINTS[entityType];
    const selectFields = getRelationshipSelectFields(entityType);

    for (let i = 0; i < ids.length; i += BATCH_SIZE) {
      const batch = ids.slice(i, i + BATCH_SIZE);
      const shortIds = batch.map((id) => this.extractShortId(id));
      const filterValue = shortIds.join('|');

      let page = 1;
      let hasMore = true;
      const foundIds = new Set<string>();

      while (hasMore) {
        await this.sleep(RATE_LIMIT_MS);

        const url = new URL(`${API_BASE}/${endpoint}`);
        url.searchParams.set('filter', `ids.openalex:${filterValue}`);
        url.searchParams.set('select', selectFields);
        url.searchParams.set('per_page', String(BATCH_SIZE));
        url.searchParams.set('page', String(page));

        try {
          const response = await fetch(url.toString(), { headers: API_HEADERS });

          if (!response.ok) {
            for (const id of batch) {
              if (!foundIds.has(this.normalizeId(id))) {
                failed.push(id);
              }
            }
            break;
          }

          interface BatchResponse {
            meta?: { count?: number };
            results?: Array<Record<string, unknown>>;
          }

          const data = (await response.json()) as BatchResponse;

          if (!Array.isArray(data.results) || data.results.length === 0) {
            break;
          }

          for (const entityData of data.results) {
            if (typeof entityData.id === 'string') {
              const normalizedId = this.normalizeId(entityData.id);
              foundIds.add(normalizedId);
              results.push({
                id: normalizedId,
                type: entityType,
                data: entityData,
              });
            }
          }

          const totalCount = data.meta?.count ?? 0;
          hasMore = page * BATCH_SIZE < totalCount;
          page++;
        } catch {
          for (const id of batch) {
            if (!foundIds.has(this.normalizeId(id))) {
              failed.push(id);
            }
          }
          break;
        }
      }

      for (const id of batch) {
        const normalizedId = this.normalizeId(id);
        if (!foundIds.has(normalizedId)) {
          failed.push(id);
        }
      }
    }

    return { fetched: results, failed };
  }

  /**
   * Generic paginated fetch for *_api_url endpoints.
   */
  private async fetchEntitiesFromUrl(
    apiUrl: string,
    entityType: EntityType,
    label: string
  ): Promise<FetchedEntity[]> {
    const allEntities: FetchedEntity[] = [];
    let page = 1;
    let hasMore = true;
    let totalCount = 0;

    while (hasMore) {
      await this.sleep(RATE_LIMIT_MS);

      const url = new URL(apiUrl);
      url.searchParams.set('per_page', String(WORKS_PER_PAGE));
      url.searchParams.set('page', String(page));
      url.searchParams.set('select', getRelationshipSelectFields(entityType));

      try {
        const response = await fetch(url.toString(), { headers: API_HEADERS });

        if (!response.ok) {
          break;
        }

        const contentType = response.headers.get('content-type');
        if (!contentType?.includes('application/json')) {
          break;
        }

        interface ApiResponse {
          meta?: { count?: number };
          results?: Array<Record<string, unknown>>;
        }

        const data = (await response.json()) as ApiResponse;

        if (!Array.isArray(data.results) || data.results.length === 0) {
          break;
        }

        if (page === 1) {
          totalCount = data.meta?.count ?? 0;
          if (totalCount > WORKS_PER_PAGE) {
            console.log(
              `      (fetching ${totalCount} ${label} across ${Math.ceil(totalCount / WORKS_PER_PAGE)} pages...)`
            );
          }
        }

        for (const entity of data.results) {
          if (typeof entity.id === 'string') {
            allEntities.push({
              id: entity.id,
              data: entity,
            });
          }
        }

        const fetchedSoFar = page * WORKS_PER_PAGE;
        hasMore = fetchedSoFar < totalCount && data.results.length === WORKS_PER_PAGE;

        if (allEntities.length >= MAX_FETCH_PER_RELATIONSHIP) {
          hasMore = false;
        }

        page++;
      } catch {
        break;
      }
    }

    return allEntities;
  }

  private async fetchWorksFromUrl(url: string, label = 'works'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'work', label);
  }

  private async fetchSourcesFromUrl(url: string, label = 'sources'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'source', label);
  }

  private async fetchAuthorsFromUrl(url: string, label = 'authors'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'author', label);
  }

  private async fetchTopicsFromUrl(url: string, label = 'topics'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'topic', label);
  }

  private async fetchConceptsFromUrl(url: string, label = 'concepts'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'concept', label);
  }

  private async fetchPublishersFromUrl(url: string, label = 'publishers'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'publisher', label);
  }

  private async fetchInstitutionsFromUrl(url: string, label = 'institutions'): Promise<FetchedEntity[]> {
    return this.fetchEntitiesFromUrl(url, 'institution', label);
  }

  /**
   * Add filter-based relationships (Institution→Authors, Concept→Authors, etc.)
   */
  private async addFilterBasedRelationships(
    nodeId: string,
    entity: Entity,
    relationships: Array<{ targetId: string; relationshipType: string }>
  ): Promise<void> {
    // Institution → Authors
    if (entity.type === 'institution') {
      const shortId = this.extractShortId(nodeId);
      const authorsUrl = `https://api.openalex.org/authors?filter=affiliations.institution.id:${shortId}`;
      const authors = await this.fetchAuthorsFromUrl(authorsUrl, 'affiliated authors');
      for (const author of authors) {
        const normalizedAuthorId = this.normalizeId(author.id);
        if (!this.entities.has(normalizedAuthorId)) {
          this.entities.set(normalizedAuthorId, {
            id: normalizedAuthorId,
            type: 'author',
            data: author.data,
          });
        }
        relationships.push({
          targetId: normalizedAuthorId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.INSTITUTION_AUTHOR,
        });
      }
      if (authors.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${authors.length} affiliated authors`);
      }
    }

    // Institution → Child Institutions
    if (entity.type === 'institution') {
      const shortId = this.extractShortId(nodeId);
      const childInstitutionsUrl = `https://api.openalex.org/institutions?filter=lineage:${shortId}`;
      const childInstitutions = await this.fetchInstitutionsFromUrl(childInstitutionsUrl, 'child institutions');
      for (const inst of childInstitutions) {
        const normalizedInstId = this.normalizeId(inst.id);
        if (normalizedInstId === nodeId) continue;
        if (!this.entities.has(normalizedInstId)) {
          this.entities.set(normalizedInstId, {
            id: normalizedInstId,
            type: 'institution',
            data: inst.data,
          });
        }
        relationships.push({
          targetId: normalizedInstId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.INSTITUTION_CHILD,
        });
      }
      if (childInstitutions.length > 1) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${childInstitutions.length - 1} child institutions`);
      }
    }

    // Concept → Authors
    if (entity.type === 'concept') {
      const shortId = this.extractShortId(nodeId);
      const authorsUrl = `https://api.openalex.org/authors?filter=x_concepts.id:${shortId}`;
      const authors = await this.fetchAuthorsFromUrl(authorsUrl, 'concept authors');
      for (const author of authors) {
        const normalizedAuthorId = this.normalizeId(author.id);
        if (!this.entities.has(normalizedAuthorId)) {
          this.entities.set(normalizedAuthorId, {
            id: normalizedAuthorId,
            type: 'author',
            data: author.data,
          });
        }
        relationships.push({
          targetId: normalizedAuthorId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.CONCEPT_AUTHOR,
        });
      }
      if (authors.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${authors.length} concept authors`);
      }
    }

    // Concept → Sources
    if (entity.type === 'concept') {
      const shortId = this.extractShortId(nodeId);
      const sourcesUrl = `https://api.openalex.org/sources?filter=x_concepts.id:${shortId}`;
      const sources = await this.fetchSourcesFromUrl(sourcesUrl, 'concept sources');
      for (const source of sources) {
        const normalizedSourceId = this.normalizeId(source.id);
        if (!this.entities.has(normalizedSourceId)) {
          this.entities.set(normalizedSourceId, {
            id: normalizedSourceId,
            type: 'source',
            data: source.data,
          });
        }
        relationships.push({
          targetId: normalizedSourceId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.CONCEPT_SOURCE,
        });
      }
      if (sources.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${sources.length} concept sources`);
      }
    }

    // Concept → Child Concepts
    if (entity.type === 'concept') {
      const shortId = this.extractShortId(nodeId);
      const childConceptsUrl = `https://api.openalex.org/concepts?filter=ancestors.id:${shortId}`;
      const childConcepts = await this.fetchConceptsFromUrl(childConceptsUrl, 'child concepts');
      for (const concept of childConcepts) {
        const normalizedConceptId = this.normalizeId(concept.id);
        if (normalizedConceptId === nodeId) continue;
        if (!this.entities.has(normalizedConceptId)) {
          this.entities.set(normalizedConceptId, {
            id: normalizedConceptId,
            type: 'concept',
            data: concept.data,
          });
        }
        relationships.push({
          targetId: normalizedConceptId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.CONCEPT_CHILD,
        });
      }
      if (childConcepts.length > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${childConcepts.length} child concepts`);
      }
    }

    // Topic hierarchy
    if (entity.type === 'topic') {
      const shortId = this.extractShortId(nodeId);

      const domainChildrenUrl = `https://api.openalex.org/topics?filter=domain.id:${shortId}`;
      const domainChildren = await this.fetchTopicsFromUrl(domainChildrenUrl, 'domain children');
      for (const topic of domainChildren) {
        const normalizedTopicId = this.normalizeId(topic.id);
        if (normalizedTopicId === nodeId) continue;
        if (!this.entities.has(normalizedTopicId)) {
          this.entities.set(normalizedTopicId, {
            id: normalizedTopicId,
            type: 'topic',
            data: topic.data,
          });
        }
        relationships.push({
          targetId: normalizedTopicId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.TOPIC_DOMAIN_CHILD,
        });
      }

      const fieldChildrenUrl = `https://api.openalex.org/topics?filter=field.id:${shortId}`;
      const fieldChildren = await this.fetchTopicsFromUrl(fieldChildrenUrl, 'field children');
      for (const topic of fieldChildren) {
        const normalizedTopicId = this.normalizeId(topic.id);
        if (normalizedTopicId === nodeId) continue;
        if (!this.entities.has(normalizedTopicId)) {
          this.entities.set(normalizedTopicId, {
            id: normalizedTopicId,
            type: 'topic',
            data: topic.data,
          });
        }
        relationships.push({
          targetId: normalizedTopicId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.TOPIC_FIELD_CHILD,
        });
      }

      const subfieldChildrenUrl = `https://api.openalex.org/topics?filter=subfield.id:${shortId}`;
      const subfieldChildren = await this.fetchTopicsFromUrl(subfieldChildrenUrl, 'subfield children');
      for (const topic of subfieldChildren) {
        const normalizedTopicId = this.normalizeId(topic.id);
        if (normalizedTopicId === nodeId) continue;
        if (!this.entities.has(normalizedTopicId)) {
          this.entities.set(normalizedTopicId, {
            id: normalizedTopicId,
            type: 'topic',
            data: topic.data,
          });
        }
        relationships.push({
          targetId: normalizedTopicId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.TOPIC_SUBFIELD_CHILD,
        });
      }

      const totalChildren = domainChildren.length + fieldChildren.length + subfieldChildren.length;
      if (totalChildren > 0) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${totalChildren} child topics`);
      }
    }

    // Publisher → Child Publishers
    if (entity.type === 'publisher') {
      const shortId = this.extractShortId(nodeId);
      const childPublishersUrl = `https://api.openalex.org/publishers?filter=lineage:${shortId}`;
      const childPublishers = await this.fetchPublishersFromUrl(childPublishersUrl, 'child publishers');
      for (const pub of childPublishers) {
        const normalizedPubId = this.normalizeId(pub.id);
        if (normalizedPubId === nodeId) continue;
        if (!this.entities.has(normalizedPubId)) {
          this.entities.set(normalizedPubId, {
            id: normalizedPubId,
            type: 'publisher',
            data: pub.data,
          });
        }
        relationships.push({
          targetId: normalizedPubId,
          relationshipType: FILTER_RELATIONSHIP_TYPES.PUBLISHER_CHILD,
        });
      }
      if (childPublishers.length > 1) {
        console.log(`    [${entity.data.display_name ?? nodeId}]: ${childPublishers.length - 1} child publishers`);
      }
    }
  }

  /**
   * Batch fetch all uncached entities from relationships.
   */
  private async batchFetchUncachedEntities(
    relationships: Array<{ targetId: string; relationshipType: string }>
  ): Promise<void> {
    const uncachedByType = new Map<EntityType, Set<string>>();

    for (const rel of relationships) {
      if (this.entities.has(rel.targetId)) continue;

      const targetType = this.getEntityType(rel.targetId);
      if (!targetType) continue;

      if (!uncachedByType.has(targetType)) {
        uncachedByType.set(targetType, new Set());
      }
      uncachedByType.get(targetType)!.add(rel.targetId);
    }

    for (const [entityType, idSet] of uncachedByType) {
      const ids = [...idSet];
      if (ids.length === 0) continue;

      const batchCount = Math.ceil(ids.length / BATCH_SIZE);
      console.log(`    Batch fetching ${ids.length} ${entityType}s (${batchCount} request${batchCount > 1 ? 's' : ''})...`);

      const { fetched, failed } = await this.batchFetchEntities(ids, entityType);

      for (const entity of fetched) {
        this.entities.set(entity.id, entity);
      }

      for (const id of failed) {
        this.failedIds.add(id);
      }
    }
  }
}
