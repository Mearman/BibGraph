/**
 * Unit tests for entity type filtering with graph list bypass
 * T035: Test visibility logic implementing formula: visible = graph_list ∪ (collections ∩ entity_types)
 *
 * Tests MUST fail initially (Test-First Development - Constitution Principle II)
 */

import type { EntityType, GraphNode } from '@bibgraph/types';
import { beforeEach,describe, expect, it } from 'vitest';

import { applyEntityTypeFilter } from './useEntityTypeFilter';

describe('Entity Type Filter with Graph List Bypass (T035)', () => {
  let allNodes: GraphNode[];

  beforeEach(() => {
    // Setup test data with mix of graph list and collection nodes
    allNodes = [
      // Graph list nodes (should ALWAYS be visible)
      {
        id: 'W1',
        entityType: 'works',
        entityId: 'W1',
        label: 'Graph List Work',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:graph-list',
          _graphListProvenance: 'user',
        },
      },
      {
        id: 'A1',
        entityType: 'authors',
        entityId: 'A1',
        label: 'Graph List Author',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:graph-list',
          _graphListProvenance: 'expansion',
        },
      },
      {
        id: 'I1',
        entityType: 'institutions',
        entityId: 'I1',
        label: 'Graph List Institution',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:graph-list',
          _graphListProvenance: 'user',
        },
      },
      // Collection nodes (bookmarks - should respect filters)
      {
        id: 'W2',
        entityType: 'works',
        entityId: 'W2',
        label: 'Bookmarked Work',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:bookmarks',
        },
      },
      {
        id: 'A2',
        entityType: 'authors',
        entityId: 'A2',
        label: 'Bookmarked Author',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:bookmarks',
        },
      },
      // History nodes (should respect filters)
      {
        id: 'W3',
        entityType: 'works',
        entityId: 'W3',
        label: 'History Work',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:history',
        },
      },
    ];
  });

  describe('Formula: visible = graph_list ∪ (collections ∩ entity_types)', () => {
    it('should show all graph list nodes regardless of filters', () => {
      const selectedTypes: EntityType[] = ['works']; // Only works selected

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // Graph list nodes should ALL be visible (bypass)
      expect(visible.find(n => n.id === 'W1')).toBeDefined(); // Works in graph list
      expect(visible.find(n => n.id === 'A1')).toBeDefined(); // Authors in graph list (bypasses filter!)
      expect(visible.find(n => n.id === 'I1')).toBeDefined(); // Institutions in graph list (bypasses filter!)
    });

    it('should filter collection nodes by entity type', () => {
      const selectedTypes: EntityType[] = ['works']; // Only works selected

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // Collection nodes should be filtered
      expect(visible.find(n => n.id === 'W2')).toBeDefined(); // Works from bookmarks (matches filter)
      expect(visible.find(n => n.id === 'W3')).toBeDefined(); // Works from history (matches filter)
      expect(visible.find(n => n.id === 'A2')).toBeUndefined(); // Authors from bookmarks (filtered out!)
    });

    it('should show everything when no filters selected (empty = all)', () => {
      const selectedTypes: EntityType[] = []; // Empty array = show all

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      expect(visible).toHaveLength(allNodes.length);
    });

    it('should show only graph list nodes when filters exclude all collection types', () => {
      const selectedTypes: EntityType[] = ['topics']; // Type not present in collections

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // Only graph list nodes visible (all bypass filter)
      const EXPECTED_GRAPH_LIST_NODE_COUNT = 3; // W1, A1, I1
      expect(visible).toHaveLength(EXPECTED_GRAPH_LIST_NODE_COUNT);
      expect(visible.every(n => n.entityData?.sourceId === 'catalogue:graph-list')).toBe(true);
    });

    it('should handle multiple selected entity types', () => {
      const selectedTypes: EntityType[] = ['works', 'authors'];

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // Graph list: all 3 visible (bypass)
      expect(visible.find(n => n.id === 'W1')).toBeDefined();
      expect(visible.find(n => n.id === 'A1')).toBeDefined();
      expect(visible.find(n => n.id === 'I1')).toBeDefined();

      // Collections: works and authors visible
      expect(visible.find(n => n.id === 'W2')).toBeDefined();
      expect(visible.find(n => n.id === 'A2')).toBeDefined();
      expect(visible.find(n => n.id === 'W3')).toBeDefined();
    });
  });

  describe('Graph List Source Identification', () => {
    it('should identify graph list nodes by sourceId', () => {
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      const graphListNodes = visible.filter(n => n.entityData?.sourceId === 'catalogue:graph-list');
      const EXPECTED_GRAPH_LIST_NODE_COUNT = 3; // All graph list nodes visible
      expect(graphListNodes).toHaveLength(EXPECTED_GRAPH_LIST_NODE_COUNT);
    });

    it('should bypass filter for nodes with graph-list provenance', () => {
      // Node with provenance but different sourceId (edge case)
      const mixedNode: GraphNode = {
        id: 'A3',
        entityType: 'authors',
        entityId: 'A3',
        label: 'Mixed Provenance Author',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          sourceId: 'catalogue:bookmarks',
          _graphListProvenance: 'user', // Has provenance = treat as graph list
        },
      };

      const nodes = [...allNodes, mixedNode];
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(nodes, selectedTypes);

      // Should bypass because of provenance
      expect(visible.find(n => n.id === 'A3')).toBeDefined();
    });
  });

  describe('Edge Cases', () => {
    it('should handle nodes without entityData', () => {
      const nodeWithoutData: GraphNode = {
        id: 'W4',
        entityType: 'works',
        entityId: 'W4',
        label: 'No Metadata Work',
        x: 0,
        y: 0,
        externalIds: [],
        // No entityData
      };

      const nodes = [...allNodes, nodeWithoutData];
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(nodes, selectedTypes);

      // Should be filtered by entity type (no bypass)
      expect(visible.find(n => n.id === 'W4')).toBeDefined(); // Works type matches
    });

    it('should handle nodes without sourceId', () => {
      const nodeWithoutSource: GraphNode = {
        id: 'A4',
        entityType: 'authors',
        entityId: 'A4',
        label: 'No Source Author',
        x: 0,
        y: 0,
        externalIds: [],
        entityData: {
          // No sourceId
        },
      };

      const nodes = [...allNodes, nodeWithoutSource];
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(nodes, selectedTypes);

      // Should be filtered out (authors not in selected types, no bypass)
      expect(visible.find(n => n.id === 'A4')).toBeUndefined();
    });

    it('should handle empty node list', () => {
      const selectedTypes: EntityType[] = ['works'];
      const visible = applyEntityTypeFilter([], selectedTypes);

      expect(visible).toEqual([]);
    });

    it('should handle null/undefined selectedTypes', () => {
      const visible1 = applyEntityTypeFilter(allNodes, null);
      expect(visible1).toHaveLength(allNodes.length); // null = show all

      const visible2 = applyEntityTypeFilter(allNodes, undefined);
      expect(visible2).toHaveLength(allNodes.length); // undefined = show all
    });
  });

  describe('Union Formula Verification', () => {
    it('should implement correct set union: graph_list ∪ (collections ∩ types)', () => {
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // Set A: All graph list nodes
      const EXPECTED_GRAPH_LIST_COUNT = 3;
      const graphListCount = visible.filter(n =>
        n.entityData?.sourceId === 'catalogue:graph-list' ||
        n.entityData?._graphListProvenance !== undefined
      ).length;
      expect(graphListCount).toBe(EXPECTED_GRAPH_LIST_COUNT);

      // Set B: Collection nodes matching type filter (W2, W3)
      const EXPECTED_COLLECTION_WORKS_COUNT = 2;
      const collectionWorksCount = visible.filter(n =>
        n.entityData?.sourceId !== 'catalogue:graph-list' &&
        n.entityData?._graphListProvenance === undefined &&
        n.entityType === 'works'
      ).length;
      expect(collectionWorksCount).toBe(EXPECTED_COLLECTION_WORKS_COUNT);

      // Union: graph list count + collection works count total
      expect(visible).toHaveLength(EXPECTED_GRAPH_LIST_COUNT + EXPECTED_COLLECTION_WORKS_COUNT);
    });

    it('should handle overlap: node in both graph list and matching filter', () => {
      // If a node is in graph list AND matches the type filter, it should appear once (set union)
      const selectedTypes: EntityType[] = ['works'];

      const visible = applyEntityTypeFilter(allNodes, selectedTypes);

      // W1 is in graph list AND is a work (matches filter)
      const w1Count = visible.filter(n => n.id === 'W1').length;
      expect(w1Count).toBe(1); // Should appear exactly once (no duplicates)
    });
  });
});
