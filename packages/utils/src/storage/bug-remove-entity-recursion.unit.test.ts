/**
 * Regression test for the removeEntityFromList infinite self-recursion (2026-10-15): the method awaited itself instead of delegating to EntityOps, so every call (including the history-cap trim on each entity visit) threw RangeError (maximum call stack size exceeded) and visit tracking was dead. The recursion happened before any database access, so a missing record discriminates: the recursive version rejects with RangeError, the delegating version resolves (removing a missing record is a silent no-op on the EntityOps path).
 */

import 'fake-indexeddb/auto';

import { describe, expect, it } from 'vitest';

import { DexieStorageProvider } from './dexie-storage-provider.js';

describe('DexieStorageProvider.removeEntityFromList', () => {
	it('delegates to the entity operation instead of recursing into itself', async () => {
		const provider = new DexieStorageProvider();
		await provider.initializeSpecialLists();
		await expect(provider.removeEntityFromList('nonexistent-list', 'nonexistent-record')).resolves.toBeUndefined();
	});

	it('addEntityToList also terminates (the eslint refactor reintroduced the self-call there on 2026-10-15, killing bookmarks and history again)', async () => {
		const provider = new DexieStorageProvider();
		await provider.initializeSpecialLists();
		const listId = await provider.createList({ title: 'Add regression list', type: 'list' });
		await expect(
			provider.addEntityToList({ listId, entityType: 'works', entityId: 'W2741809807' }),
		).resolves.toMatch(/.+/);
	});
});
