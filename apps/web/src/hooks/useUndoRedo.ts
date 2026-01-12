/**
 * Undo/Redo Hook
 *
 * Provides undo/redo functionality with action history stack.
 * Supports keyboard shortcuts (Cmd+Z, Cmd+Shift+Z) and configurable history size.
 */

import { useCallback, useEffect, useRef, useState } from 'react';

export interface UndoableAction<T = unknown> {
  id: string;
  timestamp: Date;
  description: string;
  undo: () => void | Promise<void>;
  redo: () => void | Promise<void>;
}

interface UseUndoRedoOptions {
  maxHistory?: number;
  enableKeyboardShortcuts?: boolean;
}

interface UseUndoRedoReturn<T = unknown> {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  addAction: (action: UndoableAction<T>) => void;
  clearHistory: () => void;
  historySize: number;
}

const DEFAULT_MAX_HISTORY = 10; // User decision: 10 actions

/**
 * Hook for managing undo/redo state with keyboard shortcuts
 * @param options
 */
export const useUndoRedo = <T = unknown>(options: UseUndoRedoOptions = {}): UseUndoRedoReturn<T> => {
  const {
    maxHistory = DEFAULT_MAX_HISTORY,
    enableKeyboardShortcuts = true,
  } = options;

  const [past, setPast] = useState<UndoableAction<T>[]>([]);
  const [future, setFuture] = useState<UndoableAction<T>[]>([]);
  const isOperatingRef = useRef(false);

  const performOperation = async (
    operation: () => Promise<void>,
    cleanup: () => void
  ): Promise<void> => {
    isOperatingRef.current = true;
    try {
      await operation();
    } finally {
      cleanup();
      isOperatingRef.current = false;
    }
  };

  const canUndo = past.length > 0;
  const canRedo = future.length > 0;

  /**
   * Perform undo operation
   */
  const undo = useCallback(async () => {
    if (!canUndo || isOperatingRef.current) return;

    const action = past[past.length - 1];
    await performOperation(
      async () => {
        await action.undo();
        setPast((prev) => prev.slice(0, -1));
        setFuture((prev) => [action, ...prev]);
      },
      () => {}
    );
  }, [past, canUndo]);

  /**
   * Perform redo operation
   */
  const redo = useCallback(async () => {
    if (!canRedo || isOperatingRef.current) return;

    const action = future[0];
    await performOperation(
      async () => {
        await action.redo();
        setFuture((prev) => prev.slice(1));
        setPast((prev) => [...prev, action]);
      },
      () => {}
    );
  }, [future, canRedo]);

  /**
   * Add new action to history
   */
  const addAction = useCallback((action: UndoableAction<T>) => {
    setPast((prev) => {
      const updated = [...prev, action];
      // Keep only last maxHistory actions
      return updated.slice(-maxHistory);
    });

    // Clear future when new action is added
    setFuture([]);
  }, [maxHistory]);

  /**
   * Clear all history
   */
  const clearHistory = useCallback(() => {
    setPast([]);
    setFuture([]);
  }, []);

  /**
   * Set up keyboard shortcuts
   */
  useEffect(() => {
    if (!enableKeyboardShortcuts) return;

    const handleKeyDown = (e: KeyboardEvent) => {
      const cmdOrCtrl = e.metaKey || e.ctrlKey;

      if (cmdOrCtrl && e.key === 'z' && !e.shiftKey) {
        e.preventDefault();
        undo();
      } else if (cmdOrCtrl && (e.key === 'y' || (e.key === 'z' && e.shiftKey))) {
        e.preventDefault();
        redo();
      }
    };

    document.addEventListener('keydown', handleKeyDown);
    return () => document.removeEventListener('keydown', handleKeyDown);
  }, [enableKeyboardShortcuts, undo, redo]);

  return {
    canUndo,
    canRedo,
    undo,
    redo,
    addAction,
    clearHistory,
    historySize: past.length + future.length,
  };
};

/**
 * Hook for integrating undo/redo with specific state operations
 *
 * Example usage:
 * ```tsx
 * const { addAction } = useUndoRedo();
 *
 * const handleDelete = async (id: string) => {
 *   const item = await getItem(id);
 *
 *   addAction({
 *     id: crypto.randomUUID(),
 *     timestamp: new Date(),
 *     description: `Delete ${item.name}`,
 *     undo: async () => {
 *       await restoreItem(item);
 *     },
 *     redo: async () => {
 *       await deleteItem(id);
 *     },
 *   });
 *
 *   await deleteItem(id);
 * };
 * ```
 */
