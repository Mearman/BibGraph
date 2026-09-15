/**
 * useViewModePreference - Hook for persisting 2D/3D view mode preference
 *
 * Uses localStorage to persist the user's preferred visualization mode
 * across sessions.
 */

import type { ViewMode } from '@bibgraph/types';
import { logger } from '@bibgraph/utils';
import { useCallback,useEffect, useState } from 'react';

const STORAGE_KEY = 'bibgraph-view-mode-preference';
const DEFAULT_MODE: ViewMode = '2D';

/**
 * Parse stored view mode with validation
 */
const parseStoredViewMode = (stored: string | null): ViewMode => {
  if (stored === '2D' || stored === '3D') {
    return stored;
  }
  return DEFAULT_MODE;
};

export interface UseViewModePreferenceReturn {
  /**
  Current view mode
   */
  viewMode: ViewMode;
  /**
  Set the view mode (also persists to storage)
   */
  setViewMode: (mode: ViewMode) => void;
  /**
  Whether the preference has been loaded from storage
   */
  isLoaded: boolean;
}

/**
 * Hook for managing view mode preference with localStorage persistence
 * @param defaultMode - Default mode if no preference is stored
 * @returns Object with current mode, setter, and loading state
 * @example
 * ```tsx
 * function AlgorithmsPage() {
 *   const { viewMode, setViewMode, isLoaded } = useViewModePreference();
 *
 *   if (!isLoaded) return <LoadingSpinner />;
 *
 *   return (
 *     <ViewModeToggle value={viewMode} onChange={setViewMode} />
 *   );
 * }
 * ```
 */
export const useViewModePreference = (defaultMode: ViewMode = DEFAULT_MODE): UseViewModePreferenceReturn => {
  const [viewMode, setViewModeState] = useState<ViewMode>(defaultMode);
  const [isLoaded, setIsLoaded] = useState(false);

  // Load preference from localStorage on mount
  useEffect(() => {
    try {
      const stored = localStorage.getItem(STORAGE_KEY);
      const parsed = parseStoredViewMode(stored);
      setViewModeState(parsed);
    } catch (error) {
      // localStorage may be unavailable (e.g., private browsing)
      logger.warn('ui', 'Failed to load view mode preference', { error }, 'useViewModePreference');
    }
    setIsLoaded(true);
  }, []);

  // Persist preference to localStorage
  const setViewMode = useCallback((mode: ViewMode) => {
    setViewModeState(mode);
    try {
      localStorage.setItem(STORAGE_KEY, mode);
    } catch (error) {
      // localStorage may be unavailable
      logger.warn('ui', 'Failed to save view mode preference', { error }, 'useViewModePreference');
    }
  }, []);

  return { viewMode, setViewMode, isLoaded };
};
