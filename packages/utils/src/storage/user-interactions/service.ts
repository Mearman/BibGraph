/**
 * User Interactions Service
 *
 * High-level service for managing page visits and bookmarks.
 * Provides business logic for tracking user interactions with OpenAlex entities.
 */

import type { GenericLogger } from "../../logger.js"
import {
	bookmarkEventEmitter,
	type BookmarkRecord,
	type PageVisitRecord,
	type StoredNormalizedRequest
} from "./types.js"
import { getDB, type UserInteractionsDB } from "./schema.js"

// Constants for logging
const LOG_CATEGORY = "user-interactions"

/**
 * Service for managing user page visits and bookmarks
 */
export class UserInteractionsService {
	private db: UserInteractionsDB
	private logger?: GenericLogger

	constructor(logger?: GenericLogger) {
		this.db = getDB()
		this.logger = logger
	}

	/**
	 * Record a page visit with normalized OpenAlex request
	 * @param root0
	 * @param root0.request
	 * @param root0.metadata
	 * @param root0.metadata.sessionId
	 * @param root0.metadata.referrer
	 * @param root0.metadata.duration
	 * @param root0.metadata.cached
	 * @param root0.metadata.bytesSaved
	 */
	async recordPageVisit({
		request,
		metadata,
	}: {
		request: StoredNormalizedRequest
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}): Promise<void> {
		try {
			const pageVisit: PageVisitRecord = {
				request: {
					...request,
					params: typeof request.params === 'string' ? request.params : JSON.stringify(request.params),
				},
				timestamp: new Date(),
				sessionId: metadata?.sessionId,
				referrer: metadata?.referrer,
				duration: metadata?.duration,
				cached: metadata?.cached ?? false,
				bytesSaved: metadata?.bytesSaved,
			}

			await this.db.pageVisits.add(pageVisit)

			this.logger?.debug(LOG_CATEGORY, "Page visit recorded", {
				cacheKey: request.cacheKey,
				cached: pageVisit.cached,
				duration: pageVisit.duration,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to record page visit", {
				cacheKey: request.cacheKey,
				error,
			})
		}
	}

