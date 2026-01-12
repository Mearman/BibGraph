/**
 * Sync Status Types
 *
 * Types for tracking data synchronization status across the application.
 */

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
}
