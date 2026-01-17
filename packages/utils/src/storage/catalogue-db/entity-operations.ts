/**
 * Catalogue Entity Operations
 * CRUD operations for catalogue entities (items in lists)
 */

import type { EntityType } from "@bibgraph/types";
import Dexie from "dexie";

import type { GenericLogger } from "../../logger.js";
import type { CatalogueEntity,CatalogueList } from "./index.js";
import { catalogueEventEmitter, LOG_CATEGORY } from "./index.js";
import type { CatalogueDB } from "./schema.js";

/**
 * Add a single entity to a catalogue list
 * @param db Database instance
 * @param getList Helper function to get a list
 * @param updateList Helper function to update a list
 * @param params Entity parameters
 * @param params.listId
 * @param params.entityType
 * @param params.entityId
 * @param params.notes
 * @param params.position
 * @param logger Optional logger
 * @returns The ID of the created entity record
 */
export const addEntityToList = async (
	db: CatalogueDB,
	getList: (id: string) => Promise<CatalogueList | null>,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	params: {
		listId: string;
		entityType: EntityType;
		entityId: string;
		notes?: string;
		position?: number;
	},
	logger?: GenericLogger
): Promise<string> => {
	try {
		// Validate that the entity type matches the list type
		const list = await getList(params.listId);
		if (!list) {
			throw new Error("List not found");
		}

		if (list.type === "bibliography" && params.entityType !== "works") {
			throw new Error("Bibliographies can only contain works");
		}

		// Check if entity already exists in list
		const existing = await db.catalogueEntities
			.where(["listId", "entityType", "entityId"])
			.equals([params.listId, params.entityType, params.entityId])
			.first();

		if (existing && existing.id) {
			// Instead of throwing, return the existing ID
			logger?.debug(LOG_CATEGORY, "Entity already exists in list, returning existing ID", {
				listId: params.listId,
				entityType: params.entityType,
				entityId: params.entityId,
				existingId: existing.id,
			});
			return existing.id;
		}

		// Get next position if not specified
		let position = params.position;
		if (position === undefined) {
			const entities = await db.catalogueEntities
				.where("listId")
				.equals(params.listId)
				.toArray();
			const maxPosition = entities.reduce((max, entity) => Math.max(max, entity.position), 0);
			position = maxPosition + 1;
		}

		const id = crypto.randomUUID();
		const entity: CatalogueEntity = {
			id,
			listId: params.listId,
			entityType: params.entityType,
			entityId: params.entityId,
			addedAt: new Date(),
			notes: params.notes,
			position: position ?? 0,
		};

		await db.catalogueEntities.add(entity);

		// Update list's updated timestamp
		await updateList(params.listId, {});

		// Emit event for entity addition
		catalogueEventEmitter.emit({
			type: 'entity-added',
			listId: params.listId,
			entityIds: [params.entityId],
		});

		logger?.debug(LOG_CATEGORY, "Entity added to catalogue list", {
			listId: params.listId,
			entityType: params.entityType,
			entityId: params.entityId,
		});

		return id;
	} catch (error) {
		// Handle constraint errors gracefully - they might occur in race conditions
		if (error instanceof Dexie.ConstraintError) {
			logger?.debug(LOG_CATEGORY, "Entity already exists due to race condition, attempting to find existing", {
				params,
				error: error.message,
			});

			// Try to find and return the existing entity
			try {
				const existing = await db.catalogueEntities
					.where(["listId", "entityType", "entityId"])
					.equals([params.listId, params.entityType, params.entityId])
					.first();

				if (existing?.id) {
					return existing.id;
				}
			} catch (findError) {
				logger?.warn(LOG_CATEGORY, "Failed to find existing entity after constraint error", {
					params,
					findError,
				});
			}
		}

		logger?.error(LOG_CATEGORY, "Failed to add entity to catalogue list", {
			params,
			error,
		});
		throw error;
	}
};

