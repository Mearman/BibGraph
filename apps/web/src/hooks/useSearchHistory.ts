/**
 * Search History Hook
 *
 * Manages search query history with IndexedDB persistence via storage provider.
 * Stores up to 50 search queries with FIFO eviction.
 *
 * Uses a custom DOM event ('search-history-changed') to keep multiple hook
 * instances synchronised (e.g. SearchInterface writes, SearchHistoryDropdown reads).
 */

import { useCallback, useEffect, useState } from 'react';

import { useStorageProvider } from '@/contexts/storage-provider-context';

interface SearchHistoryEntry {
  id?: string;
  query: string;
  timestamp: Date;
}

const MAX_SEARCH_HISTORY = 50;

/** Custom event name used to notify all useSearchHistory instances of changes */
const SEARCH_HISTORY_CHANGED_EVENT = 'search-history-changed';

/** Dispatch a notification that search history has been mutated */
const notifySearchHistoryChanged = () => {
  window.dispatchEvent(new CustomEvent(SEARCH_HISTORY_CHANGED_EVENT));
};

/**
 * Hook for managing search history
 * @returns Search history state and operations
 */
export const useSearchHistory = () => {
  const storageProvider = useStorageProvider();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  /** Reload history from the storage provider */
  const reloadHistory = useCallback(async () => {
    try {
      const history = await storageProvider.getSearchHistory();
      setSearchHistory(history);
      setIsLoading(false);
    } catch (error) {
      console.error('Failed to load search history:', error);
      setSearchHistory([]);
      setIsLoading(false);
    }
  }, [storageProvider]);

  // Load search history on mount and listen for cross-instance change events
  useEffect(() => {
    let mounted = true;

    const loadHistory = async () => {
      try {
        const history = await storageProvider.getSearchHistory();
        if (mounted) {
          setSearchHistory(history);
          setIsLoading(false);
        }
      } catch (error) {
        console.error('Failed to load search history:', error);
        if (mounted) {
          setSearchHistory([]);
          setIsLoading(false);
        }
      }
    };

    void loadHistory();

    // Listen for mutations from other hook instances
    const handleChange = () => {
      if (mounted) {
        void loadHistory();
      }
    };
    window.addEventListener(SEARCH_HISTORY_CHANGED_EVENT, handleChange);

    return () => {
      mounted = false;
      window.removeEventListener(SEARCH_HISTORY_CHANGED_EVENT, handleChange);
    };
  }, [storageProvider]);

  /**
   * Add a search query to history
   * @param query Search query to add
   */
  const addSearchQuery = useCallback(async (query: string) => {
    if (!query.trim()) return;

    try {
      await storageProvider.addSearchQuery(query, MAX_SEARCH_HISTORY);

      // Reload history after adding
      const updatedHistory = await storageProvider.getSearchHistory();
      setSearchHistory(updatedHistory);

      // Notify other hook instances
      notifySearchHistoryChanged();
    } catch (error) {
      console.error('Failed to add search query:', error);
    }
  }, [storageProvider]);

  /**
   * Remove a search query from history
   * @param id ID of the query to remove
   */
  const removeSearchQuery = useCallback(async (id: string) => {
    try {
      await storageProvider.removeSearchQuery(id);

      // Update local state
      setSearchHistory(prev => prev.filter(entry => entry.id !== id));

      // Notify other hook instances
      notifySearchHistoryChanged();
    } catch (error) {
      console.error('Failed to remove search query:', error);
    }
  }, [storageProvider]);

  /**
   * Clear all search history
   */
  const clearSearchHistory = useCallback(async () => {
    try {
      await storageProvider.clearSearchHistory();
      setSearchHistory([]);

      // Notify other hook instances
      notifySearchHistoryChanged();
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, [storageProvider]);

  return {
    searchHistory,
    isLoading,
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    reloadHistory,
  };
};
