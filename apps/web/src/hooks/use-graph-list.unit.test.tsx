/**
 * Unit tests for graph list management hook
 * T042-T044: Tests adding nodes with different provenance values
 *
 * Tests MUST verify:
 * - Nodes can be added with "user" provenance (manual selection)
 * - Nodes can be added with "collection-load" provenance (automatic from collections)
 * - Nodes can be added with "expansion" provenance (discovered via expansion)
 * - Optimistic updates work correctly
 * - Storage operations are called with correct parameters
 */

import type { GraphListNode,GraphNode } from '@bibgraph/types';
import { InMemoryStorageProvider } from '@bibgraph/utils';
import { renderHook, waitFor } from '@testing-library/react';
import type { ReactNode } from 'react';
import { beforeEach,describe, expect, it, vi } from 'vitest';

import { NotificationProvider } from '@/contexts/NotificationContext';
import { StorageProviderWrapper } from '@/contexts/storage-provider-context';

import { useGraphList } from './use-graph-list';

describe('Graph List Management Hook (T042-T044)', () => {
	let storage: InMemoryStorageProvider;

	beforeEach(async () => {
		storage = new InMemoryStorageProvider();
		await storage.initializeSpecialLists();
		vi.clearAllMocks();
	});

	const wrapper = ({ children }: { children: ReactNode }) => (
		<StorageProviderWrapper provider={storage}>
			<NotificationProvider>
				{children}
			</NotificationProvider>
		</StorageProviderWrapper>
	);

	describe('T042: Add node with user provenance', () => {
		it('should add node with "user" provenance when manually selected', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const node: GraphNode = {
				id: 'W1',
				entityId: 'W1',
				entityType: 'works',
				label: 'Test Work',
				x: 0,
				y: 0,
				externalIds: [],
			};

			// Add node with user provenance
			await result.current.addNode(node, 'user');

			// Verify node was added to storage
			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(1);
			expect(graphList[0].entityId).toBe('W1');
			expect(graphList[0].provenance).toBe('user');
		});

		it('should update optimistically before storage completes', async () => {
			// Create a storage provider with artificially slow addToGraphList
			// to allow time to observe the optimistic update
			let resolveAdd: () => void;
			const addPromise = new Promise<void>((resolve) => {
				resolveAdd = resolve;
			});

			// Create a proper proxy that preserves prototype methods
			const slowStorage = Object.create(
				Object.getPrototypeOf(storage),
				Object.getOwnPropertyDescriptors(storage)
			) as InMemoryStorageProvider;

			// Override only the addToGraphList method
			slowStorage.addToGraphList = vi.fn().mockImplementation(async (...args: unknown[]) => {
				// Wait for our promise before completing
				await addPromise;
				// Then call the real implementation
				return storage.addToGraphList(
					args[0] as Parameters<typeof storage.addToGraphList>[0]
				);
			});

			const slowWrapper = ({ children }: { children: ReactNode }) => (
				<StorageProviderWrapper provider={slowStorage}>{children}</StorageProviderWrapper>
			);

			const { result } = renderHook(() => useGraphList(), { wrapper: slowWrapper });

			const node: GraphNode = {
				id: 'W1',
				entityId: 'W1',
				entityType: 'works',
				label: 'Test Work',
				x: 0,
				y: 0,
				externalIds: [],
			};

			// Wait for initial loading to complete
			await waitFor(() => {
				expect(result.current.loading).toBe(false);
			});

			// Check initial state
			expect(result.current.nodes).toHaveLength(0);

			// Add node (storage will hang until we resolve it)
			const addResultPromise = result.current.addNode(node, 'user');

			// Should update optimistically BEFORE storage completes
			await waitFor(() => {
				expect(result.current.nodes.length).toBeGreaterThan(0);
			});

			// Verify node is present in state (optimistic update)
			expect(result.current.nodes).toHaveLength(1);
			const listNode = result.current.nodes[0] as GraphListNode;
			expect(listNode.entityId).toBe('W1');
			expect(listNode.provenance).toBe('user');

			// Now allow storage to complete
			resolveAdd!();
			await addResultPromise;

			// Verify final state (should be same as optimistic state)
			expect(result.current.nodes).toHaveLength(1);
			const finalNode = result.current.nodes[0] as GraphListNode;
			expect(finalNode.provenance).toBe('user');
		});

		it('should handle errors gracefully and rollback optimistic updates', async () => {
			// Create a storage provider that will fail
			const failingStorage = Object.create(
				Object.getPrototypeOf(storage),
				Object.getOwnPropertyDescriptors(storage)
			) as InMemoryStorageProvider;

			// Override only the addToGraphList method to fail
			failingStorage.addToGraphList = vi.fn().mockRejectedValue(new Error('Storage error'));

			const failingWrapper = ({ children }: { children: ReactNode }) => (
				<StorageProviderWrapper provider={failingStorage}>
					{children}
				</StorageProviderWrapper>
			);

			const { result: failingResult } = renderHook(() => useGraphList(), {
				wrapper: failingWrapper,
			});

			const node: GraphNode = {
				id: 'W1',
				entityId: 'W1',
				entityType: 'works',
				label: 'Test Work',
				x: 0,
				y: 0,
				externalIds: [],
			};

			// Try to add node (should fail)
			await expect(failingResult.current.addNode(node, 'user')).rejects.toThrow(
				'Storage error'
			);

			// Should rollback optimistic update
			expect(failingResult.current.nodes).toHaveLength(0);
		});
	});

	describe('T043: Add node with collection-load provenance', () => {
		it('should add node with "collection-load" provenance when loaded from collection', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const node: GraphNode = {
				id: 'W2',
				entityId: 'W2',
				entityType: 'works',
				label: 'Collection Work',
				x: 0,
				y: 0,
				externalIds: [],
			};

			// Add node with collection-load provenance
			await result.current.addNode(node, 'collection-load');

			// Verify node was added with correct provenance
			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(1);
			expect(graphList[0].entityId).toBe('W2');
			expect(graphList[0].provenance).toBe('collection-load');
		});

		it('should handle multiple nodes from collection load', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const nodes: GraphNode[] = [
				{
					id: 'W1',
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					x: 0,
					y: 0,
					externalIds: [],
				},
				{
					id: 'W2',
					entityId: 'W2',
					entityType: 'works',
					label: 'Work 2',
					x: 0,
					y: 0,
					externalIds: [],
				},
				{
					id: 'A1',
					entityId: 'A1',
					entityType: 'authors',
					label: 'Author 1',
					x: 0,
					y: 0,
					externalIds: [],
				},
			];

			// Add all nodes
			await Promise.all(
				nodes.map((node) => result.current.addNode(node, 'collection-load'))
			);

			// Verify all nodes added
			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(3);
			expect(graphList.every((n) => n.provenance === 'collection-load')).toBe(true);
		});
	});

	describe('T044: Add node with expansion provenance', () => {
		it('should add node with "expansion" provenance when discovered via expansion', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const node: GraphNode = {
				id: 'A1',
				entityId: 'A1',
				entityType: 'authors',
				label: 'Discovered Author',
				x: 0,
				y: 0,
				externalIds: [],
			};

			// Add node with expansion provenance
			await result.current.addNode(node, 'expansion');

			// Verify node was added with correct provenance
			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(1);
			expect(graphList[0].entityId).toBe('A1');
			expect(graphList[0].provenance).toBe('expansion');
		});

		it('should add discovered nodes from expansion without duplicates', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			// Add initial node with user provenance
			const userNode: GraphNode = {
				id: 'W1',
				entityId: 'W1',
				entityType: 'works',
				label: 'User Work',
				x: 0,
				y: 0,
				externalIds: [],
			};
			await result.current.addNode(userNode, 'user');

			// Add discovered nodes (one duplicate, one new)
			const discoveredNodes: GraphNode[] = [
				{
					id: 'W1', // Duplicate
					entityId: 'W1',
					entityType: 'works',
					label: 'User Work',
					x: 0,
					y: 0,
					externalIds: [],
				},
				{
					id: 'A1', // New
					entityId: 'A1',
					entityType: 'authors',
					label: 'Discovered Author',
					x: 0,
					y: 0,
					externalIds: [],
				},
			];

			await Promise.all(
				discoveredNodes.map((node) => result.current.addNode(node, 'expansion'))
			);

			// Should have 2 nodes total (W1 with updated provenance, A1 new)
			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(2);

			// W1 provenance should be updated (T045 requirement)
			const w1 = graphList.find((n) => n.entityId === 'W1');
			expect(w1?.provenance).toBe('expansion'); // Later provenance wins

			const a1 = graphList.find((n) => n.entityId === 'A1');
			expect(a1?.provenance).toBe('expansion');
		});
	});

	describe('Edge Cases', () => {
		it('should handle nodes without entity data', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const node: GraphNode = {
				id: 'W3',
				entityId: 'W3',
				entityType: 'works',
				label: 'Minimal Work',
				x: 0,
				y: 0,
				externalIds: [],
				// No entityData
			};

			await result.current.addNode(node, 'user');

			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(1);
			expect(graphList[0].entityId).toBe('W3');
		});

		it('should handle nodes with existing entity data', async () => {
			const { result } = renderHook(() => useGraphList(), { wrapper });

			const node: GraphNode = {
				id: 'W4',
				entityId: 'W4',
				entityType: 'works',
				label: 'Work with data',
				x: 0,
				y: 0,
				externalIds: [],
				entityData: {
					sourceId: 'catalogue:bookmarks',
					_catalogueNotes: 'Important work',
				},
			};

			await result.current.addNode(node, 'user');

			const graphList = await storage.getGraphList();
			expect(graphList).toHaveLength(1);
			expect(graphList[0].entityId).toBe('W4');
		});
	});
});
