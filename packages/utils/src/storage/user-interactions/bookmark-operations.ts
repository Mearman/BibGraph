/**
 * Bookmark Operations Helper
 *
 * Core CRUD operations for bookmarks, extracted from UserInteractionsService.
 * Handles individual bookmark operations: create, read, update, delete, search.
 */

import type { GenericLogger } from "../../logger.js"
import type { UserInteractionsDB } from "./schema.js"
import {
	bookmarkEventEmitter,
	type BookmarkRecord,
	type StoredNormalizedRequest
} from "./types.js"

const LOG_CATEGORY = "user-interactions"

/**
 * Check if a request is bookmarked by cache key
 * @param db
 * @param cacheKey
 * @param logger
 */
export const isRequestBookmarked = async (db: UserInteractionsDB, cacheKey: string, logger?: GenericLogger): Promise<boolean> => {
	try {
		const count = await db.bookmarks.where("request.cacheKey").equals(cacheKey).count()
		return count > 0
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to check bookmark status", {
			cacheKey,
			error,
		})
		return false
	}
};

/**
 * Check if a request is bookmarked by hash
 * @param db
 * @param hash
 * @param logger
 */
export const isRequestBookmarkedByHash = async (db: UserInteractionsDB, hash: string, logger?: GenericLogger): Promise<boolean> => {
	try {
		const count = await db.bookmarks.where("request.hash").equals(hash).count()
		return count > 0
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to check bookmark status by hash", {
			hash,
			error,
		})
		return false
	}
};

/**
 * Get bookmark by cache key
 * @param db
 * @param cacheKey
 * @param logger
 */
export const getBookmark = async (db: UserInteractionsDB, cacheKey: string, logger?: GenericLogger): Promise<BookmarkRecord | null> => {
	try {
		const bookmark = await db.bookmarks.where("request.cacheKey").equals(cacheKey).first()
		return bookmark ?? null
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get bookmark by cache key", {
			cacheKey,
			error: error instanceof Error ? error : new Error(String(error)),
		})
		return null
	}
};

/**
 * Get bookmark by hash
 * @param db
 * @param hash
 * @param logger
 */
export const getBookmarkByHash = async (db: UserInteractionsDB, hash: string, logger?: GenericLogger): Promise<BookmarkRecord | null> => {
	try {
		const bookmark = await db.bookmarks.where("request.hash").equals(hash).first()
		return bookmark ?? null
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get bookmark by hash", {
			hash,
			error,
		})
		return null
	}
};

/**
 * Add a bookmark for a normalized request
 * @param db
 * @param params
 * @param params.request
 * @param params.title
 * @param params.notes
 * @param params.tags
 * @param logger
 */
export const addBookmark = async (db: UserInteractionsDB, params: {
		request: StoredNormalizedRequest
		title: string
		notes?: string
		tags?: string[]
	}, logger?: GenericLogger): Promise<number> => {
	const { request, title, notes, tags } = params
	try {
		const bookmark: BookmarkRecord = {
			request: {
				...request,
				params: typeof request.params === 'string' ? request.params : JSON.stringify(request.params),
			},
			title,
			notes,
			tags,
			timestamp: new Date(),
		}

		const id: number = await db.bookmarks.add(bookmark)

		// Emit event for bookmark addition
		bookmarkEventEmitter.emit({
			type: 'added',
			bookmark: { ...bookmark, id }
		});

		logger?.debug(LOG_CATEGORY, "Bookmark added", {
			id,
			cacheKey: request.cacheKey,
			title,
		})

		return id
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to add bookmark", {
			cacheKey: request.cacheKey,
			title,
			error,
		})
		throw error
	}
};

/**
 * Get all bookmarks ordered by timestamp (newest first)
 * @param db
 * @param logger
 */
export const getAllBookmarks = async (db: UserInteractionsDB, logger?: GenericLogger): Promise<BookmarkRecord[]> => {
	try {
		return await db.bookmarks.orderBy("timestamp").reverse().toArray()
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to get all bookmarks", {
			error,
		})
		return []
	}
};

/**
 * Remove a bookmark by ID
 * @param db
 * @param bookmarkId
 * @param logger
 */
export const removeBookmark = async (db: UserInteractionsDB, bookmarkId: number, logger?: GenericLogger): Promise<void> => {
	try {
		await db.bookmarks.delete(bookmarkId)

		// Emit event for bookmark removal
		bookmarkEventEmitter.emit({
			type: 'removed',
			bookmarkIds: [bookmarkId]
		});

		logger?.debug(LOG_CATEGORY, "Bookmark removed", {
			bookmarkId,
		})
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to remove bookmark", {
			bookmarkId,
			error,
		})
		throw error
	}
};

/**
 * Update a bookmark's title, notes, or tags
 * @param db
 * @param params
 * @param params.bookmarkId
 * @param params.updates
 * @param logger
 */
export const updateBookmark = async (db: UserInteractionsDB, params: {
		bookmarkId: number
		updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>
	}, logger?: GenericLogger): Promise<void> => {
	const { bookmarkId, updates } = params
	try {
		await db.bookmarks.update(bookmarkId, updates)

		logger?.debug(LOG_CATEGORY, "Bookmark updated", {
			bookmarkId,
			updates,
		})
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to update bookmark", {
			bookmarkId,
			updates,
			error,
		})
		throw error
	}
};

/**
 * Search bookmarks by title, notes, or tags
 * @param db
 * @param query
 * @param logger
 */
export const searchBookmarks = async (db: UserInteractionsDB, query: string, logger?: GenericLogger): Promise<BookmarkRecord[]> => {
	try {
		const bookmarks = await db.bookmarks.toArray()

		const lowercaseQuery = query.toLowerCase()

		return bookmarks.filter(
			(bookmark) =>
				bookmark.title.toLowerCase().includes(lowercaseQuery) ||
				Boolean(bookmark.notes?.toLowerCase().includes(lowercaseQuery)) ||
				bookmark.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
		)
	} catch (error) {
		logger?.error(LOG_CATEGORY, "Failed to search bookmarks", {
			query,
			error,
		})
		return []
	}
};
