/**
 * Unit tests for entity extraction and relationship utilities.
 *
 * Tests cover:
 * - Entity type detection from OpenAlex IDs
 * - ID normalization
 * - Relationship extraction for all entity types
 */

import { describe, it, expect } from 'vitest';
import {
  getEntityType,
  normalizeId,
  extractShortId,
  extractRelationships,
  getRelationshipSelectFields,
  ENTITY_ENDPOINTS,
  type Entity,
  type EntityType,
} from './entity-extraction';

// ============================================================================
// Test Fixtures - Real OpenAlex API Response Structures
// ============================================================================

const FIXTURES = {
  /**
   * Work entity with full relationship data
   */
  work: {
    id: 'https://openalex.org/W2741809807',
    type: 'work' as EntityType,
    data: {
      id: 'https://openalex.org/W2741809807',
      display_name: 'The State of OA: A large-scale analysis',
      authorships: [
        {
          author: {
            id: 'https://openalex.org/A5023888391',
            display_name: 'Heather Piwowar',
          },
          institutions: [
            {
              id: 'https://openalex.org/I4200000001',
              display_name: 'Our Research',
            },
          ],
        },
        {
          author: {
            id: 'https://openalex.org/A5068897626',
            display_name: 'Jason Priem',
          },
          institutions: [
            {
              id: 'https://openalex.org/I4200000001',
              display_name: 'Our Research',
            },
            {
              id: 'https://openalex.org/I170897317',
              display_name: 'University of North Carolina at Chapel Hill',
            },
          ],
        },
      ],
      primary_location: {
        source: {
          id: 'https://openalex.org/S202381698',
          display_name: 'PeerJ',
        },
      },
      topics: [
        { id: 'https://openalex.org/T10119', display_name: 'Open Access' },
        { id: 'https://openalex.org/T12345', display_name: 'Scholarly Communication' },
      ],
      concepts: [
        { id: 'https://openalex.org/C2778793908', display_name: 'Open access' },
      ],
      funders: [
        { id: 'https://openalex.org/F4320332161', display_name: 'NSF' },
      ],
      referenced_works: [
        'https://openalex.org/W2012345678',
        'https://openalex.org/W2023456789',
      ],
      related_works: [
        'https://openalex.org/W2034567890',
      ],
    },
  },

  /**
   * Author entity with affiliations and topics
   */
  author: {
    id: 'https://openalex.org/A5035271865',
    type: 'author' as EntityType,
    data: {
      id: 'https://openalex.org/A5035271865',
      display_name: 'P. Erdös',
      last_known_institutions: [
        { id: 'https://openalex.org/I27837315', display_name: 'Hungarian Academy of Sciences' },
      ],
      topics: [
        { id: 'https://openalex.org/T12100', display_name: 'Graph Theory' },
        { id: 'https://openalex.org/T12200', display_name: 'Number Theory' },
      ],
      x_concepts: [
        { id: 'https://openalex.org/C33923547', display_name: 'Mathematics' },
        { id: 'https://openalex.org/C154945302', display_name: 'Combinatorics' },
      ],
    },
  },

  /**
   * Institution entity with associations
   */
  institution: {
    id: 'https://openalex.org/I27837315',
    type: 'institution' as EntityType,
    data: {
      id: 'https://openalex.org/I27837315',
      display_name: 'Hungarian Academy of Sciences',
      associated_institutions: [
        { id: 'https://openalex.org/I123456789', display_name: 'Research Institute' },
      ],
      topics: [
        { id: 'https://openalex.org/T12100', display_name: 'Physics' },
      ],
    },
  },

  /**
   * Source entity with publisher (string ID format)
   */
  sourceWithStringPublisher: {
    id: 'https://openalex.org/S202381698',
    type: 'source' as EntityType,
    data: {
      id: 'https://openalex.org/S202381698',
      display_name: 'PeerJ',
      host_organization: 'https://openalex.org/P4310319965',
      topics: [
        { id: 'https://openalex.org/T10119', display_name: 'Open Science' },
      ],
    },
  },

  /**
   * Source entity with publisher (object format)
   */
  sourceWithObjectPublisher: {
    id: 'https://openalex.org/S12965339',
    type: 'source' as EntityType,
    data: {
      id: 'https://openalex.org/S12965339',
      display_name: 'Nature',
      host_organization: {
        id: 'https://openalex.org/P4310319750',
        display_name: 'Springer Nature',
      },
      topics: [
        { id: 'https://openalex.org/T11111', display_name: 'Science' },
      ],
    },
  },

  /**
   * Source entity with null publisher
   */
  sourceWithNullPublisher: {
    id: 'https://openalex.org/S4306462921',
    type: 'source' as EntityType,
    data: {
      id: 'https://openalex.org/S4306462921',
      display_name: 'Mathematical Archive',
      host_organization: null,
      topics: [
        { id: 'https://openalex.org/T12100', display_name: 'Mathematics' },
      ],
    },
  },

  /**
   * Topic entity with hierarchy
   */
  topic: {
    id: 'https://openalex.org/T12100',
    type: 'topic' as EntityType,
    data: {
      id: 'https://openalex.org/T12100',
      display_name: 'Graph Theory',
      domain: { id: 'https://openalex.org/T10000', display_name: 'Physical Sciences' },
      field: { id: 'https://openalex.org/T11000', display_name: 'Mathematics' },
      subfield: { id: 'https://openalex.org/T11100', display_name: 'Discrete Mathematics' },
      siblings: [
        { id: 'https://openalex.org/T12101', display_name: 'Network Theory' },
        { id: 'https://openalex.org/T12102', display_name: 'Combinatorial Optimization' },
      ],
    },
  },

  /**
   * Concept entity with hierarchy and relations
   */
  concept: {
    id: 'https://openalex.org/C33923547',
    type: 'concept' as EntityType,
    data: {
      id: 'https://openalex.org/C33923547',
      display_name: 'Mathematics',
      ancestors: [
        { id: 'https://openalex.org/C100000000', display_name: 'Science' },
      ],
      related_concepts: [
        { id: 'https://openalex.org/C154945302', display_name: 'Combinatorics' },
        { id: 'https://openalex.org/C144133560', display_name: 'Statistics' },
      ],
    },
  },

  /**
   * Funder entity
   */
  funder: {
    id: 'https://openalex.org/F4320332161',
    type: 'funder' as EntityType,
    data: {
      id: 'https://openalex.org/F4320332161',
      display_name: 'National Science Foundation',
      topics: [
        { id: 'https://openalex.org/T10119', display_name: 'Research Funding' },
      ],
    },
  },

  /**
   * Publisher entity with parent
   */
  publisherWithParent: {
    id: 'https://openalex.org/P4310319965',
    type: 'publisher' as EntityType,
    data: {
      id: 'https://openalex.org/P4310319965',
      display_name: 'PeerJ Inc',
      parent_publisher: {
        id: 'https://openalex.org/P4310319000',
        display_name: 'Parent Publisher Group',
      },
    },
  },

  /**
   * Publisher entity without parent
   */
  publisherWithoutParent: {
    id: 'https://openalex.org/P4310319750',
    type: 'publisher' as EntityType,
    data: {
      id: 'https://openalex.org/P4310319750',
      display_name: 'Springer Nature',
      parent_publisher: null,
    },
  },
};

