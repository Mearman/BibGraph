/**
 * Sync Status Context
 *
 * Provides real-time synchronization status for IndexedDB operations.
 * Tracks active operations and shows visual indicators for sync state.
 */

import { type ClientRequestOutcome,subscribeToRequestOutcomes } from '@bibgraph/client';
import { useQueryClient } from '@tanstack/react-query';
import React, { createContext, use, useCallback, useEffect, useMemo,useState } from 'react';

import { classifyRequestError, type RequestOutcome } from '@/lib/connectivity';
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
  const [lastRequestOutcome, setLastRequestOutcome] = useState<RequestOutcome | null>(null);
  const queryClient = useQueryClient();

  // Track the outcome of the most recently completed request through the query cache, so connectivity derives from real request results rather than the last success alone. The cache event's error is typed `any` upstream, so it flows only into classifyRequestError, whose parameter is unknown.
  useEffect(() => {
    const unsubscribe = queryClient.getQueryCache().subscribe((event) => {
      if (event.type !== 'updated') return;
      const state = event.query.state;

      if (state.status === 'error') {
        const queryError: unknown = state.error;
        const next = classifyRequestError(queryError);
        setLastRequestOutcome((previous) =>
          previous !== null && previous.kind === next.kind && previous.message === next.message
            ? previous
            : next,
        );
        return;
      }
      if (state.status === 'success') {
        setLastRequestOutcome((previous) => (previous?.kind === 'success' ? previous : { kind: 'success' }));
      }
    });
    return unsubscribe;
  }, [queryClient]);

  // The transport emits each attempt's outcome the moment it happens, which the query cache cannot: under rate limiting the query stays pending through the whole retry budget (tens of seconds), during which the indicator would otherwise keep reading synced.
  useEffect(() => {
    const messageOf = (outcome: Readonly<ClientRequestOutcome | RequestOutcome>): string | undefined =>
      outcome.kind === 'http-error' || outcome.kind === 'network-error' ? outcome.message : undefined;
    const applyOutcome = (outcome: ClientRequestOutcome) => {
      setLastRequestOutcome((previous) =>
        previous !== null && previous.kind === outcome.kind && messageOf(previous) === messageOf(outcome)
          ? previous
          : outcome,
      );
    };
    return subscribeToRequestOutcomes(applyOutcome);
  }, []);

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

  // Calculate overall sync status from the browser's connectivity signal, the last completed request, and reported storage operations. A network-level request failure reads as offline even while navigator.onLine still reports online; an HTTP error reads as a sync error, never as offline.
  const overall: SyncStatusType =
    !isOnline || lastRequestOutcome?.kind === 'network-error'
      ? 'offline'
      : operations.some((op) => op.status === 'error') || lastRequestOutcome?.kind === 'http-error'
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
    lastRequestOutcome,
  }), [overall, operations, isOnline, lastRequestOutcome]);

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

