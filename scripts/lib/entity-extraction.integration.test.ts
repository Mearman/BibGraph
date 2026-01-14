/**
 * Integration tests for BFS graph expansion with entity extraction.
 *
 * These tests simulate the actual data flow in the build-connection-graph script
 * to verify that all entity types (including publishers) are correctly discovered
 * through relationship extraction.
 */

import { describe, it, expect, beforeEach } from 'vitest';
import {
  extractRelationships,
  getEntityType,
  getRelationshipSelectFields,
  FILTER_RELATIONSHIP_TYPES,
  type Entity,
  type EntityType,
} from './entity-extraction';

/**
 * Simulated cache for testing.
 */
class MockCache {
  private entities: Map<string, Entity> = new Map();

  set(id: string, entity: Entity): void {
    this.entities.set(id, entity);
  }

  get(id: string): Entity | null {
    return this.entities.get(id) ?? null;
  }

  has(id: string): boolean {
    return this.entities.has(id);
  }

  getAllByType(type: EntityType): Entity[] {
    return [...this.entities.values()].filter((e) => e.type === type);
  }
}

/**
 * Simulated BFS state for testing.
 */
interface BFSState {
  frontier: string[];
  visited: Set<string>;
}

/**
 * Simulate one iteration of frontier expansion.
 * Returns the entity IDs that would be batch-fetched, grouped by type.
 */
function simulateExpansion(
  state: BFSState,
  cache: MockCache
): Map<EntityType, Set<string>> {
  const uncachedByType = new Map<EntityType, Set<string>>();

  for (const nodeId of state.frontier) {
    const entity = cache.get(nodeId);
    if (!entity) continue;

    const relationships = extractRelationships(entity);

    for (const rel of relationships) {
      if (state.visited.has(rel.targetId)) continue;

      // Track uncached entities by type
      if (!cache.has(rel.targetId)) {
        const entityType = getEntityType(rel.targetId);
        if (entityType) {
          if (!uncachedByType.has(entityType)) {
            uncachedByType.set(entityType, new Set());
          }
          uncachedByType.get(entityType)!.add(rel.targetId);
        }
      }
    }
  }

  return uncachedByType;
}