// ============================================================================
// getEntityType Tests
// ============================================================================

describe('getEntityType', () => {
  describe('full URL format', () => {
    it.each([
      ['https://openalex.org/W123456789', 'work'],
      ['https://openalex.org/A123456789', 'author'],
      ['https://openalex.org/I123456789', 'institution'],
      ['https://openalex.org/S123456789', 'source'],
      ['https://openalex.org/C123456789', 'concept'],
      ['https://openalex.org/T123456789', 'topic'],
      ['https://openalex.org/F123456789', 'funder'],
      ['https://openalex.org/P123456789', 'publisher'],
    ])('detects %s as %s', (id, expectedType) => {
      expect(getEntityType(id)).toBe(expectedType);
    });
  });

  describe('short ID format', () => {
    it.each([
      ['W123456789', 'work'],
      ['A123456789', 'author'],
      ['I123456789', 'institution'],
      ['S123456789', 'source'],
      ['C123456789', 'concept'],
      ['T123456789', 'topic'],
      ['F123456789', 'funder'],
      ['P123456789', 'publisher'],
    ])('detects %s as %s', (id, expectedType) => {
      expect(getEntityType(id)).toBe(expectedType);
    });
  });

  describe('case insensitivity', () => {
    it.each([
      ['https://openalex.org/w123456789', 'work'],
      ['https://openalex.org/a123456789', 'author'],
      ['p123456789', 'publisher'],
    ])('handles lowercase %s as %s', (id, expectedType) => {
      expect(getEntityType(id)).toBe(expectedType);
    });
  });

  describe('invalid inputs', () => {
    it.each([
      [null, null],
      [undefined, null],
      ['', null],
      ['invalid', null],
      ['X123456789', null], // Unknown prefix
      ['123456789', null], // No prefix
    ])('returns null for %s', (id, expected) => {
      expect(getEntityType(id as string)).toBe(expected);
    });
  });

  describe('non-openalex URLs with valid ID suffix', () => {
    // The function matches the ID pattern at the end of the string,
    // regardless of the URL domain. This is intentional for flexibility.
    it('still detects valid ID patterns in non-openalex URLs', () => {
      expect(getEntityType('https://example.com/W123')).toBe('work');
    });
  });
});

