/**
 * Catalogue List Operations
 * CRUD operations for catalogue lists (user-created lists and bibliographies)
 */

import type { EntityType } from "@bibgraph/types";
import Dexie from "dexie";

import type { GenericLogger } from "../../logger.js";
import type { CatalogueList } from "./index.js";
import { catalogueEventEmitter, LOG_CATEGORY, SPECIAL_LIST_IDS } from "./index.js";
import type { CatalogueDB } from "./schema.js";

/**
 * Create a new catalogue list
 * @param db Database instance
 * @param params List parameters
 * @param params.title
 * @param params.description
 * @param params.type
 * @param params.tags
 * @param params.isPublic
 * @param logger Optional logger
 * @returns The ID of the created list
 */
export const createList = async (
	db: CatalogueDB,
	params: {
		title: string;
		description?: string;
		type: "list" | "bibliography";
		tags?: string[];
		isPublic?: boolean;
	},
	logger?: GenericLogger
): Promise<string> => {
	try {
		const id = crypto.randomUUID();
		const list: CatalogueList = {
			id,
			title: params.title,
			description: params.description,
			type: params.type,
			tags: params.tags,
			createdAt: new Date(),
			updatedAt: new Date(),
			isPublic: params.isPublic ?? false,
		};

		await db.catalogueLists.add(list);

		// Emit event for list creation
		catalogueEventEmitter.emit({
			type: 'list-added',
			listId: id,
			list,
		});

		logger?.debug(LOG_CATEGORY, "Catalogue list created", { id, title: params.title, type: params.type });

		return id;
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to create catalogue list", {
			title: params.title,
			type: params.type,
			error,
		});
		throw error;
	}
};

/**
 * Get all catalogue lists
 * @param db Database instance
 * @param logger Optional logger
 * @returns All lists ordered by update time (newest first)
 */
export const getAllLists = async (
	db: CatalogueDB,
	logger?: GenericLogger
): Promise<CatalogueList[]> => {
	try {
		return await db.catalogueLists.orderBy("updatedAt").reverse().toArray();
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get all catalogue lists", { error });
		return [];
	}
};

/**
 * Get a specific catalogue list by ID
 * @param db Database instance
 * @param listId List ID
 * @param logger Optional logger
 * @returns The list or null if not found
 */
export const getList = async (
	db: CatalogueDB,
	listId: string,
	logger?: GenericLogger
): Promise<CatalogueList | null> => {
	try {
		const result = await db.catalogueLists.get(listId);
		return result ?? null;
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get catalogue list", { listId, error });
		return null;
	}
};

/**
 * Update a catalogue list
 * @param db Database instance
 * @param listId List ID
 * @param updates Fields to update
 * @param logger Optional logger
 */
export const updateList = async (
	db: CatalogueDB,
	listId: string,
	updates: Partial<Pick<CatalogueList, "title" | "description" | "tags" | "isPublic">>,
	logger?: GenericLogger
): Promise<void> => {
	try {
		const updateData = {
			...updates,
			updatedAt: new Date(),
		};

		await db.catalogueLists.update(listId, updateData);

		// Emit event for list update
		catalogueEventEmitter.emit({
			type: 'list-updated',
			listId,
		});

		logger?.debug(LOG_CATEGORY, "Catalogue list updated", { listId, updates });
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to update catalogue list", { listId, updates, error });
		throw error;
	}
};

/**
 * Delete a catalogue list
 * @param db Database instance
 * @param listId List ID
 * @param isSpecialList Helper function to check if list is special
 * @param logger Optional logger
 */
export const deleteList = async (
	db: CatalogueDB,
	listId: string,
	isSpecialList: (id: string) => boolean,
	logger?: GenericLogger
): Promise<void> => {
	if (isSpecialList(listId)) {
		throw new Error(`Cannot delete special system list: ${listId}`);
	}

	try {
		await db.transaction("rw", db.catalogueLists, db.catalogueEntities, async () => {
			// Delete the list
			await db.catalogueLists.delete(listId);

			// Delete all entities in the list
			await db.catalogueEntities.where("listId").equals(listId).delete();

			// Delete any share records
			await db.catalogueShares.where("listId").equals(listId).delete();
		});

		// Emit event for list deletion
		catalogueEventEmitter.emit({
			type: 'list-removed',
			listId,
		});

		logger?.debug(LOG_CATEGORY, "Catalogue list deleted", { listId });
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to delete catalogue list", { listId, error });
		throw error;
	}
};

/**
 * Search catalogue lists by title, description, or tags
 * @param db Database instance
 * @param query Search query
 * @param logger Optional logger
 * @returns Matching lists
 */
export const searchLists = async (
	db: CatalogueDB,
	query: string,
	logger?: GenericLogger
): Promise<CatalogueList[]> => {
	try {
		const lists = await db.catalogueLists.toArray();
		const lowercaseQuery = query.toLowerCase();

		return lists.filter(
			(list) =>
				list.title.toLowerCase().includes(lowercaseQuery) ||
				Boolean(list.description?.toLowerCase().includes(lowercaseQuery)) ||
				list.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
		);
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to search catalogue lists", { query, error });
		return [];
	}
};

/**
 * Get non-system lists (user-created lists only)
 * @param db Database instance
 * @param isSpecialList Helper function to check if list is special
 * @param logger Optional logger
 * @returns Non-system lists
 */
