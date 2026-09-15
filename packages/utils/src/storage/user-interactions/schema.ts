/**
 * User interactions database schema
 * Dexie database class definition and singleton instance
 */

import Dexie from "dexie"

import type { BookmarkRecord, PageVisitRecord, StoredNormalizedRequest } from "./types.js"

// Constants for database operations
const DB_NAME = "user-interactions"

/**
 * Shape of a bookmark's request field as read during the V3-to-V4 upgrade: only `cacheKey` and `endpoint` are guaranteed present on pre-migration records, while the API-URL fields being written by this migration (`internalEndpoint`, `apiUrl`, `internalPath`) are not yet populated.
 */
type BookmarkMigrationRequest = Pick<StoredNormalizedRequest, "cacheKey" | "endpoint"> & Partial<Omit<StoredNormalizedRequest, "cacheKey" | "endpoint">>

interface BookmarkRecordDuringApiUrlMigration {
	request: BookmarkMigrationRequest
}

// Database schema version constants
const DB_VERSION_UNIFIED_REQUEST_SCHEMA = 3
const DB_VERSION_API_URL_SCHEMA = 4

// Dexie database class
class UserInteractionsDB extends Dexie {
	bookmarks!: Dexie.Table<BookmarkRecord, number>
	pageVisits!: Dexie.Table<PageVisitRecord, number>

	constructor() {
		super(DB_NAME)

		// V2: Legacy schema (entity/search/list based)
		this.version(2).stores({
			bookmarks: "++id, bookmarkType, entityId, entityType, searchQuery, timestamp, title, url, *tags",
			pageVisits: "++id, normalizedUrl, pageType, timestamp",
		})

		// V3: Unified request-based schema
		this.version(DB_VERSION_UNIFIED_REQUEST_SCHEMA).stores({
			bookmarks: "++id, request.cacheKey, request.hash, request.endpoint, timestamp, *tags",
			pageVisits: "++id, request.cacheKey, request.hash, request.endpoint, timestamp, cached",
		})

		// V4: API URL-based schema
		this.version(DB_VERSION_API_URL_SCHEMA).stores({
			bookmarks: "++id, request.cacheKey, request.hash, request.internalEndpoint, request.apiUrl, timestamp, *tags",
			pageVisits: "++id, request.cacheKey, request.hash, request.internalEndpoint, timestamp, cached",
		}).upgrade(async tx => {
			// Migration from V3 to V4: Convert internal paths to API URLs
			return await tx.table<BookmarkRecordDuringApiUrlMigration>("bookmarks").toCollection().modify(bookmark => {
				const { cacheKey, endpoint } = bookmark.request;

				// Convert internal cacheKey to API URL
				let apiUrl = cacheKey;
				if (cacheKey.startsWith('/')) {
					// Convert internal path to API URL
					if (cacheKey.includes('?')) {
						const [path, query] = cacheKey.split('?', 2);
						apiUrl = `https://api.openalex.org${path}?${query}`;
					} else {
						apiUrl = `https://api.openalex.org${cacheKey}`;
					}
				}

				// Update bookmark with new structure
				bookmark.request = {
					...bookmark.request,
					cacheKey: apiUrl, // Now stores API URL
					internalEndpoint: endpoint, // Use old endpoint as internal endpoint
					apiUrl, // Full API URL
					internalPath: cacheKey, // Preserve original internal path
				};
			});
		})
	}
}

// Singleton instance
let databaseInstance: UserInteractionsDB | null = null

export const getDB = (): UserInteractionsDB => {
	databaseInstance ??= new UserInteractionsDB()
	return databaseInstance
}

export { UserInteractionsDB }