// ============================================================================
// normalizeId Tests
// ============================================================================

describe('normalizeId', () => {
  it('normalizes short IDs to full URLs', () => {
    expect(normalizeId('W123456789')).toBe('https://openalex.org/W123456789');
    expect(normalizeId('A5035271865')).toBe('https://openalex.org/A5035271865');
  });

  it('normalizes lowercase IDs to uppercase', () => {
    expect(normalizeId('w123456789')).toBe('https://openalex.org/W123456789');
    expect(normalizeId('https://openalex.org/p123')).toBe('https://openalex.org/P123');
  });

  it('preserves already normalized IDs', () => {
    expect(normalizeId('https://openalex.org/W123456789')).toBe(
      'https://openalex.org/W123456789'
    );
  });

  it('returns original for unrecognized formats', () => {
    expect(normalizeId('invalid')).toBe('invalid');
  });
});

// ============================================================================
// extractShortId Tests
// ============================================================================

describe('extractShortId', () => {
  it('extracts short ID from full URL', () => {
    expect(extractShortId('https://openalex.org/W123456789')).toBe('W123456789');
    expect(extractShortId('https://openalex.org/P4310319965')).toBe('P4310319965');
  });

  it('normalizes case', () => {
    expect(extractShortId('https://openalex.org/w123456789')).toBe('W123456789');
  });

  it('returns original for unrecognized formats', () => {
    expect(extractShortId('invalid')).toBe('invalid');
  });
});

// ============================================================================
// extractRelationships Tests
// ============================================================================