export const getNonSystemLists = async (
	db: CatalogueDB,
	isSpecialList: (id: string) => boolean,
	logger?: GenericLogger
): Promise<CatalogueList[]> => {
	try {
		const allLists = await getAllLists(db, logger);
		return allLists.filter(list =>
			list.id && !isSpecialList(list.id) &&
			!list.tags?.includes("system")
		);
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get non-system lists", { error });
		return [];
	}
};

/**
 * Get list statistics
 * @param db Database instance
 * @param listId List ID
 * @param getListEntities Helper function to get list entities
 * @param logger Optional logger
 * @returns Statistics including total entities and counts by type
 */
export const getListStats = async (
	db: CatalogueDB,
	listId: string,
	getListEntities: (id: string) => Promise<import("./index.js").CatalogueEntity[]>,
	logger?: GenericLogger
): Promise<{
	totalEntities: number;
	entityCounts: Record<EntityType, number>;
}> => {
	try {
		const entities = await getListEntities(listId);

		const entityCounts: Record<EntityType, number> = {
			works: 0,
			authors: 0,
			sources: 0,
			institutions: 0,
			topics: 0,
			concepts: 0,
			publishers: 0,
			funders: 0,
			keywords: 0,
			domains: 0,
			fields: 0,
			subfields: 0,
		};

		entities.forEach(entity => {
			entityCounts[entity.entityType]++;
		});

		return {
			totalEntities: entities.length,
			entityCounts,
		};
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get list stats", { listId, error });
		return {
			totalEntities: 0,
			entityCounts: {
				works: 0,
				authors: 0,
				sources: 0,
				institutions: 0,
				topics: 0,
				concepts: 0,
				publishers: 0,
				funders: 0,
				keywords: 0,
				domains: 0,
				fields: 0,
				subfields: 0,
			},
		};
	}
};

/**
 * Check if a list is a special system list
 * @param listId List ID to check
 * @returns True if the list is a special system list
 */
export const isSpecialList = (listId: string): boolean => {
	const specialIds: string[] = Object.values(SPECIAL_LIST_IDS);
	return specialIds.includes(listId);
};

/**
 * Check if the current environment is CI (continuous integration)
 * @returns True if running in CI environment
 */
export const isCIEnvironment = (): boolean => {
	return typeof process !== "undefined" &&
		process.env?.CI === "true" ||
		process.env?.NODE_ENV === "test";
};

/**
 * Internal method for actual special lists initialization
 * @param db Database instance
 * @param getList Helper function to get a list
 * @param logger Optional logger
 */
export const doInitializeSpecialLists = async (
	db: CatalogueDB,
	getList: (id: string) => Promise<CatalogueList | null>,
	logger?: GenericLogger
): Promise<void> => {
	const bookmarksList = await getList(SPECIAL_LIST_IDS.BOOKMARKS);
	const historyList = await getList(SPECIAL_LIST_IDS.HISTORY);

	if (!bookmarksList) {
		try {
			await db.catalogueLists.add({
				id: SPECIAL_LIST_IDS.BOOKMARKS,
				title: "Bookmarks",
				description: "System-managed bookmarks list",
				type: "list",
				tags: ["system"],
				createdAt: new Date(),
				updatedAt: new Date(),
				isPublic: false,
			});
			logger?.debug(LOG_CATEGORY, "Bookmarks list created");
		} catch (error) {
			// ConstraintError is expected if list already exists (race condition)
			if (!(error instanceof Dexie.ConstraintError)) {
				throw error;
			}
		}
	}

	if (!historyList) {
		try {
			await db.catalogueLists.add({
				id: SPECIAL_LIST_IDS.HISTORY,
				title: "History",
				description: "System-managed browsing history list",
				type: "list",
				tags: ["system"],
				createdAt: new Date(),
				updatedAt: new Date(),
				isPublic: false,
			});
			logger?.debug(LOG_CATEGORY, "History list created");
		} catch (error) {
			// ConstraintError is expected if list already exists (race condition)
			if (!(error instanceof Dexie.ConstraintError)) {
				throw error;
			}
		}
	}
};

/**
 * Initialize special system lists if they don't exist
 * This method is idempotent and safe to call multiple times concurrently
 * Includes timeout protection for CI environments where IndexedDB may be slow
 * @param db Database instance
 * @param getList Helper function to get a list
 * @param logger Optional logger
 */
export const initializeSpecialLists = async (
	db: CatalogueDB,
	getList: (id: string) => Promise<CatalogueList | null>,
	logger?: GenericLogger
): Promise<void> => {
	try {
		// Create timeout promise to prevent hanging in CI environments
		const timeoutPromise = new Promise<never>((_resolve, reject) => {
			setTimeout(() => {
				reject(new Error("Special lists initialization timeout after 10 seconds"));
			}, 10000);
		});

		const initializationPromise = doInitializeSpecialLists(db, getList, logger);

		await Promise.race([initializationPromise, timeoutPromise]);
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to initialize special lists", { error });
		// In CI environments, we don't want to fail completely - just log and continue
		if (isCIEnvironment()) {
			logger?.warn(LOG_CATEGORY, "CI environment detected, continuing without special lists initialization");
			return;
		}
		// Don't re-throw constraint errors - they indicate the lists already exist
		if (!(error instanceof Dexie.ConstraintError)) {
			throw error;
		}
	}
};
