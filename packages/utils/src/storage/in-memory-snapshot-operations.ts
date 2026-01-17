/**
 * In-memory snapshot operations
 * Graph snapshot CRUD operations
 */

import type { GraphSnapshotStorage } from './catalogue-db/index.js';
import type { InMemoryStorage } from './in-memory-storage-types.js';

/**
 * Internal helper to create and store a snapshot
 * @param storage
 * @param snapshot
 */
const createAndStoreSnapshot = (
	storage: InMemoryStorage,
	snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt' | 'isAutoSave'> & { isAutoSave?: boolean }
): string => {
	const id = crypto.randomUUID();
	const timestamp = new Date();
	const storedSnapshot: GraphSnapshotStorage = {
		id,
		name: snapshot.name,
		nodes: snapshot.nodes,
		edges: snapshot.edges,
		zoom: snapshot.zoom,
		panX: snapshot.panX,
		panY: snapshot.panY,
		layoutType: snapshot.layoutType,
		nodePositions: snapshot.nodePositions,
		annotations: snapshot.annotations,
		isAutoSave: snapshot.isAutoSave ?? false,
		createdAt: timestamp,
		updatedAt: timestamp,
	};
	storage.snapshots.set(id, storedSnapshot);
	return id;
};

/**
 * Save a new snapshot (legacy method signature)
 * @param storage
 * @param snapshot
 * @param snapshot.name
 * @param snapshot.nodes
 * @param snapshot.edges
 * @param snapshot.zoom
 * @param snapshot.panX
 * @param snapshot.panY
 * @param snapshot.layoutType
 * @param snapshot.nodePositions
 * @param snapshot.annotations
 * @param snapshot.isAutoSave
 */
export const saveSnapshot = (storage: InMemoryStorage, snapshot: {
		name: string;
		nodes: string;
		edges: string;
		zoom: number;
		panX: number;
		panY: number;
		layoutType: string;
		nodePositions?: string;
		annotations?: string;
		isAutoSave?: boolean;
	}): string => createAndStoreSnapshot(storage, snapshot);

/**
 * Add a new snapshot
 * @param storage
 * @param snapshot
 */
export const addSnapshot = (storage: InMemoryStorage, snapshot: Omit<GraphSnapshotStorage, 'id' | 'createdAt' | 'updatedAt' | 'isAutoSave'> & { isAutoSave?: boolean }): string =>
	createAndStoreSnapshot(storage, snapshot);

/**
 * Get all snapshots
 * @param storage
 */
export const getSnapshots = (storage: InMemoryStorage): GraphSnapshotStorage[] => [...storage.snapshots.values()];

/**
 * Get a specific snapshot by ID
 * @param storage
 * @param snapshotId
 */
export const getSnapshot = (storage: InMemoryStorage, snapshotId: string): GraphSnapshotStorage | null => storage.snapshots.get(snapshotId) ?? null;

/**
 * Delete a snapshot
 * @param storage
 * @param snapshotId
 */
export const deleteSnapshot = (storage: InMemoryStorage, snapshotId: string): void => {
	storage.snapshots.delete(snapshotId);
};

/**
 * Update a snapshot
 * @param storage
 * @param snapshotId
 * @param updates
 * @param updates.name
 * @param updates.nodes
 * @param updates.edges
 * @param updates.zoom
 * @param updates.panX
 * @param updates.panY
 * @param updates.layoutType
 * @param updates.nodePositions
 * @param updates.annotations
 */
export const updateSnapshot = (storage: InMemoryStorage, snapshotId: string, updates: {
		name?: string;
		nodes?: string;
		edges?: string;
		zoom?: number;
		panX?: number;
		panY?: number;
		layoutType?: string;
		nodePositions?: string;
		annotations?: string;
	}): void => {
	const snapshot = storage.snapshots.get(snapshotId);
	if (!snapshot) {
		throw new Error('Snapshot not found');
	}
	const updatedSnapshot: GraphSnapshotStorage = {
		...snapshot,
		...updates,
		updatedAt: new Date(),
	};
	storage.snapshots.set(snapshotId, updatedSnapshot);
};

/**
 * Prune old auto-save snapshots, keeping only the most recent N
 * @param storage
 * @param maxCount
 */
export const pruneAutoSaveSnapshots = (storage: InMemoryStorage, maxCount: number): void => {
	const autoSnapshots = [...storage.snapshots.values()]
		.filter((snap) => snap.isAutoSave)
		.sort((a, b) => a.createdAt.getTime() - b.createdAt.getTime());

	if (autoSnapshots.length > maxCount) {
		const toDelete = autoSnapshots.slice(0, autoSnapshots.length - maxCount);
		for (const snap of toDelete) {
			if (snap.id) {
				storage.snapshots.delete(snap.id);
			}
		}
	}
};