describe('extractRelationships', () => {
  describe('work entity', () => {
    it('extracts authors from authorships', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const authors = relationships.filter((r) => r.relationshipType === 'has_author');

      expect(authors).toHaveLength(2);
      expect(authors.map((a) => a.targetId)).toContain(
        'https://openalex.org/A5023888391'
      );
      expect(authors.map((a) => a.targetId)).toContain(
        'https://openalex.org/A5068897626'
      );
    });

    it('extracts institutions from authorships', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const institutions = relationships.filter(
        (r) => r.relationshipType === 'authored_at_institution'
      );

      // 1 for first author, 2 for second author = 3 total
      expect(institutions).toHaveLength(3);
      expect(institutions.map((i) => i.targetId)).toContain(
        'https://openalex.org/I4200000001'
      );
      expect(institutions.map((i) => i.targetId)).toContain(
        'https://openalex.org/I170897317'
      );
    });

    it('extracts source from primary_location', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const sources = relationships.filter(
        (r) => r.relationshipType === 'published_in'
      );

      expect(sources).toHaveLength(1);
      expect(sources[0].targetId).toBe('https://openalex.org/S202381698');
    });

    it('extracts topics', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const topics = relationships.filter((r) => r.relationshipType === 'has_topic');

      expect(topics).toHaveLength(2);
    });

    it('extracts concepts', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const concepts = relationships.filter(
        (r) => r.relationshipType === 'has_concept'
      );

      expect(concepts).toHaveLength(1);
      expect(concepts[0].targetId).toBe('https://openalex.org/C2778793908');
    });

    it('extracts funders', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const funders = relationships.filter((r) => r.relationshipType === 'funded_by');

      expect(funders).toHaveLength(1);
      expect(funders[0].targetId).toBe('https://openalex.org/F4320332161');
    });

    it('extracts referenced works (citations)', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const citations = relationships.filter((r) => r.relationshipType === 'cites');

      expect(citations).toHaveLength(2);
    });

    it('extracts related works', () => {
      const relationships = extractRelationships(FIXTURES.work);
      const related = relationships.filter(
        (r) => r.relationshipType === 'related_to'
      );

      expect(related).toHaveLength(1);
    });
  });

  describe('author entity', () => {
    it('extracts institutions', () => {
      const relationships = extractRelationships(FIXTURES.author);
      const institutions = relationships.filter(
        (r) => r.relationshipType === 'affiliated_with'
      );

      expect(institutions).toHaveLength(1);
      expect(institutions[0].targetId).toBe('https://openalex.org/I27837315');
    });

    it('extracts topics', () => {
      const relationships = extractRelationships(FIXTURES.author);
      const topics = relationships.filter(
        (r) => r.relationshipType === 'researches_topic'
      );

      expect(topics).toHaveLength(2);
    });

    it('extracts concepts from x_concepts', () => {
      const relationships = extractRelationships(FIXTURES.author);
      const concepts = relationships.filter(
        (r) => r.relationshipType === 'researches_concept'
      );

      expect(concepts).toHaveLength(2);
    });
  });

  describe('institution entity', () => {
    it('extracts associated institutions', () => {
      const relationships = extractRelationships(FIXTURES.institution);
      const associated = relationships.filter(
        (r) => r.relationshipType === 'associated_with'
      );

      expect(associated).toHaveLength(1);
    });

    it('extracts topics', () => {
      const relationships = extractRelationships(FIXTURES.institution);
      const topics = relationships.filter(
        (r) => r.relationshipType === 'researches_topic'
      );

      expect(topics).toHaveLength(1);
    });
  });

  describe('source entity', () => {
    it('extracts publisher from string host_organization', () => {
      const relationships = extractRelationships(FIXTURES.sourceWithStringPublisher);
      const publishers = relationships.filter(
        (r) => r.relationshipType === 'hosted_by'
      );

      expect(publishers).toHaveLength(1);
      expect(publishers[0].targetId).toBe('https://openalex.org/P4310319965');
    });

    it('extracts publisher from object host_organization', () => {
      const relationships = extractRelationships(FIXTURES.sourceWithObjectPublisher);
      const publishers = relationships.filter(
        (r) => r.relationshipType === 'hosted_by'
      );

      expect(publishers).toHaveLength(1);
      expect(publishers[0].targetId).toBe('https://openalex.org/P4310319750');
    });

    it('handles null host_organization gracefully', () => {
      const relationships = extractRelationships(FIXTURES.sourceWithNullPublisher);
      const publishers = relationships.filter(
        (r) => r.relationshipType === 'hosted_by'
      );

      expect(publishers).toHaveLength(0);
    });

    it('extracts topics', () => {
      const relationships = extractRelationships(FIXTURES.sourceWithStringPublisher);
      const topics = relationships.filter(
        (r) => r.relationshipType === 'covers_topic'
      );

      expect(topics).toHaveLength(1);
    });
  });

  describe('topic entity', () => {
    it('extracts domain', () => {
      const relationships = extractRelationships(FIXTURES.topic);
      const domains = relationships.filter((r) => r.relationshipType === 'in_domain');

      expect(domains).toHaveLength(1);
      expect(domains[0].targetId).toBe('https://openalex.org/T10000');
    });

    it('extracts field', () => {
      const relationships = extractRelationships(FIXTURES.topic);
      const fields = relationships.filter((r) => r.relationshipType === 'in_field');

      expect(fields).toHaveLength(1);
      expect(fields[0].targetId).toBe('https://openalex.org/T11000');
    });

    it('extracts subfield', () => {
      const relationships = extractRelationships(FIXTURES.topic);
      const subfields = relationships.filter(
        (r) => r.relationshipType === 'in_subfield'
      );

      expect(subfields).toHaveLength(1);
      expect(subfields[0].targetId).toBe('https://openalex.org/T11100');
    });

    it('extracts siblings', () => {
      const relationships = extractRelationships(FIXTURES.topic);
      const siblings = relationships.filter(
        (r) => r.relationshipType === 'sibling_of'
      );

      expect(siblings).toHaveLength(2);
    });
  });

  describe('concept entity', () => {
    it('extracts ancestors', () => {
      const relationships = extractRelationships(FIXTURES.concept);
      const ancestors = relationships.filter((r) => r.relationshipType === 'child_of');

      expect(ancestors).toHaveLength(1);
    });

    it('extracts related concepts', () => {
      const relationships = extractRelationships(FIXTURES.concept);
      const related = relationships.filter(
        (r) => r.relationshipType === 'related_to'
      );

      expect(related).toHaveLength(2);
    });
  });

  describe('funder entity', () => {
    it('extracts topics', () => {
      const relationships = extractRelationships(FIXTURES.funder);
      const topics = relationships.filter(
        (r) => r.relationshipType === 'funds_topic'
      );

      expect(topics).toHaveLength(1);
    });
  });

  describe('publisher entity', () => {
    it('extracts parent publisher', () => {
      const relationships = extractRelationships(FIXTURES.publisherWithParent);
      const parents = relationships.filter(
        (r) => r.relationshipType === 'subsidiary_of'
      );

      expect(parents).toHaveLength(1);
      expect(parents[0].targetId).toBe('https://openalex.org/P4310319000');
    });

    it('handles null parent_publisher gracefully', () => {
      const relationships = extractRelationships(FIXTURES.publisherWithoutParent);
      const parents = relationships.filter(
        (r) => r.relationshipType === 'subsidiary_of'
      );

      expect(parents).toHaveLength(0);
    });
  });

  describe('edge cases', () => {
    it('handles empty data', () => {
      const entity: Entity = {
        id: 'https://openalex.org/W123',
        type: 'work',
        data: {},
      };
      const relationships = extractRelationships(entity);
      expect(relationships).toHaveLength(0);
    });

    it('handles missing fields', () => {
      const entity: Entity = {
        id: 'https://openalex.org/W123',
        type: 'work',
        data: {
          authorships: [],
          primary_location: null,
        },
      };
      const relationships = extractRelationships(entity);
      expect(relationships).toHaveLength(0);
    });
  });
});

