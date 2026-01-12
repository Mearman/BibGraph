/**
 * Sync Status Context
 *
 * Provides real-time synchronization status for IndexedDB operations.
 * Tracks active operations and shows visual indicators for sync state.
 */

import React, { createContext, useCallback, useContext, useEffect, useState } from 'react';
import type { SyncOperation, SyncStatus, SyncStatusType } from '@/types/sync';

interface SyncStatusContextValue {
  syncStatus: SyncStatus;
  startOperation: (name: string) => string;
  updateOperation: (id: string, updates: Partial<SyncOperation>) => void;
  completeOperation: (id: string, success: boolean, error?: Error) => void;
  clearCompleted: () => void;
}

const MAX_HISTORY = 50; // Keep last 50 completed operations

const SyncStatusContext = createContext<SyncStatusContextValue | null>(null);

export const SyncStatusProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [operations, setOperations] = useState<SyncOperation[]>([]);
  const [isOnline, setIsOnline] = useState(true);

  // Track online/offline status
  useEffect(() => {
    const handleOnline = () => setIsOnline(true);
    const handleOffline = () => setIsOnline(false);

    window.addEventListener('online', handleOnline);
    window.addEventListener('offline', handleOffline);

    // Initial check
    setIsOnline(navigator.onLine);

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

    setOperations((prev) => [operation, ...prev]);
    return id;
  }, []);

  const updateOperation = useCallback((id: string, updates: Partial<SyncOperation>) => {
    setOperations((prev) =>
      prev.map((op) => (op.id === id ? { ...op, ...updates } : op))
    );
  }, []);

  const completeOperation = useCallback((id: string, success: boolean, error?: Error) => {
    setOperations((prev) =>
      prev.map((op) =>
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
    setOperations((prev) => prev.filter((op) => op.status === 'syncing'));
  }, []);

  // Auto-remove successful operations after 5 seconds
  useEffect(() => {
    const interval = setInterval(() => {
      const now = new Date();
      setOperations((prev) => {
        const active = prev.filter((op) => op.status === 'syncing');
        const completed = prev.filter((op) => op.status !== 'syncing');

        // Remove successful ops older than 5 seconds
        const recentCompleted = completed.filter((op) => {
          if (!op.endTime) return true;
          const age = now.getTime() - op.endTime.getTime();
          return age < 5000 || op.status === 'error';
        });

        // Keep only last MAX_HISTORY completed operations
        const trimmedCompleted = recentCompleted.slice(0, MAX_HISTORY);

        return [...active, ...trimmedCompleted];
      });
    }, 1000);

    return () => clearInterval(interval);
  }, []);

  const syncStatus: SyncStatus = {
    overall,
    operations,
    lastSyncTime: operations.find((op) => op.status === 'success')?.endTime,
    isOnline,
  };

  const value: SyncStatusContextValue = {
    syncStatus,
    startOperation,
    updateOperation,
    completeOperation,
    clearCompleted,
  };

  return (
    <SyncStatusContext.Provider value={value}>
      {children}
    </SyncStatusContext.Provider>
  );
};

export const useSyncStatus = (): SyncStatusContextValue => {
  const context = useContext(SyncStatusContext);
  if (!context) {
    throw new Error('useSyncStatus must be used within SyncStatusProvider');
  }
  return context;
};

export default SyncStatusContext;
