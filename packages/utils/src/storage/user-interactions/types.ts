/**
 * Types and event system for user interactions
 * Event listeners and data structures for bookmarks and page visits
 */

// Event system for notifying components of data changes
export type BookmarkEventListener = (event: {
  type: 'added' | 'removed' | 'updated';
  bookmarkIds?: number[];
  bookmark?: BookmarkRecord;
}) => void;

export class BookmarkEventEmitter {
  private listeners: BookmarkEventListener[] = [];

  subscribe(listener: BookmarkEventListener) {
    this.listeners.push(listener);
    return () => {
      const index = this.listeners.indexOf(listener);
      if (index !== -1) {
        this.listeners.splice(index, 1);
      }
    };
  }

  emit(event: Parameters<BookmarkEventListener>[0]) {
    this.listeners.forEach(listener => {
      try {
        listener(event);
      } catch (error) {
        console.error('Error in bookmark event listener:', error);
      }
    });
  }
}

// Global event emitter for bookmark changes
export const bookmarkEventEmitter = new BookmarkEventEmitter();

/**
 * Normalized OpenAlex request stored with visit
 * This matches the structure from @bibgraph/client
 */
export interface StoredNormalizedRequest {
  /** Cache key for lookups - now stores full API URL */
  cacheKey: string
  /** Request hash for deduplication */
  hash: string
  /** Original endpoint - kept for backward compatibility */
  endpoint: string
  /** Internal endpoint for app navigation */
  internalEndpoint: string
  /** Normalized params as JSON string (for storage) */
  params: string
  /** Full API URL for external references */
  apiUrl?: string
  /** Internal navigation path */
  internalPath?: string
}

export interface BookmarkRecord {
  id?: number
  /** The normalized OpenAlex request that this bookmark represents */
  request: StoredNormalizedRequest
  /** User-provided title for the bookmark */
  title: string
  /** Optional user notes */
  notes?: string
  /** User-defined tags for organization */
  tags?: string[]
  /** When the bookmark was created */
  timestamp: Date
}

export interface PageVisitRecord {
  id?: number
  /** Normalized OpenAlex request that generated this visit */
  request: StoredNormalizedRequest
  /** Visit timestamp */
  timestamp: Date
  /** Session identifier (optional) */
  sessionId?: string
  /** Referrer URL (optional) */
  referrer?: string
  /** Response duration in ms (optional) */
  duration?: number
  /** Whether the response was cached */
  cached: boolean
  /** Bytes saved via caching (optional) */
  bytesSaved?: number
}