/**
 * Remove an entity from a catalogue list
 * @param db Database instance
 * @param updateList Helper function to update a list
 * @param listId List ID
 * @param entityRecordId Entity record ID
 * @param logger Optional logger
 */
export const removeEntityFromList = async (
	db: CatalogueDB,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	listId: string,
	entityRecordId: string,
	logger?: GenericLogger
): Promise<void> => {
	try {
		await db.catalogueEntities.delete(entityRecordId);

		// Update list's updated timestamp
		await updateList(listId, {});

		// Emit event for entity removal
		catalogueEventEmitter.emit({
			type: 'entity-removed',
			listId,
		});

		logger?.debug(LOG_CATEGORY, "Entity removed from catalogue list", {
			listId,
			entityRecordId,
		});
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to remove entity from catalogue list", {
			listId,
			entityRecordId,
			error,
		});
		throw error;
	}
};

/**
 * Update entity notes
 * @param db Database instance
 * @param updateList Helper function to update a list
 * @param entityRecordId Entity record ID
 * @param notes Notes to set
 * @param logger Optional logger
 */
export const updateEntityNotes = async (
	db: CatalogueDB,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	entityRecordId: string,
	notes: string,
	logger?: GenericLogger
): Promise<void> => {
	try {
		await db.catalogueEntities.update(entityRecordId, { notes });

		// Get the entity to find its listId for updating the list timestamp
		const entity = await db.catalogueEntities.get(entityRecordId);
		if (entity) {
			await updateList(entity.listId, {});
		}

		logger?.debug(LOG_CATEGORY, "Entity notes updated", {
			entityRecordId,
			notesLength: notes.length,
		});
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to update entity notes", {
			entityRecordId,
			error,
		});
		throw error;
	}
};

/**
 * Update entity data (entityType, entityId, and optionally notes)
 * Used primarily for migration scenarios where entity identification changes
 * @param db Database instance
 * @param updateList Helper function to update a list
 * @param entityRecordId Entity record ID
 * @param data Update data
 * @param data.entityType
 * @param data.entityId
 * @param data.notes
 * @param logger Optional logger
 */
export const updateEntityData = async (
	db: CatalogueDB,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	entityRecordId: string,
	data: { entityType: EntityType; entityId: string; notes?: string },
	logger?: GenericLogger
): Promise<void> => {
	try {
		await db.catalogueEntities.update(entityRecordId, data);

		// Get the entity to find its listId for updating the list timestamp
		const entity = await db.catalogueEntities.get(entityRecordId);
		if (entity) {
			await updateList(entity.listId, {});
		}

		logger?.debug(LOG_CATEGORY, "Entity data updated", {
			entityRecordId,
			entityType: data.entityType,
			entityId: data.entityId,
		});
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to update entity data", {
			entityRecordId,
			error,
		});
		throw error;
	}
};

/**
 * Get all entities in a catalogue list
 * @param db Database instance
 * @param listId List ID
 * @param logger Optional logger
 * @returns Array of entities sorted by position
 */
export const getListEntities = async (
	db: CatalogueDB,
	listId: string,
	logger?: GenericLogger
): Promise<CatalogueEntity[]> => {
	try {
		return await db.catalogueEntities
			.where("listId")
			.equals(listId)
			.sortBy("position");
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get catalogue list entities", { listId, error });
		return [];
	}
};

/**
 * Add multiple entities to a catalogue list
 * @param db Database instance
 * @param getList Helper function to get a list
 * @param updateList Helper function to update a list
 * @param listId List ID
 * @param entities Array of entities to add
 * @param logger Optional logger
 * @returns Object with success and failed counts
 */
