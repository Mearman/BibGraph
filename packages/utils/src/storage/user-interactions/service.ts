/**
 * User Interactions Service
 *
 * High-level service for managing page visits and bookmarks.
 * Provides business logic for tracking user interactions with OpenAlex entities.
 *
 * This service delegates to helper modules for core operations:
 * - bookmark-operations.ts: CRUD operations for bookmarks
 * - page-visit-operations.ts: Page visit recording and statistics
 * - bulk-operations.ts: Bulk update/delete operations
 */

import type { GenericLogger } from "../../logger.js"
import {
	addBookmark as addBookmarkOp,
	getAllBookmarks as getAllBookmarksOp,
	getBookmark as getBookmarkOp,
	getBookmarkByHash as getBookmarkByHashOp,
	isRequestBookmarked as isRequestBookmarkedOp,
	isRequestBookmarkedByHash as isRequestBookmarkedByHashOp,
	removeBookmark as removeBookmarkOp,
	searchBookmarks as searchBookmarksOp,
	updateBookmark as updateBookmarkOp,
} from "./bookmark-operations.js"
import {
	removeBookmarks as removeBookmarksOp,
	updateBookmarkNotes as updateBookmarkNotesOp,
	updateBookmarkTags as updateBookmarkTagsOp,
} from "./bulk-operations.js"
import {
	getPageVisitsByEndpoint as getPageVisitsByEndpointOp,
	getPageVisitStats as getPageVisitStatsOp,
	getPopularRequests as getPopularRequestsOp,
	getRecentPageVisits as getRecentPageVisitsOp,
	recordPageVisit as recordPageVisitOp,
} from "./page-visit-operations.js"
import { getDB, type UserInteractionsDB } from "./schema.js"
import type {
	BookmarkRecord,
	PageVisitRecord,
	StoredNormalizedRequest
} from "./types.js"