// ============================================================================
// getRelationshipSelectFields Tests
// ============================================================================

describe('getRelationshipSelectFields', () => {
  it('returns comma-separated field list for each entity type', () => {
    expect(getRelationshipSelectFields('work')).toContain('authorships');
    expect(getRelationshipSelectFields('author')).toContain('last_known_institutions');
    expect(getRelationshipSelectFields('source')).toContain('host_organization');
    expect(getRelationshipSelectFields('publisher')).toContain('parent_publisher');
  });

  it('includes cited_by_api_url for works', () => {
    const workFields = getRelationshipSelectFields('work');
    expect(workFields).toContain('cited_by_api_url');
  });

  describe('*_api_url fields for entity expansion', () => {
    it('includes works_api_url for author', () => {
      expect(getRelationshipSelectFields('author')).toContain('works_api_url');
    });

    it('includes works_api_url for institution', () => {
      expect(getRelationshipSelectFields('institution')).toContain('works_api_url');
    });

    it('includes works_api_url for source', () => {
      expect(getRelationshipSelectFields('source')).toContain('works_api_url');
    });

    it('includes works_api_url for topic', () => {
      expect(getRelationshipSelectFields('topic')).toContain('works_api_url');
    });

    it('includes works_api_url for concept', () => {
      expect(getRelationshipSelectFields('concept')).toContain('works_api_url');
    });

    it('does not include works_api_url for funder (not available in API)', () => {
      expect(getRelationshipSelectFields('funder')).not.toContain('works_api_url');
    });

    it('includes sources_api_url for publisher', () => {
      expect(getRelationshipSelectFields('publisher')).toContain('sources_api_url');
    });
  });

  it('always includes id and display_name', () => {
    const types: EntityType[] = [
      'work',
      'author',
      'institution',
      'source',
      'concept',
      'topic',
      'funder',
      'publisher',
    ];

    for (const type of types) {
      const fields = getRelationshipSelectFields(type);
      expect(fields).toContain('id');
      expect(fields).toContain('display_name');
    }
  });
});

// ============================================================================
// ENTITY_ENDPOINTS Tests
// ============================================================================

describe('ENTITY_ENDPOINTS', () => {
  it('maps all entity types to API endpoints', () => {
    expect(ENTITY_ENDPOINTS.work).toBe('works');
    expect(ENTITY_ENDPOINTS.author).toBe('authors');
    expect(ENTITY_ENDPOINTS.institution).toBe('institutions');
    expect(ENTITY_ENDPOINTS.source).toBe('sources');
    expect(ENTITY_ENDPOINTS.concept).toBe('concepts');
    expect(ENTITY_ENDPOINTS.topic).toBe('topics');
    expect(ENTITY_ENDPOINTS.funder).toBe('funders');
    expect(ENTITY_ENDPOINTS.publisher).toBe('publishers');
  });
});
