/**
 * CRUD operations hook for catalogue
 * Handles create, read, update, delete operations for lists and entities
 */

import type { EntityType } from "@bibgraph/types";
import type { CatalogueEntity, CatalogueList } from "@bibgraph/utils";
import { logger } from "@bibgraph/utils/logger";
import { useCallback } from "react";

import { useNotifications } from "@/contexts/NotificationContext";
import { useStorageProvider } from "@/contexts/storage-provider-context";

import type { AddEntityParams,CreateListParams, UpdateListParams } from "./types";

const CATALOGUE_LOGGER_CONTEXT = "catalogue-crud";

// User-friendly error message mapping
const getUserFriendlyErrorMessage = (error: unknown): string => {
	const errorMessage = error instanceof Error ? error.message : String(error);
	const lowerMessage = errorMessage.toLowerCase();

	// Storage quota exceeded
	if (lowerMessage.includes("quota") || lowerMessage.includes("storage") || lowerMessage.includes("full")) {
		return "Storage quota exceeded. Please free up space by deleting unused lists or clearing browser data.";
	}

	// Network errors
	if (lowerMessage.includes("network") || lowerMessage.includes("fetch") || lowerMessage.includes("connection")) {
		return "Network error occurred. Please check your internet connection and try again.";
	}

	// Not found errors
	if (lowerMessage.includes("not found") || lowerMessage.includes("does not exist")) {
		return "The requested item could not be found. It may have been deleted.";
	}

	// Validation errors
	if (lowerMessage.includes("invalid") || lowerMessage.includes("validation") || lowerMessage.includes("format")) {
		return "Invalid data format. Please check your input and try again.";
	}

	// Permission errors
	if (lowerMessage.includes("permission") || lowerMessage.includes("denied") || lowerMessage.includes("unauthorized")) {
		return "Permission denied. You don't have access to perform this action.";
	}

	// Database errors
	if (lowerMessage.includes("database") || lowerMessage.includes("indexeddb") || lowerMessage.includes("dexie")) {
		return "Database error occurred. Try refreshing the page or clearing your browser cache.";
	}

	// Duplicate errors
	if (lowerMessage.includes("duplicate") || lowerMessage.includes("already exists")) {
		return "This item already exists in the list.";
	}

	// Timeout errors
	if (lowerMessage.includes("timeout") || lowerMessage.includes("timed out")) {
		return "Operation timed out. Please try again.";
	}

	// Default fallback
	return `An error occurred: ${errorMessage}`;
};

export interface UseCatalogueCRUDParams {
	// State setters
	setLists: React.Dispatch<React.SetStateAction<CatalogueList[]>>;
	setEntities: React.Dispatch<React.SetStateAction<CatalogueEntity[]>>;
	setSelectedList: React.Dispatch<React.SetStateAction<CatalogueList | null>>;
	setIsUpdatingList: React.Dispatch<React.SetStateAction<boolean>>;
	setIsDeletingList: React.Dispatch<React.SetStateAction<boolean>>;
	setIsAddingEntity: React.Dispatch<React.SetStateAction<boolean>>;
	setIsRemovingEntity: React.Dispatch<React.SetStateAction<boolean>>;

	// Current state
	lists: CatalogueList[];
	entities: CatalogueEntity[];
	selectedList: CatalogueList | null;

	// Callbacks
	refreshLists: () => Promise<void>;
	refreshEntities: (listId: string) => Promise<void>;
	selectList: (list: CatalogueList | null) => void;
}

/**
 * CRUD operations hook for catalogue lists and entities
 * Provides optimistic updates with rollback on error
 * @param params
 */
