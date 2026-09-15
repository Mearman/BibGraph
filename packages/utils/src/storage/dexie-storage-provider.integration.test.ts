/**
 * Integration tests for Dexie storage provider persistence
 * Tests persistence across provider instances (simulating browser sessions)
 *
 * NOTE: These tests require IndexedDB and should ideally run in a browser environment.
 * In Node.js (without fake-indexeddb), these tests will be skipped.
 * True persistence testing across sessions should be done via E2E tests.
 */

import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
import { DexieStorageProvider } from './dexie-storage-provider.js';

// Check if IndexedDB is available
const hasIndexedDB = typeof indexedDB !== 'undefined';

/**
 * Number of nodes added in the first batch of the size-persistence test
 */
const FIRST_BATCH_SIZE = 50;

/**
 * Total node count after the second batch of the size-persistence test (50 initial + 25 more)
 */
const SECOND_BATCH_TOTAL_SIZE = 75;

/**
 * Number of nodes added in the clear-persistence test
 */
const CLEAR_TEST_NODE_COUNT = 10;

/**
 * Number of nodes each provider should see once every tab's node has synced
 */
const CONCURRENT_TEST_EXPECTED_NODE_COUNT = 3;

describe.skipIf(!hasIndexedDB)('Dexie Storage Provider Integration', () => {
	let provider: CatalogueStorageProvider;

	beforeEach(async () => {
		// Create fresh provider for each test
		provider = new DexieStorageProvider();
		await provider.initializeSpecialLists();
	});

	afterEach(async () => {
		// Clean up: clear graph list after each test
		await provider.clearGraphList();
	});

	describe('Graph List Persistence (T027)', () => {
		it('should persist nodes across provider instances', async () => {
			// Add nodes with first provider instance
			await provider.addToGraphList({
				entityId: 'W123',
				entityType: 'works',
				label: 'Persistent Work',
				provenance: 'user',
			});

			await provider.addToGraphList({
				entityId: 'A456',
				entityType: 'authors',
				label: 'Persistent Author',
				provenance: 'collection-load',
			});

			// Verify nodes exist
			let nodes = await provider.getGraphList();
			expect(nodes).toHaveLength(2);

			// Create new provider instance (simulates page refresh / new session)
			const newProvider = new DexieStorageProvider();
			await newProvider.initializeSpecialLists();

			// Verify nodes still exist with new provider
			nodes = await newProvider.getGraphList();
			expect(nodes).toHaveLength(2);

			const work = nodes.find((n) => n.entityId === 'W123');
			const author = nodes.find((n) => n.entityId === 'A456');

			expect(work).toBeDefined();
			expect(work?.label).toBe('Persistent Work');
			expect(work?.provenance).toBe('user');

			expect(author).toBeDefined();
			expect(author?.label).toBe('Persistent Author');
			expect(author?.provenance).toBe('collection-load');
		});

		it('should persist provenance updates across sessions', async () => {
			// Add node with initial provenance
			await provider.addToGraphList({
				entityId: 'W789',
				entityType: 'works',
				label: 'Test Work',
				provenance: 'auto-population',
			});

			// Create new provider instance
			const newProvider = new DexieStorageProvider();
			await newProvider.initializeSpecialLists();

			// Update provenance
			await newProvider.addToGraphList({
				entityId: 'W789',
				entityType: 'works',
				label: 'Updated Work',
				provenance: 'user',
			});

			// Create third provider instance
			const thirdProvider = new DexieStorageProvider();
			await thirdProvider.initializeSpecialLists();

			// Verify updated provenance persisted
			const nodes = await thirdProvider.getGraphList();
			expect(nodes).toHaveLength(1);
			expect(nodes[0].provenance).toBe('user');
			expect(nodes[0].label).toBe('Updated Work');
		});

		it('should persist size state across sessions', async () => {
			// Add multiple nodes
			for (let index = 0; index < FIRST_BATCH_SIZE; index++) {
				await provider.addToGraphList({
					entityId: `W${String(index)}`,
					entityType: 'works',
					label: `Work ${String(index)}`,
					provenance: 'user',
				});
			}

			// Verify size with first provider
			let size = await provider.getGraphListSize();
			expect(size).toBe(FIRST_BATCH_SIZE);

			// Create new provider instance
			const newProvider = new DexieStorageProvider();
			await newProvider.initializeSpecialLists();

			// Verify size persists
			size = await newProvider.getGraphListSize();
			expect(size).toBe(FIRST_BATCH_SIZE);

			// Add more nodes with new provider
			for (let index = FIRST_BATCH_SIZE; index < SECOND_BATCH_TOTAL_SIZE; index++) {
				await newProvider.addToGraphList({
					entityId: `W${String(index)}`,
					entityType: 'works',
					label: `Work ${String(index)}`,
					provenance: 'expansion',
				});
			}

			// Create third provider instance
			const thirdProvider = new DexieStorageProvider();
			await thirdProvider.initializeSpecialLists();

			// Verify total size
			size = await thirdProvider.getGraphListSize();
			expect(size).toBe(SECOND_BATCH_TOTAL_SIZE);
		});

		it('should persist removal operations across sessions', async () => {
			// Add nodes
			await provider.addToGraphList({
				entityId: 'W100',
				entityType: 'works',
				label: 'Keep This',
				provenance: 'user',
			});

			await provider.addToGraphList({
				entityId: 'W200',
				entityType: 'works',
				label: 'Remove This',
				provenance: 'user',
			});

			await provider.addToGraphList({
				entityId: 'W300',
				entityType: 'works',
				label: 'Keep This Too',
				provenance: 'user',
			});

			// Create new provider and remove middle node
			const newProvider = new DexieStorageProvider();
			await newProvider.initializeSpecialLists();
			await newProvider.removeFromGraphList('W200');

			// Create third provider to verify removal persisted
			const thirdProvider = new DexieStorageProvider();
			await thirdProvider.initializeSpecialLists();

			const nodes = await thirdProvider.getGraphList();
			expect(nodes).toHaveLength(2);
			expect(nodes.find((n) => n.entityId === 'W100')).toBeDefined();
			expect(nodes.find((n) => n.entityId === 'W300')).toBeDefined();
			expect(nodes.find((n) => n.entityId === 'W200')).toBeUndefined();
		});

		it('should persist clear operations across sessions', async () => {
			// Add nodes
			for (let index = 0; index < CLEAR_TEST_NODE_COUNT; index++) {
				await provider.addToGraphList({
					entityId: `W${String(index)}`,
					entityType: 'works',
					label: `Work ${String(index)}`,
					provenance: 'user',
				});
			}

			let size = await provider.getGraphListSize();
			expect(size).toBe(CLEAR_TEST_NODE_COUNT);

			// Create new provider and clear
			const newProvider = new DexieStorageProvider();
			await newProvider.initializeSpecialLists();
			await newProvider.clearGraphList();

			// Create third provider to verify clear persisted
			const thirdProvider = new DexieStorageProvider();
			await thirdProvider.initializeSpecialLists();

			size = await thirdProvider.getGraphListSize();
			expect(size).toBe(0);

			const nodes = await thirdProvider.getGraphList();
			expect(nodes).toHaveLength(0);
		});

		it('should handle concurrent operations across multiple sessions', async () => {
			// Simulate multiple browser tabs/windows
			const provider1 = new DexieStorageProvider();
			const provider2 = new DexieStorageProvider();
			const provider3 = new DexieStorageProvider();

			await provider1.initializeSpecialLists();
			await provider2.initializeSpecialLists();
			await provider3.initializeSpecialLists();

			// Each provider adds different nodes
			await provider1.addToGraphList({
				entityId: 'W1',
				entityType: 'works',
				label: 'From Tab 1',
				provenance: 'user',
			});

			await provider2.addToGraphList({
				entityId: 'W2',
				entityType: 'works',
				label: 'From Tab 2',
				provenance: 'expansion',
			});

			await provider3.addToGraphList({
				entityId: 'W3',
				entityType: 'works',
				label: 'From Tab 3',
				provenance: 'collection-load',
			});

			// Verify all nodes are present
			const nodes1 = await provider1.getGraphList();
			const nodes2 = await provider2.getGraphList();
			const nodes3 = await provider3.getGraphList();

			expect(nodes1).toHaveLength(CONCURRENT_TEST_EXPECTED_NODE_COUNT);
			expect(nodes2).toHaveLength(CONCURRENT_TEST_EXPECTED_NODE_COUNT);
			expect(nodes3).toHaveLength(CONCURRENT_TEST_EXPECTED_NODE_COUNT);

			// Verify each provider sees all nodes
			for (const nodes of [nodes1, nodes2, nodes3]) {
				expect(nodes.find((n) => n.entityId === 'W1')).toBeDefined();
				expect(nodes.find((n) => n.entityId === 'W2')).toBeDefined();
				expect(nodes.find((n) => n.entityId === 'W3')).toBeDefined();
			}
		});
	});
});
