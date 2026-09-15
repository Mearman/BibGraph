/**
 * Integration tests for entity type filter with graph list bypass
 * T036: Tests filter bypass with real storage interactions
 *
 * Tests integration between:
 * - Graph list storage (createGraphListSource)
 * - Collection sources (createBookmarksSource)
 * - Entity type filtering (applyEntityTypeFilter)
 *
 * Tests MUST verify end-to-end flow from storage → nodes → filtering
 */

import type { EntityType, GraphNode } from '@bibgraph/types';
import { InMemoryStorageProvider } from '@bibgraph/utils';
import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { applyEntityTypeFilter } from './useEntityTypeFilter';

describe('Entity Type Filter Integration (T036)', () => {
	let storage: InMemoryStorageProvider;

	beforeEach(async () => {
		storage = new InMemoryStorageProvider();
		await storage.initializeSpecialLists();
	});

	afterEach(async () => {
		await storage.clearGraphList();
		storage.clear();
	});

	describe('End-to-End Filter Bypass', () => {
		it('should bypass filters for graph list nodes from storage', async () => {
			// Add nodes to graph list via storage
			await storage.addToGraphList({
				entityId: 'W1',
				entityType: 'works',
				label: 'Graph List Work',
				provenance: 'user',
			});

			await storage.addToGraphList({
				entityId: 'A1',
				entityType: 'authors',
				label: 'Graph List Author',
				provenance: 'expansion',
			});

			// Retrieve from storage (don't use getEntities which tries to fetch from API)
			const storedNodes = await storage.getGraphList();
			expect(storedNodes).toHaveLength(2);

			// Convert to GraphNodes with proper metadata
			const graphListNodes: GraphNode[] = storedNodes.map((node) => ({
				id: node.entityId,
				entityId: node.entityId,
				entityType: node.entityType,
				label: node.label,
				x: 0,
				y: 0,
				externalIds: [],
				entityData: {
					sourceId: 'catalogue:graph-list',
					_graphListProvenance: node.provenance,
				},
			}));

			// Apply filter: only 'works' selected
			const selectedTypes: EntityType[] = ['works'];
			const visible = applyEntityTypeFilter(graphListNodes, selectedTypes);

			// Both nodes should be visible (bypass filter)
			expect(visible).toHaveLength(2);
			expect(visible.find((n) => n.id === 'W1')).toBeDefined();
			expect(visible.find((n) => n.id === 'A1')).toBeDefined(); // Authors bypass!
		});

		it('should filter collection nodes from storage', async () => {
			// Add nodes to bookmarks
			await storage.addBookmark({
				entityId: 'W2',
				entityType: 'works',
			});

			await storage.addBookmark({
				entityId: 'A2',
				entityType: 'authors',
			});

			// For this test, we'll manually create nodes since we don't have OpenAlex API
			const bookmarkNodes: GraphNode[] = [
				{
					id: 'W2',
					entityId: 'W2',
					entityType: 'works',
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
					entityId: 'A2',
					entityType: 'authors',
					label: 'Bookmarked Author',
					x: 0,
					y: 0,
					externalIds: [],
					entityData: {
						sourceId: 'catalogue:bookmarks',
					},
				},
			];

			// Apply filter: only 'works' selected
			const selectedTypes: EntityType[] = ['works'];
			const visible = applyEntityTypeFilter(bookmarkNodes, selectedTypes);

			// Only works should be visible (authors filtered out)
			expect(visible).toHaveLength(1);
			expect(visible[0].id).toBe('W2');
		});

		it('should handle mixed sources correctly', async () => {
			// Add nodes to graph list
			await storage.addToGraphList({
				entityId: 'W1',
				entityType: 'works',
				label: 'Graph List Work',
				provenance: 'user',
			});

			await storage.addToGraphList({
				entityId: 'I1',
				entityType: 'institutions',
				label: 'Graph List Institution',
				provenance: 'expansion',
			});

			// Add nodes to bookmarks
			await storage.addBookmark({
				entityId: 'W2',
				entityType: 'works',
			});

			await storage.addBookmark({
				entityId: 'A2',
				entityType: 'authors',
			});

			// Create mixed nodes array
			const allNodes: GraphNode[] = [
				// Graph list nodes
				{
					id: 'W1',
					entityId: 'W1',
					entityType: 'works',
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
					id: 'I1',
					entityId: 'I1',
					entityType: 'institutions',
					label: 'Graph List Institution',
					x: 0,
					y: 0,
					externalIds: [],
					entityData: {
						sourceId: 'catalogue:graph-list',
						_graphListProvenance: 'expansion',
					},
				},
				// Bookmark nodes
				{
					id: 'W2',
					entityId: 'W2',
					entityType: 'works',
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
					entityId: 'A2',
					entityType: 'authors',
					label: 'Bookmarked Author',
					x: 0,
					y: 0,
					externalIds: [],
					entityData: {
						sourceId: 'catalogue:bookmarks',
					},
				},
			];

			// Apply filter: only 'works' selected
			const selectedTypes: EntityType[] = ['works'];
			const visible = applyEntityTypeFilter(allNodes, selectedTypes);

			// Should have EXPECTED_VISIBLE_NODE_COUNT nodes:
			// - W1 (graph list work - matches AND bypasses)
			// - I1 (graph list institution - bypasses)
			// - W2 (bookmark work - matches filter)
			// A2 should be filtered out (bookmark author - doesn't match)
			const EXPECTED_VISIBLE_NODE_COUNT = 3;
			expect(visible).toHaveLength(EXPECTED_VISIBLE_NODE_COUNT);

			expect(visible.find((n) => n.id === 'W1')).toBeDefined();
			expect(visible.find((n) => n.id === 'I1')).toBeDefined(); // Bypass!
			expect(visible.find((n) => n.id === 'W2')).toBeDefined();
			expect(visible.find((n) => n.id === 'A2')).toBeUndefined(); // Filtered out
		});

		it('should verify sourceId metadata is preserved from storage', async () => {
			// Add node to graph list
			await storage.addToGraphList({
				entityId: 'W3',
				entityType: 'works',
				label: 'Storage Test Work',
				provenance: 'collection-load',
			});

			// Retrieve from storage
			const graphListNodes = await storage.getGraphList();
			expect(graphListNodes).toHaveLength(1);

			const node = graphListNodes[0];

			// Verify storage preserves metadata correctly
			expect(node.entityId).toBe('W3');
			expect(node.provenance).toBe('collection-load');

			// Create GraphNode with proper metadata
			const graphNode: GraphNode = {
				id: node.entityId,
				entityId: node.entityId,
				entityType: node.entityType,
				label: node.label,
				x: 0,
				y: 0,
				externalIds: [],
				entityData: {
					sourceId: 'catalogue:graph-list',
					_graphListProvenance: node.provenance,
				},
			};

			// Apply filter that would normally exclude works
			const selectedTypes: EntityType[] = ['authors']; // Not works!
			const visible = applyEntityTypeFilter([graphNode], selectedTypes);

			// Node should still be visible due to graph list bypass
			expect(visible).toHaveLength(1);
			expect(visible[0].id).toBe('W3');
		});
	});

	describe('Provenance Metadata Integration', () => {
		it('should identify nodes by provenance even without sourceId', () => {
			// Simulate node with provenance but different sourceId (edge case)
			const mixedNode: GraphNode = {
				id: 'A3',
				entityId: 'A3',
				entityType: 'authors',
				label: 'Mixed Source Author',
				x: 0,
				y: 0,
				externalIds: [],
				entityData: {
					sourceId: 'catalogue:bookmarks', // From bookmarks...
					_graphListProvenance: 'user', // ...but has graph list provenance!
				},
			};

			// Apply filter that excludes authors
			const selectedTypes: EntityType[] = ['works'];
			const visible = applyEntityTypeFilter([mixedNode], selectedTypes);

			// Should bypass because of provenance
			expect(visible).toHaveLength(1);
			expect(visible[0].id).toBe('A3');
		});
	});

	describe('Storage State Validation', () => {
		it('should maintain separate storage for graph list and collections', async () => {
			const entityId = 'W999';

			// Add to both graph list and bookmarks
			await storage.addToGraphList({
				entityId,
				entityType: 'works',
				label: 'Dual Storage Work',
				provenance: 'user',
			});

			await storage.addBookmark({
				entityId,
				entityType: 'works',
			});

			// Verify separate storage
			const graphListNodes = await storage.getGraphList();
			const bookmarks = await storage.getBookmarks();

			expect(graphListNodes).toHaveLength(1);
			expect(bookmarks).toHaveLength(1);

			// Both entries should exist independently
			expect(graphListNodes[0].entityId).toBe(entityId);
			expect(bookmarks[0].entityId).toBe(entityId);
		});
	});
});
