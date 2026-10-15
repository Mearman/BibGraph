/**
 * Sync Status Types
 *
 * Types for tracking data synchronization status across the application.
 */

import type { RequestOutcome } from '../lib/connectivity';

export type SyncStatusType = 'idle' | 'syncing' | 'success' | 'error' | 'offline';

export interface SyncOperation {
  id: string;
  name: string;
  status: SyncStatusType;
  startTime: Date;
  endTime?: Date;
  error?: Error;
  progress?: number; // 0-100
}

export interface SyncStatus {
  overall: SyncStatusType;
  operations: SyncOperation[];
  lastSyncTime?: Date;
  isOnline: boolean;
  /**
  Outcome of the most recently completed request (null before any completes), so connectivity surfaces can distinguish network-level failures from HTTP errors.
   */
  lastRequestOutcome: RequestOutcome | null;
}