describe('BFS expansion integration', () => {
  let cache: MockCache;
  let state: BFSState;

  beforeEach(() => {
    cache = new MockCache();
    state = {
      frontier: [],
      visited: new Set(),
    };
  });

  describe('work → source → publisher chain', () => {
    it('discovers source from work primary_location', () => {
      // Setup: Work in frontier with source in primary_location
      const work: Entity = {
        id: 'https://openalex.org/W123',
        type: 'work',
        data: {
          primary_location: {
            source: { id: 'https://openalex.org/S456' },
          },
        },
      };

      cache.set(work.id, work);
      state.frontier = [work.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('source')).toContain('https://openalex.org/S456');
    });

    it('discovers publisher from source host_organization (string format)', () => {
      // Setup: Source in frontier with string publisher ID
      const source: Entity = {
        id: 'https://openalex.org/S456',
        type: 'source',
        data: {
          host_organization: 'https://openalex.org/P789',
        },
      };

      cache.set(source.id, source);
      state.frontier = [source.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('publisher')).toContain('https://openalex.org/P789');
    });

    it('discovers publisher from source host_organization (object format)', () => {
      // Setup: Source in frontier with object publisher ID
      const source: Entity = {
        id: 'https://openalex.org/S456',
        type: 'source',
        data: {
          host_organization: { id: 'https://openalex.org/P789' },
        },
      };

      cache.set(source.id, source);
      state.frontier = [source.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('publisher')).toContain('https://openalex.org/P789');
    });

    it('handles null host_organization gracefully', () => {
      const source: Entity = {
        id: 'https://openalex.org/S456',
        type: 'source',
        data: {
          host_organization: null,
        },
      };

      cache.set(source.id, source);
      state.frontier = [source.id];

      const uncached = simulateExpansion(state, cache);

      // Should not have any publisher to fetch
      expect(uncached.has('publisher')).toBe(false);
    });

    it('simulates full 3-iteration chain: work → source → publisher', () => {
      // Iteration 1: Author with work
      const author: Entity = {
        id: 'https://openalex.org/A001',
        type: 'author',
        data: {},
      };

      // Simulate author's works being fetched separately (via works_api_url)
      const work: Entity = {
        id: 'https://openalex.org/W123',
        type: 'work',
        data: {
          primary_location: {
            source: { id: 'https://openalex.org/S456' },
          },
        },
      };

      cache.set(author.id, author);
      cache.set(work.id, work);
      state.frontier = [author.id, work.id]; // Works added from author's works_api_url

      // Iteration 1: Should discover source
      let uncached = simulateExpansion(state, cache);
      expect(uncached.get('source')).toContain('https://openalex.org/S456');

      // Simulate batch fetch of source
      const source: Entity = {
        id: 'https://openalex.org/S456',
        type: 'source',
        data: {
          host_organization: 'https://openalex.org/P789',
        },
      };
      cache.set(source.id, source);

      // Update frontier for next iteration
      state.frontier = ['https://openalex.org/S456'];

      // Iteration 2: Should discover publisher
      uncached = simulateExpansion(state, cache);
      expect(uncached.get('publisher')).toContain('https://openalex.org/P789');
    });
  });

  describe('all entity type discovery', () => {
    it('discovers all entity types from a work', () => {
      const work: Entity = {
        id: 'https://openalex.org/W001',
        type: 'work',
        data: {
          authorships: [
            {
              author: { id: 'https://openalex.org/A001' },
              institutions: [{ id: 'https://openalex.org/I001' }],
            },
          ],
          primary_location: {
            source: { id: 'https://openalex.org/S001' },
          },
          topics: [{ id: 'https://openalex.org/T001' }],
          concepts: [{ id: 'https://openalex.org/C001' }],
          funders: [{ id: 'https://openalex.org/F001' }],
          referenced_works: ['https://openalex.org/W002'],
        },
      };

      cache.set(work.id, work);
      state.frontier = [work.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('author')).toContain('https://openalex.org/A001');
      expect(uncached.get('institution')).toContain('https://openalex.org/I001');
      expect(uncached.get('source')).toContain('https://openalex.org/S001');
      expect(uncached.get('topic')).toContain('https://openalex.org/T001');
      expect(uncached.get('concept')).toContain('https://openalex.org/C001');
      expect(uncached.get('funder')).toContain('https://openalex.org/F001');
      expect(uncached.get('work')).toContain('https://openalex.org/W002');
    });

    it('discovers parent publisher from publisher', () => {
      const publisher: Entity = {
        id: 'https://openalex.org/P001',
        type: 'publisher',
        data: {
          parent_publisher: { id: 'https://openalex.org/P002' },
        },
      };

      cache.set(publisher.id, publisher);
      state.frontier = [publisher.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('publisher')).toContain('https://openalex.org/P002');
    });
  });

  describe('bidirectional citation discovery', () => {
    /**
     * Tests that we can discover both:
     * - Outbound citations: works this paper cites (via referenced_works)
     * - Inbound citations: works that cite this paper (via cited_by_api_url)
     */
    it('discovers outbound citations from referenced_works', () => {
      const work: Entity = {
        id: 'https://openalex.org/W123',
        type: 'work',
        data: {
          referenced_works: [
            'https://openalex.org/W001',
            'https://openalex.org/W002',
            'https://openalex.org/W003',
          ],
        },
      };

      cache.set(work.id, work);
      state.frontier = [work.id];

      const uncached = simulateExpansion(state, cache);

      expect(uncached.get('work')).toContain('https://openalex.org/W001');
      expect(uncached.get('work')).toContain('https://openalex.org/W002');
      expect(uncached.get('work')).toContain('https://openalex.org/W003');
    });

    /**
     * Note: cited_by_api_url is a URL field, not directly extracted relationships.
     * The actual fetching is handled in build-connection-graph.ts via fetchCitingWorks().
     * This test verifies the field is included in select parameters.
     */
    it('includes cited_by_api_url in work relationship fields', () => {
      const fields = getRelationshipSelectFields('work');
      expect(fields).toContain('cited_by_api_url');
    });
  });

  describe('filter-based expansion URL patterns', () => {
    /**
     * Tests for filter URL construction used in build-connection-graph.ts
     * These expansions use constructed filter URLs rather than extracting IDs from entity data.
     *
     * Filter-based expansions:
     * - institution → authors via affiliations.institution.id filter
     * - institution → child institutions via lineage filter
     * - concept → authors via x_concepts.id filter
     * - concept → sources via x_concepts.id filter
     * - concept → child concepts via ancestors.id filter
     * - topic → domain children via domain.id filter
     * - topic → field children via field.id filter
     * - topic → subfield children via subfield.id filter
     * - publisher → child publishers via lineage filter
     * - funder → works via funders.id filter
     */

    /**
     * Helper to construct filter URL as done in build-connection-graph.ts
     */
    function constructFilterUrl(
      entityEndpoint: string,
      filterField: string,
      entityId: string
    ): string {
      // Extract short ID (e.g., I27837315 from https://openalex.org/I27837315)
      const shortId = entityId.match(/([WAISCFTPG]\d+)$/i)?.[1]?.toUpperCase() ?? entityId;
      return `https://api.openalex.org/${entityEndpoint}?filter=${filterField}:${shortId}`;
    }

    describe('institution filter expansions', () => {
      it('constructs correct URL for institution → affiliated authors', () => {
        const institutionId = 'https://openalex.org/I27837315';
        const url = constructFilterUrl('authors', 'affiliations.institution.id', institutionId);
        expect(url).toBe('https://api.openalex.org/authors?filter=affiliations.institution.id:I27837315');
      });

      it('constructs correct URL for institution → child institutions (lineage)', () => {
        const institutionId = 'https://openalex.org/I27837315';
        const url = constructFilterUrl('institutions', 'lineage', institutionId);
        expect(url).toBe('https://api.openalex.org/institutions?filter=lineage:I27837315');
      });
    });

    describe('concept filter expansions', () => {
      it('constructs correct URL for concept → authors', () => {
        const conceptId = 'https://openalex.org/C33923547';
        const url = constructFilterUrl('authors', 'x_concepts.id', conceptId);
        expect(url).toBe('https://api.openalex.org/authors?filter=x_concepts.id:C33923547');
      });

      it('constructs correct URL for concept → sources', () => {
        const conceptId = 'https://openalex.org/C33923547';
        const url = constructFilterUrl('sources', 'x_concepts.id', conceptId);
        expect(url).toBe('https://api.openalex.org/sources?filter=x_concepts.id:C33923547');
      });

      it('constructs correct URL for concept → child concepts (ancestors)', () => {
        const conceptId = 'https://openalex.org/C33923547';
        const url = constructFilterUrl('concepts', 'ancestors.id', conceptId);
        expect(url).toBe('https://api.openalex.org/concepts?filter=ancestors.id:C33923547');
      });
    });

    describe('topic hierarchy filter expansions', () => {
      it('constructs correct URL for domain → child topics', () => {
        const topicId = 'https://openalex.org/T10000';
        const url = constructFilterUrl('topics', 'domain.id', topicId);
        expect(url).toBe('https://api.openalex.org/topics?filter=domain.id:T10000');
      });

      it('constructs correct URL for field → child topics', () => {
        const topicId = 'https://openalex.org/T11000';
        const url = constructFilterUrl('topics', 'field.id', topicId);
        expect(url).toBe('https://api.openalex.org/topics?filter=field.id:T11000');
      });

      it('constructs correct URL for subfield → child topics', () => {
        const topicId = 'https://openalex.org/T11100';
        const url = constructFilterUrl('topics', 'subfield.id', topicId);
        expect(url).toBe('https://api.openalex.org/topics?filter=subfield.id:T11100');
      });
    });

    describe('publisher filter expansions', () => {
      it('constructs correct URL for publisher → child publishers (lineage)', () => {
        const publisherId = 'https://openalex.org/P4310319965';
        const url = constructFilterUrl('publishers', 'lineage', publisherId);
        expect(url).toBe('https://api.openalex.org/publishers?filter=lineage:P4310319965');
      });
    });

    describe('funder filter expansions', () => {
      it('constructs correct URL for funder → works', () => {
        const funderId = 'https://openalex.org/F4320332161';
        const url = constructFilterUrl('works', 'funders.id', funderId);
        expect(url).toBe('https://api.openalex.org/works?filter=funders.id:F4320332161');
      });
    });

    describe('filter URL ID extraction edge cases', () => {
      it('handles lowercase IDs correctly', () => {
        const institutionId = 'https://openalex.org/i27837315';
        const url = constructFilterUrl('authors', 'affiliations.institution.id', institutionId);
        expect(url).toBe('https://api.openalex.org/authors?filter=affiliations.institution.id:I27837315');
      });

      it('handles short ID format', () => {
        const institutionId = 'I27837315';
        const url = constructFilterUrl('authors', 'affiliations.institution.id', institutionId);
        expect(url).toBe('https://api.openalex.org/authors?filter=affiliations.institution.id:I27837315');
      });
    });
  });

  describe('filter-based relationship type mapping', () => {
    /**
     * Verifies that FILTER_RELATIONSHIP_TYPES from entity-extraction.ts
     * has correct structure and naming conventions.
     */

    it('exports all expected filter-based relationship types', () => {
      // Verify all expected keys exist
      expect(FILTER_RELATIONSHIP_TYPES.FUNDER_WORK).toBe('funded_work');
      expect(FILTER_RELATIONSHIP_TYPES.INSTITUTION_AUTHOR).toBe('affiliated_author');
      expect(FILTER_RELATIONSHIP_TYPES.INSTITUTION_CHILD).toBe('child_institution');
      expect(FILTER_RELATIONSHIP_TYPES.CONCEPT_AUTHOR).toBe('concept_author');
      expect(FILTER_RELATIONSHIP_TYPES.CONCEPT_SOURCE).toBe('concept_source');
      expect(FILTER_RELATIONSHIP_TYPES.CONCEPT_CHILD).toBe('child_concept');
      expect(FILTER_RELATIONSHIP_TYPES.TOPIC_DOMAIN_CHILD).toBe('domain_child');
      expect(FILTER_RELATIONSHIP_TYPES.TOPIC_FIELD_CHILD).toBe('field_child');
      expect(FILTER_RELATIONSHIP_TYPES.TOPIC_SUBFIELD_CHILD).toBe('subfield_child');
      expect(FILTER_RELATIONSHIP_TYPES.PUBLISHER_CHILD).toBe('child_publisher');
    });

    it.each(Object.entries(FILTER_RELATIONSHIP_TYPES))(
      'relationship type %s = %s follows snake_case convention',
      (_key: string, relationshipType: string) => {
        expect(relationshipType).toBeTruthy();
        expect(typeof relationshipType).toBe('string');
        // Verify relationship type follows naming convention (snake_case)
        expect(relationshipType).toMatch(/^[a-z]+(_[a-z]+)*$/);
      }
    );

    it('all filter-based relationship types are unique', () => {
      const types = Object.values(FILTER_RELATIONSHIP_TYPES);
      const uniqueTypes = new Set(types);
      expect(uniqueTypes.size).toBe(types.length);
    });

    it('has exactly 10 filter-based relationship types', () => {
      expect(Object.keys(FILTER_RELATIONSHIP_TYPES)).toHaveLength(10);
    });
  });

  describe('realistic multi-iteration simulation', () => {
    /**
     * This test simulates the actual BFS flow that should discover publishers:
     *
     * Iteration 1: Start with author
     *   → Fetch author's works
     *   → Works have sources in primary_location
     *   → Sources are added to uncached and batch-fetched
     *
     * Iteration 2: Sources are in frontier
     *   → Extract host_organization from sources
     *   → Publishers are added to uncached and batch-fetched
     *
     * Iteration 3: Publishers are in frontier
     *   → Extract parent_publisher if any
     */
    it('discovers publishers through work→source→publisher chain', () => {
      // ===== SETUP: Seed author =====
      const author: Entity = {
        id: 'https://openalex.org/A5035271865',
        type: 'author',
        data: {
          display_name: 'P. Erdös',
        },
      };
      cache.set(author.id, author);
      state.frontier = [author.id];
      state.visited.add(author.id);

      // ===== ITERATION 1: Expand author =====
      // In real code, author works are fetched via works_api_url
      // Simulate adding works to cache and frontier
      const work1: Entity = {
        id: 'https://openalex.org/W2741809807',
        type: 'work',
        data: {
          primary_location: {
            source: { id: 'https://openalex.org/S202381698' },
          },
        },
      };
      const work2: Entity = {
        id: 'https://openalex.org/W2800123456',
        type: 'work',
        data: {
          primary_location: {
            source: { id: 'https://openalex.org/S12965339' },
          },
        },
      };

      cache.set(work1.id, work1);
      cache.set(work2.id, work2);

      // After author expansion, works are in frontier (from works_api_url)
      state.frontier = [work1.id, work2.id];
      state.visited.add(work1.id);
      state.visited.add(work2.id);

      // Expand works - should find sources
      let uncached = simulateExpansion(state, cache);
      expect(uncached.has('source')).toBe(true);
      expect(uncached.get('source')?.size).toBe(2);

      // ===== Simulate batch fetch of sources =====
      const source1: Entity = {
        id: 'https://openalex.org/S202381698',
        type: 'source',
        data: {
          display_name: 'PeerJ',
          host_organization: 'https://openalex.org/P4310319965', // String format
        },
      };
      const source2: Entity = {
        id: 'https://openalex.org/S12965339',
        type: 'source',
        data: {
          display_name: 'Nature',
          host_organization: { id: 'https://openalex.org/P4310319750' }, // Object format
        },
      };

      cache.set(source1.id, source1);
      cache.set(source2.id, source2);

      // ===== ITERATION 2: Sources in frontier =====
      state.frontier = [source1.id, source2.id];
      state.visited.add(source1.id);
      state.visited.add(source2.id);

      // Expand sources - should find publishers
      uncached = simulateExpansion(state, cache);

      // THIS IS THE CRITICAL CHECK
      expect(uncached.has('publisher')).toBe(true);
      expect(uncached.get('publisher')).toContain('https://openalex.org/P4310319965');
      expect(uncached.get('publisher')).toContain('https://openalex.org/P4310319750');
    });
  });
});