	/**
	 * Get recent page visits across all pages
	 * @param limit
	 */
	async getRecentPageVisits(limit = 50): Promise<PageVisitRecord[]> {
		try {
			return await this.db.pageVisits.orderBy("timestamp").reverse().limit(limit).toArray()
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get recent page visits", {
				error,
			})
			return []
		}
	}

	/**
	 * Check if a request is bookmarked
	 * @param cacheKey - The cache key from the normalized request
	 */
	async isRequestBookmarked(cacheKey: string): Promise<boolean> {
		try {
			const count = await this.db.bookmarks.where("request.cacheKey").equals(cacheKey).count()

			return count > 0
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to check bookmark status", {
				cacheKey,
				error,
			})
			return false
		}
	}

	/**
	 * Check if a request is bookmarked by hash
	 * @param hash - The hash from the normalized request
	 */
	async isRequestBookmarkedByHash(hash: string): Promise<boolean> {
		try {
			const count = await this.db.bookmarks.where("request.hash").equals(hash).count()

			return count > 0
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to check bookmark status by hash", {
				hash,
				error,
			})
			return false
		}
	}

	/**
	 * Get bookmark by cache key
	 * @param cacheKey
	 */
	async getBookmark(cacheKey: string): Promise<BookmarkRecord | null> {
		try {
			const bookmark = await this.db.bookmarks.where("request.cacheKey").equals(cacheKey).first()

			return bookmark ?? null
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get bookmark by cache key", {
				cacheKey,
				error: error instanceof Error ? error : new Error(String(error)),
			})
			return null
		}
	}

	/**
	 * Get bookmark by hash
	 * @param hash
	 */
	async getBookmarkByHash(hash: string): Promise<BookmarkRecord | null> {
		try {
			const bookmark = await this.db.bookmarks.where("request.hash").equals(hash).first()

			return bookmark ?? null
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get bookmark by hash", {
				hash,
				error,
			})
			return null
		}
	}

	/**
	 * Add a bookmark for a normalized request
	 * @param root0
	 * @param root0.request
	 * @param root0.title
	 * @param root0.notes
	 * @param root0.tags
	 */
	async addBookmark({
		request,
		title,
		notes,
		tags,
	}: {
		request: StoredNormalizedRequest
		title: string
		notes?: string
		tags?: string[]
	}): Promise<number> {
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

			const id: number = await this.db.bookmarks.add(bookmark)

			// Emit event for bookmark addition
			bookmarkEventEmitter.emit({
				type: 'added',
				bookmark: { ...bookmark, id }
			});

			this.logger?.debug(LOG_CATEGORY, "Bookmark added", {
				id,
				cacheKey: request.cacheKey,
				title,
			})

			return id
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to add bookmark", {
				cacheKey: request.cacheKey,
				title,
				error,
			})
			throw error
		}
	}

	/**
	 * Get all bookmarks
	 */
	async getAllBookmarks(): Promise<BookmarkRecord[]> {
		try {
			return await this.db.bookmarks.orderBy("timestamp").reverse().toArray()
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get all bookmarks", {
				error,
			})
			return []
		}
	}

	/**
	 * Remove a bookmark
	 * @param bookmarkId
	 */
	async removeBookmark(bookmarkId: number): Promise<void> {
		try {
			await this.db.bookmarks.delete(bookmarkId)

			// Emit event for bookmark removal
			bookmarkEventEmitter.emit({
				type: 'removed',
				bookmarkIds: [bookmarkId]
			});

			this.logger?.debug(LOG_CATEGORY, "Bookmark removed", {
				bookmarkId,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to remove bookmark", {
				bookmarkId,
				error,
			})
			throw error
		}
	}

	/**
	 * Update a bookmark
	 * @param root0
	 * @param root0.bookmarkId
	 * @param root0.updates
	 */
	async updateBookmark({
		bookmarkId,
		updates,
	}: {
		bookmarkId: number
		updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>
	}): Promise<void> {
		try {
			await this.db.bookmarks.update(bookmarkId, updates)

			this.logger?.debug(LOG_CATEGORY, "Bookmark updated", {
				bookmarkId,
				updates,
			})
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to update bookmark", {
				bookmarkId,
				updates,
				error,
			})
			throw error
		}
	}

	/**
	 * Search bookmarks by title, notes, or tags
	 * @param query
	 */
	async searchBookmarks(query: string): Promise<BookmarkRecord[]> {
		try {
			const bookmarks = await this.db.bookmarks.toArray()

			const lowercaseQuery = query.toLowerCase()

			return bookmarks.filter(
				(bookmark) =>
					bookmark.title.toLowerCase().includes(lowercaseQuery) ||
					Boolean(bookmark.notes?.toLowerCase().includes(lowercaseQuery)) ||
					bookmark.tags?.some((tag) => tag.toLowerCase().includes(lowercaseQuery))
			)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to search bookmarks", {
				query,
				error,
			})
			return []
		}
	}

	/**
	 * Check if an entity is bookmarked
	 * @param root0
	 * @param root0.entityId
	 * @param root0.entityType
	 */
	async isEntityBookmarked({
		entityId,
		entityType,
	}: {
		entityId: string
		entityType: string
	}): Promise<boolean> {
		const cacheKey = `/${entityType}/${entityId}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a search is bookmarked
	 * @param root0
	 * @param root0.searchQuery
	 * @param root0.filters
	 */
	async isSearchBookmarked({
		searchQuery,
	}: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<boolean> {
		const cacheKey = `/search?q=${searchQuery}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a list is bookmarked
	 * @param url - The list URL
	 */
	async isListBookmarked(url: string): Promise<boolean> {
		return this.isRequestBookmarked(url)
	}

	/**
	 * Get entity bookmark
	 * @param root0
	 * @param root0.entityId
	 * @param root0.entityType
	 */
	async getEntityBookmark({
		entityId,
		entityType,
	}: {
		entityId: string
		entityType: string
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/${entityType}/${entityId}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get search bookmark
	 * @param root0
	 * @param root0.searchQuery
	 * @param root0.filters
	 */
	async getSearchBookmark({
		searchQuery,
	}: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/search?q=${searchQuery}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get list bookmark
	 * @param url - The list URL
	 */
	async getListBookmark(url: string): Promise<BookmarkRecord | null> {
		return this.getBookmark(url)
	}

	/**
	 * Add list bookmark
	 * @param url - The list URL
	 * @param title - The bookmark title
	 * @param notes - Optional notes
	 * @param tags - Optional tags
	 */
	async addListBookmark(
		url: string,
		title: string,
		notes?: string,
		tags?: string[]
	): Promise<number> {
		const { createApiUrlRequest } = await import("./path-utilities.js")
		const request = createApiUrlRequest(
			url,
			{},
			url.slice(0, 16)
		)

		return this.addBookmark({
			request,
			title,
			notes,
			tags,
		})
	}

	/**
	 * Get page visit statistics (legacy format for compatibility)
	 */
	async getPageVisitStatsLegacy(): Promise<{
		totalVisits: number
		uniqueRequests: number
		byEndpoint: Record<string, number>
	}> {
		const stats = await this.getPageVisitStats()
		return {
			totalVisits: stats.totalVisits,
			uniqueRequests: stats.uniqueRequests,
			byEndpoint: stats.byEndpoint,
		}
	}

	/**
	 * Record page visit (legacy format for compatibility)
	 * @param root0
	 * @param root0.cacheKey
	 * @param root0.metadata
	 * @param root0.metadata.sessionId
	 * @param root0.metadata.referrer
	 * @param root0.metadata.duration
	 * @param root0.metadata.cached
	 * @param root0.metadata.bytesSaved
	 */
	async recordPageVisitLegacy({
		cacheKey,
		metadata,
	}: {
		cacheKey: string
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}): Promise<void> {
		const { createApiUrlRequest } = await import("./path-utilities.js")
		const request = createApiUrlRequest(
			cacheKey,
			{},
			cacheKey.slice(0, 16)
		)

		return this.recordPageVisit({ request, metadata })
	}

	/**
	 * Get page visit statistics
	 */
	async getPageVisitStats(): Promise<{
		totalVisits: number
		uniqueRequests: number
		byEndpoint: Record<string, number>
		mostVisitedRequest: {
			cacheKey: string
			count: number
		} | null
		cacheHitRate: number
	}> {
		try {
			const visits = await this.db.pageVisits.toArray()

			const totalVisits = visits.length

			const requestCounts = new Map<string, number>()
			const endpointCounts: Record<string, number> = {}
			let cachedCount = 0

			visits.forEach((visit) => {
				// Count by cache key
				const count = requestCounts.get(visit.request.cacheKey) ?? 0
				requestCounts.set(visit.request.cacheKey, count + 1)

				// Count by endpoint
				const { endpoint } = visit.request
				endpointCounts[endpoint] = (endpointCounts[endpoint] ?? 0) + 1

				// Count cached visits
				if (visit.cached) {
					cachedCount++
				}
			})

			const uniqueRequests = requestCounts.size

			let mostVisitedRequest: {
				cacheKey: string
				count: number
			} | null = null
			for (const [cacheKey, count] of requestCounts) {
				if (!mostVisitedRequest || count > mostVisitedRequest.count) {
					mostVisitedRequest = { cacheKey, count }
				}
			}

			const cacheHitRate = totalVisits > 0 ? cachedCount / totalVisits : 0

			return {
				totalVisits,
				uniqueRequests,
				byEndpoint: endpointCounts,
				mostVisitedRequest,
				cacheHitRate,
			}
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get page visit stats", {
				error,
			})
			return {
				totalVisits: 0,
				uniqueRequests: 0,
				byEndpoint: {},
				mostVisitedRequest: null,
				cacheHitRate: 0,
			}
		}
	}

	/**
	 * Get page visits by endpoint pattern
	 * @param endpointPattern
	 * @param limit
	 */
	async getPageVisitsByEndpoint(endpointPattern: string, limit = 20): Promise<PageVisitRecord[]> {
		try {
			const allVisits = await this.db.pageVisits.orderBy("timestamp").reverse().toArray()

			return allVisits
				.filter((visit) => visit.request.endpoint.includes(endpointPattern))
				.slice(0, limit)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get page visits by endpoint", {
				endpointPattern,
				error,
			})
			return []
		}
	}

	/**
	 * Get popular requests from page visits
	 * @param limit
	 */
	async getPopularRequests(
		limit = 10
	): Promise<{ cacheKey: string; endpoint: string; count: number }[]> {
		try {
			const visits = await this.db.pageVisits.toArray()

			const requestCounts = new Map<string, { cacheKey: string; endpoint: string; count: number }>()

			visits.forEach((visit) => {
				const { cacheKey, endpoint } = visit.request
				const existing = requestCounts.get(cacheKey)

				if (existing) {
					existing.count++
				} else {
					requestCounts.set(cacheKey, { cacheKey, endpoint, count: 1 })
				}
			})

			return [...requestCounts.values()]
				.sort((a, b) => b.count - a.count)
				.slice(0, limit)
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to get popular requests", {
				error,
			})
			return []
		}
	}

	/**
	 * Remove multiple bookmarks in bulk
	 * @param bookmarkIds
	 */
	async removeBookmarks(bookmarkIds: number[]): Promise<{ success: number; failed: number }> {
		this.logger?.debug(LOG_CATEGORY, "removeBookmarks service called with:", bookmarkIds);
		let success = 0
		let failed = 0
		const successfullyDeletedIds: number[] = [];

		try {
			// Use a transaction for bulk deletion
			await this.db.transaction("rw", this.db.bookmarks, async () => {
				for (const bookmarkId of bookmarkIds) {
					try {
						this.logger?.debug(LOG_CATEGORY, "Deleting bookmark ID:", bookmarkId);
						await this.db.bookmarks.delete(bookmarkId)
						this.logger?.debug(LOG_CATEGORY, "Successfully deleted bookmark ID:", bookmarkId);
						successfullyDeletedIds.push(bookmarkId);
						success++
					} catch (error) {
						this.logger?.error(LOG_CATEGORY, "Failed to delete bookmark ID:", { bookmarkId, error });
						failed++
						this.logger?.warn(LOG_CATEGORY, "Failed to delete bookmark in bulk operation", {
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

			this.logger?.debug(LOG_CATEGORY, "Bulk bookmark removal completed", {
				totalRequested: bookmarkIds.length,
				success,
				failed,
			})

			this.logger?.debug(LOG_CATEGORY, "Bulk removal completed with result:", { success, failed });
			return { success, failed }
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Bulk removal transaction failed:", error);
			this.logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark removal", {
				bookmarkIds,
				error,
			})
			throw error
		}
	}

	/**
	 * Update tags for multiple bookmarks in bulk
	 * @param root0
	 * @param root0.bookmarkIds
	 * @param root0.addTags
	 * @param root0.removeTags
	 * @param root0.replaceTags
	 */
	async updateBookmarkTags({
		bookmarkIds,
		addTags,
		removeTags,
		replaceTags,
	}: {
		bookmarkIds: number[]
		addTags?: string[]
		removeTags?: string[]
		replaceTags?: string[]
	}): Promise<{ success: number; failed: number }> {
		let success = 0
		let failed = 0

		try {
			// Use a transaction for bulk updates
			await this.db.transaction("rw", this.db.bookmarks, async () => {
				for (const bookmarkId of bookmarkIds) {
					try {
						const bookmark = await this.db.bookmarks.get(bookmarkId)
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
						await this.db.bookmarks.update(bookmarkId, { tags: updatedTags })
						success++
					} catch (error) {
						failed++
						this.logger?.warn(LOG_CATEGORY, "Failed to update bookmark tags in bulk operation", {
							bookmarkId,
							error,
						})
					}
				}
			})

			this.logger?.debug(LOG_CATEGORY, "Bulk bookmark tag update completed", {
				totalRequested: bookmarkIds.length,
				success,
				failed,
				addTags,
				removeTags,
				replaceTags,
			})

			return { success, failed }
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark tag update", {
				bookmarkIds,
				addTags,
				removeTags,
				replaceTags,
				error,
			})
			throw error
		}
	}

	/**
	 * Update notes for multiple bookmarks in bulk
	 * @param root0
	 * @param root0.bookmarkIds
	 * @param root0.notes
	 * @param root0.action
	 */
	async updateBookmarkNotes({
		bookmarkIds,
		notes,
		action,
	}: {
		bookmarkIds: number[]
		notes?: string
		action?: "replace" | "append" | "prepend"
	}): Promise<{ success: number; failed: number }> {
		let success = 0
		let failed = 0

		try {
			// Use a transaction for bulk updates
			await this.db.transaction("rw", this.db.bookmarks, async () => {
				for (const bookmarkId of bookmarkIds) {
					try {
						const bookmark = await this.db.bookmarks.get(bookmarkId)
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
						await this.db.bookmarks.update(bookmarkId, { notes: updatedNotes })
						success++
					} catch (error) {
						failed++
						this.logger?.warn(LOG_CATEGORY, "Failed to update bookmark notes in bulk operation", {
							bookmarkId,
							error,
						})
					}
				}
			})

			this.logger?.debug(LOG_CATEGORY, "Bulk bookmark notes update completed", {
				totalRequested: bookmarkIds.length,
				success,
				failed,
				action,
			})

			return { success, failed }
		} catch (error) {
			this.logger?.error(LOG_CATEGORY, "Failed to perform bulk bookmark notes update", {
				bookmarkIds,
				notes,
				action,
				error,
			})
			throw error
		}
	}
}

// Export singleton instance
export const userInteractionsService: UserInteractionsService = new UserInteractionsService()