export const useCatalogueCRUD = (params: UseCatalogueCRUDParams) => {
	const storageProvider = useStorageProvider();
	const { showNotification } = useNotifications();

	const {
		setLists,
		setEntities,
		setIsUpdatingList,
		setIsDeletingList,
		setIsAddingEntity,
		setIsRemovingEntity,
		lists,
		entities,
		selectedList,
		refreshLists,
		refreshEntities,
		selectList,
	} = params;

	// Create list (optimistic update)
	const createList = useCallback(async (params: CreateListParams): Promise<string> => {
		// Create temporary optimistic list
		const optimisticListId = `temp-${crypto.randomUUID()}`;
		const optimisticList: CatalogueList = {
			id: optimisticListId,
			title: params.title,
			description: params.description,
			type: params.type,
			tags: params.tags || [],
			isPublic: params.isPublic || false,
			createdAt: new Date(),
			updatedAt: new Date(),
		};

		// Optimistically add to lists
		setLists((prev) => [...prev, optimisticList]);

		try {
			const listId = await storageProvider.createList(params);

			// Replace optimistic list with real one
			setLists((prev) =>
				prev.map((l) =>
					l.id === optimisticListId ? { ...optimisticList, id: listId } : l
				)
			);

			// Auto-select the new list
			const newList = lists.find(l => l.id === listId);
			if (newList) {
				selectList(newList);
			}

			showNotification({
				title: "Success",
				message: `Created "${params.title}"`,
				category: "success",
			});

			return listId;
		} catch (error) {
			// Rollback: remove optimistic list
			setLists((prev) => prev.filter((l) => l.id !== optimisticListId));

			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to create catalogue list", { params, error });

			showNotification({
				title: "Error",
				message: getUserFriendlyErrorMessage(error),
				category: "error",
			});

			throw new Error(getUserFriendlyErrorMessage(error));
		}
	}, [showNotification, setLists, selectList, lists, storageProvider]);

	// Update list (optimistic update)
	const updateList = useCallback(async (
		listId: string,
		updates: UpdateListParams
	): Promise<void> => {
		setIsUpdatingList(true);

		// Store previous state for rollback
		const previousLists = [...lists];
		const listToUpdate = lists.find((l) => l.id === listId);

		if (!listToUpdate) {
			showNotification({
				title: "Error",
				message: "List not found",
				category: "error",
			});
			setIsUpdatingList(false);
			return;
		}

		// Optimistically update list
		setLists((prev) =>
			prev.map((l) =>
				l.id === listId ? { ...l, ...updates, updatedAt: new Date() } : l
			)
		);

		try {
			await storageProvider.updateList(listId, updates);

			showNotification({
				title: "Success",
				message: "List updated",
				category: "success",
			});
		} catch (error) {
			// Rollback: restore previous state
			setLists(previousLists);

			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update catalogue list", { listId, updates, error });

			showNotification({
				title: "Error",
				message: getUserFriendlyErrorMessage(error),
				category: "error",
			});

			throw new Error(getUserFriendlyErrorMessage(error));
		} finally {
			setIsUpdatingList(false);
		}
	}, [lists, showNotification, setLists, setIsUpdatingList, storageProvider]);

	// Delete list (optimistic update)
	const deleteList = useCallback(async (listId: string): Promise<void> => {
		setIsDeletingList(true);

		// Store previous state for rollback
		const previousLists = [...lists];
		const listToDelete = lists.find((l) => l.id === listId);
		const wasSelected = selectedList?.id === listId;

		// Optimistically remove list
		setLists((prev) => prev.filter((l) => l.id !== listId));

		// Clear selection if deleted list was selected
		if (wasSelected) {
			selectList(null);
		}

		try {
			await storageProvider.deleteList(listId);

			showNotification({
				title: "Success",
				message: `Deleted "${listToDelete?.title || "list"}"`,
				category: "success",
			});
		} catch (error) {
			// Rollback: restore list and selection
			setLists(previousLists);
			if (wasSelected && listToDelete) {
				selectList(listToDelete);
			}

			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to delete catalogue list", { listId, error });

			showNotification({
				title: "Error",
				message: getUserFriendlyErrorMessage(error),
				category: "error",
			});

			throw new Error(getUserFriendlyErrorMessage(error));
		} finally {
			setIsDeletingList(false);
		}
	}, [lists, selectedList, showNotification, setLists, selectList, setIsDeletingList, storageProvider]);

	// Add entity to list (optimistic update)
	const addEntityToList = useCallback(async (params: AddEntityParams): Promise<string> => {
		setIsAddingEntity(true);

		// Create temporary optimistic entity for immediate UI feedback
		const optimisticEntity: CatalogueEntity = {
			id: `temp-${crypto.randomUUID()}`,
			entityType: params.entityType,
			entityId: params.entityId,
			notes: params.notes,
			listId: params.listId,
			position: entities.length,
			addedAt: new Date(),
		};

		// Optimistically add to local state
		setEntities((prev) => [...prev, optimisticEntity]);

		try {
			const recordId = await storageProvider.addEntityToList({
				listId: params.listId,
				entityType: params.entityType,
				entityId: params.entityId,
				notes: params.notes,
			});

			// Success: replace optimistic entity with real one
			setEntities((prev) =>
				prev.map((e) =>
					e.id === optimisticEntity.id
						? { ...optimisticEntity, id: recordId }
						: e
				)
			);

			showNotification({
				title: "Success",
				message: `Added ${params.entityType} to list`,
				category: "success",
			});

			return recordId;
		} catch (error) {
			// Error: rollback optimistic update
			setEntities((prev) => prev.filter((e) => e.id !== optimisticEntity.id));

			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add entity to catalogue list", { params, error });

			showNotification({
				title: "Error",
				message: getUserFriendlyErrorMessage(error),
				category: "error",
			});

			throw new Error(getUserFriendlyErrorMessage(error));
		} finally {
			setIsAddingEntity(false);
		}
	}, [storageProvider, entities, showNotification, setEntities, setIsAddingEntity]);

	// Add multiple entities to list
	const addEntitiesToList = useCallback(async (
		listId: string,
		entities: Array<{
			entityType: EntityType;
			entityId: string;
			notes?: string;
		}>
	): Promise<{ success: number; failed: number }> => {
		try {
			return await storageProvider.addEntitiesToList(listId, entities);
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to add multiple entities to catalogue list", {
				listId,
				entitiesCount: entities.length,
				error
			});
			throw error;
		}
	}, [storageProvider]);

	// Remove entity from list (optimistic update)
	const removeEntityFromList = useCallback(async (listId: string, entityRecordId: string): Promise<void> => {
		setIsRemovingEntity(true);

		// Find and store the entity for potential rollback
		const entityToRemove = entities.find((e) => e.id === entityRecordId);

		// Optimistically remove from local state
		setEntities((prev) => prev.filter((e) => e.id !== entityRecordId));

		try {
			await storageProvider.removeEntityFromList(listId, entityRecordId);

			// Refresh to ensure consistency with storage
			await refreshEntities(listId);

			showNotification({
				title: "Success",
				message: "Removed from list",
				category: "success",
			});

			logger.debug(CATALOGUE_LOGGER_CONTEXT, "Entity removed and list refreshed", {
				listId,
				entityRecordId
			});
		} catch (error) {
			// Error: rollback by restoring the removed entity
			if (entityToRemove) {
				setEntities((prev) => [...prev, entityToRemove]);
			}

			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to remove entity from catalogue list", {
				listId,
				entityRecordId,
				error
			});

			showNotification({
				title: "Error",
				message: getUserFriendlyErrorMessage(error),
				category: "error",
			});

			throw new Error(getUserFriendlyErrorMessage(error));
		} finally {
			setIsRemovingEntity(false);
		}
	}, [entities, storageProvider, refreshEntities, showNotification, setEntities, setIsRemovingEntity]);

	// Reorder entities in list
	const reorderEntities = useCallback(async (listId: string, orderedEntityIds: string[]): Promise<void> => {
		try {
			await storageProvider.reorderEntities(listId, orderedEntityIds);
			// Refresh entities after reordering to update UI
			await refreshEntities(listId);
			logger.debug(CATALOGUE_LOGGER_CONTEXT, "Entities reordered and list refreshed", {
				listId,
				entityCount: orderedEntityIds.length
			});
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to reorder catalogue list entities", {
				listId,
				orderedEntityIds,
				error
			});
			throw error;
		}
	}, [storageProvider, refreshEntities]);

	// Update entity notes
	const updateEntityNotes = useCallback(async (entityRecordId: string, notes: string): Promise<void> => {
		try {
			await storageProvider.updateEntityNotes(entityRecordId, notes);
			// Refresh entities to show updated notes
			if (selectedList?.id) {
				await refreshEntities(selectedList.id);
			}
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to update entity notes", {
				entityRecordId,
				notesLength: notes.length,
				error
			});
			throw error;
		}
	}, [selectedList, storageProvider, refreshEntities]);

	// Bulk remove entities from list
	const bulkRemoveEntities = useCallback(async (listId: string, entityIds: string[]): Promise<void> => {
		if (!entityIds || entityIds.length === 0) return;

		try {
			// Remove entities one by one
			for (const entityId of entityIds) {
				await storageProvider.removeEntityFromList(listId, entityId);
			}

			// Refresh entities after bulk removal to update UI
			await refreshEntities(listId);

			logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk remove completed and list refreshed", {
				listId,
				removedCount: entityIds.length
			});
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk remove entities", {
				listId,
				entityCount: entityIds.length,
				error
			});
			throw error;
		}
	}, [storageProvider, refreshEntities]);

	// Bulk move entities from one list to another
	const bulkMoveEntities = useCallback(async (
		sourceListId: string,
		targetListId: string,
		entityIds: string[]
	): Promise<void> => {
		if (!entityIds || entityIds.length === 0) return;
		if (sourceListId === targetListId) {
			throw new Error("Source and target lists cannot be the same");
		}

		try {
			// Get the entities from source list
			const sourceEntities = await storageProvider.getListEntities(sourceListId);
			const entitiesToMove = sourceEntities.filter(e => e.id && entityIds.includes(e.id));

			// Move entities one by one
			for (const entity of entitiesToMove) {
				// Add to target list
				await storageProvider.addEntityToList({
					listId: targetListId,
					entityType: entity.entityType,
					entityId: entity.entityId,
					notes: entity.notes,
				});

				// Remove from source list
				if (entity.id) {
					await storageProvider.removeEntityFromList(sourceListId, entity.id);
				}
			}

			// Refresh source list after bulk move to update UI
			await refreshEntities(sourceListId);

			logger.debug(CATALOGUE_LOGGER_CONTEXT, "Bulk move completed and source list refreshed", {
				sourceListId,
				targetListId,
				movedCount: entitiesToMove.length
			});
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to bulk move entities", {
				sourceListId,
				targetListId,
				entityCount: entityIds.length,
				error
			});
			throw error;
		}
	}, [storageProvider, refreshEntities]);

	// Merge lists
	const mergeLists = useCallback(async (
		sourceListIds: string[],
		mergeStrategy: 'union' | 'intersection' | 'combine',
		newListName: string,
		deduplicate: boolean
	): Promise<string> => {
		try {
			// Fetch entities from all source lists
			const allEntities: Array<{
				listId: string;
				entity: CatalogueEntity;
			}> = [];

			for (const listId of sourceListIds) {
				const listEntities = await storageProvider.getListEntities(listId);
				for (const entity of listEntities) {
					allEntities.push({ listId, entity });
				}
			}

			// Apply merge strategy
			let entitiesToMerge: Array<typeof allEntities[0]>;
			const entityKey = (e: CatalogueEntity) => `${e.entityType}:${e.entityId}`;

			if (mergeStrategy === 'intersection') {
				// Only entities that appear in ALL source lists
				const entityCounts = new Map<string, number>();
				for (const { entity } of allEntities) {
					const key = entityKey(entity);
					entityCounts.set(key, (entityCounts.get(key) || 0) + 1);
				}
				const requiredCount = sourceListIds.length;
				entitiesToMerge = allEntities.filter(({ entity }) =>
					(entityCounts.get(entityKey(entity)) || 0) >= requiredCount
				);
			} else if (mergeStrategy === 'union') {
				// All unique entities
				const seen = new Set<string>();
				entitiesToMerge = [];
				for (const item of allEntities) {
					const key = entityKey(item.entity);
					if (!seen.has(key)) {
						seen.add(key);
						entitiesToMerge.push(item);
					}
				}
			} else {
				// Combine: keep all entities including duplicates
				entitiesToMerge = allEntities;
			}

			// Additional deduplication if requested (and not intersection)
			if (deduplicate && mergeStrategy !== 'intersection') {
				const seen = new Set<string>();
				entitiesToMerge = entitiesToMerge.filter(({ entity }) => {
					const key = entityKey(entity);
					if (seen.has(key)) return false;
					seen.add(key);
					return true;
				});
			}

			// Create new list
			const newListId = await storageProvider.createList({
				title: newListName,
				type: 'list',
				tags: ['merged'],
			});

			// Add entities to new list
			for (const { entity } of entitiesToMerge) {
				await storageProvider.addEntityToList({
					listId: newListId,
					entityType: entity.entityType,
					entityId: entity.entityId,
					notes: entity.notes,
				});
			}

			// Refresh lists to show the new merged list
			await refreshLists();

			// Select the new list (need to fetch it from storage first)
			const newList = await storageProvider.getList(newListId);
			if (newList) {
				selectList(newList);
			}

			logger.info(CATALOGUE_LOGGER_CONTEXT, "Lists merged successfully", {
				sourceListIds,
				mergeStrategy,
				newListId,
				newListName,
				deduplicate,
				entityCount: entitiesToMerge.length,
			});

			return newListId;
		} catch (error) {
			logger.error(CATALOGUE_LOGGER_CONTEXT, "Failed to merge lists", {
				sourceListIds,
				mergeStrategy,
				newListName,
				error,
			});
			throw error;
		}
	}, [storageProvider, refreshLists, selectList]);

	return {
		// List CRUD
		createList,
		updateList,
		deleteList,

		// Entity CRUD
		addEntityToList,
		addEntitiesToList,
		removeEntityFromList,
		reorderEntities,
		updateEntityNotes,
		bulkRemoveEntities,
		bulkMoveEntities,
		mergeLists,
	};
};
