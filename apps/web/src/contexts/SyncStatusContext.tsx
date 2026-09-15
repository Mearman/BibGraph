/**
 * Sync Status Context
 *
 * Provides real-time synchronization status for IndexedDB operations.
 * Tracks active operations and shows visual indicators for sync state.
 */

import React, { createContext, use, useCallback, useEffect, useMemo,useState } from 'react';

import type { SyncOperation, SyncStatus, SyncStatusType } from '@/types/sync';

interface SyncStatusContextValue {
  syncStatus: SyncStatus;
  startOperation: (name: string) => string;
  updateOperation: (id: string, updates: Partial<SyncOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  clearCompleted: () => void;
}

const MAX_HISTORY = 50; // Keep last 50 completed operations
const OPERATION_RETENTION_MS = 5000; // Keep completed operations visible for 5 seconds
const STATUS_POLL_INTERVAL_MS = 1000; // Sweep completed operations once per second

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export const SyncStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [isOnline, setIsOnline] = useState(() => navigator.onLine);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => { setIsOnline(true); };
    const handleOffline = () => { setIsOnline(false); };

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    return () => {
      window.removeEventListener('online', handleOnline);
      window.removeEventListener('offline', handleOffline);
    };
  }, []);

  // Calculate overall sync status
  const overall: SyncStatusType = !isOnline
    ? 'offline'
    : operations.some((op) => op.status === 'error')
      ? 'error'
      : operations.some((op) => op.status === 'syncing')
        ? 'syncing'
        : operations.some((op) => op.status === 'success')
          ? 'success'
          : 'idle';

  const startOperation = useCallback((name: string): string => {
    const id = crypto.randomUUID();
    const operation: SyncOperation = {
      id,
      name,
      status: 'syncing',
      startTime: new Date(),
    };

    setOperations((previous) => [operation, ...previous]);
    return id;
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<SyncOperation>) => {
    setOperations((previous) =>
      previous.map((op) => (op.id === id ? { ...op, ...updates } : op))
    );
  }, []);

  const completeOperation = useCallback((id: string, success: boolean, error?: Error) => {
    setOperations((previous) =>
      previous.map((op) =>
        op.id === id
          ? {
              ...op,
              status: success ? 'success' : 'error',
              endTime: new Date(),
              error,
              progress: 100,
            }
          : op
      )
    );
  }, []);

  const clearCompleted = useCallback(() => {
    setOperations((previous) => previous.filter((op) => op.status === 'syncing'));
  }, []);

  // Auto-remove successful operations after 5 seconds
  const shouldKeepOp = useCallback((op: SyncOperation, now: Readonly<Date>) => {
    if (!op.endTime) return true;
    const age = now.getTime() - op.endTime.getTime();
    return age < OPERATION_RETENTION_MS || op.status === 'error';
  }, []);

  const filterActiveOps = useCallback((ops: readonly SyncOperation[]) => {
    return ops.filter((op) => op.status === 'syncing');
  }, []);

  const filterAndTrimCompletedOps = useCallback((ops: readonly SyncOperation[], now: Readonly<Date>) => {
    const completed = ops.filter((op) => op.status !== 'syncing');
    const recentCompleted = completed.filter((op) => shouldKeepOp(op, now));
    return recentCompleted.slice(0, MAX_HISTORY);
  }, [shouldKeepOp]);

  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setOperations((previous) => {
        const active = filterActiveOps(previous);
        const trimmedCompleted = filterAndTrimCompletedOps(previous, now);
        return [...active, ...trimmedCompleted];
      });
    }, STATUS_POLL_INTERVAL_MS);

    return () => { clearInterval(interval); };
  }, [filterActiveOps, filterAndTrimCompletedOps]);

  const syncStatus: SyncStatus = useMemo(() => ({
    overall,
    operations,
    lastSyncTime: operations.find((op) => op.status === 'success')?.endTime,
    isOnline,
  }), [overall, operations, isOnline]);

  const value: SyncStatusContextValue = useMemo(() => ({
    syncStatus,
    startOperation,
    updateOperation,
    completeOperation,
    clearCompleted,
  }), [syncStatus, startOperation, updateOperation, completeOperation, clearCompleted]);

  return (
    <SyncStatusContext value={value}>
      {children}
    </SyncStatusContext>
  );
};

export const useSyncStatus = (): SyncStatusContextValue => {
  const context = use(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider');
  }
  return context;
};

