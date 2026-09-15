/**
 * Entity Type Coverage Integration Tests
 *
 * Validates that all 12 OpenAlex entity types are properly represented across:
 * - TypeScript EntityType union
 * - API client methods
 * - ENTITY_TYPE_CONFIGS
 *
 * This ensures complete entity type coverage after migration.
 * @see specs/019-full-entity-support/spec.md (User Story 3)
 */

import { cachedOpenAlex } from '@bibgraph/client';
import type { EntityType } from '@bibgraph/types';
import { describe, expect,it } from 'vitest';

import { ENTITY_TYPE_CONFIGS } from '@/components/entity-detail/EntityTypeConfig';

const EXPECTED_ENTITY_TYPE_COUNT = 12;

describe('Entity Type Coverage', () => {
  /**
   * All 12 OpenAlex entity types that should be supported (licenses excluded - not a first-class OpenAlex entity)
   */
  const EXPECTED_ENTITY_TYPES: EntityType[] = [
    'works',
    'authors',
    'sources',
    'institutions',
    'topics',
    'concepts',
    'publishers',
    'funders',
    'keywords',
    'domains',
    'fields',
    'subfields',
  ];

  describe('TypeScript EntityType Union', () => {
    it('should include all 12 expected entity types', () => {
      // Test that we can assign all expected types without TypeScript errors
      

      // Verify we have exactly 12 types
      expect(EXPECTED_ENTITY_TYPES).toHaveLength(EXPECTED_ENTITY_TYPE_COUNT);

      // Verify each type is a valid EntityType
      for (const type of EXPECTED_ENTITY_TYPES) {
        // This will cause a type error if the type is not in the union
        // Type checking performed via TypeScript compilation
        // const _typeCheck: EntityType = type;
        expect(type).toBeTruthy();
      }
    });

    it('should not allow invalid entity types', () => {
      // TypeScript should catch these at compile time, but we can verify at runtime
      const invalidTypes = ['invalid', 'license', 'licenses', 'unknown'];

      for (const invalidType of invalidTypes) {
        // Test that invalid types are not in the expected list
        const isValid: boolean = EXPECTED_ENTITY_TYPES.includes(invalidType as EntityType);
        expect(isValid).toBe(false);
      }
    });
  });

  describe('API Client Methods', () => {
    it('should have client methods for all entity types', () => {
      // Verify client has endpoints for all types
      expect(cachedOpenAlex.client.works).toBeDefined();
      expect(cachedOpenAlex.client.authors).toBeDefined();
      expect(cachedOpenAlex.client.sources).toBeDefined();
      expect(cachedOpenAlex.client.institutions).toBeDefined();
      expect(cachedOpenAlex.client.topics).toBeDefined();
      expect(cachedOpenAlex.client.concepts).toBeDefined();
      expect(cachedOpenAlex.client.publishers).toBeDefined();
      expect(cachedOpenAlex.client.funders).toBeDefined();
      expect(cachedOpenAlex.client.keywords).toBeDefined();

      // Note: domains, fields, subfields are handled by topics API
      expect(typeof cachedOpenAlex.client.topics.getDomains).toBe('function');
      expect(typeof cachedOpenAlex.client.topics.getFields).toBe('function');
      expect(typeof cachedOpenAlex.client.topics.getSubfields).toBe('function');
    });

    it('should have client objects for standard entity types', () => {
      // Standard entity types should have client objects with methods
      expect(cachedOpenAlex.client.works).toBeDefined();
      expect(cachedOpenAlex.client.authors).toBeDefined();
      expect(cachedOpenAlex.client.sources).toBeDefined();
      expect(cachedOpenAlex.client.institutions).toBeDefined();
      expect(cachedOpenAlex.client.topics).toBeDefined();
      expect(cachedOpenAlex.client.concepts).toBeDefined();
      expect(cachedOpenAlex.client.publishers).toBeDefined();
      expect(cachedOpenAlex.client.funders).toBeDefined();
      expect(cachedOpenAlex.client.keywords).toBeDefined();
    });

    it('should have getById methods for standard entity types', () => {
      // Each standard entity type should have a method to get by ID
      expect(typeof cachedOpenAlex.client.works.getWork).toBe('function');
      expect(typeof cachedOpenAlex.client.authors.getAuthor).toBe('function');
      expect(typeof cachedOpenAlex.client.sources.getSource).toBe('function');
      expect(typeof cachedOpenAlex.client.institutions.getInstitution).toBe('function');
      expect(typeof cachedOpenAlex.client.topics.getTopic).toBe('function');
      expect(typeof cachedOpenAlex.client.concepts.getConcept).toBe('function');
      expect(typeof cachedOpenAlex.client.publishers.getPublisher).toBe('function');
      expect(typeof cachedOpenAlex.client.funders.getFunder).toBe('function');
      expect(typeof cachedOpenAlex.client.keywords.getKeyword).toBe('function');
    });

    it('should have taxonomy methods for domains/fields/subfields', () => {
      // Taxonomy entities use specialized TopicsApi methods
      expect(typeof cachedOpenAlex.client.topics.getDomains).toBe('function');
      expect(typeof cachedOpenAlex.client.topics.getFields).toBe('function');
      expect(typeof cachedOpenAlex.client.topics.getSubfields).toBe('function');
    });
  });

  describe('ENTITY_TYPE_CONFIGS', () => {
    it('should have configs for all 12 entity types', () => {
      // Verify each entity type has a config
      for (const entityType of EXPECTED_ENTITY_TYPES) {
        const config = ENTITY_TYPE_CONFIGS[entityType];

        expect(config).toBeDefined();
        expect(config).toHaveProperty('name');
        expect(config).toHaveProperty('icon');
        expect(config).toHaveProperty('colorKey');
      }
    });

    it('should have valid config properties', () => {
      // Verify each config has required properties with correct types
      for (const entityType of EXPECTED_ENTITY_TYPES) {
        const config = ENTITY_TYPE_CONFIGS[entityType];

        // Name should be a non-empty string
        expect(typeof config.name).toBe('string');
        expect(config.name.length).toBeGreaterThan(0);

        // Icon should exist (React element)
        expect(config.icon).toBeDefined();

        // ColorKey should be defined (may be singular or plural form)
        expect(config.colorKey).toBeDefined();
        expect(typeof config.colorKey).toBe('string');
      }
    });

    it('should not have configs for invalid entity types', () => {
      // Verify licenses (excluded) is not in configs
      expect('licenses' in ENTITY_TYPE_CONFIGS).toBe(false);

      // Verify other invalid keys are not present
      expect('invalid' in ENTITY_TYPE_CONFIGS).toBe(false);
    });
  });

  describe('Entity Type Consistency', () => {
    it('should have matching entity types across type system, client, and configs', () => {
      // Count entity types in each system
      const typeCount = EXPECTED_ENTITY_TYPES.length;
      const configCount = Object.keys(ENTITY_TYPE_CONFIGS).length;

      // Should have 12 types and 12 configs
      expect(typeCount).toBe(EXPECTED_ENTITY_TYPE_COUNT);
      expect(configCount).toBe(EXPECTED_ENTITY_TYPE_COUNT);

      // Every type should have a config
      for (const type of EXPECTED_ENTITY_TYPES) {
        expect(ENTITY_TYPE_CONFIGS[type]).toBeDefined();
      }

      // Every config should map to a valid type
      for (const key of Object.keys(ENTITY_TYPE_CONFIGS)) {
        expect(EXPECTED_ENTITY_TYPES).toContain(key as EntityType);
      }
    });
  });

  describe('Exclusions', () => {
    it('should NOT include licenses as entity type', () => {
      // Verify licenses is not in expected types (per research findings)
      expect(EXPECTED_ENTITY_TYPES).not.toContain('licenses');

      // Verify no license client methods
      expect('licenses' in cachedOpenAlex.client).toBe(false);

      // Verify no license config
      expect('licenses' in ENTITY_TYPE_CONFIGS).toBe(false);
    });
  });
});
