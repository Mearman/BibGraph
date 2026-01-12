/**
 * Search History Hook
 *
 * Manages search query history with IndexedDB persistence.
 * Stores up to 50 search queries with FIFO eviction.
 */

import { openDB } from 'idb';
import { useCallback, useEffect, useState } from 'react';

import { logger } from '@bibgraph/utils';

const SEARCH_HISTORY_DB_NAME = 'bibgraph-search-history';
const SEARCH_HISTORY_STORE_NAME = 'queries';
const SEARCH_HISTORY_VERSION = 1;
const MAX_SEARCH_HISTORY = 50;

interface SearchHistoryEntry {
  id: string;
  query: string;
  timestamp: Date;
}

interface SearchHistoryDB {
  [SEARCH_HISTORY_STORE_NAME]: {
    key: string;
    value: SearchHistoryEntry;
  };
}

const initializeDB = async () => {
  return openDB<SearchHistoryDB>(SEARCH_HISTORY_DB_NAME, SEARCH_HISTORY_VERSION, {
    upgrade(db) {
      if (!db.objectStoreNames.contains(SEARCH_HISTORY_STORE_NAME)) {
        const store = db.createObjectStore(SEARCH_HISTORY_STORE_NAME, {
          keyPath: 'id',
        });
        store.createIndex('timestamp', 'timestamp');
      }
    },
  });
};

export const useSearchHistory = () => {
  const [searchHistory, setSearchHistory] = useState<SearchHistoryEntry[]>([]);
  const [isInitialized, setIsInitialized] = useState(false);

  // Initialize IndexedDB and load history
  useEffect(() => {
    const init = async () => {
      try {
        const db = await initializeDB();
        const allEntries = await db.getAll(SEARCH_HISTORY_STORE_NAME);
        const sortedEntries = allEntries
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_SEARCH_HISTORY);
        setSearchHistory(sortedEntries);
        setIsInitialized(true);
      } catch (error) {
        logger.error('search-history', 'Failed to initialize search history', { error });
        setIsInitialized(true);
      }
    };

    void init();
  }, []);

  const addSearchQuery = useCallback(
    async (query: string) => {
      if (!query.trim()) return;

      try {
        const db = await initializeDB();

        // Create new entry
        const entry: SearchHistoryEntry = {
          id: crypto.randomUUID(),
          query: query.trim(),
          timestamp: new Date(),
        };

        // Add to database
        await db.put(SEARCH_HISTORY_STORE_NAME, entry);

        // Get all entries and enforce FIFO eviction
        const allEntries = await db.getAll(SEARCH_HISTORY_STORE_NAME);
        if (allEntries.length > MAX_SEARCH_HISTORY) {
          // Sort by timestamp (oldest first)
          const sortedEntries = [...allEntries].sort(
            (a, b) => a.timestamp.getTime() - b.timestamp.getTime(),
          );

          // Remove oldest entries
          const entriesToRemove = sortedEntries.slice(0, allEntries.length - MAX_SEARCH_HISTORY);
          for (const entry of entriesToRemove) {
            await db.delete(SEARCH_HISTORY_STORE_NAME, entry.id);
          }
        }

        // Update state
        const updatedHistory = await db.getAll(SEARCH_HISTORY_STORE_NAME);
        const sortedHistory = updatedHistory
          .sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())
          .slice(0, MAX_SEARCH_HISTORY);
        setSearchHistory(sortedHistory);

        logger.debug('search-history', 'Added search query to history', { query });
      } catch (error) {
        logger.error('search-history', 'Failed to add search query to history', { error, query });
      }
    },
    [],
  );

  const removeSearchQuery = useCallback(async (id: string) => {
    try {
      const db = await initializeDB();
      await db.delete(SEARCH_HISTORY_STORE_NAME, id);

      // Update state
      const updatedHistory = searchHistory.filter((entry) => entry.id !== id);
      setSearchHistory(updatedHistory);

      logger.debug('search-history', 'Removed search query from history', { id });
    } catch (error) {
      logger.error('search-history', 'Failed to remove search query from history', { error, id });
    }
  }, [searchHistory]);

  const clearSearchHistory = useCallback(async () => {
    try {
      const db = await initializeDB();
      await db.clear(SEARCH_HISTORY_STORE_NAME);
      setSearchHistory([]);

      logger.debug('search-history', 'Cleared search history');
    } catch (error) {
      logger.error('search-history', 'Failed to clear search history', { error });
    }
  }, []);

  return {
    searchHistory: isInitialized ? searchHistory : [],
    addSearchQuery,
    removeSearchQuery,
    clearSearchHistory,
    isInitialized,
  };
};