// Default limits for queries
const DEFAULT_PAGE_VISIT_LIMIT = 50
const DEFAULT_ENDPOINT_VISIT_LIMIT = 20
const DEFAULT_POPULAR_REQUESTS_LIMIT = 10

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

	// ============================================================
	// Page Visit Operations
	// ============================================================

	/**
	 * Record a page visit with normalized OpenAlex request
	 * @param params
	 * @param params.request
	 * @param params.metadata
	 * @param params.metadata.sessionId
	 * @param params.metadata.referrer
	 * @param params.metadata.duration
	 * @param params.metadata.cached
	 * @param params.metadata.bytesSaved
	 */
	async recordPageVisit(params: {
		request: StoredNormalizedRequest
		metadata?: {
			sessionId?: string
			referrer?: string
			duration?: number
			cached?: boolean
			bytesSaved?: number
		}
	}): Promise<void> {
		return recordPageVisitOp(this.db, params, this.logger)
	}

	/**
	 * Get recent page visits across all pages
	 * @param limit
	 */
	async getRecentPageVisits(limit = DEFAULT_PAGE_VISIT_LIMIT): Promise<PageVisitRecord[]> {
		return getRecentPageVisitsOp(this.db, limit, this.logger)
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
		return getPageVisitStatsOp(this.db, this.logger)
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
	 * @param params
	 * @param params.cacheKey
	 * @param params.metadata
	 * @param params.metadata.sessionId
	 * @param params.metadata.referrer
	 * @param params.metadata.duration
	 * @param params.metadata.cached
	 * @param params.metadata.bytesSaved
	 */
	async recordPageVisitLegacy(params: {
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
			params.cacheKey,
			{},
			params.cacheKey.slice(0, 16)
		)

		return this.recordPageVisit({ request, metadata: params.metadata })
	}

	/**
	 * Get page visits by endpoint pattern
	 * @param endpointPattern
	 * @param limit
	 */
	async getPageVisitsByEndpoint(
		endpointPattern: string,
		limit = DEFAULT_ENDPOINT_VISIT_LIMIT
	): Promise<PageVisitRecord[]> {
		return getPageVisitsByEndpointOp(this.db, endpointPattern, limit, this.logger)
	}

	/**
	 * Get popular requests from page visits
	 * @param limit
	 */
	async getPopularRequests(
		limit = DEFAULT_POPULAR_REQUESTS_LIMIT
	): Promise<{ cacheKey: string; endpoint: string; count: number }[]> {
		return getPopularRequestsOp(this.db, limit, this.logger)
	}

	// ============================================================
	// Bookmark Core Operations
	// ============================================================

	/**
	 * Check if a request is bookmarked
	 * @param cacheKey
	 */
	async isRequestBookmarked(cacheKey: string): Promise<boolean> {
		return isRequestBookmarkedOp(this.db, cacheKey, this.logger)
	}

	/**
	 * Check if a request is bookmarked by hash
	 * @param hash
	 */
	async isRequestBookmarkedByHash(hash: string): Promise<boolean> {
		return isRequestBookmarkedByHashOp(this.db, hash, this.logger)
	}

	/**
	 * Get bookmark by cache key
	 * @param cacheKey
	 */
	async getBookmark(cacheKey: string): Promise<BookmarkRecord | null> {
		return getBookmarkOp(this.db, cacheKey, this.logger)
	}

	/**
	 * Get bookmark by hash
	 * @param hash
	 */
	async getBookmarkByHash(hash: string): Promise<BookmarkRecord | null> {
		return getBookmarkByHashOp(this.db, hash, this.logger)
	}

	/**
	 * Add a bookmark for a normalized request
	 * @param params
	 * @param params.request
	 * @param params.title
	 * @param params.notes
	 * @param params.tags
	 */
	async addBookmark(params: {
		request: StoredNormalizedRequest
		title: string
		notes?: string
		tags?: string[]
	}): Promise<number> {
		return addBookmarkOp(this.db, params, this.logger)
	}

	/**
	 * Get all bookmarks
	 */
	async getAllBookmarks(): Promise<BookmarkRecord[]> {
		return getAllBookmarksOp(this.db, this.logger)
	}

	/**
	 * Remove a bookmark
	 * @param bookmarkId
	 */
	async removeBookmark(bookmarkId: number): Promise<void> {
		return removeBookmarkOp(this.db, bookmarkId, this.logger)
	}

	/**
	 * Update a bookmark
	 * @param params
	 * @param params.bookmarkId
	 * @param params.updates
	 */
	async updateBookmark(params: {
		bookmarkId: number
		updates: Partial<Pick<BookmarkRecord, "title" | "notes" | "tags">>
	}): Promise<void> {
		return updateBookmarkOp(this.db, params, this.logger)
	}

	/**
	 * Search bookmarks by title, notes, or tags
	 * @param query
	 */
	async searchBookmarks(query: string): Promise<BookmarkRecord[]> {
		return searchBookmarksOp(this.db, query, this.logger)
	}

	// ============================================================
	// Bookmark Convenience Methods (Entity, Search, List)
	// ============================================================

	/**
	 * Check if an entity is bookmarked
	 * @param params
	 * @param params.entityId
	 * @param params.entityType
	 */
	async isEntityBookmarked(params: {
		entityId: string
		entityType: string
	}): Promise<boolean> {
		const cacheKey = `/${params.entityType}/${params.entityId}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a search is bookmarked
	 * @param params
	 * @param params.searchQuery
	 * @param params.filters
	 */
	async isSearchBookmarked(params: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<boolean> {
		const cacheKey = `/search?q=${params.searchQuery}`
		return this.isRequestBookmarked(cacheKey)
	}

	/**
	 * Check if a list is bookmarked
	 * @param url
	 */
	async isListBookmarked(url: string): Promise<boolean> {
		return this.isRequestBookmarked(url)
	}

	/**
	 * Get entity bookmark
	 * @param params
	 * @param params.entityId
	 * @param params.entityType
	 */
	async getEntityBookmark(params: {
		entityId: string
		entityType: string
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/${params.entityType}/${params.entityId}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get search bookmark
	 * @param params
	 * @param params.searchQuery
	 * @param params.filters
	 */
	async getSearchBookmark(params: {
		searchQuery: string
		filters?: Record<string, unknown>
	}): Promise<BookmarkRecord | null> {
		const cacheKey = `/search?q=${params.searchQuery}`
		return this.getBookmark(cacheKey)
	}

	/**
	 * Get list bookmark
	 * @param url
	 */
	async getListBookmark(url: string): Promise<BookmarkRecord | null> {
		return this.getBookmark(url)
	}

	/**
	 * Add list bookmark
	 * @param url
	 * @param title
	 * @param notes
	 * @param tags
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

	// ============================================================
	// Bulk Bookmark Operations
	// ============================================================

	/**
	 * Remove multiple bookmarks in bulk
	 * @param bookmarkIds
	 */
	async removeBookmarks(bookmarkIds: number[]): Promise<{ success: number; failed: number }> {
		return removeBookmarksOp(this.db, bookmarkIds, this.logger)
	}

	/**
	 * Update tags for multiple bookmarks in bulk
	 * @param params
	 * @param params.bookmarkIds
	 * @param params.addTags
	 * @param params.removeTags
	 * @param params.replaceTags
	 */
	async updateBookmarkTags(params: {
		bookmarkIds: number[]
		addTags?: string[]
		removeTags?: string[]
		replaceTags?: string[]
	}): Promise<{ success: number; failed: number }> {
		return updateBookmarkTagsOp(this.db, params, this.logger)
	}

	/**
	 * Update notes for multiple bookmarks in bulk
	 * @param params
	 * @param params.bookmarkIds
	 * @param params.notes
	 * @param params.action
	 */
	async updateBookmarkNotes(params: {
		bookmarkIds: number[]
		notes?: string
		action?: "replace" | "append" | "prepend"
	}): Promise<{ success: number; failed: number }> {
		return updateBookmarkNotesOp(this.db, params, this.logger)
	}
}

// Export singleton instance
export const userInteractionsService: UserInteractionsService = new UserInteractionsService()
