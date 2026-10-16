/**
 * Shapes and constants for the persisted background job queue: the Dexie store the page's hydration surfaces enqueue into, the service worker's sync handler drains, and the app-open fallback drains when Background Sync is unavailable (Safari, Firefox).
 */

/**
The one sync tag the app registers; draining is tag-driven, so a single tag keeps Chrome's retry budget in one place.
 */
export const BACKGROUND_SYNC_TAG = "bibgraph-queue";

/**
Job kinds the queue can hold. "hydrate-entities" is the batched multi-id OpenAlex lookup; nothing else is queued today.
 */
export type BackgroundJobKind = "hydrate-entities";

/**
 * Payload of a hydrate-entities job: the entity type plus the ids to fetch in batched list requests (the same getWorksByIds path the surfaces use inline).
 */
export interface HydrateEntitiesPayload {
  readonly entityType: "works";
  readonly ids: readonly string[];
}

/**
One persisted job row.
 */
export interface BackgroundJob {
  readonly id: string;
  readonly kind: BackgroundJobKind;
  readonly payload: HydrateEntitiesPayload;
  readonly enqueuedAt: number;
  readonly attempts: number;
  readonly lastError: string | null;
}

/**
Dexie stores plain objects, so the mutable twin of the readonly record shape above.
 */
export interface StoredBackgroundJob extends BackgroundJob {
  id: string;
  kind: BackgroundJobKind;
  payload: { entityType: "works"; ids: string[] };
  enqueuedAt: number;
  attempts: number;
  lastError: string | null;
}
