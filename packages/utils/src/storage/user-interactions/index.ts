/**
 * User Interactions Database
 *
 * Modular structure for tracking page visits and bookmarks with normalized OpenAlex requests.
 * Refactored from user-interactions-db.ts for improved maintainability.
 */

// Export types and event system
export type {
	BookmarkEventListener,
	BookmarkRecord,
	PageVisitRecord,
	StoredNormalizedRequest
} from "./types.js"
export { BookmarkEventEmitter, bookmarkEventEmitter } from "./types.js"

// Export path utilities
export { apiUrlToInternalPath, createApiUrlRequest, internalPathToApiUrl } from "./path-utilities.js"

// Export database schema
export { UserInteractionsDB, getDB } from "./schema.js"

// Export service
export { UserInteractionsService, userInteractionsService } from "./service.js"
