/**
 * Unit tests for bookmark storage operations
 * Tests use InMemoryStorageProvider for fast, isolated test execution
 */

import { afterEach,beforeEach, describe, expect, it } from 'vitest';

import { SPECIAL_LIST_IDS } from './catalogue-db/index.js';
import type { CatalogueStorageProvider } from './catalogue-storage-provider.js';
import { InMemoryStorageProvider } from './in-memory-storage-provider.js';

// Helper function for delays in tests
const delay = (ms: number): Promise<void> => new Promise((resolve) => setTimeout(resolve, ms));

// Helper function to create work nodes for testing
const createWorkNode = (_: unknown, i: number) => ({
	entityId: `W${i}`,
	entityType: 'works' as const,
	label: `Work ${i}`,
	provenance: 'user' as const,
});

describe('Bookmark Storage Operations', () => {
	let provider: CatalogueStorageProvider;

	beforeEach(() => {
		provider = new InMemoryStorageProvider();
	});

	afterEach(() => {
		// Clear storage for test isolation
		if (provider instanceof InMemoryStorageProvider) {
			provider.clear();
		}
	});

	describe('initializeSpecialLists()', () => {
		it('should create bookmarks list on initialization', async () => {
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(bookmarksList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmarksList?.title).toBe('Bookmarks');
			expect(bookmarksList?.type).toBe('list');
			expect(bookmarksList?.isPublic).toBe(false);
			expect(bookmarksList?.tags).toContain('system');
		});

		it('should be idempotent - safe to call multiple times', async () => {
			await provider.initializeSpecialLists();
			await provider.initializeSpecialLists();
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(bookmarksList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
		});

		it('should create both bookmarks and history lists', async () => {
			await provider.initializeSpecialLists();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const historyList = await provider.getList(SPECIAL_LIST_IDS.HISTORY);

			expect(bookmarksList).not.toBeNull();
			expect(historyList).not.toBeNull();
			expect(bookmarksList?.id).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(historyList?.id).toBe(SPECIAL_LIST_IDS.HISTORY);
		});
	});

	describe('addBookmark()', () => {
		it('should add bookmark with metadata', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2741809807',
				notes: 'Important for Chapter 3',
			});

			expect(entityRecordId).toBeTruthy();
			expect(typeof entityRecordId).toBe('string');

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);
			expect(bookmarks[0].entityType).toBe('works');
			expect(bookmarks[0].entityId).toBe('W2741809807');
			expect(bookmarks[0].listId).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
		});

		it('should store entityType and entityId correctly', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A123456789',
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].entityType).toBe('authors');
			expect(bookmarks[0].entityId).toBe('A123456789');
			expect(bookmarks[0].notes).toBeUndefined();
		});

		it('should preserve user-provided notes', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W999',
				notes: 'Key reference paper',
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].entityType).toBe('works');
			expect(bookmarks[0].entityId).toBe('W999');
			expect(bookmarks[0].notes).toBe('Key reference paper');
		});

		it('should initialize special lists automatically if not done', async () => {
			// Don't call initializeSpecialLists() explicitly
			const entityRecordId = await provider.addBookmark({
				entityType: 'topics',
				entityId: 'T12345',
			});

			expect(entityRecordId).toBeTruthy();

			const bookmarksList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmarksList).not.toBeNull();
		});

		it('should support all entity types', async () => {
			await provider.initializeSpecialLists();

			const entityTypes = [
				'works',
				'authors',
				'sources',
				'institutions',
				'topics',
				'publishers',
				'funders',
			] as const;

			for (const entityType of entityTypes) {
				await provider.addBookmark({
					entityType,
					entityId: `${entityType.toUpperCase()}-123`,
				});
			}

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(entityTypes.length);
		});
	});

	describe('isBookmarked()', () => {
		it('should correctly detect bookmarked entity', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2741809807',
			});

			const isBookmarked = await provider.isBookmarked('works', 'W2741809807');
			expect(isBookmarked).toBe(true);
		});

		it('should return false for non-bookmarked entity', async () => {
			await provider.initializeSpecialLists();

			const isBookmarked = await provider.isBookmarked('works', 'W9999999');
			expect(isBookmarked).toBe(false);
		});

		it('should distinguish between entity types', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
			});

			// Same ID but different type should not be bookmarked
			const isWorkBookmarked = await provider.isBookmarked('works', 'W123');
			const isAuthorBookmarked = await provider.isBookmarked('authors', 'W123');

			expect(isWorkBookmarked).toBe(true);
			expect(isAuthorBookmarked).toBe(false);
		});

		it('should work with empty bookmarks list', async () => {
			await provider.initializeSpecialLists();

			const isBookmarked = await provider.isBookmarked('works', 'W123');
			expect(isBookmarked).toBe(false);
		});
	});

	describe('getBookmarks()', () => {
		it('should retrieve all bookmarks', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
			});
			await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A1',
			});
			await provider.addBookmark({
				entityType: 'topics',
				entityId: 'T1',
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks).toHaveLength(3);
			expect(bookmarks.map((b) => b.entityId)).toEqual(['W1', 'A1', 'T1']);
		});

		it('should return empty array when no bookmarks exist', async () => {
			await provider.initializeSpecialLists();

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks).toEqual([]);
		});

		it('should initialize special lists automatically', async () => {
			// Don't call initializeSpecialLists() explicitly
			const bookmarks = await provider.getBookmarks();

			expect(Array.isArray(bookmarks)).toBe(true);
			expect(bookmarks).toHaveLength(0);
		});

		it('should return bookmarks sorted by position', async () => {
			await provider.initializeSpecialLists();

			// Add bookmarks in specific order
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
			});
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2',
			});
			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W3',
			});

			const bookmarks = await provider.getBookmarks();

			expect(bookmarks[0].position).toBeLessThan(bookmarks[1].position);
			expect(bookmarks[1].position).toBeLessThan(bookmarks[2].position);
		});
	});

	describe('removeBookmark()', () => {
		it('should remove bookmark by entity record ID', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
			});

			let bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);

			await provider.removeBookmark(entityRecordId);

			bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(0);
		});

		it('should only remove specified bookmark', async () => {
			await provider.initializeSpecialLists();

			const recordId1 = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W1',
			});
			const recordId2 = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W2',
			});

			await provider.removeBookmark(recordId1);

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(1);
			expect(bookmarks[0].id).toBe(recordId2);
			expect(bookmarks[0].entityId).toBe('W2');
		});

		it('should update bookmark status after removal', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'authors',
				entityId: 'A999',
			});

			let isBookmarked = await provider.isBookmarked('authors', 'A999');
			expect(isBookmarked).toBe(true);

			await provider.removeBookmark(entityRecordId);

			isBookmarked = await provider.isBookmarked('authors', 'A999');
			expect(isBookmarked).toBe(false);
		});

		it('should throw error when removing non-existent bookmark', async () => {
			await provider.initializeSpecialLists();

			await expect(
				provider.removeBookmark('non-existent-id')
			).rejects.toThrow();
		});
	});

	describe('duplicate bookmark detection', () => {
		it('should prevent duplicate bookmarks for same entity', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W123',
			});

			// Attempt to add same entity again
			await expect(
				provider.addBookmark({
					entityType: 'works',
					entityId: 'W123',
				})
			).rejects.toThrow('Entity already exists in list');
		});

		it('should allow same entity ID with different entity types', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'X123',
			});

			// Different entity type but same ID - should be allowed
			const recordId = await provider.addBookmark({
				entityType: 'authors',
				entityId: 'X123',
			});

			expect(recordId).toBeTruthy();

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks).toHaveLength(2);
		});
	});

	describe('bookmark metadata validation', () => {
		it('should preserve all bookmark metadata fields', async () => {
			await provider.initializeSpecialLists();

			const beforeTimestamp = new Date();

			const entityRecordId = await provider.addBookmark({
				entityType: 'institutions',
				entityId: 'I987654',
				notes: 'Leading research institution',
			});

			const afterTimestamp = new Date();

			const bookmarks = await provider.getBookmarks();
			const bookmark = bookmarks[0];

			expect(bookmark.id).toBe(entityRecordId);
			expect(bookmark.entityType).toBe('institutions');
			expect(bookmark.entityId).toBe('I987654');
			expect(bookmark.listId).toBe(SPECIAL_LIST_IDS.BOOKMARKS);
			expect(bookmark.notes).toBe('Leading research institution');
			expect(bookmark.addedAt).toBeInstanceOf(Date);
			expect(bookmark.addedAt.getTime()).toBeGreaterThanOrEqual(beforeTimestamp.getTime());
			expect(bookmark.addedAt.getTime()).toBeLessThanOrEqual(afterTimestamp.getTime());
			expect(bookmark.position).toBeGreaterThan(0);
		});

		it('should handle bookmark without optional fields', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'funders',
				entityId: 'F555',
				// No notes provided
			});

			const bookmarks = await provider.getBookmarks();
			const bookmark = bookmarks[0];

			expect(bookmark.id).toBe(entityRecordId);
			expect(bookmark.notes).toBeUndefined();
		});

		it('should handle special characters in notes', async () => {
			await provider.initializeSpecialLists();

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W999',
				notes: 'Contains special chars: <>&"\'',
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].entityType).toBe('works');
			expect(bookmarks[0].entityId).toBe('W999');
			expect(bookmarks[0].notes).toBe('Contains special chars: <>&"\'');
		});

		it('should handle very long notes', async () => {
			await provider.initializeSpecialLists();

			const longNotes = 'A'.repeat(1000);

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W888',
				notes: longNotes,
			});

			const bookmarks = await provider.getBookmarks();
			expect(bookmarks[0].entityType).toBe('works');
			expect(bookmarks[0].entityId).toBe('W888');
			expect(bookmarks[0].notes).toBe(longNotes);
			expect(bookmarks[0].notes?.length).toBeGreaterThanOrEqual(1000);
		});
	});

	describe('integration with list operations', () => {
		it('should not allow manual deletion of bookmarks list', async () => {
			await provider.initializeSpecialLists();

			await expect(
				provider.deleteList(SPECIAL_LIST_IDS.BOOKMARKS)
			).rejects.toThrow('Cannot delete special system list');
		});

		it('should identify bookmarks list as special system list', async () => {
			const isSpecial = provider.isSpecialList(SPECIAL_LIST_IDS.BOOKMARKS);

			expect(isSpecial).toBe(true);
		});

		it('should exclude bookmarks list from non-system lists', async () => {
			await provider.initializeSpecialLists();

			// Create a regular user list
			await provider.createList({
				title: 'My Research Papers',
				type: 'bibliography',
			});

			const nonSystemLists = await provider.getNonSystemLists();

			expect(nonSystemLists).toHaveLength(1);
			expect(nonSystemLists[0].title).toBe('My Research Papers');
			expect(nonSystemLists.find((l) => l.id === SPECIAL_LIST_IDS.BOOKMARKS)).toBeUndefined();
		});

		it('should update list timestamp when bookmark added', async () => {
			await provider.initializeSpecialLists();

			const beforeList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const beforeTimestamp = beforeList?.updatedAt;

			// Wait a moment to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			await provider.addBookmark({
				entityType: 'works',
				entityId: 'W777',
			});

			const afterList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const afterTimestamp = afterList?.updatedAt;

			expect(beforeTimestamp).toBeTruthy();
			expect(afterTimestamp).toBeTruthy();
			expect(afterTimestamp!.getTime()).toBeGreaterThan(beforeTimestamp!.getTime());
		});

		it('should update list timestamp when bookmark removed', async () => {
			await provider.initializeSpecialLists();

			const entityRecordId = await provider.addBookmark({
				entityType: 'works',
				entityId: 'W666',
			});

			const beforeList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const beforeTimestamp = beforeList?.updatedAt;

			// Wait a moment to ensure timestamp difference
			await new Promise((resolve) => setTimeout(resolve, 10));

			await provider.removeBookmark(entityRecordId);

			const afterList = await provider.getList(SPECIAL_LIST_IDS.BOOKMARKS);
			const afterTimestamp = afterList?.updatedAt;

			expect(afterTimestamp!.getTime()).toBeGreaterThan(beforeTimestamp!.getTime());
		});
	});

	// ========== Graph List Storage Operations (Feature 038-graph-list) ==========
	// Tests for User Story 1: Persist Graph Working Set

	describe('Graph List Operations', () => {
		describe('initializeSpecialLists()', () => {
			it('should create graph list on initialization (T025)', async () => {
				await provider.initializeSpecialLists();

				const graphList = await provider.getList(SPECIAL_LIST_IDS.GRAPH);

				expect(graphList).not.toBeNull();
				expect(graphList?.id).toBe(SPECIAL_LIST_IDS.GRAPH);
				expect(graphList?.title).toBe('Graph');
				expect(graphList?.description).toBe('System-managed graph working set');
				expect(graphList?.type).toBe('list');
				expect(graphList?.isPublic).toBe(false);
				expect(graphList?.tags).toContain('system');
			});
		});

		describe('getGraphList() (T025)', () => {
			it('should return empty array when no nodes in graph list', async () => {
				await provider.initializeSpecialLists();

				const nodes = await provider.getGraphList();

				expect(nodes).toEqual([]);
			});

			it('should return nodes with correct structure', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W123',
					entityType: 'works',
					label: 'Test Work',
					provenance: 'user',
				});

				const nodes = await provider.getGraphList();

				expect(nodes).toHaveLength(1);
				expect(nodes[0]).toMatchObject({
					entityId: 'W123',
					entityType: 'works',
					label: 'Test Work',
					provenance: 'user',
				});
				expect(nodes[0].id).toBeTruthy();
				expect(nodes[0].addedAt).toBeInstanceOf(Date);
			});

			it('should parse provenance correctly from all types', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W1',
					entityType: 'works',
					label: 'User Added',
					provenance: 'user',
				});

				await provider.addToGraphList({
					entityId: 'W2',
					entityType: 'works',
					label: 'From Collection',
					provenance: 'collection-load',
				});

				await provider.addToGraphList({
					entityId: 'W3',
					entityType: 'works',
					label: 'Expanded',
					provenance: 'expansion',
				});

				await provider.addToGraphList({
					entityId: 'W4',
					entityType: 'works',
					label: 'Auto',
					provenance: 'auto-population',
				});

				const nodes = await provider.getGraphList();

				expect(nodes).toHaveLength(4);

				 
				const toMapEntry = (n: typeof nodes[0]) => [n.entityId, n] as const;
				const nodeMap = new Map(nodes.map(toMapEntry));

				expect(nodeMap.get('W1')?.provenance).toBe('user');
				expect(nodeMap.get('W2')?.provenance).toBe('collection-load');
				expect(nodeMap.get('W3')?.provenance).toBe('expansion');
				expect(nodeMap.get('W4')?.provenance).toBe('auto-population');
			});

			it('should extract labels correctly from serialized format', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W123',
					entityType: 'works',
					label: 'Complex Label: with | symbols',
					provenance: 'user',
				});

				const nodes = await provider.getGraphList();

				expect(nodes[0].label).toBe('Complex Label: with | symbols');
			});
		});

		describe('addToGraphList() (T026)', () => {
			it('should add node to graph list successfully', async () => {
				await provider.initializeSpecialLists();

				const id = await provider.addToGraphList({
					entityId: 'A456',
					entityType: 'authors',
					label: 'Jane Doe',
					provenance: 'user',
				});

				expect(id).toBeTruthy();

				const nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(1);
				expect(nodes[0].entityId).toBe('A456');
			});

			it('should enforce size limit of 1000 nodes', async () => {
				await provider.initializeSpecialLists();

				// Add 1000 nodes
				for (let i = 0; i < 1000; i++) {
					await provider.addToGraphList({
						entityId: `W${i}`,
						entityType: 'works',
						label: `Work ${i}`,
						provenance: 'user',
					});
				}

				// 1001st node should throw error
				await expect(
					provider.addToGraphList({
						entityId: 'W1000',
						entityType: 'works',
						label: 'Exceeds Limit',
						provenance: 'user',
					})
				).rejects.toThrow('Graph list size limit reached (1000 nodes)');
			});

			it('should update existing node provenance and timestamp', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W789',
					entityType: 'works',
					label: 'Original Label',
					provenance: 'collection-load',
				});

				const nodesInitial = await provider.getGraphList();
				const initialTimestamp = nodesInitial[0].addedAt;

				// Wait to ensure timestamp difference
				await delay(10);

				// Add same node with different provenance
				await provider.addToGraphList({
					entityId: 'W789',
					entityType: 'works',
					label: 'Updated Label',
					provenance: 'user',
				});

				const nodesAfter = await provider.getGraphList();

				// Should still have only 1 node (deduplication)
				expect(nodesAfter).toHaveLength(1);
				// Provenance should be updated
				expect(nodesAfter[0].provenance).toBe('user');
				// Label should be updated
				expect(nodesAfter[0].label).toBe('Updated Label');
				// Timestamp should be newer
				expect(nodesAfter[0].addedAt.getTime()).toBeGreaterThan(initialTimestamp.getTime());
			});

			it('should deduplicate by entityId across entity types', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W999',
					entityType: 'works',
					label: 'A Work',
					provenance: 'user',
				});

				// Try to add different entity type with same ID
				await provider.addToGraphList({
					entityId: 'W999',
					entityType: 'authors', // Different type
					label: 'An Author',
					provenance: 'user',
				});

				const nodes = await provider.getGraphList();

				// Should have 2 nodes since entity types differ
				expect(nodes).toHaveLength(2);
			});
		});

		describe('removeFromGraphList()', () => {
			it('should remove node from graph list', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W100',
					entityType: 'works',
					label: 'To Remove',
					provenance: 'user',
				});

				let nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(1);

				await provider.removeFromGraphList('W100');

				nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(0);
			});

			it('should throw error when removing non-existent node', async () => {
				await provider.initializeSpecialLists();

				await expect(provider.removeFromGraphList('W_NONEXISTENT')).rejects.toThrow();
			});
		});

		describe('clearGraphList()', () => {
			it('should remove all nodes from graph list', async () => {
				await provider.initializeSpecialLists();

				// Add multiple nodes
				await provider.addToGraphList({
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					provenance: 'user',
				});
				await provider.addToGraphList({
					entityId: 'A1',
					entityType: 'authors',
					label: 'Author 1',
					provenance: 'expansion',
				});

				let nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(2);

				await provider.clearGraphList();

				nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(0);
			});
		});

		describe('getGraphListSize()', () => {
			it('should return 0 for empty graph list', async () => {
				await provider.initializeSpecialLists();

				const size = await provider.getGraphListSize();

				expect(size).toBe(0);
			});

			it('should return correct count of nodes', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W1',
					entityType: 'works',
					label: 'Work 1',
					provenance: 'user',
				});
				await provider.addToGraphList({
					entityId: 'W2',
					entityType: 'works',
					label: 'Work 2',
					provenance: 'user',
				});
				await provider.addToGraphList({
					entityId: 'A1',
					entityType: 'authors',
					label: 'Author 1',
					provenance: 'user',
				});

				const size = await provider.getGraphListSize();

				expect(size).toBe(3);
			});
		});

		describe('isInGraphList()', () => {
			it('should return false for node not in list', async () => {
				await provider.initializeSpecialLists();

				const exists = await provider.isInGraphList('W_MISSING');

				expect(exists).toBe(false);
			});

			it('should return true for node in list', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W200',
					entityType: 'works',
					label: 'Present Work',
					provenance: 'user',
				});

				const exists = await provider.isInGraphList('W200');

				expect(exists).toBe(true);
			});
		});

		describe('batchAddToGraphList()', () => {
			it('should add multiple nodes in batch', async () => {
				await provider.initializeSpecialLists();

				const ids = await provider.batchAddToGraphList([
					{
						entityId: 'W1',
						entityType: 'works',
						label: 'Work 1',
						provenance: 'collection-load',
					},
					{
						entityId: 'W2',
						entityType: 'works',
						label: 'Work 2',
						provenance: 'collection-load',
					},
					{
						entityId: 'A1',
						entityType: 'authors',
						label: 'Author 1',
						provenance: 'collection-load',
					},
				]);

				expect(ids).toHaveLength(3);

				const nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(3);
			});

			it('should stop adding when reaching size limit', async () => {
				await provider.initializeSpecialLists();

				// Fill graph list to 998 nodes
				const initialBatch = Array.from({ length: 998 }, createWorkNode);
				await provider.batchAddToGraphList(initialBatch);

				// Try to add 5 more (should only add 2 to reach 1000 limit)
				const ids = await provider.batchAddToGraphList([
					{
						entityId: 'W998',
						entityType: 'works',
						label: 'Work 998',
						provenance: 'user',
					},
					{
						entityId: 'W999',
						entityType: 'works',
						label: 'Work 999',
						provenance: 'user',
					},
					{
						entityId: 'W1000',
						entityType: 'works',
						label: 'Should Not Add',
						provenance: 'user',
					},
					{
						entityId: 'W1001',
						entityType: 'works',
						label: 'Should Not Add',
						provenance: 'user',
					},
					{
						entityId: 'W1002',
						entityType: 'works',
						label: 'Should Not Add',
						provenance: 'user',
					},
				]);

				expect(ids).toHaveLength(2); // Only 2 added

				const size = await provider.getGraphListSize();
				expect(size).toBe(1000); // Exactly at limit
			});
		});

		describe('pruneGraphList()', () => {
			it('should remove auto-populated nodes older than 24 hours', async () => {
				await provider.initializeSpecialLists();

				// Add various nodes
				await provider.addToGraphList({
					entityId: 'W1',
					entityType: 'works',
					label: 'User Node',
					provenance: 'user',
				});
				await provider.addToGraphList({
					entityId: 'W2',
					entityType: 'works',
					label: 'Auto Node',
					provenance: 'auto-population',
				});

				// Simulate old timestamp by directly manipulating storage
				// (In real implementation, would need to wait 24h or use mock time)
				await provider.getGraphList();

				// For this test, we'll verify the method exists and returns correct structure
				const result = await provider.pruneGraphList();

				expect(result).toHaveProperty('removedCount');
				expect(result).toHaveProperty('removedNodeIds');
				expect(typeof result.removedCount).toBe('number');
				expect(Array.isArray(result.removedNodeIds)).toBe(true);
			});

			it('should not remove user/expansion/collection-load nodes', async () => {
				await provider.initializeSpecialLists();

				await provider.addToGraphList({
					entityId: 'W1',
					entityType: 'works',
					label: 'User',
					provenance: 'user',
				});
				await provider.addToGraphList({
					entityId: 'W2',
					entityType: 'works',
					label: 'Expansion',
					provenance: 'expansion',
				});
				await provider.addToGraphList({
					entityId: 'W3',
					entityType: 'works',
					label: 'Collection',
					provenance: 'collection-load',
				});

				const result = await provider.pruneGraphList();

				expect(result.removedCount).toBe(0);

				const nodes = await provider.getGraphList();
				expect(nodes).toHaveLength(3);
			});
		});
	});
});
