/**
 * Unit tests for multi-source graph deduplication logic
 * T041: Tests deduplication with graph list prioritization
 *
 * Tests MUST verify:
 * - Duplicate nodes are deduplicated to single instance
 * - Graph list nodes take priority over collection nodes
 * - Metadata from graph list is preserved when deduplicating
 * - Union formula still works after deduplication
 */


import { RelationType } from '@bibgraph/types';
import type { GraphSourceEntity } from '@bibgraph/utils';
import { describe, expect,it } from 'vitest';

import { deduplicateEntities } from './use-multi-source-graph';

describe('Multi-Source Graph Deduplication (T041)', () => {
	describe('Basic Deduplication', () => {
		it('should remove duplicate entities with same entityId', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					entityData: { sourceId: 'catalogue:history' },
					sourceId: 'catalogue:history',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].entityId).toBe('W1');
		});

		it('should keep all entities with unique entityIds', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W2',
					entityType: 'works',
					label: 'Work 2',
					entityData: { sourceId: 'catalogue:history' },
					sourceId: 'catalogue:history',
					relationships: [],
				},
				{
					entityId: 'A1',
					entityType: 'authors',
					label: 'Author 1',
					entityData: { sourceId: 'catalogue:graph-list' },
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(entities.length);
			expect(deduplicated.map((e) => e.entityId).sort()).toEqual(['A1', 'W1', 'W2']);
		});
	});

	describe('Graph List Priority', () => {
		it('should prioritize graph list node over bookmark node', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Graph List Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
			expect(deduplicated[0].entityData._graphListProvenance).toBe('user');
			expect(deduplicated[0].label).toBe('Graph List Work');
		});

		it('should prioritize graph list node over history node', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'A1',
					entityType: 'authors',
					label: 'History Author',
					entityData: { sourceId: 'catalogue:history' },
					sourceId: 'catalogue:history',
					relationships: [],
				},
				{
					entityId: 'A1',
					entityType: 'authors',
					label: 'Graph List Author',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'expansion',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
			expect(deduplicated[0].entityData._graphListProvenance).toBe('expansion');
		});

		it('should prioritize graph list node when it appears first', () => {
			// Graph list node loaded before bookmark
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Graph List Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'collection-load',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
		});

		it('should prioritize graph list node when it appears last', () => {
			// Graph list node loaded after bookmark
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Graph List Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
		});
	});

	describe('Provenance-Based Priority', () => {
		it('should prioritize node with _graphListProvenance over collection node', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'I1',
					entityType: 'institutions',
					label: 'Bookmarked Institution',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'I1',
					entityType: 'institutions',
					label: 'Provenance Institution',
					entityData: {
						sourceId: 'catalogue:bookmarks', // Different sourceId but has provenance
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].entityData._graphListProvenance).toBe('user');
			expect(deduplicated[0].label).toBe('Provenance Institution');
		});
	});

	describe('Multiple Duplicates', () => {
		it('should handle multiple sources with duplicates', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'History Work',
					entityData: { sourceId: 'catalogue:history' },
					sourceId: 'catalogue:history',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Graph List Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Custom List Work',
					entityData: { sourceId: 'catalogue:my-list' },
					sourceId: 'catalogue:my-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
			expect(deduplicated[0].entityData._graphListProvenance).toBe('user');
		});

		it('should keep first collection node when no graph list version exists', () => {
			// When no graph list node, keep first occurrence
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W2',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W2',
					entityType: 'works',
					label: 'History Work',
					entityData: { sourceId: 'catalogue:history' },
					sourceId: 'catalogue:history',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:bookmarks'); // First one wins
		});
	});

	describe('Metadata Preservation', () => {
		it('should preserve graph list metadata during deduplication', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Bookmarked Work',
					entityData: {
						sourceId: 'catalogue:bookmarks',
						_catalogueNotes: 'bookmark note',
						_catalogueAddedAt: '2024-01-01',
					},
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Graph List Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
						_graphListAddedAt: '2024-01-02',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].entityData._graphListProvenance).toBe('user');
			expect(deduplicated[0].entityData._graphListAddedAt).toBe('2024-01-02');
			// Bookmark metadata should not be preserved
			expect(deduplicated[0].entityData._catalogueNotes).toBeUndefined();
		});

		it('should preserve relationships from deduplicated node', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [
						{ targetId: 'A1', targetType: 'authors', relationType: RelationType.AUTHORSHIP },
					],
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [
						{ targetId: 'A1', targetType: 'authors', relationType: RelationType.AUTHORSHIP },
						{ targetId: 'T1', targetType: 'topics', relationType: RelationType.TOPIC },
					],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].relationships).toHaveLength(2);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
		});
	});

	describe('Empty and Edge Cases', () => {
		it('should handle empty array', () => {
			const entities: GraphSourceEntity[] = [];
			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toEqual([]);
		});

		it('should handle single entity', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					entityData: { sourceId: 'catalogue:bookmarks' },
					sourceId: 'catalogue:bookmarks',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0]).toEqual(entities[0]);
		});

		it('should handle entities without metadata', () => {
			const entities: GraphSourceEntity[] = [
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					sourceId: 'catalogue:bookmarks',
					relationships: [],
					entityData: {}, // No metadata
				},
				{
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'user',
					},
					sourceId: 'catalogue:graph-list',
					relationships: [],
				},
			];

			const deduplicated = deduplicateEntities(entities);

			expect(deduplicated).toHaveLength(1);
			expect(deduplicated[0].sourceId).toBe('catalogue:graph-list');
		});
	});
});
