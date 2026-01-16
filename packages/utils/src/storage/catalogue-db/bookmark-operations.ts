/**
 * Catalogue Bookmark Operations
 * Operations for managing bookmarks in the special bookmarks list
 */

import type { GenericLogger } from "../../logger.js";
import type { EntityType } from "@bibgraph/types";
import type { CatalogueEntity } from "./index.js";
import { LOG_CATEGORY, SPECIAL_LIST_IDS } from "./index.js";
import type { CatalogueDB } from "./schema.js";

/**
 * Add a bookmark to the special bookmarks list
 * @param db Database instance
 * @param initializeSpecialLists Helper to initialize special lists
 * @param addEntityToList Helper to add entity to list
 * @param params Bookmark parameters
 * @param logger Optional logger
 * @returns The ID of the created bookmark entity record
 */
export const addBookmark = async (
	db: CatalogueDB,
	initializeSpecialLists: () => Promise<void>,
	addEntityToList: (params: {
		listId: string;
		entityType: EntityType;
		entityId: string;
		notes?: string;
	}) => Promise<string>,
	params: {
		entityType: EntityType;
		entityId: string;
		notes?: string;
	},
	logger?: GenericLogger
): Promise<string> => {
	await initializeSpecialLists();

	// Store entity data directly in proper fields, user notes only in notes field
	return await addEntityToList({
		listId: SPECIAL_LIST_IDS.BOOKMARKS,
		entityType: params.entityType,
		entityId: params.entityId,
		notes: params.notes, // User notes only, no URLs
	});
};

/**
 * Remove a bookmark from the special bookmarks list
 * @param removeEntityFromList Helper to remove entity from list
 * @param entityRecordId Entity record ID
 */
export const removeBookmark = async (
	removeEntityFromList: (listId: string, entityRecordId: string) => Promise<void>,
	entityRecordId: string
): Promise<void> => {
	await removeEntityFromList(SPECIAL_LIST_IDS.BOOKMARKS, entityRecordId);
};

/**
 * Get all bookmarks
 * @param db Database instance
 * @param initializeSpecialLists Helper to initialize special lists
 * @param getListEntities Helper to get list entities
 * @param logger Optional logger
 * @returns Array of bookmark entities
 */
export const getBookmarks = async (
	db: CatalogueDB,
	initializeSpecialLists: () => Promise<void>,
	getListEntities: (listId: string) => Promise<CatalogueEntity[]>,
	logger?: GenericLogger
): Promise<CatalogueEntity[]> => {
	await initializeSpecialLists();
	return await getListEntities(SPECIAL_LIST_IDS.BOOKMARKS);
};

/**
 * Check if an entity is bookmarked
 * @param db Database instance
 * @param entityType Entity type
 * @param entityId Entity ID
 * @param logger Optional logger
 * @returns True if bookmarked, false otherwise
 */
export const isBookmarked = async (
	db: CatalogueDB,
	entityType: EntityType,
	entityId: string,
	logger?: GenericLogger
): Promise<boolean> => {
	try {
		const existing = await db.catalogueEntities
			.where(["listId", "entityType", "entityId"])
			.equals([SPECIAL_LIST_IDS.BOOKMARKS, entityType, entityId])
			.first();
		return !!existing;
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to check bookmark status", { entityType, entityId, error: String(error) });
		return false;
	}
};
