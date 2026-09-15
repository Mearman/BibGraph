/**
 * Notification Constants
 * Centralized configuration for notification timing and behavior
 *
 * This file eliminates magic numbers for notification durations across components,
 * ensuring consistent UX and making timing values discoverable and maintainable.
 */

// =============================================================================
// NOTIFICATION DURATIONS
// =============================================================================

/**
 * Auto-close duration constants for notifications (in milliseconds)
 *
 * Use semantically named durations instead of raw numbers:
 * - BRIEF: Quick feedback that doesn't need user attention (e.g., screen reader announcements)
 * - SHORT: Standard success/info messages
 * - MEDIUM: Messages with more context that users may want to read
 * - LONG: Error messages or important information requiring user attention
 */
export const NOTIFICATION_DURATION = {
  /**
  Brief notifications (1s) - screen reader only or minimal feedback
   */
  BRIEF_MS: 1000,
  /**
  Short notifications (2s) - standard success/info messages
   */
  SHORT_MS: 2000,
  /**
  Medium notifications (3s) - messages with more context
   */
  MEDIUM_MS: 3000,
  /**
  Long notifications (5s) - errors or important messages
   */
  LONG_MS: 5000,
} as const;

/**
 * Default notification duration for common cases
 */
export const DEFAULT_NOTIFICATION_DURATION_MS = NOTIFICATION_DURATION.SHORT_MS;
