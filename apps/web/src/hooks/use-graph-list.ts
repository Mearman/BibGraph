/**
 * Graph List Management Hook
 * T042-T044: Add nodes to graph list with provenance tracking
 *
 * Provides optimistic updates when adding nodes to the persistent graph list.
 * Each add operation records provenance (user, collection-load, expansion, auto-population).
 */


import type { GraphListNode,GraphNode, GraphProvenance } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useCallback,useEffect, useState } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

const LOG_PREFIX = 'use-graph-list';

/** Minimal node input for adding to graph list - only needs identifying info */
export type GraphNodeInput = Pick<GraphNode, 'entityId' | 'entityType' | 'label'>;

export interface UseGraphListReturn {
	nodes: GraphListNode[];
	loading: boolean;
	error: Error | null;
	addNode: (node: GraphNodeInput, provenance: GraphProvenance) => Promise<void>;
	removeNode: (entityId: string) => Promise<void>;
	clearList: () => Promise<void>;
}

/**
 * Hook for managing graph list with optimistic updates
 * T042-T044: Add node operations with provenance tracking
 */
export const useGraphList = (): UseGraphListReturn => {
	const storage = useStorageProvider();
	const [nodes, setNodes] = useState<GraphListNode[]>([]);
	const [loading, setLoading] = useState(true);
	const [error, setError] = useState<Error | null>(null);

	// Load initial nodes from storage
	useEffect(() => {
		let mounted = true;

		const loadNodes = async () => {
			try {
				setLoading(true);
				const graphList = await storage.getGraphList();
				if (mounted) {
					setNodes(graphList);
					setError(null);
				}
			} catch (err) {
				logger.error(LOG_PREFIX, 'Failed to load graph list', { error: err });
				if (mounted) {
					setError(err as Error);
				}
			} finally {
				if (mounted) {
					setLoading(false);
				}
			}
		};

		loadNodes();

		return () => {
			mounted = false;
		};
	}, [storage]);

	/**
	 * Add node to graph list with provenance tracking
	 * T042: user provenance
	 * T043: collection-load provenance
	 * T044: expansion provenance
	 *
	 * Uses optimistic updates for better UX
	 */
	const addNode = useCallback(
		async (node: GraphNodeInput, provenance: GraphProvenance): Promise<void> => {
			const newEntry: GraphListNode = {
				id: node.entityId, // Use entityId as temporary id for optimistic update
				entityId: node.entityId,
				entityType: node.entityType,
				label: node.label,
				provenance,
				addedAt: new Date(),
			};

			// Optimistic update
			setNodes((prev) => {
				// Check if node already exists
				const existingIndex = prev.findIndex((n) => n.entityId === node.entityId);
				if (existingIndex !== -1) {
					// Update existing node's provenance
					const updated = [...prev];
					updated[existingIndex] = newEntry;
					return updated;
				}
				// Add new node
				return [...prev, newEntry];
			});

			try {
				// Persist to storage
				await storage.addToGraphList({
					entityId: node.entityId,
					entityType: node.entityType,
					label: node.label,
					provenance,
				});

				logger.debug(LOG_PREFIX, 'Added node to graph list', {
					entityId: node.entityId,
					provenance,
				});
			} catch (err) {
				logger.error(LOG_PREFIX, 'Failed to add node to graph list', {
					error: err,
					entityId: node.entityId,
				});

				// Rollback optimistic update
				setNodes((prev) => prev.filter((n) => n.entityId !== node.entityId));

				throw err; // Re-throw for caller to handle
			}
		},
		[storage]
	);

	/**
	 * Remove node from graph list
	 * T051: Implementation for removal
	 */
	const removeNode = useCallback(
		async (entityId: string): Promise<void> => {
			// Optimistic update
			setNodes((prev) => prev.filter((n) => n.entityId !== entityId));

			try {
				await storage.removeFromGraphList(entityId);
				logger.debug(LOG_PREFIX, 'Removed node from graph list', { entityId });
			} catch (err) {
				logger.error(LOG_PREFIX, 'Failed to remove node from graph list', {
					error: err,
					entityId,
				});

				// Reload from storage to ensure consistency
				const graphList = await storage.getGraphList();
				setNodes(graphList);

				throw err;
			}
		},
		[storage]
	);

	/**
	 * Clear entire graph list
	 * T052: Implementation for clearing
	 */
	const clearList = useCallback(async (): Promise<void> => {
		// Optimistic update
		const previousNodes = nodes;
		setNodes([]);

		try {
			await storage.clearGraphList();
			logger.debug(LOG_PREFIX, 'Cleared graph list');
		} catch (err) {
			logger.error(LOG_PREFIX, 'Failed to clear graph list', { error: err });

			// Rollback optimistic update
			setNodes(previousNodes);

			throw err;
		}
	}, [storage, nodes]);

	return {
		nodes,
		loading,
		error,
		addNode,
		removeNode,
		clearList,
	};
};