export const addEntitiesToList = async (
	db: CatalogueDB,
	getList: (id: string) => Promise<CatalogueList | null>,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	listId: string,
	entities: Array<{
		entityType: EntityType;
		entityId: string;
		notes?: string;
	}>,
	logger?: GenericLogger
): Promise<{ success: number; failed: number }> => {
	let success = 0;
	let failed = 0;

	try {
		// Validate list type
		const list = await getList(listId);
		if (!list) {
			throw new Error("List not found");
		}

		// Get next position
		const entitiesInList = await db.catalogueEntities
			.where("listId")
			.equals(listId)
			.toArray();
		const maxPosition = entitiesInList.reduce((max, entity) => Math.max(max, entity.position), 0);
		let nextPosition = maxPosition + 1;

		await db.transaction("rw", db.catalogueEntities, async () => {
			for (const entity of entities) {
				try {
					// Validate entity type for bibliographies
					if (list.type === "bibliography" && entity.entityType !== "works") {
						throw new Error("Bibliographies can only contain works");
					}

					// Check for duplicates
					const existing = await db.catalogueEntities
						.where(["listId", "entityType", "entityId"])
						.equals([listId, entity.entityType, entity.entityId])
						.first();

					if (existing) {
						failed++;
						continue;
					}

					const id = crypto.randomUUID();
					const entityRecord: CatalogueEntity = {
						id,
						listId,
						entityType: entity.entityType,
						entityId: entity.entityId,
						addedAt: new Date(),
						notes: entity.notes,
						position: nextPosition++,
					};

					await db.catalogueEntities.add(entityRecord);
					success++;
				} catch (error) {
					logger?.warn(LOG_CATEGORY, "Failed to add entity in bulk operation", {
						listId,
						entityType: entity.entityType,
						entityId: entity.entityId,
						error,
					});
					failed++;
				}
			}
		});

		// Update list's updated timestamp
		await updateList(listId, {});

		// Emit event for bulk entity addition
		if (success > 0) {
			catalogueEventEmitter.emit({
				type: 'entity-added',
				listId,
				entityIds: entities.map(e => e.entityId),
			});
		}

		logger?.debug(LOG_CATEGORY, "Bulk entity addition completed", {
			listId,
			totalRequested: entities.length,
			success,
			failed,
		});

		return { success, failed };
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to perform bulk entity addition", {
			listId,
			entitiesCount: entities.length,
			error,
		});
		throw error;
	}
};

/**
 * Reorder entities in a list by updating their positions
 * @param db Database instance
 * @param getList Helper function to get a list
 * @param getListEntities Helper function to get list entities
 * @param updateList Helper function to update a list
 * @param listId List ID
 * @param orderedEntityIds Array of entity record IDs in new order
 * @param logger Optional logger
 */
export const reorderEntities = async (
	db: CatalogueDB,
	getList: (id: string) => Promise<CatalogueList | null>,
	getListEntities: (id: string) => Promise<CatalogueEntity[]>,
	updateList: (id: string, updates: Record<string, unknown>) => Promise<void>,
	listId: string,
	orderedEntityIds: string[],
	logger?: GenericLogger
): Promise<void> => {
	try {
		// Validate that the list exists
		const list = await getList(listId);
		if (!list) {
			throw new Error("List not found");
		}

		// Get all entities for the list to validate IDs
		const listEntities = await getListEntities(listId);
		const entityIdSet = new Set(listEntities.map(e => e.id));

		// Validate that all provided IDs exist in the list
		for (const entityId of orderedEntityIds) {
			if (!entityIdSet.has(entityId)) {
				throw new Error(`Entity ${entityId} not found in list ${listId}`);
			}
		}

		// Update positions atomically within a transaction
		await db.transaction("rw", db.catalogueEntities, async () => {
			for (let i = 0; i < orderedEntityIds.length; i++) {
				const orderedEntityId = orderedEntityIds[i];
				await db.catalogueEntities.update(orderedEntityId, {
					position: i + 1
				});
			}
		});

		// Update list's updated timestamp
		await updateList(listId, {});

		// Emit event for entity reorder
		catalogueEventEmitter.emit({
			type: 'entity-reordered',
			listId,
		});

		logger?.debug(LOG_CATEGORY, "Entities reordered successfully", {
			listId,
			entityCount: orderedEntityIds.length
		});
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to reorder entities", {
			listId,
			entityCount: orderedEntityIds.length,
			error
		});
		throw error;
	}
};
