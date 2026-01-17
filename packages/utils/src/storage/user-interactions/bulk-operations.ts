/**
 * Bulk Operations Helper
 *
 * Bulk update and delete operations for bookmarks, extracted from UserInteractionsService.
 * Handles transactional bulk operations with proper error handling.
 */

import type { GenericLogger } from "../../logger.js"
import type { UserInteractionsDB } from "./schema.js"
import { bookmarkEventEmitter } from "./types.js"

const LOG_CATEGORY = "user-interactions"

/**
 * Result type for bulk operations
 */
export interface BulkOperationResult {
	success: number
	failed: number
}

/**
 * Remove multiple bookmarks in bulk
 * @param db
 * @param bookmarkIds
 * @param logger
 */
export const removeBookmarks = async (db: UserInteractionsDB, bookmarkIds: number[], logger?: GenericLogger): Promise<BulkOperationResult> => {
	logger?.debug(LOG_CATEGORY, "removeBookmarks service called with:", bookmarkIds);
	let success = 0
	let failed = 0
	const successfullyDeletedIds: number[] = [];

	try {
		// Use a transaction for bulk deletion
		await db.transaction("rw", db.bookmarks, async () => {
			for (const bookmarkId of bookmarkIds) {
				try {
					logger?.debug(LOG_CATEGORY, "Deleting bookmark ID:", bookmarkId);
					await db.bookmarks.delete(bookmarkId)
					logger?.debug(LOG_CATEGORY, "Successfully deleted bookmark ID:", bookmarkId);
					successfullyDeletedIds.push(bookmarkId);
					success++
				} catch (error) {
					logger?.error(LOG_CATEGORY, "Failed to delete bookmark ID:", { bookmarkId, error });
					failed++
					logger?.warn(LOG_CATEGORY, "Failed to delete bookmark in bulk operation", {
						bookmarkId,
						error,
					})
				}
			}
		})

		// Emit event for bulk bookmark removal if any were deleted
		if (successfullyDeletedIds.length > 0) {
			bookmarkEventEmitter.emit({
				type: 'removed',
				bookmarkIds: successfullyDeletedIds
			});
		}

		logger?.debug(LOG_CATEGORY, "Bulk bookmark removal completed", {
			totalRequested: bookmarkIds.length,
			success,
			failed,
		})

		logger?.debug(LOG_CATEGORY, "Bulk removal completed with result:", { success, failed });
		return { success, failed }
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Bulk removal transaction failed:", error);
		logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark removal", {
			bookmarkIds,
			error,
		})
		throw error
	}
};

/**
 * Update tags for multiple bookmarks in bulk
 * @param db
 * @param params
 * @param params.bookmarkIds
 * @param params.addTags
 * @param params.removeTags
 * @param params.replaceTags
 * @param logger
 */
export const updateBookmarkTags = async (db: UserInteractionsDB, params: {
		bookmarkIds: number[]
		addTags?: string[]
		removeTags?: string[]
		replaceTags?: string[]
	}, logger?: GenericLogger): Promise<BulkOperationResult> => {
	const { bookmarkIds, addTags, removeTags, replaceTags } = params
	let success = 0
	let failed = 0

	try {
		// Use a transaction for bulk updates
		await db.transaction("rw", db.bookmarks, async () => {
			for (const bookmarkId of bookmarkIds) {
				try {
					const bookmark = await db.bookmarks.get(bookmarkId)
					if (!bookmark) {
						failed++
						continue
					}

					let updatedTags: string[] = []

					if (replaceTags === undefined) {
						// Start with existing tags
						updatedTags = [...(bookmark.tags || [])]

						// Add new tags
						if (addTags) {
							addTags.forEach(tag => {
								if (!updatedTags.includes(tag)) {
									updatedTags.push(tag)
								}
							})
						}

						// Remove tags
						if (removeTags) {
							updatedTags = updatedTags.filter(tag => !removeTags.includes(tag))
						}
					} else {
						// Replace all tags
						updatedTags = replaceTags
					}

					// Update the bookmark
					await db.bookmarks.update(bookmarkId, { tags: updatedTags })
					success++
				} catch (error) {
					failed++
					logger?.warn(LOG_CATEGORY, "Failed to update bookmark tags in bulk operation", {
						bookmarkId,
						error,
					})
				}
			}
		})

		logger?.debug(LOG_CATEGORY, "Bulk bookmark tag update completed", {
			totalRequested: bookmarkIds.length,
			success,
			failed,
			addTags,
			removeTags,
			replaceTags,
		})

		return { success, failed }
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark tag update", {
			bookmarkIds,
			addTags,
			removeTags,
			replaceTags,
			error,
		})
		throw error
	}
};

/**
 * Update notes for multiple bookmarks in bulk
 * @param db
 * @param params
 * @param params.bookmarkIds
 * @param params.notes
 * @param params.action
 * @param logger
 */
export const updateBookmarkNotes = async (db: UserInteractionsDB, params: {
		bookmarkIds: number[]
		notes?: string
		action?: "replace" | "append" | "prepend"
	}, logger?: GenericLogger): Promise<BulkOperationResult> => {
	const { bookmarkIds, notes, action } = params
	let success = 0
	let failed = 0

	try {
		// Use a transaction for bulk updates
		await db.transaction("rw", db.bookmarks, async () => {
			for (const bookmarkId of bookmarkIds) {
				try {
					const bookmark = await db.bookmarks.get(bookmarkId)
					if (!bookmark) {
						failed++
						continue
					}

					let updatedNotes: string

					if (action === "replace" || notes === undefined) {
						updatedNotes = notes || ""
					} else if (action === "append") {
						updatedNotes = (bookmark.notes || "") + (bookmark.notes ? "\n" : "") + notes
					} else if (action === "prepend") {
						updatedNotes = notes + (bookmark.notes ? "\n" : "") + (bookmark.notes || "")
					} else {
						updatedNotes = notes
					}

					// Update the bookmark
					await db.bookmarks.update(bookmarkId, { notes: updatedNotes })
					success++
				} catch (error) {
					failed++
					logger?.warn(LOG_CATEGORY, "Failed to update bookmark notes in bulk operation", {
						bookmarkId,
						error,
					})
				}
			}
		})

		logger?.debug(LOG_CATEGORY, "Bulk bookmark notes update completed", {
			totalRequested: bookmarkIds.length,
			success,
			failed,
			action,
		})

		return { success, failed }
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark notes update", {
			bookmarkIds,
			notes,
			action,
			error,
		})
		throw error
	}
};
