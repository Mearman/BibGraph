/**
 * Search History Hook
 *
 * Manages search query history with IndexedDB persistence via storage provider.
 * Stores up to 50 search queries with FIFO eviction.
 */

import { useStorageProvider } from '@/contexts/storage-provider-context';
import { useCallback, useEffect, useState } from 'react';

interface SearchHistoryEntry {
  id?: string;
  query: string;
  timestamp: Date;
}

const MAX_SEARCH_HISTORY = 50;

/**
 * Hook for managing search history
 * @returns Search history state and operations
 */
export const useSearchHistory = () => {
  const storageProvider = useStorageProvider();
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Load search history on mount
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

    return () => {
      mounted = false;
    };
  }, []);

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
    } catch (error) {
      console.error('Failed to add search query:', error);
    }
  }, []);

  /**
   * Remove a search query from history
   * @param id ID of the query to remove
   */
  const removeSearchQuery = useCallback(async (id: string) => {
    try {
      await storageProvider.removeSearchQuery(id);

      // Update local state
      setSearchHistory(prev => prev.filter(entry => entry.id !== id));
    } catch (error) {
      console.error('Failed to remove search query:', error);
    }
  }, []);

  /**
   * Clear all search history
   */
  const clearSearchHistory = useCallback(async () => {
    try {
      await storageProvider.clearSearchHistory();
      setSearchHistory([]);
    } catch (error) {
      console.error('Failed to clear search history:', error);
    }
  }, []);

  return {
    searchHistory,
    isLoading,
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
  };
};
