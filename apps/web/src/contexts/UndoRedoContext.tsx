/**
 * Global Undo/Redo Context
 *
 * Provides application-wide undo/redo functionality for destructive actions.
 * Integrates with useUndoRedo hook and manages action history across all hooks.
 */

import React, { createContext, use } from 'react';

import { type UndoableAction,useUndoRedo } from '@/hooks/useUndoRedo';

export interface UndoRedoContextValue {
  canUndo: boolean;
  canRedo: boolean;
  undo: () => Promise<void>;
  redo: () => Promise<void>;
  addAction: (action: UndoableAction) => void;
  clearHistory: () => void;
  historySize: number;
}

const UndoRedoContext = createContext<UndoRedoContextValue | null>(null);

/**
 * Provider component that wraps the application with undo/redo functionality
 * @param root0
 * @param root0.children
 */
export const UndoRedoProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const undoRedo = useUndoRedo({
    maxHistory: 10, // User decision: 10 actions
    enableKeyboardShortcuts: true,
  });

  return (
    <UndoRedoContext value={undoRedo}>
      {children}
    </UndoRedoContext>
  );
};

/**
 * Hook to access the global undo/redo context
 */
export const useUndoRedoContext = (): UndoRedoContextValue => {
  const context = use(UndoRedoContext);
  if (!context) {
    throw new Error('useUndoRedoContext must be used within UndoRedoProvider');
  }
  return context;
};

